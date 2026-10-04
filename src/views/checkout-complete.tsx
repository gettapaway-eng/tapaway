'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ShopHeader } from '@/components/shop/shop-header';
import { useCart } from '@/lib/cart';
import { Confirmation, clearAfterPayment, loadPending, type Placed } from '@/views/checkout';

// Where Dodo's hosted checkout sends people back to. The URL says which order
// (?ref=) and Dodo adds ?payment_id=&status=. Only the server's answer counts:
// it reads the webhook-updated order, or asks Dodo itself.

type State =
  | { kind: 'checking' }
  | { kind: 'paid'; placed: Placed | null }
  | { kind: 'failed' }
  | { kind: 'slow' }
  | { kind: 'missing' };

const POLL_MS = 1500;
const MAX_POLLS = 20; // ~30s before saying "taking longer than usual"

export default function CheckoutComplete() {
  const { clear } = useCart();
  const [state, setState] = useState<State>({ kind: 'checking' });
  const [reference, setReference] = useState('');
  const run = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') ?? '';
    const paymentId = params.get('payment_id') ?? '';
    setReference(ref);
    if (!ref) {
      setState({ kind: 'missing' });
      return;
    }

    const id = ++run.current;
    let polls = 0;
    let timer: number | undefined;

    async function poll() {
      if (id !== run.current) return;
      polls += 1;
      try {
        const query = new URLSearchParams({ ref, ...(paymentId ? { payment_id: paymentId } : {}) });
        const response = await fetch(`/api/orders/status?${query}`, { cache: 'no-store' });
        const body = (await response.json().catch(() => null)) as
          | { ok: true; paymentStatus: 'unpaid' | 'paid' | 'failed' | 'refunded' }
          | { ok: false; error: string }
          | null;
        if (id !== run.current) return;

        if (body?.ok && body.paymentStatus === 'paid') {
          // Read the snapshot before clearing it, then let the cart go.
          const placed = loadPending(ref);
          clearAfterPayment();
          clear();
          setState({ kind: 'paid', placed });
          return;
        }
        if (body?.ok && (body.paymentStatus === 'failed' || body.paymentStatus === 'refunded')) {
          setState({ kind: 'failed' });
          return;
        }
        if (body && !body.ok && (body.error === 'not_found' || body.error === 'invalid_reference')) {
          setState({ kind: 'missing' });
          return;
        }
      } catch {
        // Network blip: keep polling until the budget runs out.
      }
      if (polls >= MAX_POLLS) setState({ kind: 'slow' });
      else timer = window.setTimeout(poll, POLL_MS);
    }

    void poll();
    return () => window.clearTimeout(timer);
  }, [clear]);

  if (state.kind === 'paid' && state.placed) return <Confirmation placed={state.placed} />;

  return (
    <div className="min-h-svh bg-white text-[var(--ink)]">
      <ShopHeader />
      <main className="mx-auto max-w-[27rem] px-4 pb-24 pt-10 sm:pt-16">
        {state.kind === 'checking' ? (
          <Message title="Confirming your deposit…" spinner>
            This takes a few seconds. Keep this page open.
          </Message>
        ) : state.kind === 'paid' ? (
          // Paid, but opened somewhere without the snapshot (another tab or device).
          <Message title="Your tags are reserved">
            Your deposit is paid. Your reference is <Reference value={reference} />, and we’ll email you before
            anything ships.
          </Message>
        ) : state.kind === 'failed' ? (
          <Message
            title="Your payment didn’t go through"
            action={<PrimaryLink href="/checkout?step=review">Try again</PrimaryLink>}
          >
            Nothing was charged, and your details and cart are still saved.
          </Message>
        ) : state.kind === 'slow' ? (
          <Message
            title="Still confirming your payment"
            action={<PrimaryButton onClick={() => window.location.reload()}>Check again</PrimaryButton>}
          >
            This is taking longer than usual. If you paid, your reservation is safe: reference{' '}
            <Reference value={reference} />, and we’ll email you a confirmation.
          </Message>
        ) : (
          <Message title="We couldn’t find that order" action={<PrimaryLink href="/shop">Go to the shop</PrimaryLink>}>
            The link may be incomplete. If you paid a deposit, the confirmation email has your reference.
          </Message>
        )}
      </main>
    </div>
  );
}

function Message({
  title,
  spinner,
  action,
  children,
}: {
  title: string;
  spinner?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="shop-rise">
      {spinner ? (
        <svg className="mb-6 size-6 animate-spin [animation-duration:650ms]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
          <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : null}
      <h1 className="text-[2rem] leading-[1.1] font-semibold tracking-[-0.03em]" aria-live="polite">
        {title}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-pretty text-zinc-600">{children}</p>
      {action ? <div className="mt-7">{action}</div> : null}
    </div>
  );
}

function Reference({ value }: { value: string }) {
  return <span className="tabular font-semibold tracking-[0.04em] text-[var(--ink)]">{value}</span>;
}

const primaryClass =
  'press focus-ring inline-flex h-12 items-center rounded-full bg-[var(--ink)] px-7 text-[15px] font-semibold text-white hover:bg-[#3a3d42]';

function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={primaryClass}>
      {children}
    </Link>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={primaryClass}>
      {children}
    </button>
  );
}
