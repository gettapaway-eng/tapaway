'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  Mail,
  Nfc,
  PackageCheck,
  Pencil,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Truck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { DiscreteTabs } from '@/components/registry/discrete-tabs';
import { cn } from '@/lib/utils';
import { useAudit, type AuditRow } from './data';
import { hardwareIdHex } from './format';
import { absoluteLabel, PageHeader, relativeLabel, SearchField, ToolButton, Toolbar } from './ui';

// Who did what, newest first, grouped by day. Read-only by design: the log is
// only useful if nobody can quietly edit it, so there's no RLS policy that
// would let a client change a row.

type Kind = 'all' | 'orders' | 'waitlist' | 'tags' | 'permissions';

const ACTIONS: Record<string, { verb: string; icon: LucideIcon; tone: string; kind: Exclude<Kind, 'all'> }> = {
  'waitlist.removed': { verb: 'deleted', icon: Trash2, tone: 'text-red-500', kind: 'waitlist' },
  'waitlist.restored': { verb: 'restored', icon: RotateCcw, tone: 'text-[var(--tint)]', kind: 'waitlist' },
  'waitlist.deleted': { verb: 'deleted for good', icon: Trash2, tone: 'text-red-600', kind: 'waitlist' },
  'tag.released': { verb: 'released tag', icon: Nfc, tone: 'text-amber-500', kind: 'tags' },
  'provisioner.added': { verb: 'made a provisioner:', icon: ShieldCheck, tone: 'text-emerald-500', kind: 'permissions' },
  'provisioner.removed': { verb: 'removed provisioner:', icon: ShieldOff, tone: 'text-muted-foreground', kind: 'permissions' },
  'order.confirmed': { verb: 'confirmed pre-order', icon: Check, tone: 'text-[var(--tint)]', kind: 'orders' },
  'order.shipped': { verb: 'shipped pre-order', icon: Truck, tone: 'text-[var(--tint)]', kind: 'orders' },
  'order.tracking_updated': { verb: 'updated tracking for', icon: Pencil, tone: 'text-muted-foreground', kind: 'orders' },
  'order.delivered': { verb: 'marked delivered:', icon: PackageCheck, tone: 'text-emerald-500', kind: 'orders' },
  'order.cancelled': { verb: 'cancelled pre-order', icon: XCircle, tone: 'text-red-500', kind: 'orders' },
};
const FALLBACK = { verb: '', icon: Mail, tone: 'text-muted-foreground', kind: 'waitlist' as const };

function describeTarget(row: AuditRow): string {
  if (row.action === 'tag.released' && row.target) {
    return `${hardwareIdHex(row.target)}${row.detail.owner ? ` from ${row.detail.owner}` : ''}`;
  }
  return row.target ?? '';
}

function dayHeading(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function ActivityPage() {
  const audit = useAudit();
  const [kind, setKind] = useState<Kind>('all');
  const [query, setQuery] = useState('');
  const rows = audit.data ?? [];

  const counts = useMemo(() => {
    const result = { orders: 0, waitlist: 0, tags: 0, permissions: 0 };
    for (const row of rows) result[(ACTIONS[row.action] ?? FALLBACK).kind] += 1;
    return result;
  }, [rows]);

  const needle = query.trim().toLowerCase();
  const visible = rows.filter((row) => {
    const meta = ACTIONS[row.action] ?? FALLBACK;
    if (kind !== 'all' && meta.kind !== kind) return false;
    if (!needle) return true;
    return [row.actor_email, row.target, describeTarget(row), ...(row.detail.emails ?? [])].some((value) =>
      value?.toLowerCase().includes(needle),
    );
  });

  const groups = useMemo(() => {
    const result: { heading: string; rows: AuditRow[] }[] = [];
    for (const row of visible) {
      const heading = dayHeading(row.at);
      const last = result[result.length - 1];
      if (last?.heading === heading) last.rows.push(row);
      else result.push({ heading, rows: [row] });
    }
    return result;
  }, [visible]);

  return (
    <>
      <PageHeader title="Activity log" description="Every change made in this admin: who did it, to what, and when.">
        <ToolButton icon="refresh" spinning={audit.isFetching} onClick={() => audit.refetch()}>
          Refresh
        </ToolButton>
      </PageHeader>

      <Toolbar>
        <DiscreteTabs<Kind>
          label="Filter activity"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'all', label: 'All', count: rows.length },
            { value: 'orders', label: 'Pre-orders', count: counts.orders },
            { value: 'waitlist', label: 'Waitlist', count: counts.waitlist },
            { value: 'tags', label: 'Tags', count: counts.tags },
            { value: 'permissions', label: 'Permissions', count: counts.permissions },
          ]}
        />
        <SearchField value={query} onChange={setQuery} placeholder="Search people, emails, tags" />
      </Toolbar>

      <div className="mt-4">
        {audit.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : audit.error ? (
          <p className="rounded-xl border border-border bg-card px-4 py-10 text-center text-red-600 dark:text-red-400">
            Couldn't load the log: {audit.error.message}
          </p>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-4 py-14 text-center">
            <p className="text-[14px] font-semibold">{rows.length === 0 ? 'Nothing logged yet' : 'No activity matches'}</p>
            <p className="mt-1 text-muted-foreground">
              {rows.length === 0
                ? 'Deleting signups, releasing tags and changing provisioners will appear here.'
                : 'Try another filter or search.'}
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.heading} className="mb-5">
              <h2 className="type-caption mb-1.5 px-1 font-medium text-muted-foreground">{group.heading}</h2>
              <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {group.rows.map((row) => (
                  <ActivityRow key={row.id} row={row} />
                ))}
              </ol>
            </section>
          ))
        )}
      </div>
    </>
  );
}

function ActivityRow({ row }: { row: AuditRow }) {
  const [open, setOpen] = useState(false);
  const meta = ACTIONS[row.action] ?? FALLBACK;
  const Icon = meta.icon;
  const emails = row.detail.emails ?? [];
  const expandable = emails.length > 1;

  const body = (
    <>
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-muted">
        <Icon className={cn('size-3.5', meta.tone)} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block">
          <span className="font-medium">{row.actor_email ?? 'Someone'}</span>{' '}
          <span className="text-muted-foreground">{meta.verb || row.action}</span>{' '}
          <span className={cn(row.action === 'tag.released' && 'tabular font-mono text-[12px]')}>{describeTarget(row)}</span>
        </span>
        {expandable && open ? (
          <span className="mt-2 flex flex-wrap gap-1">
            {emails.map((email) => (
              <span key={email} className="rounded-md bg-muted px-1.5 py-0.5 text-[12px] text-muted-foreground">
                {email}
              </span>
            ))}
          </span>
        ) : null}
      </span>
      <span className="type-caption shrink-0 pt-1 text-muted-foreground" title={absoluteLabel(row.at)}>
        {relativeLabel(row.at)}
      </span>
      {expandable ? (
        <ChevronRight
          className={cn('mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-90')}
        />
      ) : null}
    </>
  );

  return (
    <li>
      {expandable ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-start gap-3 px-3.5 py-2.5 text-left outline-none hover:bg-accent/50 focus-visible:bg-accent"
        >
          {body}
        </button>
      ) : (
        <div className="flex items-start gap-3 px-3.5 py-2.5">{body}</div>
      )}
    </li>
  );
}
