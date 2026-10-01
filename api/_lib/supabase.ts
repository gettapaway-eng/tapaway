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

/**
 * Resolves a browser session token to the user it belongs to, or null if it's
 * missing, expired or forged. Calls Supabase Auth's REST endpoint directly
 * rather than `client.auth.getUser`: the auth types live in @supabase/auth-js,
 * which pnpm doesn't hoist, and Vercel's function compiler can't see them —
 * so the method "doesn't exist" there even though it works at runtime.
 */
export async function userFromToken(token: string): Promise<{ id: string; email: string | null } | null> {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey || !token) return null;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: secretKey, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { id?: unknown; email?: unknown };
    return typeof body.id === 'string'
      ? { id: body.id, email: typeof body.email === 'string' ? body.email : null }
      : null;
  } catch {
    return null;
  }
}
