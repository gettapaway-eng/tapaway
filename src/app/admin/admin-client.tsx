'use client';

import dynamic from 'next/dynamic';

// Client-only: the admin reads its section from the URL hash and creates the
// Supabase browser client at import, which needs the public env vars.
const Admin = dynamic(() => import('@/views/admin'), { ssr: false, loading: () => null });

export function AdminClient() {
  return <Admin />;
}
