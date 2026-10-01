'use client';

// Adapted from uselayouts "discrete-tabs" (https://uselayouts.com/r/discrete-tabs.json).
// Kept: the shared-layout spring that slides the active pill between options.
// Changed: options are data (label + count) instead of hard-coded demo tabs,
// the spring is critically damped (no overshoot on a control used all day),
// and it's a proper radiogroup with arrow-key support.

import { useId, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export interface DiscreteTabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function DiscreteTabs<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: DiscreteTabOption<T>[];
  label: string;
  className?: string;
}) {
  const id = useId();

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + (event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length];
    onChange(next.value);
    (event.currentTarget.querySelector(`[data-value="${next.value}"]`) as HTMLElement | null)?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('inline-flex items-center rounded-[9px] bg-muted p-[3px]', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            data-value={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative inline-flex h-[26px] items-center gap-1.5 rounded-[7px] px-2.5 text-[12.5px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--tint)]',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active ? (
              <motion.span
                layoutId={`discrete-tab-${id}`}
                className="absolute inset-0 rounded-[7px] bg-background shadow-[0_1px_2px_rgba(0,0,0,0.1),0_0_0_0.5px_rgba(0,0,0,0.04)] dark:bg-white/[0.16] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              />
            ) : null}
            <span className="relative">{option.label}</span>
            {option.count !== undefined ? (
              <span className="tabular relative text-[11.5px] text-muted-foreground">{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
