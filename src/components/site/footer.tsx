import { Reveal } from "@/components/site/motion";
import { Logomark } from "@/components/site/logo";
import { WaitlistForm } from "@/components/site/waitlist-form";

export function Footer() {
  return (
    <footer className="bg-white px-2 py-2 sm:px-4 sm:py-4">
      <div className="relative mx-auto min-h-[420px] overflow-hidden rounded-2xl sm:min-h-[560px]">
        <img
          src={`${import.meta.env.BASE_URL}footerbg.webp`}
          alt=""
          loading="lazy"
          decoding="async"
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
          <WaitlistForm className="mt-8" />
        </Reveal>
      </div>
    </footer>
  );
}
