import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-only Supabase client with the secret key (sb_secret_…, the successor
// to the legacy service_role key). It bypasses RLS,
// which is the point: no client role may insert orders or waitlist rows, so
// these functions are the only way in. Never import this from src/.
//
// Returns null when unconfigured, so each endpoint decides whether that is
// fatal (orders) or merely skips a best-effort write (waitlist mirror).
let client: SupabaseClient | null | undefined;

export function supabaseAdmin(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  client =
    url && secretKey
      ? createClient(url, secretKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  return client;
}
