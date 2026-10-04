import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { AdminClient } from './admin-client';

export const metadata: Metadata = {
  title: 'tapaway admin',
  robots: { index: false, follow: false },
};

// The admin exists only on its own subdomain (admin.tapaway.today); proxy.ts
// rewrites every path there to this page. On the main site /admin is a 404.
// Local dev: http://admin.localhost:3000.
export default async function AdminPage() {
  const host = (await headers()).get('host') ?? '';
  if (!host.startsWith('admin.')) notFound();
  return <AdminClient />;
}
