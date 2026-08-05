import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const easeSmooth = [0.22, 1, 0.36, 1] as const;

function staggerContainer(stagger: number, delay: number): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  };
}

/** Fades + slides a block in as it scrolls into view (or immediately, if already in view on load). */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease: easeSmooth, delay }}
    >
      {children}
    </motion.div>
  );
}

type MotionTag = keyof typeof motion;

/** Container that staggers its RevealItem children in one after another as it enters view. */
export function RevealGroup({
  children,
  className,
  stagger = 0.12,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  as?: MotionTag;
}) {
  const Component = motion[as] as typeof motion.div;
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={staggerContainer(stagger, delay)}
    >
      {children}
    </Component>
  );
}

export function RevealItem({
  children,
  className,
  y = 28,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  as?: MotionTag;
}) {
  const Component = motion[as] as typeof motion.div;
  return (
    <Component
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: easeSmooth },
        },
      }}
    >
      {children}
    </Component>
  );
}

/** Word-by-word quick wave reveal for headlines. `lines` renders each entry on its own line. */
export function WordReveal({
  lines,
  className,
  lineClassName,
  stagger = 0.045,
  delay = 0,
}: {
  lines: string[];
  className?: string;
  lineClassName?: string;
  stagger?: number;
  delay?: number;
}) {
  return (
    <motion.span
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.6 }}
      variants={staggerContainer(stagger, delay)}
    >
      {lines.map((line, li) => {
        const words = line.split(" ");
        return (
          <span key={li} className={cn("block overflow-hidden", lineClassName)}>
            {words.map((word, wi) => (
              <motion.span
                key={wi}
                variants={{
                  hidden: { opacity: 0, y: "0.5em", filter: "blur(6px)" },
                  visible: {
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                    transition: { duration: 0.55, ease: easeSmooth },
                  },
                }}
                className="inline-block will-change-transform"
              >
                {word}
                {wi < words.length - 1 ? " " : ""}
              </motion.span>
            ))}
          </span>
        );
      })}
    </motion.span>
  );
}
