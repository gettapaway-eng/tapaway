'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactLenis } from 'lenis/react';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

// App-wide client providers. The query client lives in state so each browser
// session gets one, and server renders never share a cache between requests.
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  // Smooth wheel scrolling is for the marketing site and shop. The admin is a
  // tool full of its own scroll areas (panels, lists, menus) that Lenis would
  // hijack, so it scrolls natively there.
  const [smoothScroll, setSmoothScroll] = useState(false);
  useEffect(() => setSmoothScroll(!window.location.hostname.startsWith('admin.')), []);

  return (
    <QueryClientProvider client={queryClient}>
      {smoothScroll ? (
        <ReactLenis
          root
          options={{
            duration: 1.4,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
          }}
        />
      ) : null}
      <TooltipProvider>
        {children}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
