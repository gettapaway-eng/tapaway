import { PhoneFrame } from "@/components/site/phone-frame";
import { CheckIcon } from "@/components/site/mockup-bits";
import { cn } from "@/lib/utils";

function HeroTaskCard({
  title,
  subtitle,
  date,
  done,
  faded,
}: {
  title: string;
  subtitle: string;
  date: string;
  done?: boolean;
  faded?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-2xl bg-gradient-to-b from-white to-zinc-50 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03]",
        faded && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2.5">
        <CheckIcon done={done} />
        <div>
          <p className="text-[14px] font-semibold text-zinc-900">{title}</p>
          <p className="mt-0.5 text-[11px] text-zinc-400">{subtitle}</p>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-500">
            <span className="h-1 w-1 rounded-full bg-red-500" />
            High Priority
          </span>
        </div>
      </div>
      <span className="shrink-0 rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-500">
        {date}
      </span>
    </div>
  );
}

function HeroPhoneScreen() {
  return (
    <div className="relative px-5 pb-10 pt-2">
      <p className="text-[19px] font-bold text-zinc-900">My tasks</p>
      <p className="mt-4 text-[10px] font-semibold tracking-wide text-zinc-400">
        TOP PRIORITY
      </p>
      <div className="mt-2.5 space-y-3">
        <HeroTaskCard
          title="Final Design Review"
          subtitle="Produlis App"
          date="Feb 20"
          done
        />
        <HeroTaskCard
          title="Landing page"
          subtitle="Temlis"
          date="Feb 20"
          done
        />
      </div>
      <p className="mt-4 text-[10px] font-semibold tracking-wide text-zinc-400">
        DUE TODAY
      </p>
      <div className="mt-2.5 space-y-3">
        <HeroTaskCard
          title="Wireframe Homepage"
          subtitle="Produlis App"
          date="Feb 20"
          faded
        />
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="bg-white px-2 pt-2 sm:px-4 sm:pt-4">
      <div
        className="relative mx-auto max-w-[1920px] overflow-hidden rounded-2xl"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 85%, #cfe1fb 0%, #9dc1f8 35%, #5f95f2 65%, #4a80ea 100%)",
        }}
      >
        {/* Header — lean and compact like reference */}
        <header className="relative z-20 flex w-full items-center justify-between px-4 pt-4 sm:px-6 sm:pt-5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="7" width="20" height="14" rx="6" fill="#3b82f6" />
                <rect x="10" y="1" width="4" height="5" rx="2" fill="#3b82f6" />
                <circle cx="8.5" cy="14" r="2" fill="white" />
                <circle cx="15.5" cy="14" r="2" fill="white" />
              </svg>
            </span>
            <span className="text-[15px] font-semibold text-white">
              Nearo
            </span>
          </div>

          <button className="rounded-full bg-white px-5 py-2 text-[11px] font-semibold tracking-wide text-black shadow-sm transition-colors hover:bg-zinc-100 active:bg-zinc-200">
            TEMLIS
          </button>
        </header>

        <div className="relative z-10 mx-auto px-6 pt-8 text-center sm:pt-12">
          <span className="inline-block rounded-full border border-white/40 px-4 py-1.5 text-[11px] font-medium tracking-wide text-white/90">
            COMING SOON
          </span>

          <h1 className="mt-5 text-5xl font-bold tracking-tight text-white sm:text-7xl lg:text-8xl">
            You're one tap away<br className="hidden sm:block" /> from focus
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[14px] leading-relaxed text-white/85">
            We're getting close. Sign up to get early access
            <br />
            to Nearo and start building your viral waitlist.
          </p>

          <form className="mx-auto mt-8 flex max-w-lg items-center rounded-full border border-white/40 bg-white/10 p-1.5 pl-6 backdrop-blur-sm transition-colors focus-within:border-white/60 focus-within:bg-white/15">
            <input
              type="email"
              placeholder="Your email address"
              className="h-9 w-full min-w-0 bg-transparent text-[14px] text-white placeholder:text-white/70 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-white px-6 py-2.5 text-[12px] font-semibold tracking-wide whitespace-nowrap text-black transition-colors hover:bg-zinc-100 active:bg-zinc-200"
            >
              JOIN WAITLIST
            </button>
          </form>
        </div>

        <div className="relative z-10 mx-auto -mb-60 mt-12 flex max-w-3xl justify-center px-6">
          <PhoneFrame
            className="w-[280px] sm:w-[420px]"
            screenClassName="h-[700px]"
            fadeColor="#6f9ff5"
          >
            <HeroPhoneScreen />
          </PhoneFrame>
        </div>
      </div>
    </section>
  );
}
