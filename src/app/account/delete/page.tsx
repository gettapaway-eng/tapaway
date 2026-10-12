import type { Metadata } from 'next';
import AccountDelete from '@/views/account-delete';

export const metadata: Metadata = {
  title: 'Delete your account — tapaway',
  description: 'Permanently delete your tapaway app account and everything stored with it.',
  robots: { index: false, follow: false },
};

export default function AccountDeletePage() {
  return <AccountDelete />;
}
