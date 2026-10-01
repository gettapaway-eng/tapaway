import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactLenis } from 'lenis/react';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Hero } from '@/components/site/hero';
import { Features } from '@/components/site/features';
import { Steps } from '@/components/site/steps';
import { Footer } from '@/components/site/footer';

// Lazy so the Supabase client (and its env check) only loads on the admin
// subdomain — the marketing site never pays for it, and can't be broken by it.
const Admin = lazy(() => import('@/pages/admin'));

const queryClient = new QueryClient();

// The admin exists only on its own subdomain (admin.tapaway.today) but ships in
// this same build: the hostname decides which app renders. There is no /admin
// route on the main site. Local dev: http://admin.localhost:5173.
const isAdminHost = window.location.hostname.startsWith('admin.');

function AdminApp() {
  return (
    <Suspense fallback={null}>
      <Admin />
    </Suspense>
  );
}

function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <Steps />
      <Footer />
    </main>
  );
}

function Router() {
  if (isAdminHost) return <AdminApp />;
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactLenis
        root
        options={{
          duration: 1.4,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
        }}
      />
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
