import { useState, type ComponentProps, type ReactNode, type SubmitEvent } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Minus, Plus, X } from 'lucide-react';
import { ShopHeader } from '@/components/shop/shop-header';
import { TagStack } from '@/components/shop/tag-turntable';
import { useCart } from '@/lib/cart';
import { cn } from '@/lib/utils';
import { MAX_QUANTITY_PER_PACK, formatPrice } from '../../shared/packs';

const ERROR_COPY: Record<string, string> = {
  invalid_input: 'Some details are missing or too long. Check the highlighted fields and try again.',
  disposable_email: "That looks like a temporary email address. Use one you'll still have when your tags ship.",
  rate_limited: 'Too many pre-orders from this connection in the last hour. Try again later.',
};
const FALLBACK_ERROR = "Your pre-order didn't go through. Check your connection and try again.";

type Field =
  | 'email'
  | 'fullName'
  | 'phone'
  | 'addressLine1'
  | 'addressLine2'
  | 'city'
  | 'region'
  | 'postalCode'
  | 'country'
  | 'notes';

export default function Checkout() {
  const { lines, priced, setQuantity, remove, clear } = useCart();
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ reference: string; email: string } | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'submitting') return;
    setError(null);
    setStatus('submitting');

    const form = new FormData(event.currentTarget);
    const field = (name: Field) => String(form.get(name) ?? '');

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: field('email'),
          fullName: field('fullName'),
          phone: field('phone'),
          addressLine1: field('addressLine1'),
          addressLine2: field('addressLine2'),
          city: field('city'),
          region: field('region'),
          postalCode: field('postalCode'),
          country: field('country'),
          notes: field('notes'),
          items: lines,
          company: form.get('company') ?? undefined,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { ok: true; reference: string }
        | { ok: false; error: string }
        | null;

      if (response.ok && body?.ok) {
        setPlaced({ reference: body.reference, email: field('email') });
        clear();
        window.scrollTo({ top: 0 });
      } else {
        setError((body && !body.ok && ERROR_COPY[body.error]) || FALLBACK_ERROR);
      }
    } catch {
      setError(FALLBACK_ERROR);
    } finally {
      setStatus('idle');
    }
  }

  if (placed) {
    return (
      <Shell>
        <main className="mx-auto max-w-lg px-5 pb-24 pt-10 sm:pt-16">
          <div className="rounded-3xl bg-zinc-100 px-6 pb-8 pt-10 text-center sm:px-10">
            <img
              src={`${import.meta.env.BASE_URL}tag/tag-thumb.webp`}
              alt=""
              className="mx-auto size-24 drop-shadow-[0_6px_12px_rgba(0,0,0,0.12)]"
            />
            <h1 className="mt-6 text-3xl font-medium tracking-tight">Your tags are reserved</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">
              We'll email {placed.email} before anything ships. Nothing has been charged.
            </p>
            <div className="mt-7 rounded-2xl bg-white px-5 py-4">
              <p className="text-[13px] text-zinc-500">Pre-order reference</p>
              <p className="tabular mt-1 text-2xl font-semibold tracking-[0.08em]">{placed.reference}</p>
            </div>
          </div>
          <Link
            href="/"
            className="focus-ring mt-6 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft className="size-4" /> Back to tapaway
          </Link>
        </main>
      </Shell>
    );
  }

  if (priced.lines.length === 0) {
    return (
      <Shell>
        <main className="mx-auto max-w-md px-5 pt-16 text-center sm:pt-24">
          <h1 className="text-3xl font-medium tracking-tight">Your cart is empty</h1>
          <p className="mt-3 text-[15px] text-zinc-600">Choose a pack of tags to reserve.</p>
          <Link
            href="/shop"
            className="press focus-ring mt-8 inline-flex h-12 items-center rounded-full bg-zinc-900 px-7 text-[15px] font-semibold text-white hover:bg-zinc-800"
          >
            Choose tags
          </Link>
        </main>
      </Shell>
    );
  }

  return (
    <Shell>
      <main className="mx-auto grid max-w-6xl gap-10 px-5 pb-24 pt-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
        <form onSubmit={handleSubmit} className="max-w-[36rem]" noValidate={false}>
          <Link
            href="/shop"
            className="focus-ring inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-zinc-500 hover:text-zinc-900"
          >
            <ArrowLeft className="size-4" /> Change packs
          </Link>
          <h1 className="mt-4 text-[2.25rem] leading-tight font-medium tracking-tight">Reserve your tags</h1>
          <p className="mt-2 text-[15px] text-zinc-600">
            No payment today. We'll email you to confirm before anything ships.
          </p>

          <Section title="Where should we email you?">
            <TextField name="email" label="Email" type="email" autoComplete="email" required maxLength={254} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="fullName" label="Full name" autoComplete="name" required maxLength={120} />
              <TextField name="phone" label="Phone" optional type="tel" autoComplete="tel" maxLength={40} />
            </div>
          </Section>

          <Section title="Where should we ship them?">
            <TextField name="addressLine1" label="Street address" autoComplete="address-line1" required maxLength={200} />
            <TextField
              name="addressLine2"
              label="Apartment, suite or floor"
              optional
              autoComplete="address-line2"
              maxLength={200}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="city" label="City" autoComplete="address-level2" required maxLength={100} />
              <TextField name="region" label="State or region" optional autoComplete="address-level1" maxLength={100} />
              <TextField name="postalCode" label="Postal code" autoComplete="postal-code" required maxLength={20} />
              <TextField name="country" label="Country" autoComplete="country-name" required maxLength={56} />
            </div>
          </Section>

          <Section title="Anything we should know?">
            <label className="block">
              <span className="sr-only">Notes</span>
              <textarea
                name="notes"
                maxLength={500}
                rows={3}
                placeholder="Delivery instructions, a gift note…"
                className="focus-ring block w-full resize-y rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-[15px] placeholder:text-zinc-400 hover:border-zinc-300"
              />
            </label>
          </Section>

          {/* Honeypot: hidden from people and screen readers; bots fill it. */}
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute h-0 w-0 opacity-0"
          />

          {error ? (
            <p role="alert" className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="press focus-ring mt-8 h-13 w-full rounded-full bg-zinc-900 px-6 text-[15px] font-semibold text-white hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
          >
            {status === 'submitting' ? 'Reserving…' : `Reserve ${priced.totalTags} tag${priced.totalTags === 1 ? '' : 's'}`}
          </button>
        </form>

        <aside className="h-fit rounded-3xl bg-zinc-100 p-6 lg:sticky lg:top-6" aria-label="Order summary">
          <h2 className="text-[15px] font-semibold">Your order</h2>
          <ul className="mt-4 space-y-2">
            {priced.lines.map((line) => (
              <li key={line.packId} className="flex items-center gap-3 rounded-2xl bg-white p-3">
                <TagStack count={line.tags} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold">{line.name}</p>
                  <p className="tabular text-[12px] text-zinc-500">{formatPrice(line.unitPriceCents)} per pack</p>
                </div>
                <div className="flex items-center">
                  <IconButton
                    label={line.quantity === 1 ? `Remove ${line.name}` : `One fewer ${line.name}`}
                    onClick={() => setQuantity(line.packId, line.quantity - 1)}
                  >
                    <Minus className="size-3.5" />
                  </IconButton>
                  <span className="tabular w-6 text-center text-[14px] font-semibold">{line.quantity}</span>
                  <IconButton
                    label={`One more ${line.name}`}
                    onClick={() => setQuantity(line.packId, line.quantity + 1)}
                    disabled={line.quantity >= MAX_QUANTITY_PER_PACK}
                  >
                    <Plus className="size-3.5" />
                  </IconButton>
                  <IconButton label={`Remove ${line.name}`} onClick={() => remove(line.packId)} className="ml-1">
                    <X className="size-3.5" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>

          <dl className="tabular mt-5 space-y-2 text-[14px]">
            <div className="flex justify-between text-zinc-600">
              <dt>Tags</dt>
              <dd>{priced.totalTags}</dd>
            </div>
            <div className="flex justify-between text-zinc-600">
              <dt>Due today</dt>
              <dd>{formatPrice(0)}</dd>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-3 text-[16px] font-semibold">
              <dt>Total when we ship</dt>
              <dd>{formatPrice(priced.subtotalCents)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[12px] leading-relaxed text-zinc-500">Shipping and taxes are confirmed by email first.</p>
        </aside>
      </main>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-white text-zinc-900">
      <ShopHeader />
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="mt-10 space-y-4">
      <legend className="mb-4 text-[15px] font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function TextField({
  name,
  label,
  optional,
  ...props
}: { name: Field; label: string; optional?: boolean } & Omit<ComponentProps<'input'>, 'name' | 'id'>) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium text-zinc-700">
        {label}
        {optional ? <span className="font-normal text-zinc-400">Optional</span> : null}
      </span>
      <input
        name={name}
        {...props}
        className="focus-ring block h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-[15px] transition-colors duration-150 hover:border-zinc-300 user-invalid:border-red-400"
      />
    </label>
  );
}

function IconButton({
  label,
  className,
  ...props
}: { label: string } & Omit<ComponentProps<'button'>, 'aria-label' | 'type'>) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
      className={cn(
        'press focus-ring grid size-8 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30',
        className,
      )}
    />
  );
}
