import { createClient } from '@supabase/supabase-js';

// Browser client: publishable key only. Everything it can reach is gated by
// RLS or by the `is_admin()` check inside the admin_* functions — see
// supabase/migrations/*_shop_and_admin.sql. Orders are never written from here;
// the browser posts to /api/orders instead.
// NEXT_PUBLIC_ vars are inlined at build time, so they must be referenced
// literally (not via a computed key) for Next to replace them.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not configured');
}

export const supabase = createClient(url, publishableKey);
