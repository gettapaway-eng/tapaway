'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Mail } from 'lucide-react';
import HoldButton from '@/components/registry/hold-button';
import { DiscreteTabs } from '@/components/registry/discrete-tabs';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useAdminNav } from './context';
import {
  tagStatus,
  useInventory,
  useOrders,
  useReleaseTag,
  useSetProvisioner,
  useUsers,
  type InventoryRow,
  type OrderRow,
  type TagStatus,
  type UserRow,
} from './data';
import { csvDownload, formatPrice, hardwareIdHex } from './format';
import { DetailGroup, DetailRow, Inspector } from './inspector';
import {
  absoluteLabel,
  Cell,
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

const includes = (haystack: (string | null | undefined)[], needle: string) => {
  const query = needle.trim().toLowerCase();
  return !query || haystack.some((value) => value?.toLowerCase().includes(query));
};

function copy(text: string, what: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${what} copied`),
    () => toast.error(`Couldn't copy ${what.toLowerCase()}`),
  );
}

function CopyButton({ text, what }: { text: string; what: string }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        copy(text, what);
      }}
      className="press -mr-1 grid size-6 place-items-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--tint)]"
      aria-label={`Copy ${what.toLowerCase()}`}
    >
      <Copy className="size-3.5" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export const TAG_STATUS: Record<TagStatus, { label: string; tone: PillTone }> = {
  registered: { label: 'Registered', tone: 'green' },
  available: { label: 'Available', tone: 'blue' },
  unconfirmed: { label: 'Unconfirmed', tone: 'amber' },
};

export function TagsPage() {
  const inventory = useInventory();
  const { selection, select, role, email } = useAdminNav();
  const isAdmin = role === 'admin';
  const [filter, setFilter] = useState<'all' | TagStatus>('all');
  const [query, setQuery] = useState('');

  const rows = inventory.data ?? [];
  const counts = useMemo(() => {
    const result = { registered: 0, available: 0, unconfirmed: 0 };
    for (const row of rows) result[tagStatus(row)] += 1;
    return result;
  }, [rows]);
  const visible = rows.filter(
    (row) =>
      (filter === 'all' || tagStatus(row) === filter) &&
      includes([hardwareIdHex(row.hardware_id), row.owner_email, row.tag_name], query),
  );
  const selected = selection?.kind === 'tag' ? rows.find((row) => row.hardware_id === selection.id) : undefined;

  return (
    <>
      <PageHeader
        title="Tags"
        description={
          isAdmin
            ? 'Every tag provisioned from the iOS debug menu. Select one to see who owns it or release it.'
            : 'Every tag provisioned so far, and whether it has been confirmed and registered.'
        }
      >
        <ToolButton icon="refresh" spinning={inventory.isFetching} onClick={() => inventory.refetch()}>
          Refresh
        </ToolButton>
      </PageHeader>

      <MyProvisioning rows={rows} email={email} prominent={!isAdmin} />

      <Toolbar>
        <DiscreteTabs<'all' | TagStatus>
          label="Filter by status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: rows.length },
            { value: 'registered', label: 'Registered', count: counts.registered },
            { value: 'available', label: 'Available', count: counts.available },
            { value: 'unconfirmed', label: 'Unconfirmed', count: counts.unconfirmed },
          ]}
        />
        <SearchField value={query} onChange={setQuery} placeholder={isAdmin ? 'Search ID, owner, tag name' : 'Search hardware ID'} />
      </Toolbar>

      <DataTable head={['Hardware ID', 'Status', isAdmin ? 'Owner' : 'Registered', 'Provisioned']}>
        {inventory.isLoading ? (
          <SkeletonRows columns={4} />
        ) : inventory.error ? (
          <TableMessage columns={4} tone="error" title="Couldn't load tags" detail={inventory.error.message} />
        ) : visible.length === 0 ? (
          <TableMessage
            columns={4}
            title={rows.length === 0 ? 'No tags provisioned yet' : 'No tags match'}
            detail={
              rows.length === 0
                ? 'Provision blank tags from the iOS app: debug menu → Provision blank tags.'
                : 'Try another filter or search.'
            }
          />
        ) : (
          visible.map((row) => {
            const status = TAG_STATUS[tagStatus(row)];
            return (
              <Row
                key={row.hardware_id}
                label={`Tag ${hardwareIdHex(row.hardware_id)}`}
                selected={selected?.hardware_id === row.hardware_id}
                onOpen={() => select({ kind: 'tag', id: row.hardware_id })}
              >
                <Cell className="tabular font-mono text-[12px]">{hardwareIdHex(row.hardware_id)}</Cell>
                <Cell>
                  <Pill tone={status.tone}>{status.label}</Pill>
                </Cell>
                <Cell>
                  {isAdmin ? (
                    <>
                      {row.owner_email ?? <span className="text-muted-foreground">—</span>}
                      {row.tag_name ? <span className="ml-2 text-muted-foreground">{row.tag_name}</span> : null}
                    </>
                  ) : row.owner_user_id ? (
                    <span className="text-muted-foreground">
                      Yes{row.registered_at ? <> · <RelativeTime value={row.registered_at} /></> : null}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </Cell>
                <Cell className="text-muted-foreground">
                  <RelativeTime value={row.provisioned_at} />
                </Cell>
              </Row>
            );
          })
        )}
      </DataTable>

      <TagInspector row={selected} canManage={isAdmin} onClose={() => select(null)} />
    </>
  );
}

/**
 * "How am I doing?" for whoever is signed in: tags they provisioned today and
 * in total, and any of theirs stuck unconfirmed (present those to the
 * provisioner again). Prominent for provisioners — it's their main question —
 * and only shown to admins once they've provisioned something themselves.
 */
function MyProvisioning({ rows, email, prominent }: { rows: InventoryRow[]; email: string; prominent: boolean }) {
  const mine = rows.filter((row) => row.provisioned_by_email === email);
  if (!prominent && mine.length === 0) return null;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const today = mine.filter((row) => new Date(row.provisioned_at) >= startOfDay && row.confirmed_at).length;
  const confirmed = mine.filter((row) => row.confirmed_at).length;
  const stuck = mine.filter((row) => !row.confirmed_at).length;

  const cells = [
    { label: 'Provisioned today', value: today, caption: 'Confirmed tags' },
    { label: 'Provisioned in total', value: confirmed, caption: `By ${email}` },
    {
      label: 'Need another pass',
      value: stuck,
      caption: stuck ? 'Present these to the provisioner again' : 'Nothing stuck',
      warn: stuck > 0,
    },
  ];

  return (
    <section
      aria-label="Your provisioning"
      className="mt-5 grid grid-cols-3 overflow-hidden rounded-xl border border-border bg-card"
    >
      {cells.map((cell) => (
        <div key={cell.label} className="border-border px-5 py-3.5 [&:not(:last-child)]:border-r">
          <p className="text-muted-foreground">{cell.label}</p>
          <p className={cn('type-large tabular mt-1.5', cell.warn && 'text-amber-600 dark:text-amber-400')}>{cell.value}</p>
          <p className="type-caption mt-0.5 truncate text-muted-foreground">{cell.caption}</p>
        </div>
      ))}
    </section>
  );
}

function TagInspector({
  row,
  canManage,
  onClose,
}: {
  row: InventoryRow | undefined;
  /** Admins see the owner and can release; provisioners get a read-only view. */
  canManage: boolean;
  onClose: () => void;
}) {
  const release = useReleaseTag();
  const status = row ? TAG_STATUS[tagStatus(row)] : null;
  const hex = row ? hardwareIdHex(row.hardware_id) : '';

  return (
    <Inspector
      open={Boolean(row)}
      onOpenChange={(open) => !open && onClose()}
      title={<span className="tabular font-mono text-[14px]">{hex}</span>}
      subtitle={status ? <Pill tone={status.tone}>{status.label}</Pill> : null}
      footer={
        canManage && row?.owner_user_id ? (
          <div>
            <HoldButton
              size="md"
              radius={12}
              holdTime={1200}
              backgroundColor="color-mix(in oklch, var(--foreground) 6%, var(--background))"
              textColor="var(--foreground)"
              fillColor="#e5484d"
              fillTextColor="#ffffff"
              glow={false}
              wave={false}
              resetAfter={0}
              doneLabel="Released"
              doneIcon={<Check className="size-4" />}
              className="w-full"
              onHold={() =>
                release.mutate(row.hardware_id, {
                  onSuccess: () => {
                    toast.success('Tag released', { description: `${hex} can be registered by anyone now.` });
                    onClose();
                  },
                  onError: (error) => toast.error("Couldn't release tag", { description: error.message }),
                })
              }
            >
              Hold to release from {row.owner_email ?? 'owner'}
            </HoldButton>
            <p className="type-caption mt-2 text-center text-muted-foreground">
              Their app stops recognising it. The next person to register it becomes its owner.
            </p>
          </div>
        ) : null
      }
    >
      {row ? (
        <>
          <DetailGroup title={canManage ? 'Ownership' : 'Registration'}>
            {canManage ? (
              <DetailRow label="Owner">{row.owner_email ?? <span className="text-muted-foreground">Nobody</span>}</DetailRow>
            ) : (
              <DetailRow label="Registered">{row.owner_user_id ? 'Yes' : 'Not yet'}</DetailRow>
            )}
            {canManage && row.tag_name ? <DetailRow label="Named">{row.tag_name}</DetailRow> : null}
            {row.registered_at ? (
              <DetailRow label="Last updated">
                <RelativeTime value={row.registered_at} />
              </DetailRow>
            ) : null}
          </DetailGroup>
          <DetailGroup title="Provisioning">
            <DetailRow label="Hardware ID">
              <span className="inline-flex items-center gap-1.5">
                <span className="tabular font-mono text-[12px]">{hex}</span>
                <CopyButton text={hex} what="Hardware ID" />
              </span>
            </DetailRow>
            <DetailRow label="Started">{absoluteLabel(row.provisioned_at)}</DetailRow>
            <DetailRow label="Confirmed">
              {row.confirmed_at ? absoluteLabel(row.confirmed_at) : <span className="text-amber-600 dark:text-amber-400">Not yet</span>}
            </DetailRow>
            {row.provisioned_by_email ? <DetailRow label="By">{row.provisioned_by_email}</DetailRow> : null}
          </DetailGroup>
          {!row.confirmed_at ? (
            <p className="mt-3 px-1 text-muted-foreground">
              Provisioning started but was never verified. Present this tag to the provisioner again — it picks up where
              it left off.
            </p>
          ) : null}
        </>
      ) : null}
    </Inspector>
  );
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export function UsersPage() {
  const users = useUsers();
  const { selection, select } = useAdminNav();
  const [filter, setFilter] = useState<'all' | 'tags' | 'provisioners'>('all');
  const [query, setQuery] = useState('');
  const rows = users.data ?? [];
  const visible = rows.filter(
    (row) =>
      (filter === 'all' || (filter === 'tags' ? row.live_tag_count > 0 : row.is_provisioner)) &&
      includes([row.email], query),
  );
  const selected = selection?.kind === 'user' ? rows.find((row) => row.id === selection.id) : undefined;

  return (
    <>
      <PageHeader title="Users" description="Accounts created by signing in to the iOS app.">
        <ToolButton icon="refresh" spinning={users.isFetching} onClick={() => users.refetch()}>
          Refresh
        </ToolButton>
      </PageHeader>

      <Toolbar>
        <DiscreteTabs<'all' | 'tags' | 'provisioners'>
          label="Filter users"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: rows.length },
            { value: 'tags', label: 'With tags', count: rows.filter((row) => row.live_tag_count > 0).length },
            { value: 'provisioners', label: 'Provisioners', count: rows.filter((row) => row.is_provisioner).length },
          ]}
        />
        <SearchField value={query} onChange={setQuery} placeholder="Search by email" />
      </Toolbar>

      <DataTable head={['Email', 'Tags', 'Joined', 'Last sign-in', 'Roles']}>
        {users.isLoading ? (
          <SkeletonRows columns={5} />
        ) : users.error ? (
          <TableMessage columns={5} tone="error" title="Couldn't load users" detail={users.error.message} />
        ) : visible.length === 0 ? (
          <TableMessage
            columns={5}
            title={rows.length === 0 ? 'No accounts yet' : 'No users match'}
            detail={rows.length === 0 ? 'Accounts appear here after someone signs in to the app.' : undefined}
          />
        ) : (
          visible.map((row) => (
            <Row
              key={row.id}
              label={row.email ?? 'User'}
              selected={selected?.id === row.id}
              onOpen={() => select({ kind: 'user', id: row.id })}
            >
              <Cell>{row.email ?? '—'}</Cell>
              <Cell className="tabular">{row.live_tag_count}</Cell>
              <Cell className="text-muted-foreground">
                <RelativeTime value={row.created_at} />
              </Cell>
              <Cell className="text-muted-foreground">
                <RelativeTime value={row.last_sign_in_at} />
              </Cell>
              <Cell>
                <span className="inline-flex flex-wrap justify-end gap-1">
                  {row.is_admin ? <Pill tone="gray">Admin</Pill> : null}
                  {row.is_provisioner ? <Pill tone="blue">Provisioner</Pill> : null}
                </span>
              </Cell>
            </Row>
          ))
        )}
      </DataTable>

      <UserInspector row={selected} onClose={() => select(null)} />
    </>
  );
}

function UserInspector({
  row,
  onClose,
}: {
  row: UserRow | undefined;
  onClose: () => void;
}) {
  const setProvisioner = useSetProvisioner();
  const inventory = useInventory();
  const { select } = useAdminNav();
  const ownedTags = (inventory.data ?? []).filter((tag) => row && tag.owner_user_id === row.id);

  return (
    <Inspector
      open={Boolean(row)}
      onOpenChange={(open) => !open && onClose()}
      title={row?.email ?? 'User'}
      subtitle={row ? <>Joined {absoluteLabel(row.created_at)}</> : null}
    >
      {row ? (
        <>
          <DetailGroup title="Account">
            <DetailRow label="Email">
              <span className="inline-flex items-center gap-1.5">
                <span className="truncate">{row.email}</span>
                {row.email ? <CopyButton text={row.email} what="Email" /> : null}
              </span>
            </DetailRow>
            <DetailRow label="Last sign-in">
              <RelativeTime value={row.last_sign_in_at} />
            </DetailRow>
            <DetailRow label="Admin">{row.is_admin ? 'Yes' : 'No'}</DetailRow>
          </DetailGroup>

          <DetailGroup title="Permissions">
            <div className="flex min-h-12 items-center justify-between gap-4 px-3.5 py-2.5">
              <div>
                <p className="text-foreground">Can provision tags</p>
                <p className="type-caption mt-0.5 text-muted-foreground">From the iOS app's debug menu.</p>
              </div>
              <Switch
                checked={row.is_provisioner}
                disabled={setProvisioner.isPending}
                aria-label="Can provision tags"
                onCheckedChange={(enabled) =>
                  setProvisioner.mutate(
                    { userId: row.id, enabled },
                    {
                      onSuccess: () =>
                        toast.success(enabled ? 'Provisioner added' : 'Provisioner removed', {
                          description: row.email ?? undefined,
                        }),
                      onError: (error) => toast.error("Couldn't change permission", { description: error.message }),
                    },
                  )
                }
              />
            </div>
          </DetailGroup>

          <DetailGroup title="Provisioned tags">
            {ownedTags.length === 0 ? (
              <div className="px-3.5 py-3 text-muted-foreground">None registered.</div>
            ) : (
              ownedTags.map((tag) => (
                <button
                  key={tag.hardware_id}
                  type="button"
                  onClick={() => select({ kind: 'tag', id: tag.hardware_id })}
                  className="flex min-h-10 w-full items-center justify-between gap-3 px-3.5 py-2 text-left outline-none hover:bg-accent/60 focus-visible:bg-accent"
                >
                  <span>{tag.tag_name ?? 'Unnamed tag'}</span>
                  <span className="tabular font-mono text-[11.5px] text-muted-foreground">
                    {hardwareIdHex(tag.hardware_id)}
                  </span>
                </button>
              ))
            )}
          </DetailGroup>
          {row.live_tag_count > ownedTags.length ? (
            <p className="type-caption mt-2 px-1 text-muted-foreground">
              Plus {row.live_tag_count - ownedTags.length} registration
              {row.live_tag_count - ownedTags.length === 1 ? '' : 's'} of tags set up before provisioning existed. Those
              aren't in the inventory, so they can't be listed or released here.
            </p>
          ) : null}
        </>
      ) : null}
    </Inspector>
  );
}

// ---------------------------------------------------------------------------
// Pre-orders (read-only for now)
// ---------------------------------------------------------------------------

export const ORDER_STATUS: Record<OrderRow['status'], { label: string; tone: PillTone }> = {
  pending: { label: 'Pending', tone: 'amber' },
  confirmed: { label: 'Confirmed', tone: 'blue' },
  shipped: { label: 'Shipped', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'red' },
};

export const PAYMENT_STATUS: Record<OrderRow['payment_status'], { label: string; tone: PillTone }> = {
  paid: { label: 'Deposit paid', tone: 'green' },
  unpaid: { label: 'Unpaid', tone: 'gray' },
  failed: { label: 'Payment failed', tone: 'red' },
  refunded: { label: 'Refunded', tone: 'gray' },
};

const itemsSummary = (row: OrderRow) => row.items.map((item) => `${item.quantity} × ${item.name}`).join(', ');

export function OrdersPage() {
  const orders = useOrders();
  const { selection, select } = useAdminNav();
  const [query, setQuery] = useState('');
  const rows = orders.data ?? [];
  const visible = rows.filter((row) => includes([row.reference, row.email, row.full_name, row.country], query));
  const selected = selection?.kind === 'order' ? rows.find((row) => row.id === selection.id) : undefined;

  return (
    <>
      <PageHeader title="Pre-orders" description="Reservations from the shop. A deposit is taken at checkout; the rest when it ships.">
        <ToolButton
          icon="download"
          disabled={visible.length === 0}
          onClick={() => {
            csvDownload('tapaway-preorders.csv', [
              ['reference', 'status', 'payment', 'deposit', 'paid at', 'placed', 'name', 'email', 'phone', 'address', 'city', 'region', 'postal code', 'country', 'items', 'tags', 'total', 'notes'],
              ...visible.map((row) => [
                row.reference,
                row.status,
                row.payment_status,
                formatPrice(row.deposit_cents, row.currency),
                row.paid_at ?? '',
                row.created_at,
                row.full_name,
                row.email,
                row.phone ?? '',
                [row.address_line1, row.address_line2].filter(Boolean).join(', '),
                row.city,
                row.region ?? '',
                row.postal_code,
                row.country,
                itemsSummary(row),
                String(row.total_tags),
                formatPrice(row.subtotal_cents, row.currency),
                row.notes ?? '',
              ]),
            ]);
            toast.success(`Exported ${visible.length} pre-order${visible.length === 1 ? '' : 's'}`);
          }}
        >
          Export
        </ToolButton>
        <ToolButton icon="refresh" spinning={orders.isFetching} onClick={() => orders.refetch()}>
          Refresh
        </ToolButton>
      </PageHeader>

      <Toolbar>
        <SearchField value={query} onChange={setQuery} placeholder="Search reference, name, email" />
      </Toolbar>

      <DataTable head={['Reference', 'Customer', 'Items', 'Ship to', 'Placed']}>
        {orders.isLoading ? (
          <SkeletonRows columns={5} />
        ) : orders.error ? (
          <TableMessage columns={5} tone="error" title="Couldn't load pre-orders" detail={orders.error.message} />
        ) : visible.length === 0 ? (
          <TableMessage
            columns={5}
            title={rows.length === 0 ? 'No pre-orders yet' : 'No pre-orders match'}
            detail={rows.length === 0 ? 'Reservations from /shop appear here.' : undefined}
          />
        ) : (
          visible.map((row) => {
            const status = ORDER_STATUS[row.status];
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
                    <Pill tone={status.tone}>{status.label}</Pill>
                    <Pill tone={PAYMENT_STATUS[row.payment_status].tone}>{PAYMENT_STATUS[row.payment_status].label}</Pill>
                  </span>
                </Cell>
                <Cell>{row.full_name}</Cell>
                <Cell>
                  {itemsSummary(row)}
                  <span className="tabular ml-2 text-muted-foreground">{formatPrice(row.subtotal_cents, row.currency)}</span>
                </Cell>
                <Cell className="text-muted-foreground">{[row.city, row.country].filter(Boolean).join(', ')}</Cell>
                <Cell className="text-muted-foreground">
                  <RelativeTime value={row.created_at} />
                </Cell>
              </Row>
            );
          })
        )}
      </DataTable>

      <OrderInspector row={selected} onClose={() => select(null)} />
    </>
  );
}

function OrderInspector({ row, onClose }: { row: OrderRow | undefined; onClose: () => void }) {
  const status = row ? ORDER_STATUS[row.status] : null;
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
        row && status ? (
          <span className="inline-flex items-center gap-2">
            <Pill tone={status.tone}>{status.label}</Pill>
            Placed {absoluteLabel(row.created_at)}
          </span>
        ) : null
      }
      footer={
        row ? (
          <a
            href={`mailto:${row.email}?subject=${encodeURIComponent(`Your tapaway pre-order ${row.reference}`)}`}
            className="press flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-semibold text-primary-foreground outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--tint)]"
          >
            <Mail className="size-4" /> Email {row.full_name.split(' ')[0]}
          </a>
        ) : null
      }
    >
      {row ? (
        <>
          <DetailGroup title="Items">
            {row.items.map((item, index) => (
              <DetailRow key={index} label={`${item.quantity} × ${item.name}`}>
                <span className="tabular text-muted-foreground">{item.quantity * item.tags} tags</span>
              </DetailRow>
            ))}
            <DetailRow label="Total">
              <span className="tabular font-semibold">{formatPrice(row.subtotal_cents, row.currency)}</span>
            </DetailRow>
          </DetailGroup>

          <DetailGroup title="Deposit">
            <DetailRow label="Status">
              <Pill tone={PAYMENT_STATUS[row.payment_status].tone}>{PAYMENT_STATUS[row.payment_status].label}</Pill>
            </DetailRow>
            <DetailRow label="Amount">
              <span className="tabular">{formatPrice(row.deposit_cents, row.currency)}</span>
            </DetailRow>
            {row.paid_at ? <DetailRow label="Paid">{absoluteLabel(row.paid_at)}</DetailRow> : null}
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

          {row.notes ? (
            <DetailGroup title="Notes">
              <p className="whitespace-pre-line px-3.5 py-3">{row.notes}</p>
            </DetailGroup>
          ) : null}
        </>
      ) : null}
    </Inspector>
  );
}
