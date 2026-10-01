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

export const useInventory = () =>
  useQuery({
    queryKey: ['admin', 'tags'],
    queryFn: () => unwrap<InventoryRow>(supabase.rpc('admin_tag_inventory')),
  });

export const useUsers = () =>
  useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => unwrap<UserRow>(supabase.rpc('admin_users')),
  });

export const useWaitlist = () =>
  useQuery({
    queryKey: ['admin', 'waitlist'],
    queryFn: () =>
      unwrap<WaitlistRow>(supabase.from('waitlist_signups').select('*').order('created_at', { ascending: false })),
  });

export const useOrders = () =>
  useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: () => unwrap<OrderRow>(supabase.from('orders').select('*').order('created_at', { ascending: false })),
  });

export function useReleaseTag() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (hardwareId: string) => {
      const { error } = await supabase.rpc('admin_release_tag', { p_hardware_id: hardwareId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'tags'] }),
  });
}

export function useSetProvisioner() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, enabled }: { userId: string; enabled: boolean }) => {
      const { error } = await supabase.rpc('admin_set_provisioner', { p_user_id: userId, p_enabled: enabled });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export type TagStatus = 'registered' | 'available' | 'unconfirmed';

export function tagStatus(row: InventoryRow): TagStatus {
  if (!row.confirmed_at) return 'unconfirmed';
  return row.owner_user_id ? 'registered' : 'available';
}
