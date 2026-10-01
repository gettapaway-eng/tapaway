import type { ComponentProps, KeyboardEvent, ReactNode } from 'react';
import { Download, RotateCw, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// Admin building blocks, styled on the semantic tokens so light and dark both
// follow the OS. This is a tool used many times a day: motion is reserved for
// things that answer an action (press, select, open).

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="type-title">{title}</h1>
        {description ? <p className="mt-1 max-w-xl text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex flex-wrap items-center gap-2">{children}</div>;
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block w-full sm:ml-auto sm:w-60">
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-[30px] w-full rounded-lg border-0 bg-muted pl-8 pr-3 text-[13px] outline-none ring-0 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[var(--tint)]"
      />
    </label>
  );
}

export function ToolButton({
  icon,
  children,
  className,
  spinning,
  ...props
}: { icon?: 'refresh' | 'download'; spinning?: boolean } & ComponentProps<'button'>) {
  const Icon = icon === 'refresh' ? RotateCw : icon === 'download' ? Download : null;
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'press inline-flex h-[30px] items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-[12.5px] font-medium text-foreground shadow-[0_1px_1px_rgba(0,0,0,0.03)] outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-[var(--tint)] disabled:opacity-50',
        className,
      )}
    >
      {Icon ? <Icon className={cn('size-3.5', spinning && 'animate-spin')} /> : null}
      {children}
    </button>
  );
}

const PILL_TONES = {
  green: ['bg-emerald-500/12 text-emerald-700 dark:text-emerald-300', 'bg-emerald-500'],
  blue: ['bg-blue-500/12 text-blue-700 dark:text-blue-300', 'bg-blue-500'],
  amber: ['bg-amber-500/15 text-amber-800 dark:text-amber-300', 'bg-amber-500'],
  gray: ['bg-foreground/[0.07] text-muted-foreground', 'bg-muted-foreground/60'],
  red: ['bg-red-500/12 text-red-700 dark:text-red-300', 'bg-red-500'],
} as const;
export type PillTone = keyof typeof PILL_TONES;

export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  const [pill, dot] = PILL_TONES[tone];
  return (
    <span
      className={cn(
        'inline-flex h-[20px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11.5px] font-medium',
        pill,
      )}
    >
      <span className={cn('size-1.5 rounded-full', dot)} aria-hidden="true" />
      {children}
    </span>
  );
}

export function DataTable({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            {head.map((cell, index) => (
              <th
                key={index}
                scope="col"
                className="type-caption h-8 px-4 font-medium text-muted-foreground last:text-right"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr:last-child]:border-b-0 [&>tr]:border-b [&>tr]:border-border/70">{children}</tbody>
      </table>
    </div>
  );
}

/** A row that opens its detail panel on click or Enter. */
export function Row({
  onOpen,
  selected,
  children,
  label,
}: {
  onOpen?: () => void;
  selected?: boolean;
  children: ReactNode;
  label?: string;
}) {
  if (!onOpen) return <tr>{children}</tr>;
  return (
    <tr
      tabIndex={0}
      aria-label={label}
      aria-selected={selected}
      onClick={onOpen}
      onKeyDown={(event: KeyboardEvent<HTMLTableRowElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        'cursor-default outline-none transition-colors duration-100 hover:bg-accent/60 focus-visible:bg-accent focus-visible:shadow-[inset_2px_0_0_var(--tint)]',
        selected && 'bg-[color-mix(in_oklch,var(--tint)_10%,transparent)] hover:bg-[color-mix(in_oklch,var(--tint)_13%,transparent)]',
      )}
    >
      {children}
    </tr>
  );
}

export function Cell({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('h-11 px-4 align-middle last:text-right', className)} {...props} />;
}

export function SkeletonRows({ columns, rows = 6 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row}>
          {Array.from({ length: columns }, (_, column) => (
            <Cell key={column}>
              <span
                className="block h-3 animate-pulse rounded-full bg-muted"
                style={{ width: `${40 + ((row * 7 + column * 13) % 45)}%` }}
              />
            </Cell>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Empty or failed table body — says what to do next. */
export function TableMessage({
  columns,
  title,
  detail,
  tone = 'neutral',
}: {
  columns: number;
  title: string;
  detail?: string;
  tone?: 'neutral' | 'error';
}) {
  return (
    <tr>
      <td colSpan={columns} className="px-4 py-14 text-center">
        <p className={cn('text-[14px] font-semibold', tone === 'error' ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
          {title}
        </p>
        {detail ? <p className="mx-auto mt-1 max-w-sm text-muted-foreground">{detail}</p> : null}
      </td>
    </tr>
  );
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

export function relativeLabel(value: string): string {
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  if (Math.abs(seconds) < 60) return 'just now';
  const [unit, size] = UNITS.find(([, unitSeconds]) => Math.abs(seconds) >= unitSeconds) ?? ['minute', 60];
  return relative.format(Math.round(seconds / size), unit);
}

export function absoluteLabel(value: string): string {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** "3 days ago", with the exact time on hover. */
export function RelativeTime({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">Never</span>;
  return (
    <time dateTime={value} title={absoluteLabel(value)}>
      {relativeLabel(value)}
    </time>
  );
}
