import { cn } from "@/lib/utils";

export function CheckIcon({ done = true }: { done?: boolean }) {
  return (
    <span
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
        done ? "bg-emerald-500" : "border-2 border-zinc-300 bg-white",
      )}
    >
      {done && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path
            d="M1 3.3 3.2 5.5 8 1"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

export function PriorityBadge() {
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-500">
      <span className="h-1 w-1 rounded-full bg-red-500" />
      High Priority
    </span>
  );
}

export function TaskRow({
  title,
  subtitle,
  done,
  date,
  strike,
}: {
  title: string;
  subtitle?: string;
  done?: boolean;
  date?: string;
  strike?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2 py-2.5">
      <div className="flex items-start gap-2">
        <CheckIcon done={done} />
        <div>
          <p
            className={cn(
              "text-sm font-semibold text-zinc-900",
              strike && "text-zinc-400 line-through",
            )}
          >
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-zinc-400">{subtitle}</p>
          )}
          {!strike && <PriorityBadge />}
        </div>
      </div>
      {date && <span className="text-xs text-zinc-400">{date}</span>}
    </div>
  );
}

export function AvatarDot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-6 w-6 rounded-full border-2 border-white bg-gradient-to-br from-zinc-300 to-zinc-400",
        className,
      )}
    />
  );
}
