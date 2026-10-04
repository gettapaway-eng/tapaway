'use client';

import {
  forwardRef,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// Form controls for the shop's checkout. Plain, quiet surfaces at rest; the
// detail shows up on interaction — a focus ring the instant you land, errors
// that slide open beneath the field instead of shoving the page, and menus
// that grow out of the control that opened them.

export const controlBase =
  'block h-12 w-full rounded-xl border bg-white px-3.5 text-[15px] text-zinc-900 outline-none ' +
  'transition-[border-color,box-shadow] duration-150 placeholder:text-zinc-400 ' +
  'border-zinc-200 hover:border-zinc-300 ' +
  'focus-visible:border-[var(--focus-blue)] focus-visible:shadow-[0_0_0_3px_rgb(47_123_246/0.18)] ' +
  'aria-invalid:border-red-400 aria-invalid:hover:border-red-500 ' +
  'aria-invalid:focus-visible:border-red-500 aria-invalid:focus-visible:shadow-[0_0_0_3px_rgb(239_68_68/0.16)] ' +
  'disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400';

// ---------------------------------------------------------------------------
// Field: label, optional marker, the control, then a hint or an error that
// animates its own height so the fields below glide rather than jump.
// ---------------------------------------------------------------------------

export function Field({
  id,
  label,
  optional,
  error,
  hint,
  trailing,
  className,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  hint?: ReactNode;
  /** Right-aligned, in the label row — e.g. a character count. */
  trailing?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  // Keep the last message mounted while the row collapses, so it fades out
  // with its text instead of going blank first.
  const lastError = useRef(error);
  if (error) lastError.current = error;

  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-zinc-700">
          {label}
        </label>
        {trailing ?? (optional ? <span className="text-[12px] text-zinc-400">Optional</span> : null)}
      </div>
      {children}
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-[var(--ease-out-strong)] motion-reduce:transition-opacity',
          error ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <p id={`${id}-error`} className="overflow-hidden text-[13px] leading-snug text-red-600" aria-live="polite">
          <span className="block pt-1.5">{error ? error : lastError.current}</span>
        </p>
      </div>
      {hint && !error ? <div className="pt-1.5 text-[13px] leading-snug text-zinc-500">{hint}</div> : null}
    </div>
  );
}

/** aria wiring for a control inside <Field>. */
export function describedBy(id: string, error?: string) {
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  } as const;
}

export const TextInput = forwardRef<HTMLInputElement, ComponentProps<'input'>>(function TextInput(
  { className, ...props },
  ref,
) {
  return <input ref={ref} {...props} className={cn(controlBase, className)} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, ComponentProps<'textarea'>>(function TextArea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} {...props} className={cn(controlBase, 'h-auto resize-none py-3 leading-relaxed', className)} />;
});

// ---------------------------------------------------------------------------
// Combobox: a searchable dropdown for long, known lists (countries, states,
// dial codes). The trigger is a button so it takes focus like any input and
// react-hook-form can focus it when it's the first invalid field.
// ---------------------------------------------------------------------------

const itemValue = (option: ComboOption) => `${option.label} ${option.value}`;

// Centre the chosen item when the list mounts — opening "State" on Texas
// shouldn't start at Alabama.
function scrollSelectedIntoView(node: HTMLDivElement | null) {
  if (!node) return;
  requestAnimationFrame(() => {
    // Scroll the list itself; scrollIntoView could also nudge the page.
    const item = node.querySelector<HTMLElement>('[data-selected="true"]');
    if (item) node.scrollTop = item.offsetTop - node.clientHeight / 2 + item.offsetHeight / 2;
  });
}

export interface ComboOption {
  value: string;
  label: string;
  /** Extra search terms: ISO codes, dial codes, abbreviations. */
  keywords?: string[];
  leading?: ReactNode;
  /** Right-aligned secondary text in the list, e.g. "+91". */
  detail?: string;
}

interface ComboboxProps {
  id: string;
  options: ComboOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText?: string;
  /** What the closed trigger shows; defaults to the option's label. */
  renderValue?: (option: ComboOption) => ReactNode;
  className?: string;
  contentClassName?: string;
  align?: 'start' | 'end';
  /** "bare" drops the field chrome, for use inside a composite like the phone field. */
  variant?: 'field' | 'bare';
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-label'?: string;
  disabled?: boolean;
}

export const Combobox = forwardRef<HTMLButtonElement, ComboboxProps>(function Combobox(
  {
    id,
    options,
    value,
    onChange,
    onBlur,
    placeholder,
    searchPlaceholder,
    emptyText = 'No matches',
    renderValue,
    className,
    contentClassName,
    align = 'start',
    variant = 'field',
    disabled,
    ...aria
  },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const listId = useId();
  const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);

  function openWith(initial = '') {
    setQuery(initial);
    setOpen(true);
  }

  // Typing on the closed trigger opens the menu and starts the search with
  // that letter — the way a native <select> jumps, but with filtering.
  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (open || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key.length === 1 && /\S/.test(event.key)) {
      event.preventDefault();
      openWith(event.key);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openWith();
    }
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setQuery('');
        else onBlur?.();
      }}
    >
      <Popover.Trigger asChild disabled={disabled}>
        <button
          ref={ref}
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-haspopup="listbox"
          onKeyDown={onTriggerKeyDown}
          {...aria}
          className={cn(
            variant === 'field' ? controlBase : 'h-full text-[15px] text-zinc-900 outline-none',
            'press flex items-center gap-2.5 text-left',
            className,
          )}
        >
          {selected ? (
            (renderValue?.(selected) ?? (
              <>
                {selected.leading}
                <span className="min-w-0 flex-1 truncate">{selected.label}</span>
              </>
            ))
          ) : (
            <span className="min-w-0 flex-1 truncate text-zinc-400">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-auto size-4 shrink-0 text-zinc-400" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            'shop-menu z-50 w-[var(--radix-popover-trigger-width)] min-w-[16rem] overflow-hidden rounded-2xl',
            contentClassName,
          )}
          onOpenAutoFocus={(event) => {
            // Let cmdk's input take focus itself (it's autoFocus below), so the
            // caret lands after any letter typed on the trigger.
            event.preventDefault();
          }}
        >
          <Command
            loop
            label={searchPlaceholder}
            // Open with the current choice highlighted, not the top of the list.
            defaultValue={selected && !query ? itemValue(selected) : undefined}
            className="flex max-h-[min(22rem,var(--radix-popover-content-available-height))] flex-col">
            <div className="flex items-center gap-2 border-b border-black/[0.06] px-3.5">
              <Search className="size-4 shrink-0 text-zinc-400" strokeWidth={1.75} aria-hidden="true" />
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder={searchPlaceholder}
                className="h-11 w-full bg-transparent text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400"
              />
            </div>
            {/* data-lenis-prevent: the page's smooth scroller would otherwise eat the wheel. */}
            <Command.List
              id={listId}
              ref={scrollSelectedIntoView}
              data-lenis-prevent
              className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
              <Command.Empty className="px-3 py-6 text-center text-[14px] text-zinc-500">{emptyText}</Command.Empty>
              {options.map((option) => (
                <Command.Item
                  key={option.value}
                  value={itemValue(option)}
                  keywords={option.keywords}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="flex h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-[14px] text-zinc-800 data-[selected=true]:bg-zinc-900/[0.06]"
                >
                  {option.leading}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {option.detail ? <span className="tabular text-[13px] text-zinc-400">{option.detail}</span> : null}
                  <Check
                    className={cn('size-4 shrink-0 text-[var(--focus-blue)]', option.value === value ? 'opacity-100' : 'opacity-0')}
                    strokeWidth={2.25}
                    aria-hidden="true"
                  />
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
});

/** A flag that sits on a fixed-width baseline so labels stay aligned. */
export function Flag({ emoji }: { emoji: string }) {
  return (
    <span className="grid w-5 shrink-0 place-items-center text-[17px] leading-none" aria-hidden="true">
      {emoji}
    </span>
  );
}
