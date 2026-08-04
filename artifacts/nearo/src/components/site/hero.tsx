import { motion } from "framer-motion";
import { Reveal, WordReveal, easeSmooth } from "@/components/site/motion";
import { Logomark } from "@/components/site/logo";

export function Hero() {
  return (
    <section className="bg-white px-2 pt-2 sm:px-4 sm:pt-4">
      <div className="relative mx-auto min-h-[calc(100svh-6rem)] max-w-[1920px] overflow-hidden rounded-2xl sm:min-h-[calc(100svh-8rem)]">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={`${import.meta.env.BASE_URL}kling_20260804_VIDEO_Animate_th_1940_0.mp4`}
          poster={`${import.meta.env.BASE_URL}hero-poster.jpg`}
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          preload="auto"
        />

        <motion.header
          className="relative z-20 pt-4 sm:pt-5"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeSmooth }}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-center px-6 sm:px-8">
            <div className="flex items-center gap-2">
              <Logomark className="h-6 w-auto" />
              <span className="text-lg font-semibold text-white">
                tapaway
              </span>
            </div>
          </div>
        </motion.header>

        <div className="relative z-10 mx-auto px-6 pt-8 text-center sm:pt-12">
          <Reveal delay={0.05} y={12}>
            <span className="inline-block rounded-full border border-white/40 bg-white/10 px-4 py-1.5 text-xs font-medium tracking-wide text-white/90 backdrop-blur-md">
              DROPPING SOON
            </span>
          </Reveal>

          <h1 className="mt-5 text-4xl font-medium tracking-tight text-white sm:text-6xl lg:text-7xl">
            <WordReveal
              lines={["You're one tap", "away from focus"]}
              delay={0.15}
              stagger={0.045}
            />
          </h1>
          <p className="mx-auto mt-5 max-w-xs text-base leading-relaxed text-white/85 sm:max-w-md sm:text-xl">
            <WordReveal
              lines={[
                "A beautifully simple way to spend less time scrolling and more time living",
              ]}
              delay={0.55}
              stagger={0.03}
            />
          </p>

          <Reveal delay={1.15}>
            <form className="mx-auto mt-8 flex max-w-lg items-center rounded-full border border-white/40 bg-white/10 p-1.5 pl-6 backdrop-blur-sm transition-colors focus-within:border-white/60 focus-within:bg-white/15">
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
      </div>
    </section>
  );
}
