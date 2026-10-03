import { useMemo, type ReactNode } from 'react';
import { Logomark } from '@/components/site/logo';
import { cn } from '@/lib/utils';
import {
  findCountry,
  flagEmoji,
  formatNational,
  nationalDigits,
  normalizePostal,
  regionsFor,
} from '../../../shared/address';

// The parcel label the checkout is really filling in. It writes itself as
// fields are typed, so the review step is just "read the label". Blank lines
// show as faint rules — a label waiting for a pen — and crossfade to text the
// first time they're filled; typing after that changes text with no motion.

export interface LabelValues {
  fullName: string;
  phoneCountry: string;
  phone: string;
  country: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
}

export function ShippingLabel({
  values,
  reference,
  stamped = false,
  className,
}: {
  values: LabelValues;
  /** Assigned by the server on reserve; until then the code block says so. */
  reference?: string;
  stamped?: boolean;
  className?: string;
}) {
  const country = findCountry(values.country);
  const region = regionsFor(values.country)?.find((entry) => entry.code === values.region)?.name ?? values.region.trim();
  const postal = normalizePostal(values.country, values.postalCode);
  const locality = [values.city.trim(), [region, postal].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const digits = nationalDigits(values.phone);
  const phone = digits ? `+${findCountry(values.phoneCountry)?.dial} ${formatNational(values.phoneCountry, digits)}` : '';

  return (
    <div
      className={cn(
        'relative rounded-[10px] bg-white text-[var(--ink)] shadow-[0_1px_0_rgb(0_0_0/0.04),0_18px_40px_-18px_rgb(18_52_86/0.45)]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold">
          <Logomark className="h-3.5 w-auto [&_path]:fill-[var(--ink)]" />
          tapaway
        </span>
        <span className="text-[12px] text-zinc-400">Pre-order parcel</span>
      </div>

      {/* Perforation between the sender strip and the address block. */}
      <div className="mx-3 border-t border-dashed border-zinc-200" aria-hidden="true" />

      <div className="px-5 pb-4 pt-3.5">
        <p className="text-[12px] text-zinc-400">Deliver to</p>
        <div className="mt-1.5 space-y-[3px] text-[14px] leading-snug">
          <Line value={values.fullName.trim()} width="62%" strong />
          <Line value={values.addressLine1.trim()} width="80%" />
          {values.addressLine2.trim() ? <Line value={values.addressLine2.trim()} width="50%" /> : null}
          <Line value={locality} width="70%" />
          <Line
            value={country ? country.name : ''}
            width="40%"
            leading={country ? <span aria-hidden="true">{flagEmoji(country.code)} </span> : null}
          />
        </div>
        <div className="mt-2.5 text-[13px] text-zinc-500">
          <Line value={phone} width="38%" tabular />
        </div>
      </div>

      <div className="flex items-end justify-between gap-4 rounded-b-[10px] border-t border-zinc-100 px-5 py-3.5">
        <div className="min-w-0">
          <p className="text-[12px] text-zinc-400">Reference</p>
          <p className={cn('tabular mt-0.5 truncate text-[15px] font-semibold tracking-[0.06em]', !reference && 'text-zinc-300')}>
            {reference ?? 'TA-······'}
          </p>
        </div>
        <Barcode seed={reference ?? 'tapaway'} muted={!reference} />
      </div>

      {stamped ? <Stamp /> : null}
    </div>
  );
}

function Line({
  value,
  width,
  strong,
  tabular,
  leading,
}: {
  value: string;
  width: string;
  strong?: boolean;
  tabular?: boolean;
  leading?: ReactNode;
}) {
  // Both layers share one grid cell so the label never reflows between them.
  return (
    <div className="grid min-h-[1.375em] items-center">
      <span
        className={cn(
          'col-start-1 row-start-1 h-[0.55em] rounded-full bg-zinc-100 transition-opacity duration-200 ease-out',
          value ? 'opacity-0' : 'opacity-100',
        )}
        style={{ width }}
        aria-hidden="true"
      />
      <span
        className={cn(
          'col-start-1 row-start-1 break-words transition-opacity duration-200 ease-out',
          value ? 'opacity-100' : 'opacity-0',
          strong && 'font-semibold',
          tabular && 'tabular',
        )}
      >
        {leading}
        {value}
      </span>
    </div>
  );
}

/** Decorative bars, stable for a given seed so the label doesn't flicker. */
function Barcode({ seed, muted }: { seed: string; muted: boolean }) {
  const bars = useMemo(() => {
    let hash = 2166136261;
    for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    const out: { x: number; w: number }[] = [];
    let x = 0;
    while (x < 92) {
      hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
      const w = 1 + (Math.abs(hash) % 3);
      out.push({ x, w });
      x += w + 1 + (Math.abs(hash >> 4) % 2);
    }
    return out;
  }, [seed]);

  return (
    <svg
      viewBox="0 0 92 28"
      className={cn('h-7 w-[92px] shrink-0 transition-opacity duration-300', muted ? 'opacity-20' : 'opacity-90')}
      aria-hidden="true"
    >
      {bars.map((bar) => (
        <rect key={bar.x} x={bar.x} y={0} width={bar.w} height={28} fill="currentColor" />
      ))}
    </svg>
  );
}

function Stamp() {
  return (
    <div
      className="label-stamp pointer-events-none absolute -bottom-3 right-24 grid size-[84px] place-items-center rounded-full bg-white/80 border-[2.5px] border-[var(--leaf)] text-center text-[var(--leaf)]"
      aria-hidden="true"
    >
      <span className="text-[13px] font-extrabold leading-tight tracking-[0.02em]">
        Reserved
        <span className="block text-[10px] font-semibold opacity-80">tapaway</span>
      </span>
    </div>
  );
}
