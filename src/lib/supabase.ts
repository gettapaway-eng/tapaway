import { createClient } from '@supabase/supabase-js';

// Browser client: publishable key only. Everything it can reach is gated by
// RLS or by the `is_admin()` check inside the admin_* functions — see
// supabase/migrations/*_shop_and_admin.sql. Orders are never written from here;
// the browser posts to /api/orders instead.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !publishableKey) {
  throw new Error('VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is not configured');
}

export const supabase = createClient(url, publishableKey);
