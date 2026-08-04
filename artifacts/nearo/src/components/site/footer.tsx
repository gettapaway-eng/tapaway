import { Reveal } from "@/components/site/motion";
import { Logomark } from "@/components/site/logo";

export function Footer() {
  return (
    <footer className="bg-white px-2 py-2 sm:px-4 sm:py-4">
      <div className="relative mx-auto min-h-[420px] max-w-[1920px] overflow-hidden rounded-2xl sm:min-h-[560px]">
        <img
          src={`${import.meta.env.BASE_URL}footerbg.png`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />

        <Logomark className="pointer-events-none absolute right-0 top-1/2 h-[280px] w-auto translate-x-1/3 -translate-y-1/2 opacity-20 blur-md sm:h-[420px]" />

        <Reveal
          delay={0.05}
          y={16}
          className="relative z-10 flex min-h-[420px] flex-col items-center justify-center px-6 py-10 text-center sm:min-h-[560px] sm:px-10 sm:py-14"
        >
          <Logomark className="h-8 w-auto sm:h-10" />
          <p className="mt-5 max-w-2xl text-3xl font-medium tracking-tight text-white sm:text-5xl">
            Reclaim your focus today
            <br />
            with just one tap
          </p>
          <form className="mx-auto mt-8 flex w-full max-w-lg items-center rounded-full border border-white/40 bg-white/10 p-1.5 pl-6 backdrop-blur-sm transition-colors focus-within:border-white/60 focus-within:bg-white/15">
            <input
              type="email"
              placeholder="Your email address"
              className="h-9 w-full min-w-0 bg-transparent text-base text-white placeholder:text-white/70 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-white px-6 py-2.5 text-sm font-semibold tracking-wide whitespace-nowrap text-black transition-colors hover:bg-zinc-100 active:bg-zinc-200"
            >
              JOIN WAITLIST
            </button>
          </form>
        </Reveal>
      </div>
    </footer>
  );
}
