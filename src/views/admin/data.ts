'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Every admin read and write, in one place. All of it is enforced server-side
// (RLS on tables, an is_admin() check inside each admin_* function); these
// hooks only shape the data for the UI.

export interface InventoryRow {
  hardware_id: string;
  provisioned_at: string;
  confirmed_at: string | null;
  provisioned_by_email: string | null;
  owner_user_id: string | null;
  owner_email: string | null;
  tag_name: string | null;
  registered_at: string | null;
}

export interface UserRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  live_tag_count: number;
  is_provisioner: boolean;
  is_admin: boolean;
}

export interface WaitlistRow {
  email: string;
  source: string;
  created_at: string;
  removed_at: string | null;
}

export interface AuditRow {
  id: number;
  at: string;
  actor_email: string | null;
  action: string;
  target: string | null;
  detail: { emails?: string[]; owner?: string | null } & Record<string, unknown>;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderRow {
  id: string;
  reference: string;
  status: OrderStatus;
  email: string;
  full_name: string;
  phone: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  region: string | null;
  postal_code: string;
  country: string;
  notes: string | null;
  items: { name: string; quantity: number; tags: number }[];
  total_tags: number;
  subtotal_cents: number;
  currency: string;
  /** The deposit taken on Dodo's checkout; older rows predate deposits. */
  payment_status: 'unpaid' | 'paid' | 'failed' | 'refunded';
  deposit_cents: number;
  payment_id: string | null;
  paid_at: string | null;
  /** Fulfilment, set from the admin. `carrier` is an id from shared/carriers.ts. */
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

async function unwrap<T>(request: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type AdminRole = 'admin' | 'provisioner';

/** What this account may see: 'admin' (everything), 'provisioner' (tags, read-only), or null. */
export const useAdminRole = (userId: string) =>
  useQuery({
    queryKey: ['admin', 'role', userId],
    queryFn: async (): Promise<AdminRole | null> => {
      const { data, error } = await supabase.rpc('my_admin_role');
      if (error) throw new Error(error.message);
      return data === 'admin' || data === 'provisioner' ? data : null;
    },
  });

// Tags are readable by admins and provisioners (owner identity is blanked
// server-side for provisioners). The rest is admin-only: callers pass
// `enabled` so a provisioner's browser never even asks.
export const useInventory = () =>
  useQuery({
    queryKey: ['admin', 'tags'],
    queryFn: () => unwrap<InventoryRow>(supabase.rpc('admin_tag_inventory')),
  });

export const useUsers = (enabled = true) =>
  useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => unwrap<UserRow>(supabase.rpc('admin_users')),
    enabled,
  });

export const useWaitlist = (enabled = true) =>
  useQuery({
    queryKey: ['admin', 'waitlist'],
    queryFn: () =>
      unwrap<WaitlistRow>(supabase.from('waitlist_signups').select('*').order('created_at', { ascending: false })),
    enabled,
  });

export const useOrders = (enabled = true) =>
  useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: () => unwrap<OrderRow>(supabase.from('orders').select('*').order('created_at', { ascending: false })),
    enabled,
  });

export const useAudit = () =>
  useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () =>
      unwrap<AuditRow>(supabase.from('admin_audit').select('*').order('at', { ascending: false }).limit(300)),
  });

export type WaitlistAction = 'remove' | 'restore' | 'purge';

/**
 * Waitlist moderation goes through /api/admin/waitlist, not straight to the
 * database: it also has to update the AutoSend mailing list, which needs a
 * server-held key. The session token proves who's asking.
 */
export function useWaitlistAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ action, emails }: { action: WaitlistAction; emails: string[] }) => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Your session expired. Sign in again.');
      let response: Response;
      try {
        response = await fetch('/api/admin/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action, emails }),
        });
      } catch {
        throw new Error('No connection to the server.');
      }
      const body = (await response.json().catch(() => null)) as { ok: boolean; affected?: number; error?: string } | null;
      if (!response.ok || !body?.ok) {
        const messages: Record<string, string> = {
          autosend_failed: "AutoSend didn't accept the change, so nothing was changed. Try again.",
          database_failed: 'AutoSend was updated but the database write failed. Run the same action again.',
          rate_limited: 'Too many changes in a minute. Wait a moment.',
          not_an_admin: "This account isn't an admin.",
          not_signed_in: 'Your session expired. Sign in again.',
        };
        throw new Error(messages[body?.error ?? ''] ?? `The server returned ${response.status}.`);
      }
      return body.affected ?? 0;
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['admin', 'waitlist'] });
      client.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}

export type OrderAction =
  | { action: 'confirm' | 'deliver' | 'cancel'; orderId: string }
  | {
      action: 'ship' | 'update_tracking';
      orderId: string;
      carrier: string;
      trackingNumber: string;
      trackingUrl: string;
      hardwareIds?: string[];
    };

/**
 * Fulfilment goes through /api/admin/orders: the browser can only read
 * orders, and the server checks each change against the order's current
 * state and audits it.
 */
export function useOrderAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: OrderAction) => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Your session expired. Sign in again.');
      let response: Response;
      try {
        response = await fetch('/api/admin/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(input),
        });
      } catch {
        throw new Error('No connection to the server.');
      }
      const body = (await response.json().catch(() => null)) as
        | { ok: true; order: OrderRow }
        | { ok: false; error: string; message?: string; status?: string }
        | null;
      if (!response.ok || !body?.ok) {
        const error = body && !body.ok ? body : null;
        const messages: Record<string, string> = {
          not_paid: 'This pre-order’s $5 payment hasn’t gone through, so it can’t be shipped yet.',
          tag_unavailable: error?.message ?? 'One of those tags is no longer free. Pick again.',
          too_many_tags: error?.message ?? 'That’s more tags than this order has.',
          invalid_transition: `Someone already moved this order on (it’s now ${error?.status ?? 'changed'}). Refresh to see it.`,
          invalid_input: error?.message ?? 'Check the shipment details and try again.',
          not_found: 'This order no longer exists.',
          database_failed: 'The database didn’t accept the change. Try again; if it keeps happening, check the fulfilment migration is applied.',
          rate_limited: 'Too many changes in a minute. Wait a moment.',
          not_an_admin: "This account isn't an admin.",
          not_signed_in: 'Your session expired. Sign in again.',
        };
        throw new Error(messages[error?.error ?? ''] ?? `The server returned ${response.status}.`);
      }
      return body.order;
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['admin', 'orders'] });
      client.invalidateQueries({ queryKey: ['admin', 'order-tags'] });
      client.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}

export function useReleaseTag() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (hardwareId: string) => {
      const { error } = await supabase.rpc('admin_release_tag', { p_hardware_id: hardwareId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['admin', 'tags'] });
      client.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}

export function useSetProvisioner() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, enabled }: { userId: string; enabled: boolean }) => {
      const { error } = await supabase.rpc('admin_set_provisioner', { p_user_id: userId, p_enabled: enabled });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['admin', 'users'] });
      client.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}

export type TagStatus = 'registered' | 'shipped' | 'available' | 'unconfirmed';

/** hardware_id → order_id, for every tag packed into a pre-order parcel. */
export type PackedTags = ReadonlyMap<string, string>;

/**
 * Where a tag is: set up in the app, in a customer's parcel, on the shelf, or
 * still being provisioned. Registration wins — a shipped tag becomes
 * "registered" once its new owner sets it up.
 */
export function tagStatus(row: InventoryRow, packed: PackedTags): TagStatus {
  if (row.owner_user_id) return 'registered';
  if (packed.has(row.hardware_id)) return 'shipped';
  return row.confirmed_at ? 'available' : 'unconfirmed';
}

export interface OrderTagRow {
  hardware_id: string;
  order_id: string;
  assigned_at: string;
}

/** Which tags went into which parcel. Admin-only by RLS; others get an empty map. */
export function usePackedTags(enabled = true) {
  const query = useQuery({
    queryKey: ['admin', 'order-tags'],
    queryFn: () => unwrap<OrderTagRow>(supabase.from('order_tags').select('*')),
    enabled,
  });
  const map = useMemo<PackedTags>(
    () => new Map((query.data ?? []).map((row) => [row.hardware_id, row.order_id])),
    [query.data],
  );
  return { ...query, map };
}

// ---------------------------------------------------------------------------
// Order stage: the one answer to "what's happening with this pre-order?",
// combining payment and fulfilment so lists and counts never disagree.
// ---------------------------------------------------------------------------

export type OrderStage = 'to_ship' | 'shipped' | 'delivered' | 'awaiting_payment' | 'payment_failed' | 'cancelled' | 'refunded';

export function orderStage(row: OrderRow): OrderStage {
  if (row.status === 'cancelled') return 'cancelled';
  if (row.status === 'delivered') return 'delivered';
  if (row.status === 'shipped') return 'shipped';
  if (row.payment_status === 'refunded') return 'refunded';
  if (row.payment_status === 'failed') return 'payment_failed';
  if (row.payment_status !== 'paid') return 'awaiting_payment';
  return 'to_ship';
}

/** A real reservation: paid and not called off. Abandoned checkouts don't count. */
export const isCommitted = (row: OrderRow) =>
  row.payment_status === 'paid' && row.status !== 'cancelled';
