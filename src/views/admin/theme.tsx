'use client';

import { createContext, useContext, useEffect, useId, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

// Admin appearance: System (follows the OS, live), Light, or Dark. Applied to
// <body> rather than a wrapper, because inspectors, ⌘K and toasts portal there.
// The choice is a per-browser convenience, so localStorage is the right home —
// wrapped, since storage can be unavailable (private mode, blocked site data).

export type ThemePreference = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'tapaway.admin.theme';

interface ThemeValue {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.body.classList.add('admin-root');
    return () => document.body.classList.remove('admin-root', 'dark', 'theme-switching');
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark', resolved === 'dark');
  }, [resolved]);

  function setPreference(next: ThemePreference) {
    // Ease the swap instead of flashing: colours cross-fade for a beat, then
    // the transition class comes off so normal interactions stay instant.
    const body = document.body;
    body.classList.add('theme-switching');
    window.setTimeout(() => body.classList.remove('theme-switching'), 320);
    setPreferenceState(next);
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not persisted this time; the choice still applies for this visit.
    }
  }

  return <ThemeContext.Provider value={{ preference, resolved, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useAdminTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useAdminTheme must be used inside <AdminThemeProvider>');
  return value;
}

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'Match system', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

/** Compact three-way segmented control, like the appearance picker in macOS. */
export function ThemeSwitch({ className }: { className?: string }) {
  const { preference, setPreference } = useAdminTheme();
  const id = useId();

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className={cn('inline-flex items-center rounded-[9px] bg-muted p-[3px]', className)}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const index = OPTIONS.findIndex((option) => option.value === preference);
        const next = OPTIONS[(index + (event.key === 'ArrowRight' ? 1 : -1) + OPTIONS.length) % OPTIONS.length];
        setPreference(next.value);
        (event.currentTarget.querySelector(`[data-value="${next.value}"]`) as HTMLElement | null)?.focus();
      }}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = value === preference;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            tabIndex={active ? 0 : -1}
            data-value={value}
            onClick={() => setPreference(value)}
            className={cn(
              'relative grid h-[24px] w-[28px] place-items-center rounded-[7px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--tint)]',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active ? (
              <motion.span
                layoutId={`theme-switch-${id}`}
                className="absolute inset-0 rounded-[7px] bg-background shadow-[0_1px_2px_rgba(0,0,0,0.1),0_0_0_0.5px_rgba(0,0,0,0.04)] dark:bg-white/[0.16] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              />
            ) : null}
            <Icon className="relative size-3.5" strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}
