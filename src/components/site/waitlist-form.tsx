import { useState, type SubmitEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { easeSmooth } from "@/components/site/motion";
import { cn } from "@/lib/utils";

function CheckBadge() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-inset ring-white/30">
      <svg width="12" height="9" viewBox="0 0 9 7" fill="none">
        <path
          d="M1 3.3 3.2 5.5 8 1"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function WaitlistForm({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <motion.div
      layout
      transition={{ duration: 0.5, ease: easeSmooth }}
      className={cn(
        "mx-auto w-full max-w-lg overflow-hidden border border-white/40 bg-white/10 backdrop-blur-sm transition-colors",
        submitted
          ? "rounded-[28px]"
          : "rounded-full focus-within:border-white/60 focus-within:bg-white/15",
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {submitted ? (
          <motion.div
            key="success"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.3, ease: easeSmooth, delay: 0.1 }}
            className="flex items-center gap-3 px-5 py-4 text-left sm:px-6"
          >
            <CheckBadge />
            <p className="text-sm leading-snug text-white/95 sm:text-[15px]">
              You're in. We'll let you know when Tapaway is ready. Until
              then, spend more time living.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.2, ease: easeSmooth }}
            className="flex items-center p-1.5 pl-6"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Your email address"
              className="h-9 w-full min-w-0 bg-transparent text-base text-white placeholder:text-white/70 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-white px-6 py-2.5 text-sm font-semibold tracking-wide whitespace-nowrap text-black transition-colors hover:bg-zinc-100 active:bg-zinc-200"
            >
              JOIN WAITLIST
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
