import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

// A detail panel that slides in from the right edge and leaves the same way.
// Built on the same Radix Dialog as shadcn's Sheet (focus trap, Esc, scroll
// lock), but with a light dim instead of a black scrim — it's an inspector
// next to the list, not a modal that replaces it — and a spring, so a quick
// open/close/open is interruptible instead of restarting from the edge.

const SPRING = { type: 'spring', bounce: 0, duration: 0.38 } as const;

export function Inspector({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/[0.08] dark:bg-black/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className="fixed inset-y-2 right-2 z-50 flex w-[min(420px,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-border bg-[color-mix(in_oklch,var(--background)_88%,transparent)] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.28),0_0_0_0.5px_rgba(0,0,0,0.05)] outline-none backdrop-blur-2xl backdrop-saturate-150"
                initial={{ transform: 'translateX(calc(100% + 16px))' }}
                animate={{ transform: 'translateX(0%)' }}
                exit={{ transform: 'translateX(calc(100% + 16px))' }}
                transition={SPRING}
              >
                <header className="flex items-start gap-3 px-5 pb-3 pt-4">
                  <div className="min-w-0 flex-1">
                    <Dialog.Title className="truncate text-[15px] font-semibold tracking-[-0.01em]">{title}</Dialog.Title>
                    {subtitle ? <div className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</div> : null}
                  </div>
                  <Dialog.Close
                    className="press grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--tint)]"
                    aria-label="Close"
                  >
                    <X className="size-3.5" strokeWidth={2.25} />
                  </Dialog.Close>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
                {footer ? <footer className="border-t border-border px-5 py-4">{footer}</footer> : null}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}

/** Inset grouped list, like iOS/macOS Settings: rows of label → value. */
export function DetailGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mt-4 first:mt-1">
      {title ? <h3 className="type-caption mb-1.5 px-1 font-medium text-muted-foreground">{title}</h3> : null}
      <dl className="divide-y divide-border overflow-hidden rounded-xl bg-muted/60 dark:bg-muted/50">{children}</dl>
    </section>
  );
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-4 px-3.5 py-2">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-foreground">{children}</dd>
    </div>
  );
}
