'use client';

import { useMemo, type ReactNode } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChevronRight, ClipboardList, Mail, Nfc } from 'lucide-react';
import CountUp from '@/components/registry/count-up';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { useAdminNav } from './context';
import { tagStatus, useInventory, useOrders, useUsers, useWaitlist, type InventoryRow } from './data';
import { hardwareIdHex } from './format';
import { TAG_STATUS } from './pages';
import { PageHeader, relativeLabel, absoluteLabel } from './ui';

const DAY = 86_400_000;

export function OverviewPage() {
  const waitlist = useWaitlist();
  const users = useUsers();
  const inventory = useInventory();
  const orders = useOrders();
  const { go, select } = useAdminNav();

  // Deleted signups don't count anywhere on the overview.
  const signups = useMemo(() => (waitlist.data ?? []).filter((row) => !row.removed_at), [waitlist.data]);
  const tags = inventory.data ?? [];
  const preorders = orders.data ?? [];

  const lastWeek = signups.filter((row) => Date.now() - new Date(row.created_at).getTime() < 7 * DAY).length;
  const registered = tags.filter((row) => tagStatus(row) === 'registered').length;
  const reservedTags = preorders.filter((row) => row.status !== 'cancelled').reduce((sum, row) => sum + row.total_tags, 0);

  // Cumulative signups per day, from the first signup to today.
  const growth = useMemo(() => {
    if (signups.length === 0) return [];
    const byDay = new Map<string, number>();
    for (const row of signups) {
      const day = row.created_at.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    const first = new Date(`${[...byDay.keys()].sort()[0]}T00:00:00Z`).getTime();
    const points: GrowthPoint[] = [];
    let total = 0;
    for (let t = first; t <= Date.now(); t += DAY) {
      const key = new Date(t).toISOString().slice(0, 10);
      const joined = byDay.get(key) ?? 0;
      total += joined;
      points.push({ day: key, total, joined });
    }
    return points;
  }, [signups]);

  const activity = useMemo(() => {
    type Item = { at: string; icon: typeof Mail; who: string; what: ReactNode; open: () => void };
    const items: Item[] = [
      ...signups.slice(0, 8).map((row) => ({
        at: row.created_at,
        icon: Mail,
        who: row.email,
        what: row.source === 'autosend' ? 'Joined the waitlist (imported)' : 'Joined the waitlist',
        open: () => go('waitlist'),
      })),
      ...preorders.slice(0, 8).map((row) => ({
        at: row.created_at,
        icon: ClipboardList,
        who: row.full_name,
        what: `Reserved ${row.total_tags} tag${row.total_tags === 1 ? '' : 's'} · ${row.reference}`,
        open: () => select({ kind: 'order', id: row.id }),
      })),
      ...tags
        .filter((row) => row.registered_at && row.owner_email)
        .map((row) => ({
          at: row.registered_at!,
          icon: Nfc,
          who: row.owner_email!,
          what: (
            <>
              Registered <span className="tabular font-mono text-[11px]">{hardwareIdHex(row.hardware_id)}</span>
            </>
          ),
          open: () => select({ kind: 'tag', id: row.hardware_id }),
        })),
    ];
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 7);
  }, [signups, preorders, tags, go, select]);

  const loading = waitlist.isLoading || users.isLoading || inventory.isLoading || orders.isLoading;

  return (
    <>
      <PageHeader title="Overview" />

      {/* One grouped panel, not four floating cards. */}
      <section
        aria-label="Summary"
        className="mt-5 grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-4"
      >
        <Stat
          label="On the waitlist"
          value={signups.length}
          caption={lastWeek > 0 ? `${lastWeek} joined this week` : 'None this week'}
          onClick={() => go('waitlist')}
          loading={loading}
        />
        <Stat
          label="App accounts"
          value={users.data?.length ?? 0}
          caption="Signed in to the iOS app"
          onClick={() => go('users')}
          loading={loading}
        />
        <Stat
          label="Tags registered"
          value={registered}
          caption={`of ${tags.length} provisioned`}
          onClick={() => go('tags')}
          loading={loading}
        />
        <Stat
          label="Tags reserved"
          value={reservedTags}
          caption={`${preorders.length} pre-order${preorders.length === 1 ? '' : 's'}`}
          onClick={() => go('orders')}
          loading={loading}
        />
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel fill title="Waitlist growth" detail={growth.length ? `Since ${absoluteLabel(growth[0].day).split(',')[0]}` : undefined}>
          {growth.length > 1 ? <GrowthChart data={growth} /> : <EmptyNote>Signups will chart here once there are a few.</EmptyNote>}
        </Panel>

        <div className="grid min-w-0 content-start gap-4">
          <Panel title="Tag pipeline" action={<PanelLink onClick={() => go('tags')}>Tags</PanelLink>}>
            <TagPipeline tags={tags} />
          </Panel>

          <Panel title="Recent activity">
            {activity.length === 0 ? (
              <EmptyNote>Nothing yet.</EmptyNote>
            ) : (
              <ul className="-mx-1.5">
                {activity.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={item.open}
                        className="flex w-full items-start gap-2.5 rounded-lg px-1.5 py-1.5 text-left outline-none hover:bg-accent/60 focus-visible:bg-accent"
                      >
                        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                          <Icon className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{item.who}</span>
                          <span className="type-caption block truncate text-muted-foreground">{item.what}</span>
                        </span>
                        <span className="type-caption shrink-0 pt-0.5 text-muted-foreground" title={absoluteLabel(item.at)}>
                          {relativeLabel(item.at)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  caption,
  onClick,
  loading,
}: {
  label: string;
  value: number;
  caption: string;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-start border-border px-5 py-4 text-left outline-none transition-colors duration-100 hover:bg-accent/50 focus-visible:bg-accent [&:not(:last-child)]:border-r max-lg:[&:nth-child(2)]:border-r-0 max-lg:[&:nth-child(-n+2)]:border-b"
    >
      <span className="flex w-full items-center justify-between text-muted-foreground">
        {label}
        <ChevronRight className="size-3.5 opacity-0 transition-opacity duration-100 group-hover:opacity-100" />
      </span>
      <span className="type-large tabular mt-2">
        {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded-md bg-muted align-middle" /> : <CountUp to={value} duration={1.1} />}
      </span>
      <span className="type-caption mt-1 text-muted-foreground">{caption}</span>
    </button>
  );
}

function Panel({
  title,
  detail,
  action,
  children,
  fill,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
  children: ReactNode;
  fill?: boolean;
}) {
  return (
    <section className={cn('min-w-0 rounded-xl border border-border bg-card p-4', fill && 'flex flex-col')}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-semibold">
          {title}
          {detail ? <span className="ml-2 font-normal text-muted-foreground">{detail}</span> : null}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function PanelLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-0.5 rounded text-[12px] font-medium text-[var(--tint)] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--tint)]"
    >
      {children}
      <ChevronRight className="size-3" />
    </button>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-muted-foreground">{children}</p>;
}

interface GrowthPoint {
  day: string;
  total: number;
  joined: number;
}

const growthConfig = {
  total: { label: 'On the waitlist', color: 'var(--tint)' },
} satisfies ChartConfig;

const dayLabel = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { ...options, timeZone: 'UTC' });

/**
 * The hover readout. The total leads, large and tabular, since that's what the
 * line plots; the day's change sits under it, coloured only when it moved.
 */
function GrowthTooltip({ active, payload }: { active?: boolean; payload?: { payload: GrowthPoint }[] }) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;
  return (
    <div className="min-w-[148px] rounded-xl border border-border bg-popover px-3 py-2.5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <p className="type-caption text-muted-foreground">{dayLabel(point.day, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="tabular text-[20px] font-semibold leading-none tracking-[-0.02em]">{point.total}</span>
        <span className="text-muted-foreground">on the waitlist</span>
      </p>
      <p className="type-caption mt-1.5 flex items-center gap-1.5">
        <span
          className={point.joined > 0 ? 'size-1.5 rounded-full bg-[var(--tint)]' : 'size-1.5 rounded-full bg-muted-foreground/40'}
          aria-hidden="true"
        />
        <span className={point.joined > 0 ? 'text-foreground' : 'text-muted-foreground'}>
          {point.joined > 0 ? `+${point.joined} joined that day` : 'No new signups'}
        </span>
      </p>
    </div>
  );
}

function GrowthChart({ data }: { data: GrowthPoint[] }) {
  return (
    <ChartContainer config={growthConfig} className="aspect-auto min-h-[240px] w-full flex-1">
      <AreaChart data={data} margin={{ left: 0, right: 4, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="growth-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-total)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--color-total)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="0" stroke="var(--border)" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          minTickGap={48}
          tickMargin={8}
          tickFormatter={(value: string) => dayLabel(value, { month: 'short', day: 'numeric' })}
        />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} tickMargin={4} />
        <ChartTooltip
          cursor={{ stroke: 'var(--muted-foreground)', strokeOpacity: 0.35, strokeDasharray: '3 3' }}
          isAnimationActive={false}
          offset={14}
          content={<GrowthTooltip />}
        />
        <Area
          dataKey="total"
          type="monotone"
          stroke="var(--color-total)"
          strokeWidth={2}
          fill="url(#growth-fill)"
          isAnimationActive={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)', fill: 'var(--color-total)' }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function TagPipeline({ tags }: { tags: InventoryRow[] }) {
  const total = tags.length;
  const segments = (['registered', 'available', 'unconfirmed'] as const).map((status) => ({
    status,
    count: tags.filter((row) => tagStatus(row) === status).length,
  }));
  const color = { registered: 'bg-emerald-500', available: 'bg-[var(--tint)]', unconfirmed: 'bg-amber-500' } as const;

  if (total === 0) return <EmptyNote>No tags provisioned yet.</EmptyNote>;
  return (
    <div>
      <div className="flex h-2 gap-[2px] overflow-hidden rounded-full bg-muted" role="img" aria-label="Tag status breakdown">
        {segments
          .filter((segment) => segment.count > 0)
          .map((segment) => (
            <span
              key={segment.status}
              className={cn('h-full first:rounded-l-full last:rounded-r-full', color[segment.status])}
              style={{ width: `${(segment.count / total) * 100}%` }}
            />
          ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {segments.map((segment) => (
          <li key={segment.status} className="flex items-center gap-2">
            <span className={cn('size-2 rounded-full', color[segment.status])} aria-hidden="true" />
            <span className="flex-1">{TAG_STATUS[segment.status].label}</span>
            <span className="tabular text-muted-foreground">{segment.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

