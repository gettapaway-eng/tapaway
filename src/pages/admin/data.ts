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

export interface OrderRow {
  id: string;
  reference: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'cancelled';
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

export type TagStatus = 'registered' | 'available' | 'unconfirmed';

export function tagStatus(row: InventoryRow): TagStatus {
  if (!row.confirmed_at) return 'unconfirmed';
  return row.owner_user_id ? 'registered' : 'available';
}
