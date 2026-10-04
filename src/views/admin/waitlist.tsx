'use client';

import { useEffect, useMemo, useRef, useState, type ComponentProps, type MouseEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Copy, Minus, RotateCcw, Trash2, X } from 'lucide-react';
import HoldButton from '@/components/registry/hold-button';
import { DiscreteTabs } from '@/components/registry/discrete-tabs';
import { cn } from '@/lib/utils';
import { useAdminNav } from './context';
import { useWaitlist, useWaitlistAction, type WaitlistAction, type WaitlistRow } from './data';
import { csvDownload } from './format';
import { Cell, DataTable, PageHeader, RelativeTime, SearchField, SkeletonRows, TableMessage, ToolButton, Toolbar } from './ui';

// Waitlist moderation. Select rows (click, Shift-click for a range, ⌘A for
// everything shown), then act on them from the bar that rises at the bottom.
// Removing is forgiving — it's one Undo away, and lands in "Removed" — while
// deleting for good asks for a deliberate hold.

type Filter = 'active' | 'website' | 'autosend' | 'removed';

const SOURCE_LABEL: Record<string, string> = { website: 'Website', autosend: 'Imported from AutoSend' };

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export function WaitlistPage() {
  const waitlist = useWaitlist();
  const act = useWaitlistAction();
  const { section } = useAdminNav();
  const [filter, setFilter] = useState<Filter>('active');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const anchor = useRef<number | null>(null);

  const rows = waitlist.data ?? [];
  const active = useMemo(() => rows.filter((row) => !row.removed_at), [rows]);
  const removed = useMemo(() => rows.filter((row) => row.removed_at), [rows]);

  const inFilter = (row: WaitlistRow) => {
    switch (filter) {
      case 'removed':
        return Boolean(row.removed_at);
      case 'website':
      case 'autosend':
        return !row.removed_at && row.source === filter;
      default:
        return !row.removed_at;
    }
  };
  const needle = query.trim().toLowerCase();
  const visible = rows.filter((row) => inFilter(row) && (!needle || row.email.includes(needle)));
  const visibleEmails = visible.map((row) => row.email);
  const selectedVisible = visibleEmails.filter((email) => selected.has(email));

  // A filter or search change makes old selections invisible; drop them
  // rather than act on rows the admin can't see.
  useEffect(() => {
    setSelected(new Set());
    anchor.current = null;
  }, [filter, needle]);

  // ⌘A, Delete, Esc — only while this section is showing and nobody is typing.
  useEffect(() => {
    if (section !== 'waitlist') return;
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target) || document.querySelector('[role="dialog"]')) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setSelected(new Set(visibleEmails));
      } else if (event.key === 'Escape') {
        setSelected(new Set());
      } else if ((event.key === 'Backspace' || event.key === 'Delete') && selectedVisible.length && filter !== 'removed') {
        event.preventDefault();
        run('remove', selectedVisible);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function toggle(index: number, event: MouseEvent | null) {
    const email = visibleEmails[index];
    setSelected((current) => {
      const next = new Set(current);
      if (event?.shiftKey && anchor.current !== null) {
        const [from, to] = [anchor.current, index].sort((a, b) => a - b);
        const turnOn = !current.has(email);
        for (const value of visibleEmails.slice(from, to + 1)) (turnOn ? next.add(value) : next.delete(value));
      } else if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
    anchor.current = index;
  }

  function run(action: WaitlistAction, emails: string[]) {
    const count = emails.length;
    const noun = `${count} signup${count === 1 ? '' : 's'}`;
    const pending = toast.loading(
      action === 'remove' ? `Deleting ${noun}…` : action === 'restore' ? `Restoring ${noun}…` : `Deleting ${noun} for good…`,
    );
    act.mutate(
      { action, emails },
      {
        onSuccess: () => {
          setSelected(new Set());
          if (action === 'remove') {
            toast.success(`Deleted ${noun}`, {
              id: pending,
              description: 'Taken off the AutoSend list, and blocked from rejoining.',
              action: { label: 'Undo', onClick: () => run('restore', emails) },
              duration: 8000,
            });
          } else {
            toast.success(action === 'restore' ? `Restored ${noun}` : `Deleted ${noun} for good`, {
              id: pending,
              description: action === 'restore' ? 'Back on the AutoSend list.' : 'They can sign up again.',
            });
          }
        },
        onError: (error) => toast.error("Couldn't update the waitlist", { id: pending, description: error.message }),
      },
    );
  }

  const allChecked = visible.length > 0 && selectedVisible.length === visible.length;
  const someChecked = selectedVisible.length > 0 && !allChecked;

  return (
    <>
      <PageHeader
        title="Waitlist"
        description="Everyone who joined from the website. Select signups to delete them — they come off the AutoSend list too."
      >
        <ToolButton
          icon="download"
          disabled={visible.length === 0}
          onClick={() => {
            csvDownload('tapaway-waitlist.csv', [
              ['email', 'source', 'joined'],
              ...visible.map((row) => [row.email, row.source, row.created_at]),
            ]);
            toast.success(`Exported ${visible.length} signup${visible.length === 1 ? '' : 's'}`);
          }}
        >
          Export
        </ToolButton>
        <ToolButton icon="refresh" spinning={waitlist.isFetching} onClick={() => waitlist.refetch()}>
          Refresh
        </ToolButton>
      </PageHeader>

      <Toolbar>
        <DiscreteTabs<Filter>
          label="Filter signups"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'active', label: 'All', count: active.length },
            { value: 'website', label: 'Website', count: active.filter((row) => row.source === 'website').length },
            { value: 'autosend', label: 'Imported', count: active.filter((row) => row.source === 'autosend').length },
            { value: 'removed', label: 'Deleted', count: removed.length },
          ]}
        />
        <SearchField value={query} onChange={setQuery} placeholder="Search by email" />
      </Toolbar>

      <DataTable
        head={[
          <RowCheckbox
            key="all"
            label={allChecked ? 'Deselect all' : 'Select all shown'}
            checked={allChecked ? true : someChecked ? 'indeterminate' : false}
            disabled={visible.length === 0}
            onToggle={() => setSelected(allChecked ? new Set() : new Set(visibleEmails))}
          />,
          'Email',
          'Source',
          filter === 'removed' ? 'Deleted' : 'Joined',
          '',
        ]}
      >
        {waitlist.isLoading ? (
          <SkeletonRows columns={5} rows={10} />
        ) : waitlist.error ? (
          <TableMessage columns={5} tone="error" title="Couldn't load the waitlist" detail={waitlist.error.message} />
        ) : visible.length === 0 ? (
          <TableMessage
            columns={5}
            title={
              filter === 'removed'
                  ? 'Nothing deleted'
                  : rows.length === 0
                    ? 'No signups yet'
                    : 'No signups match'
            }
            detail={
              filter === 'removed'
                  ? 'Signups you delete land here first. Restore them, or delete them for good.'
                  : undefined
            }
          />
        ) : (
          visible.map((row, index) => {
            const isSelected = selected.has(row.email);
            return (
              <tr
                key={row.email}
                aria-selected={isSelected}
                onClick={(event) => toggle(index, event)}
                className={cn(
                  'group cursor-default select-none transition-colors duration-100',
                  isSelected
                    ? 'bg-[color-mix(in_oklch,var(--tint)_10%,transparent)] hover:bg-[color-mix(in_oklch,var(--tint)_14%,transparent)]'
                    : 'hover:bg-accent/60',
                )}
              >
                <Cell className="w-10 pr-0" onClick={(event) => event.stopPropagation()}>
                  <RowCheckbox label={`Select ${row.email}`} checked={isSelected} onToggle={(event) => toggle(index, event)} />
                </Cell>
                <Cell>
                  <span className={cn(row.removed_at && 'text-muted-foreground line-through decoration-muted-foreground/50')}>
                    {row.email}
                  </span>
                </Cell>
                <Cell className="text-muted-foreground">{SOURCE_LABEL[row.source] ?? row.source}</Cell>
                <Cell className="text-muted-foreground">
                  <RelativeTime value={filter === 'removed' ? row.removed_at : row.created_at} />
                </Cell>
                <Cell className="w-10">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigator.clipboard
                        .writeText(row.email)
                        .then(() => toast.success('Email copied'), () => toast.error("Couldn't copy"));
                    }}
                    className="press grid size-7 place-items-center rounded-md text-muted-foreground opacity-0 outline-none hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--tint)] group-hover:opacity-100"
                    aria-label={`Copy ${row.email}`}
                  >
                    <Copy className="size-3.5" />
                  </button>
                </Cell>
              </tr>
            );
          })
        )}
      </DataTable>

      <p className="type-caption mt-3 text-muted-foreground">
        Tip: Shift-click selects a range · ⌘A selects everything shown · Delete key deletes the selection · Esc clears it.
      </p>

      <SelectionBar
        count={selectedVisible.length}
        removedView={filter === 'removed'}
        busy={act.isPending}
        onClear={() => setSelected(new Set())}
        onRemove={() => run('remove', selectedVisible)}
        onRestore={() => run('restore', selectedVisible)}
        onPurge={() => run('purge', selectedVisible)}
      />
    </>
  );
}

/**
 * Rises from the bottom edge when rows are selected and sinks back the same
 * way — a floating material over the content, not a toolbar that reflows it.
 */
function SelectionBar({
  count,
  removedView,
  busy,
  onClear,
  onRemove,
  onRestore,
  onPurge,
}: {
  count: number;
  removedView: boolean;
  busy: boolean;
  onClear: () => void;
  onRemove: () => void;
  onRestore: () => void;
  onPurge: () => void;
}) {
  return (
    <AnimatePresence>
      {count > 0 ? (
        <motion.div
          role="toolbar"
          aria-label={`${count} selected`}
          initial={{ opacity: 0, transform: 'translateY(16px) scale(0.98)' }}
          animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
          exit={{ opacity: 0, transform: 'translateY(16px) scale(0.98)' }}
          transition={{ type: 'spring', bounce: 0, duration: 0.32 }}
          className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-border bg-[color-mix(in_oklch,var(--background)_82%,transparent)] p-1.5 pl-3 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(0,0,0,0.05)] backdrop-blur-2xl backdrop-saturate-150"
        >
          <span className="tabular mr-2 whitespace-nowrap text-[13px] font-medium">{count} selected</span>
          {removedView ? (
            <>
              <BarButton onClick={onRestore} disabled={busy} icon={<RotateCcw className="size-3.5" />}>
                Restore
              </BarButton>
              <HoldButton
                size="sm"
                radius={10}
                holdTime={1000}
                disabled={busy}
                backgroundColor="color-mix(in oklch, #e5484d 12%, var(--background))"
                textColor="#e5484d"
                fillColor="#e5484d"
                fillTextColor="#ffffff"
                glow={false}
                wave={false}
                resetAfter={600}
                doneLabel="Deleted"
                onHold={onPurge}
              >
                Hold to delete for good
              </HoldButton>
            </>
          ) : (
            <BarButton onClick={onRemove} disabled={busy} tone="danger" icon={<Trash2 className="size-3.5" />}>
              Delete
            </BarButton>
          )}
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selection"
            className="press ml-0.5 grid size-8 place-items-center rounded-xl text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--tint)]"
          >
            <X className="size-4" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function BarButton({
  children,
  icon,
  tone,
  ...props
}: { icon: ReactNode; tone?: 'danger' } & Omit<ComponentProps<'button'>, 'type'>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'press inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--tint)] disabled:opacity-50',
        tone === 'danger'
          ? 'bg-red-500/12 text-red-600 hover:bg-red-500/18 dark:text-red-400'
          : 'bg-muted text-foreground hover:bg-accent',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/**
 * A checkbox that shows a dash, not a tick, when only some rows are selected
 * — a tick there would read as "everything is selected".
 */
function RowCheckbox({
  label,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  checked: boolean | 'indeterminate';
  disabled?: boolean;
  onToggle: (event: MouseEvent) => void;
}) {
  return (
    <CheckboxPrimitive.Root
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle(event);
      }}
      className="grid size-[15px] place-items-center rounded-[4px] border border-input bg-background outline-none transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-[var(--tint)] disabled:opacity-40 data-[state=checked]:border-[var(--tint)] data-[state=checked]:bg-[var(--tint)] data-[state=indeterminate]:border-[var(--tint)] data-[state=indeterminate]:bg-[var(--tint)]"
    >
      <CheckboxPrimitive.Indicator className="text-white">
        {checked === 'indeterminate' ? <Minus className="size-3" strokeWidth={3} /> : <Check className="size-3" strokeWidth={3} />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
