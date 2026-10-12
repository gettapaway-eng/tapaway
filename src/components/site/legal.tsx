import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logomark } from '@/components/site/logo';

// Shared reading layout for /privacy and /terms: one narrow column, plain
// type, nothing competing with the text.

export const SUPPORT_EMAIL = 'support@tapaway.today';

export function LegalPage({ title, updated, intro, children }: {
  title: string;
  /** Shown as "Last updated …"; change it whenever the text changes. */
  updated: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-svh bg-white text-[var(--ink)]">
      <div className="mx-auto max-w-[42rem] px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <Link href="/" className="focus-ring inline-flex items-center gap-1.5 rounded-md text-[15px] font-semibold">
          <Logomark className="h-5 w-auto [&_path]:fill-[var(--ink)]" />
          tapaway
        </Link>

        <header className="mt-12 border-b border-zinc-200 pb-8 sm:mt-16">
          <h1 className="text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[2.75rem]">{title}</h1>
          <p className="mt-3 text-[14px] text-zinc-500">Last updated {updated}</p>
          <div className="mt-6 text-[17px] leading-[1.65] text-zinc-700">{intro}</div>
        </header>

        <div>{children}</div>

        <footer className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t border-zinc-200 pt-6 text-[14px] text-zinc-500">
          <Link href="/privacy" className="focus-ring rounded hover:text-[var(--ink)]">Privacy</Link>
          <Link href="/terms" className="focus-ring rounded hover:text-[var(--ink)]">Terms</Link>
          <Link href="/account/delete" className="focus-ring rounded hover:text-[var(--ink)]">Delete your account</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="focus-ring rounded hover:text-[var(--ink)]">{SUPPORT_EMAIL}</a>
        </footer>
      </div>
    </main>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-8">
      <h2 className="text-[20px] font-semibold tracking-[-0.015em]">
        <a href={`#${id}`} className="focus-ring rounded hover:underline hover:underline-offset-4">{title}</a>
      </h2>
      <div className="mt-3 space-y-4 text-[16px] leading-[1.7] text-zinc-700">{children}</div>
    </section>
  );
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-zinc-300">{children}</ul>;
}

export function Mail() {
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-[var(--ink)] underline underline-offset-4">
      {SUPPORT_EMAIL}
    </a>
  );
}
