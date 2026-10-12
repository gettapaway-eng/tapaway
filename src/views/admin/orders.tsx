'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { Check, ExternalLink, Mail, PackageCheck, Pencil, Truck, X, XCircle } from 'lucide-react';
import HoldButton from '@/components/registry/hold-button';
import { DiscreteTabs } from '@/components/registry/discrete-tabs';
import { cn } from '@/lib/utils';
import { CARRIERS, carrierName, findCarrier } from '@shared/carriers';
import { useAdminNav } from './context';
import {
  isCommitted,
  orderStage,
  tagStatus,
  useInventory,
  useOrderAction,
  useOrders,
  usePackedTags,
  type OrderRow,
  type OrderStage,
  type PackedTags,
} from './data';
import { csvDownload, formatPrice, hardwareIdHex } from './format';
import { DetailGroup, DetailRow, Inspector } from './inspector';
import {
  absoluteLabel,
  Cell,
  CopyButton,
  DataTable,
  PageHeader,
  Pill,
  RelativeTime,
  Row,
  SearchField,
  SkeletonRows,
  TableMessage,
  ToolButton,
  Toolbar,
  type PillTone,
} from './ui';

// ---------------------------------------------------------------------------
// Vocabulary. One stage per order (see orderStage in data.ts); every list,
// count and button reads from it, so they can't disagree.
// ---------------------------------------------------------------------------

export const ORDER_STAGE: Record<OrderStage, { label: string; tone: PillTone }> = {
  to_ship: { label: 'To ship', tone: 'amber' },
  shipped: { label: 'Shipped', tone: 'blue' },
  delivered: { label: 'Delivered', tone: 'green' },
  awaiting_payment: { label: 'Awaiting payment', tone: 'gray' },
  payment_failed: { label: 'Payment failed', tone: 'red' },
  cancelled: { label: 'Cancelled', tone: 'gray' },
  refunded: { label: 'Refunded', tone: 'gray' },
};

type Filter = 'to_ship' | 'shipped' | 'delivered' | 'unpaid' | 'cancelled' | 'all';

const inFilter = (row: OrderRow, filter: Filter) => {
  const stage = orderStage(row);
  if (filter === 'all') return true;
  if (filter === 'unpaid') return stage === 'awaiting_payment' || stage === 'payment_failed';
  if (filter === 'cancelled') return stage === 'cancelled' || stage === 'refunded';
  return stage === filter;
};

const tagsLabel = (count: number) => `${count} tag${count === 1 ? '' : 's'}`;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** The most recent thing that happened to an order, for "updated" columns. */
const lastEvent = (row: OrderRow) =>
  row.delivered_at ?? row.cancelled_at ?? row.shipped_at ?? row.paid_at ?? row.created_at;

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export function OrdersPage() {
  const orders = useOrders();
  const packed = usePackedTags().map;
  const { selection, select } = useAdminNav();
  const rows = orders.data ?? [];

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { to_ship: 0, shipped: 0, delivered: 0, unpaid: 0, cancelled: 0, all: rows.length };
    for (const row of rows) {
      for (const filter of ['to_ship', 'shipped', 'delivered', 'unpaid', 'cancelled'] as const) {
        if (inFilter(row, filter)) result[filter] += 1;
      }
    }
    return result;
  }, [rows]);

  // Open on the work: "To ship" when there's something to ship.
  const [filter, setFilter] = useState<Filter | null>(null);
  const activeFilter: Filter = filter ?? (counts.to_ship > 0 ? 'to_ship' : 'all');
  const [query, setQuery] = useState('');

  const visible = rows.filter(
    (row) =>
      inFilter(row, activeFilter) &&
      includes([row.reference, row.email, row.full_name, row.country, row.city, row.tracking_number], query),
  );
  const selected = selection?.kind === 'order' ? rows.find((row) => row.id === selection.id) : undefined;
  const tagsToShip = rows.filter((row) => orderStage(row) === 'to_ship').reduce((sum, row) => sum + row.total_tags, 0);

  return (
    <>
      <PageHeader
        title="Pre-orders"
        description={
          counts.to_ship > 0
            ? `${counts.to_ship} to ship (${tagsLabel(tagsToShip)})${counts.shipped ? ` · ${counts.shipped} on the way` : ''}.`
            : counts.shipped > 0
              ? `Nothing waiting to ship. ${counts.shipped} on the way.`
              : 'Paid pre-orders appear under To ship, ready to send.'
        }
      >
        <ToolButton icon="download" disabled={visible.length === 0} onClick={() => exportCsv(visible)}>
          Export
        </ToolButton>
        <ToolButton icon="refresh" spinning={orders.isFetching} onClick={() => orders.refetch()}>
          Refresh
        </ToolButton>
      </PageHeader>

      <Toolbar>
        <DiscreteTabs<Filter>
          label="Filter by stage"
          value={activeFilter}
          onChange={setFilter}
          options={[
            { value: 'to_ship', label: 'To ship', count: counts.to_ship },
            { value: 'shipped', label: 'Shipped', count: counts.shipped },
            { value: 'delivered', label: 'Delivered', count: counts.delivered },
            { value: 'unpaid', label: 'Unpaid', count: counts.unpaid },
            { value: 'cancelled', label: 'Cancelled', count: counts.cancelled },
            { value: 'all', label: 'All', count: counts.all },
          ]}
        />
        <SearchField value={query} onChange={setQuery} placeholder="Search reference, name, tracking" />
      </Toolbar>

      <DataTable head={['Order', 'Customer', 'Tags', 'Ship to', 'Updated']}>
        {orders.isLoading ? (
          <SkeletonRows columns={5} />
        ) : orders.error ? (
          <TableMessage columns={5} tone="error" title="Couldn't load pre-orders" detail={orders.error.message} />
        ) : visible.length === 0 ? (
          <TableMessage columns={5} title={emptyTitle(activeFilter, rows.length, query)} detail={emptyDetail(activeFilter, rows.length)} />
        ) : (
          visible.map((row) => {
            const stage = ORDER_STAGE[orderStage(row)];
            return (
              <Row
                key={row.id}
                label={`Pre-order ${row.reference}`}
                selected={selected?.id === row.id}
                onOpen={() => select({ kind: 'order', id: row.id })}
              >
                <Cell>
                  <span className="inline-flex items-center gap-2">
                    <span className="tabular font-mono text-[12px] font-semibold">{row.reference}</span>
                    <Pill tone={stage.tone}>{stage.label}</Pill>
                  </span>
                </Cell>
                <Cell>{row.full_name}</Cell>
                <Cell className="tabular">
                  {tagsLabel(row.total_tags)}
                  <span className="ml-2 text-muted-foreground">{formatPrice(row.subtotal_cents, row.currency)}</span>
                </Cell>
                <Cell className="text-muted-foreground">{[row.city, row.country].filter(Boolean).join(', ')}</Cell>
                <Cell className="text-muted-foreground">
                  <RelativeTime value={lastEvent(row)} />
                </Cell>
              </Row>
            );
          })
        )}
      </DataTable>

      <OrderInspector row={selected} packed={packed} onClose={() => select(null)} />
    </>
  );
}

const includes = (haystack: (string | null | undefined)[], needle: string) => {
  const query = needle.trim().toLowerCase();
  return !query || haystack.some((value) => value?.toLowerCase().includes(query));
};

function emptyTitle(filter: Filter, total: number, query: string) {
  if (total === 0) return 'No pre-orders yet';
  if (query.trim()) return 'No pre-orders match';
  return {
    to_ship: 'Nothing to ship',
    shipped: 'Nothing on the way',
    delivered: 'Nothing delivered yet',
    unpaid: 'No unpaid pre-orders',
    cancelled: 'Nothing cancelled',
    all: 'No pre-orders',
  }[filter];
}

function emptyDetail(filter: Filter, total: number) {
  if (total === 0) return 'Pre-orders from /shop appear here once they’re placed.';
  if (filter === 'to_ship') return 'Paid pre-orders land here, ready to pack.';
  return undefined;
}

function exportCsv(rows: OrderRow[]) {
  csvDownload('tapaway-preorders.csv', [
    [
      'reference', 'stage', 'placed', 'paid at', 'shipped at', 'delivered at', 'carrier', 'tracking number',
      'tracking link', 'name', 'email', 'phone', 'address', 'city', 'region', 'postal code', 'country', 'items',
      'tags', 'total', 'paid at pre-order',
    ],
    ...rows.map((row) => [
      row.reference,
      ORDER_STAGE[orderStage(row)].label,
      row.created_at,
      row.paid_at ?? '',
      row.shipped_at ?? '',
      row.delivered_at ?? '',
      carrierName(row.carrier),
      row.tracking_number ?? '',
      row.tracking_url ?? '',
      row.full_name,
      row.email,
      row.phone ?? '',
      [row.address_line1, row.address_line2].filter(Boolean).join(', '),
      row.city,
      row.region ?? '',
      row.postal_code,
      row.country,
      row.items.map((item) => `${item.quantity} × ${item.name}`).join(', '),
      String(row.total_tags),
      formatPrice(row.subtotal_cents, row.currency),
      formatPrice(row.payment_status === 'paid' ? row.deposit_cents : 0, row.currency),
    ]),
  ]);
  toast.success(`Exported ${rows.length} pre-order${rows.length === 1 ? '' : 's'}`);
}

// ---------------------------------------------------------------------------
// Inspector
// ---------------------------------------------------------------------------

function OrderInspector({ row, packed, onClose }: { row: OrderRow | undefined; packed: PackedTags; onClose: () => void }) {
  const stage = row ? ORDER_STAGE[orderStage(row)] : null;
  const parcel = row ? [...packed].filter(([, orderId]) => orderId === row.id).map(([id]) => id) : [];
  const address = row
    ? [row.full_name, row.address_line1, row.address_line2, [row.city, row.region, row.postal_code].filter(Boolean).join(' '), row.country]
        .filter(Boolean)
        .join('\n')
    : '';

  return (
    <Inspector
      open={Boolean(row)}
      onOpenChange={(open) => !open && onClose()}
      title={<span className="tabular font-mono">{row?.reference}</span>}
      subtitle={
        row && stage ? (
          <span className="inline-flex items-center gap-2">
            <Pill tone={stage.tone}>{stage.label}</Pill>
            {row.full_name}
          </span>
        ) : null
      }
      footer={row ? <EmailButton row={row} /> : null}
    >
      {row ? (
        <>
          <Journey row={row} />
          <NextStep key={row.id} row={row} parcel={parcel} packed={packed} />

          {row.tracking_number || parcel.length > 0 ? (
            <DetailGroup title="Shipment">
              {row.tracking_number ? (
                <>
                  <DetailRow label="Carrier">{carrierName(row.carrier)}</DetailRow>
                  <DetailRow label="Tracking number">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="tabular truncate font-mono text-[12px]">{row.tracking_number}</span>
                      <CopyButton text={row.tracking_number} what="Tracking number" />
                    </span>
                  </DetailRow>
                </>
              ) : null}
              <DetailRow label="Tags in parcel">
                {parcel.length > 0 ? (
                  <span className="flex flex-wrap justify-end gap-1">
                    {parcel.map((id) => (
                      <span
                        key={id}
                        className="tabular whitespace-nowrap rounded-md bg-background px-1.5 py-0.5 font-mono text-[11px] ring-1 ring-inset ring-border"
                      >
                        {hardwareIdHex(id)}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not recorded</span>
                )}
              </DetailRow>
            </DetailGroup>
          ) : null}

          <DetailGroup title="Order">
            {row.items.map((item, index) => (
              <DetailRow key={index} label={`${item.quantity} × ${item.name}`}>
                <span className="tabular text-muted-foreground">{tagsLabel(item.quantity * item.tags)}</span>
              </DetailRow>
            ))}
            <DetailRow label="Total">
              <span className="tabular font-semibold">{formatPrice(row.subtotal_cents, row.currency)}</span>
            </DetailRow>
            <DetailRow label="Paid at pre-order">
              <span className="tabular">{formatPrice(row.payment_status === 'paid' ? row.deposit_cents : 0, row.currency)}</span>
            </DetailRow>
            {row.payment_id ? (
              <DetailRow label="Dodo payment">
                <span className="inline-flex items-center gap-1.5">
                  <span className="tabular truncate font-mono text-[12px]">{row.payment_id}</span>
                  <CopyButton text={row.payment_id} what="Payment ID" />
                </span>
              </DetailRow>
            ) : null}
          </DetailGroup>

          <DetailGroup title="Customer">
            <DetailRow label="Email">
              <span className="inline-flex items-center gap-1.5">
                <span className="truncate">{row.email}</span>
                <CopyButton text={row.email} what="Email" />
              </span>
            </DetailRow>
            {row.phone ? <DetailRow label="Phone">{row.phone}</DetailRow> : null}
          </DetailGroup>

          <DetailGroup title="Ship to">
            <div className="flex items-start justify-between gap-3 px-3.5 py-3">
              <address className="whitespace-pre-line not-italic leading-relaxed">{address}</address>
              <CopyButton text={address} what="Address" />
            </div>
          </DetailGroup>

          <CancelOrder row={row} onDone={onClose} />
        </>
      ) : null}
    </Inspector>
  );
}

/**
 * Placed → Paid → Shipped → Delivered as a rail: filled up to where the order
 * is, with the date under each step reached. A cancelled or failed order ends
 * the rail in red where it stopped.
 */
function Journey({ row }: { row: OrderRow }) {
  const stage = orderStage(row);
  const steps: { label: string; at: string | null; state: 'done' | 'stopped' | 'todo' }[] = [
    { label: 'Placed', at: row.created_at, state: 'done' },
    {
      label: stage === 'payment_failed' ? 'Payment failed' : 'Paid',
      at: row.paid_at,
      state: row.payment_status === 'paid' ? 'done' : stage === 'payment_failed' ? 'stopped' : 'todo',
    },
    { label: 'Shipped', at: row.shipped_at, state: row.shipped_at ? 'done' : 'todo' },
    { label: 'Delivered', at: row.delivered_at, state: row.delivered_at ? 'done' : 'todo' },
  ];
  if (stage === 'cancelled') {
    const at = steps.findIndex((step) => step.state === 'todo');
    steps.splice(at === -1 ? steps.length : at, steps.length, { label: 'Cancelled', at: row.cancelled_at, state: 'stopped' });
  }

  return (
    <ol className="mt-1 grid gap-0 px-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, index) => {
        const next = steps[index + 1];
        return (
          <li key={step.label} className="relative min-w-0">
            <div className="flex items-center">
              <span
                className={cn(
                  'relative z-10 grid size-5 shrink-0 place-items-center rounded-full transition-colors duration-200',
                  step.state === 'done' && 'bg-[var(--tint)] text-white',
                  step.state === 'stopped' && 'bg-red-500 text-white',
                  step.state === 'todo' && 'border-[1.5px] border-border bg-background',
                )}
                aria-hidden="true"
              >
                {step.state === 'done' ? <Check className="size-3" strokeWidth={3} /> : null}
                {step.state === 'stopped' ? <X className="size-3" strokeWidth={3} /> : null}
              </span>
              {next ? (
                <span
                  className={cn(
                    'h-[2px] flex-1 rounded-full transition-colors duration-200',
                    next.state === 'done' ? 'bg-[var(--tint)]' : 'bg-border',
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <p className={cn('mt-1.5 truncate pr-2 text-[12px] font-medium', step.state === 'todo' && 'text-muted-foreground')}>
              {step.label}
            </p>
            <p className="tabular truncate pr-2 text-[11px] text-muted-foreground" title={step.at ? absoluteLabel(step.at) : undefined}>
              {step.at && step.state !== 'todo' ? shortDate(step.at) : '—'}
            </p>
            <span className="sr-only">{step.state === 'done' ? 'done' : step.state === 'stopped' ? 'stopped' : 'not yet'}</span>
          </li>
        );
      })}
    </ol>
  );
}

const primaryButton =
  'press inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--tint)] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40';
const quietButton =
  'press inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium text-foreground outline-none hover:bg-foreground/[0.06] focus-visible:ring-2 focus-visible:ring-[var(--tint)] disabled:pointer-events-none disabled:opacity-40';

const STEP_SURFACE: Record<OrderStage, string> = {
  to_ship: 'bg-amber-500/[0.09] ring-amber-500/25',
  shipped: 'bg-[var(--tint)]/[0.08] ring-[var(--tint)]/25',
  delivered: 'bg-emerald-500/[0.08] ring-emerald-500/25',
  awaiting_payment: 'bg-muted/70 ring-border',
  payment_failed: 'bg-red-500/[0.07] ring-red-500/20',
  cancelled: 'bg-muted/70 ring-border',
  refunded: 'bg-muted/70 ring-border',
};

/**
 * The one card that says where the order stands and offers the next action —
 * at most one primary button. "Ship order" turns the card itself into the
 * shipment form, so the action never jumps somewhere else on the panel.
 */
function NextStep({ row, parcel, packed }: { row: OrderRow; parcel: string[]; packed: PackedTags }) {
  const stage = orderStage(row);
  const action = useOrderAction();
  const [editing, setEditing] = useState<'ship' | 'update_tracking' | null>(null);

  function deliver() {
    action.mutate(
      { action: 'deliver', orderId: row.id },
      {
        onSuccess: () => toast.success('Marked delivered', { description: row.reference }),
        onError: (error) => toast.error('Couldn’t mark it delivered', { description: error.message }),
      },
    );
  }

  const content: { title: string; body: ReactNode; actions?: ReactNode } = (() => {
    switch (stage) {
      case 'to_ship':
        return {
          title: 'Ready to ship',
          body: (
            <>
              {tagsLabel(row.total_tags)} to {row.city}, {row.country}. Paid {row.paid_at ? shortDate(row.paid_at) : ''}.
            </>
          ),
          actions: (
            <button type="button" className={primaryButton} onClick={() => setEditing('ship')}>
              <Truck className="size-4" /> Ship order
            </button>
          ),
        };
      case 'shipped':
        return {
          title: 'On its way',
          body: (
            <>
              Sent with {carrierName(row.carrier)}
              {row.shipped_at ? ` on ${shortDate(row.shipped_at)}` : ''}. Mark it delivered once tracking shows it arrived.
            </>
          ),
          actions: (
            <>
              <button type="button" className={primaryButton} disabled={action.isPending} onClick={deliver}>
                <PackageCheck className="size-4" /> {action.isPending ? 'Saving…' : 'Mark delivered'}
              </button>
              {row.tracking_url ? <TrackLink href={row.tracking_url} /> : null}
              <button
                type="button"
                className={quietButton}
                title="Edit shipment"
                onClick={() => setEditing('update_tracking')}
              >
                <Pencil className="size-3.5" /> Edit
              </button>
            </>
          ),
        };
      case 'delivered':
        return {
          title: `Delivered ${row.delivered_at ? shortDate(row.delivered_at) : ''}`,
          body: <>Nothing left to do. The $5 was taken at pre-order.</>,
          actions: (
            <>
              {row.tracking_url ? <TrackLink href={row.tracking_url} /> : null}
              <button type="button" className={quietButton} onClick={() => setEditing('update_tracking')}>
                <Pencil className="size-3.5" /> Edit shipment
              </button>
            </>
          ),
        };
      case 'awaiting_payment':
        return {
          title: 'Waiting for payment',
          body: <>The customer left before paying the $5, so there’s nothing to ship. It moves to To ship if they pay.</>,
        };
      case 'payment_failed':
        return {
          title: 'Payment failed',
          body: <>Dodo declined the $5 and nothing was charged. There’s nothing to ship unless they pre-order again.</>,
        };
      case 'refunded':
        return { title: 'Refunded', body: <>The $5 was refunded. Nothing to ship.</> };
      case 'cancelled':
        return {
          title: `Cancelled ${row.cancelled_at ? shortDate(row.cancelled_at) : ''}`,
          body:
            row.payment_status === 'paid' ? (
              <>If you haven’t yet, refund the $5 in Dodo Payments.</>
            ) : (
              <>Nothing was paid, so there’s nothing to refund.</>
            ),
        };
    }
  })();

  return (
    <section className={cn('mt-5 overflow-hidden rounded-2xl ring-1 ring-inset', STEP_SURFACE[editing ? 'awaiting_payment' : stage])}>
      <AnimatePresence mode="popLayout" initial={false}>
        {editing ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, filter: 'blur(2px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(2px)' }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            <ShipmentForm
              row={row}
              mode={editing}
              parcel={parcel}
              packed={packed}
              onCancel={() => setEditing(null)}
              onSaved={() => setEditing(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="summary"
            className="p-4"
            initial={{ opacity: 0, filter: 'blur(2px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(2px)' }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{content.title}</h3>
            <p className="mt-1 leading-relaxed text-muted-foreground">{content.body}</p>
            {content.actions ? <div className="mt-3.5 flex flex-wrap items-center gap-1.5">{content.actions}</div> : null}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function TrackLink({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={quietButton}>
      Track <ExternalLink className="size-3.5" />
    </a>
  );
}

const fieldClass =
  'block h-9 w-full rounded-[10px] border border-border bg-background px-3 text-[13px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 focus-visible:border-[var(--tint)] focus-visible:shadow-[0_0_0_3px_color-mix(in_oklch,var(--tint)_22%,transparent)]';

/**
 * The shipment itself, in the order you do it at the packing table: who's
 * carrying it, its tracking number, and which tags went in the box.
 */
function ShipmentForm({
  row,
  mode,
  parcel,
  packed,
  onCancel,
  onSaved,
}: {
  row: OrderRow;
  mode: 'ship' | 'update_tracking';
  parcel: string[];
  packed: PackedTags;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const action = useOrderAction();
  const inventory = useInventory();

  // Tags that can go in this box: free stock, plus whatever's already in it.
  const choices = useMemo(() => {
    const free = (inventory.data ?? [])
      .filter((tag) => tagStatus(tag, packed) === 'available' || parcel.includes(tag.hardware_id))
      .sort((a, b) => a.provisioned_at.localeCompare(b.provisioned_at));
    return free.map((tag) => tag.hardware_id);
  }, [inventory.data, packed, parcel]);

  const [carrier, setCarrier] = useState(row.carrier ?? CARRIERS[0].id);
  const [trackingNumber, setTrackingNumber] = useState(row.tracking_number ?? '');
  const [customUrl, setCustomUrl] = useState<string | null>(row.tracking_url);
  const [editingUrl, setEditingUrl] = useState(false);
  // Preselect: the tags already packed, or the oldest free ones up to the order's count.
  const [picked, setPicked] = useState<string[] | null>(parcel.length > 0 ? parcel : null);
  const selected = picked ?? choices.slice(0, row.total_tags);

  const template = findCarrier(carrier)?.track;
  const suggestedUrl = template && trackingNumber.trim() ? template(trackingNumber.trim()) : '';
  const trackingUrl = customUrl ?? suggestedUrl;
  const urlValid = trackingUrl === '' || /^https:\/\/\S+$/.test(trackingUrl);
  const ready = trackingNumber.trim().length >= 3 && urlValid && !action.isPending;
  const short = row.total_tags - selected.length;

  function toggle(id: string) {
    setPicked((current) => {
      const base = current ?? selected;
      if (base.includes(id)) return base.filter((value) => value !== id);
      return base.length >= row.total_tags ? base : [...base, id];
    });
  }

  function submit() {
    if (!ready) return;
    action.mutate(
      {
        action: mode,
        orderId: row.id,
        carrier,
        trackingNumber: trackingNumber.trim(),
        trackingUrl: trackingUrl.trim(),
        hardwareIds: selected,
      },
      {
        onSuccess: () => {
          toast.success(mode === 'ship' ? 'Order shipped' : 'Shipment updated', { description: row.reference });
          onSaved();
        },
        onError: (error) => toast.error('Couldn’t save the shipment', { description: error.message }),
      },
    );
  }

  return (
    <form
      className="p-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{mode === 'ship' ? 'Ship order' : 'Edit shipment'}</h3>
        <span className="text-[12px] text-muted-foreground">{tagsLabel(row.total_tags)} to {row.city}</span>
      </div>

      <FormStep n={1} label="Carrier">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Carrier">
          {CARRIERS.map((option) => {
            const active = option.id === carrier;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setCarrier(option.id);
                  setCustomUrl(null);
                }}
                className={cn(
                  'press h-8 rounded-full px-3 text-[12px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--tint)]',
                  active
                    ? 'bg-foreground text-background'
                    : 'bg-background text-foreground ring-1 ring-inset ring-border hover:ring-foreground/30',
                )}
              >
                {option.name}
              </button>
            );
          })}
        </div>
      </FormStep>

      <FormStep n={2} label="Tracking number">
        <input
          autoFocus
          value={trackingNumber}
          onChange={(event) => setTrackingNumber(event.target.value)}
          placeholder="e.g. 1490810023451"
          spellCheck={false}
          autoCapitalize="characters"
          maxLength={64}
          className={cn(fieldClass, 'tabular h-10 font-mono text-[14px] tracking-wide')}
        />
        <div className="mt-1.5 flex min-h-5 items-center gap-1.5 text-[12px] text-muted-foreground">
          {editingUrl || (!template && customUrl === null) ? (
            <input
              type="url"
              inputMode="url"
              value={trackingUrl}
              onChange={(event) => setCustomUrl(event.target.value)}
              placeholder={template ? 'https://' : 'Paste the tracking link from the carrier (optional)'}
              spellCheck={false}
              maxLength={500}
              aria-label="Tracking link"
              aria-invalid={!urlValid || undefined}
              className={cn(fieldClass, 'h-8 text-[12px]', !urlValid && 'border-red-400')}
            />
          ) : trackingUrl ? (
            <>
              <span className="min-w-0 flex-1 truncate">Links to {trackingUrl.replace(/^https:\/\//, '')}</span>
              <button
                type="button"
                onClick={() => setEditingUrl(true)}
                className="shrink-0 font-medium text-[var(--tint)] outline-none hover:underline focus-visible:underline"
              >
                Change
              </button>
            </>
          ) : (
            <span>The tracking link fills in from the number.</span>
          )}
        </div>
        {!urlValid ? <p className="mt-1 text-[12px] text-red-600 dark:text-red-400">Use a full link starting with https://</p> : null}
      </FormStep>

      <FormStep n={3} label="Tags in this parcel" hint={`${selected.length} of ${row.total_tags}`}>
        {inventory.isLoading ? (
          <p className="text-muted-foreground">Loading inventory…</p>
        ) : choices.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-amber-700 dark:text-amber-400">
            No free tags in inventory. You can still ship and record the tags later from Edit shipment.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {choices.map((id) => {
              const on = selected.includes(id);
              const full = !on && selected.length >= row.total_tags;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  disabled={full}
                  onClick={() => toggle(id)}
                  className={cn(
                    'press tabular inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 font-mono text-[11px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--tint)] disabled:cursor-default disabled:opacity-55',
                    on
                      ? 'bg-[var(--tint)] text-white'
                      : 'bg-background text-foreground ring-1 ring-inset ring-border hover:ring-foreground/30',
                  )}
                >
                  {on ? <Check className="size-3" strokeWidth={3} /> : null}
                  {hardwareIdHex(id)}
                </button>
              );
            })}
          </div>
        )}
        {choices.length > 0 && short > 0 ? (
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            {short === row.total_tags ? 'No tags picked' : `${short} more to pick`} — fine if you’re recording them later.
          </p>
        ) : null}
      </FormStep>

      <div className="mt-4 flex items-center gap-1.5">
        <button type="submit" className={cn(primaryButton, 'flex-1')} disabled={!ready}>
          {action.isPending ? 'Saving…' : mode === 'ship' ? (
            <>
              <Truck className="size-4" /> Ship order
            </>
          ) : (
            'Save shipment'
          )}
        </button>
        <button type="button" className={quietButton} disabled={action.isPending} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function FormStep({ n, label, hint, children }: { n: number; label: string; hint?: string; children: ReactNode }) {
  return (
    // min-w-0: a fieldset otherwise refuses to shrink below its longest line
    // (the tracking link), pushing the form out of the card.
    <fieldset className="mt-4 min-w-0">
      <legend className="mb-2 flex w-full items-center gap-2 text-[12px] font-medium">
        <span className="tabular grid size-[18px] place-items-center rounded-full bg-foreground/[0.08] text-[11px] font-semibold">
          {n}
        </span>
        <span className="flex-1">{label}</span>
        {hint ? <span className="tabular font-normal text-muted-foreground">{hint}</span> : null}
      </legend>
      {children}
    </fieldset>
  );
}

/** Calling an order off is rare and can't be undone here: a hold, kept out of the way. */
function CancelOrder({ row, onDone }: { row: OrderRow; onDone: () => void }) {
  const action = useOrderAction();
  const cancellable = row.status === 'pending' || row.status === 'confirmed';
  if (!cancellable) return null;

  return (
    <section className="mt-6">
      {/* Red-tinted so it reads as a control at rest, and as destructive;
          it fills solid red while held. */}
      <HoldButton
        size="md"
        radius={12}
        holdTime={1200}
        disabled={action.isPending}
        backgroundColor="color-mix(in oklch, #e5484d 14%, var(--background))"
        textColor="#e5484d"
        icon={<XCircle className="size-4" />}
        fillColor="#e5484d"
        fillTextColor="#ffffff"
        glow={false}
        wave={false}
        resetAfter={0}
        doneLabel="Cancelled"
        className="w-full"
        onHold={() =>
          action.mutate(
            { action: 'cancel', orderId: row.id },
            {
              onSuccess: () => {
                toast.success('Order cancelled', { description: row.reference });
                onDone();
              },
              onError: (error) => toast.error('Couldn’t cancel the order', { description: error.message }),
            },
          )
        }
      >
        Hold to cancel order
      </HoldButton>
      <p className="mt-1.5 text-center text-[12px] text-muted-foreground">
        {isCommitted(row)
          ? 'Cancelling doesn’t refund the $5 — refund it in Dodo Payments.'
          : 'Nothing was paid on this order.'}
      </p>
    </section>
  );
}

/**
 * Emails stay hand-written and sent from your own mail app. Once an order has
 * shipped, the draft opens with the carrier and tracking details filled in.
 */
function EmailButton({ row }: { row: OrderRow }) {
  const first = row.full_name.split(' ')[0];
  const shipped = (row.status === 'shipped' || row.status === 'delivered') && row.tracking_number;
  const subject = shipped ? `Your tapaway pre-order ${row.reference} has shipped` : `Your tapaway pre-order ${row.reference}`;
  const body = shipped
    ? [
        `Hi ${first},`,
        '',
        `Your tapaway pre-order ${row.reference} is on its way.`,
        '',
        `Carrier: ${carrierName(row.carrier)}`,
        `Tracking number: ${row.tracking_number}`,
        ...(row.tracking_url ? [`Track it: ${row.tracking_url}`] : []),
        '',
        '— tapaway',
      ].join('\n')
    : `Hi ${first},\n\n`;

  return (
    <a
      href={`mailto:${row.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
      className="press flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-muted text-[13px] font-semibold text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-[var(--tint)]"
    >
      <Mail className="size-4" /> {shipped ? `Send shipping email to ${first}` : `Email ${first}`}
    </a>
  );
}
