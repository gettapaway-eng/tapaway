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

type Status = "idle" | "submitting" | "success" | "error";

const ERROR_MESSAGES: Record<string, string> = {
  rate_limited: "Too many attempts — please try again in a few minutes.",
  invalid_input: "That doesn't look like a valid email address.",
  disposable_email:
    "Please use a permanent email address so we can reach you at launch.",
};
const DEFAULT_ERROR = "Something went wrong. Please try again.";

export function WaitlistForm({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    const form = event.currentTarget;
    const company = (
      form.elements.namedItem("company") as HTMLInputElement | null
    )?.value;

    setStatus("submitting");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company }),
      });
      const data: { ok: boolean; error?: string } = await res.json();

      if (!res.ok || !data.ok) {
        setStatus("error");
        setErrorMessage(
          (data.error && ERROR_MESSAGES[data.error]) || DEFAULT_ERROR,
        );
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage(DEFAULT_ERROR);
    }
  }

  const submitted = status === "success";

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
            className="flex flex-col"
          >
            <div className="flex items-center p-1.5 pl-6">
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Your email address"
                className="h-9 w-full min-w-0 bg-transparent text-base text-white placeholder:text-white/70 focus:outline-none"
              />
              {/* Honeypot: hidden from real users, invisible to screen readers,
                  but naive bots that auto-fill every input often fill it in. */}
              <input
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute h-0 w-0 opacity-0"
              />
              <button
                type="submit"
                disabled={status === "submitting"}
                className="shrink-0 rounded-full bg-white px-6 py-2.5 text-sm font-semibold tracking-wide whitespace-nowrap text-black transition-colors hover:bg-zinc-100 active:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "submitting" ? "JOINING…" : "JOIN WAITLIST"}
              </button>
            </div>
            {errorMessage ? (
              <p role="alert" className="px-6 pb-3 text-sm text-red-300">
                {errorMessage}
              </p>
            ) : null}
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
