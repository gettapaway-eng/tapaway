import { cn } from "@/lib/utils";

export function PhoneFrame({
  className,
  screenClassName,
  fadeColor,
  children,
}: {
  className?: string;
  screenClassName?: string;
  fadeColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative w-[300px] rounded-[3rem] bg-gradient-to-b from-zinc-800 to-black p-[3px] shadow-2xl ring-1 ring-black/40",
        className,
      )}
    >
      {/* side buttons */}
      <span className="absolute -left-[2px] top-[108px] h-6 w-[2px] rounded-l-sm bg-black/60" />
      <span className="absolute -left-[2px] top-[146px] h-10 w-[2px] rounded-l-sm bg-black/60" />
      <span className="absolute -left-[2px] top-[198px] h-10 w-[2px] rounded-l-sm bg-black/60" />
      <span className="absolute -right-[2px] top-[158px] h-14 w-[2px] rounded-r-sm bg-black/60" />

      <div className="rounded-[2.85rem] bg-black p-2">
        <div
          className={cn(
            "relative min-h-[560px] overflow-hidden rounded-[2.35rem] bg-white",
            screenClassName,
          )}
        >
          <div className="absolute left-1/2 top-3 z-20 h-[30px] w-[104px] -translate-x-1/2 rounded-full bg-black" />
          <StatusBar />
          {children}
          {fadeColor && (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32"
              style={{
                background: `linear-gradient(to bottom, transparent, ${fadeColor})`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function StatusBar() {
  return (
    <div className="flex items-center justify-between px-7 pb-2 pt-12 text-sm font-semibold text-black">
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <svg width="17" height="12" viewBox="0 0 14 10" fill="currentColor">
          <rect x="0" y="6" width="2.2" height="4" rx="0.5" />
          <rect x="3.2" y="4" width="2.2" height="6" rx="0.5" />
          <rect x="6.4" y="2" width="2.2" height="8" rx="0.5" />
          <rect x="9.6" y="0" width="2.2" height="10" rx="0.5" />
        </svg>
        <svg width="17" height="12" viewBox="0 0 14 10" fill="currentColor">
          <path d="M7 1.5C9.5 1.5 11.7 2.5 13 4l-1 1.2C10.9 4 9 3.2 7 3.2S3.1 4 2 5.2L1 4C2.3 2.5 4.5 1.5 7 1.5Z" />
          <path d="M4 6.3C4.9 5.5 5.9 5 7 5s2.1.5 3 1.3L9 7.6c-.6-.5-1.2-.8-2-.8s-1.4.3-2 .8L4 6.3Z" />
          <circle cx="7" cy="8.5" r="1" />
        </svg>
        <svg width="26" height="13" viewBox="0 0 22 11" fill="none">
          <rect
            x="0.5"
            y="0.5"
            width="19"
            height="10"
            rx="2.5"
            stroke="currentColor"
          />
          <rect x="2" y="2" width="16" height="7" rx="1.3" fill="currentColor" />
          <rect x="20.5" y="3.5" width="1.3" height="4" rx="0.6" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}
