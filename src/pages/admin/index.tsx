import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { MotionConfig } from 'motion/react';
import { LogOut, Search } from 'lucide-react';
import { Toaster } from 'sonner';
import { Logomark } from '@/components/site/logo';
import { Kbd } from '@/components/ui/kbd';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { supabase } from '@/lib/supabase';
import { CommandPalette, SECTION_META, useCommandPalette } from './command-palette';
import { AdminNavContext, SECTIONS, type AdminNav, type Section, type Selection } from './context';
import { useInventory, useOrders, useUsers, useWaitlist } from './data';
import { OverviewPage } from './overview';
import { OrdersPage, TagsPage, UsersPage, WaitlistPage } from './pages';
import { AdminSignIn } from './sign-in';
import { AdminThemeProvider, ThemeSwitch, useAdminTheme } from './theme';

// /admin. The route itself protects nothing — every table and function behind
// it checks `is_admin()` server-side, so a non-admin who gets past this screen
// sees errors, not data. This gate only keeps the UI honest.
export default function AdminPage() {
  return (
    <AdminThemeProvider>
      <AdminRoot />
    </AdminThemeProvider>
  );
}

function AdminRoot() {
  const { resolved } = useAdminTheme();
  useEffect(() => {
    const previous = document.title;
    document.title = 'tapaway admin';
    return () => {
      document.title = previous;
    };
  }, []);
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      {session === undefined ? <FullPage /> : !session ? <AdminSignIn /> : <AdminGate session={session} />}
      <Toaster position="bottom-right" theme={resolved} closeButton toastOptions={{ className: 'admin-toast' }} />
    </MotionConfig>
  );
}

function AdminGate({ session }: { session: Session }) {
  const isAdmin = useQuery({
    queryKey: ['admin', 'is-admin', session.user.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) throw new Error(error.message);
      return data === true;
    },
  });

  if (isAdmin.isLoading) return <FullPage />;
  if (!isAdmin.data) {
    return (
      <FullPage>
        <p className="text-[15px] font-semibold">{session.user.email} doesn't have admin access</p>
        <p className="max-w-xs text-center text-muted-foreground">
          Ask an existing admin to add this account, or sign in with a different one.
        </p>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="press mt-2 h-8 rounded-lg border border-border bg-background px-3 font-medium hover:bg-accent"
        >
          Sign out
        </button>
      </FullPage>
    );
  }
  return <AdminShell email={session.user.email ?? ''} />;
}

function readSection(): Section {
  const hash = window.location.hash.slice(1);
  return (SECTIONS as string[]).includes(hash) ? (hash as Section) : 'overview';
}

function AdminShell({ email }: { email: string }) {
  // The section lives in the URL hash, so refresh and back/forward work.
  const [section, setSection] = useState<Section>(readSection);
  const [selection, setSelection] = useState<Selection>(null);
  const palette = useCommandPalette();

  useEffect(() => {
    const onHash = () => setSection(readSection());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useCallback((next: Section) => {
    if (window.location.hash !== `#${next}`) window.location.hash = next;
    setSection(next);
  }, []);

  // Selecting something also brings up the section that owns it.
  const select = useCallback(
    (next: Selection) => {
      setSelection(next);
      if (next) go(next.kind === 'tag' ? 'tags' : next.kind === 'user' ? 'users' : 'orders');
    },
    [go],
  );

  const nav = useMemo<AdminNav>(() => ({ section, go, selection, select }), [section, go, selection, select]);

  // Loaded up front so the sidebar shows counts; each page reuses the cache.
  const counts: Partial<Record<Section, number | undefined>> = {
    tags: useInventory().data?.length,
    users: useUsers().data?.length,
    waitlist: useWaitlist().data?.length,
    orders: useOrders().data?.length,
  };

  return (
    <AdminNavContext.Provider value={nav}>
      <SidebarProvider>
        <Sidebar variant="inset" collapsible="icon">
          <SidebarHeader>
            <div className="flex h-9 items-center gap-2 px-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <Logomark className="h-[18px] w-auto shrink-0 [&_path]:fill-foreground" />
              <span className="text-[14px] font-semibold tracking-[-0.01em] group-data-[collapsible=icon]:hidden">
                tapaway
              </span>
            </div>
            <button
              type="button"
              onClick={() => palette.setOpen(true)}
              className="flex h-8 items-center gap-2 rounded-lg bg-sidebar-accent/70 px-2.5 text-left text-muted-foreground outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-[var(--tint)] group-data-[collapsible=icon]:hidden"
            >
              <Search className="size-3.5" />
              <span className="flex-1">Search</span>
              <Kbd className="h-5 bg-background/70 text-[10.5px]">⌘K</Kbd>
            </button>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {SECTIONS.map((id) => {
                    const { label, icon: Icon } = SECTION_META[id];
                    const active = id === section;
                    return (
                      <SidebarMenuItem key={id}>
                        <SidebarMenuButton
                          isActive={active}
                          tooltip={label}
                          onClick={() => go(id)}
                          className="h-8 text-[13px] font-medium data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold [&>svg]:size-4"
                        >
                          <Icon className={active ? 'text-[var(--tint)]' : 'text-muted-foreground'} strokeWidth={1.9} />
                          <span>{label}</span>
                        </SidebarMenuButton>
                        {counts[id] !== undefined ? (
                          <SidebarMenuBadge className="tabular text-[11.5px] font-normal text-muted-foreground">
                            {counts[id]}
                          </SidebarMenuBadge>
                        ) : null}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Sign out"
                  onClick={() => supabase.auth.signOut()}
                  className="h-auto py-1.5"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--tint)] text-[11px] font-semibold uppercase text-white">
                    {email.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium">{email}</span>
                    <span className="block text-[11px] text-muted-foreground">Sign out</span>
                  </span>
                  <LogOut className="size-3.5 text-muted-foreground" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="min-w-0 overflow-hidden border border-border/60 dark:border-border">
          <header className="toolbar-material sticky top-0 z-20 flex h-12 items-center gap-2 px-3 [mask-image:linear-gradient(to_bottom,black_calc(100%-6px),transparent)]">
            <SidebarTrigger className="size-7 text-muted-foreground" />
            <span className="h-4 w-px bg-border" aria-hidden="true" />
            <span className="text-[13px] font-semibold">{SECTION_META[section].label}</span>
            <ThemeSwitch className="ml-auto" />
            <button
              type="button"
              onClick={() => palette.setOpen(true)}
              className="grid size-7 place-items-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--tint)] md:hidden"
              aria-label="Search"
            >
              <Search className="size-4" />
            </button>
          </header>
          <main className="mx-auto w-full max-w-6xl px-5 pb-10 pt-3 md:px-8">
            {section === 'overview' ? <OverviewPage /> : null}
            {section === 'tags' ? <TagsPage /> : null}
            {section === 'users' ? <UsersPage /> : null}
            {section === 'waitlist' ? <WaitlistPage /> : null}
            {section === 'orders' ? <OrdersPage /> : null}
          </main>
        </SidebarInset>
      </SidebarProvider>

      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </AdminNavContext.Provider>
  );
}

function FullPage({ children }: { children?: ReactNode }) {
  return (
    <div className="grid min-h-svh place-items-center px-6">
      <div className="flex flex-col items-center gap-2">{children}</div>
    </div>
  );
}
