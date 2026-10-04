import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

// Self-hosted by next/font: no request to Google at runtime, no layout shift.
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

const description =
  'TapAway helps you stay focused by using a physical NFC device to lock distracting apps. Tap to start Focus Mode, block social media, and build better digital habits.';
const shareDescription =
  'Block distracting apps with a simple tap. TapAway uses a physical NFC device to help you reclaim your attention and build healthier phone habits.';

export const metadata: Metadata = {
  metadataBase: new URL('https://tapaway.today'),
  title: 'TapAway — Block Distracting Apps with a Physical NFC Device',
  description,
  keywords: [
    'TapAway',
    'app blocker',
    'focus app',
    'digital detox',
    'screen time',
    'block social media',
    'NFC app blocker',
    'productivity',
    'focus mode',
    'phone addiction',
  ],
  authors: [{ name: 'TapAway' }],
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'TapAway',
    title: 'TapAway — Tap Once. Focus Instantly.',
    description: shareDescription,
    images: ['/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TapAway — Tap Once. Focus Instantly.',
    description: shareDescription,
    images: ['/og-image.jpg'],
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
