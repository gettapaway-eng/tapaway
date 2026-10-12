'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ClipboardList, History, LayoutGrid, Mail, Nfc, Users } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';
import { ROLE_SECTIONS, useAdminNav, type Section } from './context';
import { useInventory, useOrders, useUsers } from './data';
import { hardwareIdHex } from './format';

// ⌘K. Spotlight-style: opens instantly with no animation — it's summoned from
// the keyboard many times a day, and motion there only reads as delay.

export const SECTION_META: Record<Section, { label: string; icon: typeof Nfc }> = {
  overview: { label: 'Overview', icon: LayoutGrid },
  tags: { label: 'Tags', icon: Nfc },
  users: { label: 'Users', icon: Users },
  waitlist: { label: 'Waitlist', icon: Mail },
  orders: { label: 'Pre-orders', icon: ClipboardList },
  activity: { label: 'Activity log', icon: History },
};

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return { open, setOpen };
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { go, select, role } = useAdminNav();
  const isAdmin = role === 'admin';
  const users = useUsers(isAdmin);
  const inventory = useInventory();
  const orders = useOrders(isAdmin);

  const run = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/[0.12] dark:bg-black/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[18vh] z-50 w-[min(600px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-border shadow-[0_32px_80px_-16px_rgba(0,0,0,0.35),0_0_0_0.5px_rgba(0,0,0,0.06)] outline-none"
        >
          <Dialog.Title className="sr-only">Search the admin</Dialog.Title>
          <Command
            loop
            className="rounded-none bg-[color-mix(in_oklch,var(--background)_82%,transparent)] backdrop-blur-2xl backdrop-saturate-150 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11.5px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-input-wrapper]]:h-12 [&_[cmdk-input-wrapper]]:border-border [&_[cmdk-input-wrapper]]:px-4 [&_[cmdk-input]]:text-[15px]"
          >
            <CommandInput placeholder={isAdmin ? 'Search people, tags, pre-orders…' : 'Search tags…'} autoFocus />
            <CommandList className="max-h-[min(420px,55vh)] p-1.5">
              <CommandEmpty className="py-10 text-center text-muted-foreground">No results.</CommandEmpty>

              <CommandGroup heading="Go to">
                {ROLE_SECTIONS[role].map((section: Section) => {
                  const { label, icon: Icon } = SECTION_META[section];
                  return (
                    <PaletteItem key={section} value={`go ${label}`} onSelect={() => run(() => go(section))}>
                      <Icon className="size-4 text-muted-foreground" />
                      {label}
                    </PaletteItem>
                  );
                })}
              </CommandGroup>

              {isAdmin && users.data?.length ? (
                <CommandGroup heading="Users">
                  {users.data.map((row) => (
                    <PaletteItem
                      key={row.id}
                      value={`user ${row.email ?? row.id}`}
                      onSelect={() => run(() => select({ kind: 'user', id: row.id }))}
                    >
                      <Users className="size-4 text-muted-foreground" />
                      {row.email}
                    </PaletteItem>
                  ))}
                </CommandGroup>
              ) : null}

              {inventory.data?.length ? (
                <CommandGroup heading="Tags">
                  {inventory.data.map((row) => {
                    const hex = hardwareIdHex(row.hardware_id);
                    return (
                      <PaletteItem
                        key={row.hardware_id}
                        value={`tag ${hex} ${hex.replaceAll(' ', '')} ${row.owner_email ?? ''} ${row.tag_name ?? ''}`}
                        onSelect={() => run(() => select({ kind: 'tag', id: row.hardware_id }))}
                      >
                        <Nfc className="size-4 text-muted-foreground" />
                        <span className="tabular font-mono text-[12px]">{hex}</span>
                        {row.owner_email ? <span className="ml-auto text-muted-foreground">{row.owner_email}</span> : null}
                      </PaletteItem>
                    );
                  })}
                </CommandGroup>
              ) : null}

              {isAdmin && orders.data?.length ? (
                <CommandGroup heading="Pre-orders">
                  {orders.data.map((row) => (
                    <PaletteItem
                      key={row.id}
                      value={`order ${row.reference} ${row.full_name} ${row.email}`}
                      onSelect={() => run(() => select({ kind: 'order', id: row.id }))}
                    >
                      <ClipboardList className="size-4 text-muted-foreground" />
                      <span className="tabular font-mono text-[12px]">{row.reference}</span>
                      <span className="ml-auto text-muted-foreground">{row.full_name}</span>
                    </PaletteItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
            <div className="flex items-center justify-end gap-3 border-t border-border px-3 py-2 text-[11.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Kbd>↵</Kbd> Open
              </span>
              <span className="inline-flex items-center gap-1">
                <Kbd>esc</Kbd> Close
              </span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PaletteItem({
  value,
  onSelect,
  children,
}: {
  value: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <CommandItem
      value={value}
      onSelect={onSelect}
      className="h-9 gap-2.5 rounded-lg px-2.5 text-[13px] data-[selected=true]:bg-[var(--tint)] data-[selected=true]:text-white [&[data-selected=true]_*]:!text-white"
    >
      {children}
    </CommandItem>
  );
}
