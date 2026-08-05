import {
  Reveal,
  RevealGroup,
  RevealItem,
  WordReveal,
} from "@/components/site/motion";

const steps = [
  {
    title: "Choose Apps",
    description:
      "Select Instagram, X, Reddit, YouTube or any apps you want blocked.",
    image: "blockapps.webp",
  },
  {
    title: "Tap Phone",
    description:
      "Tap your phone on the TapAway device to block the apps and activate focus mode.",
    image: "tapdevice.webp",
  },
  {
    title: "Live Fully",
    description:
      "Feel 95% less distracted — turn your phone back into a tool that supports your goals.",
    image: "zero distracted.webp",
  },
];

function StepCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="overflow-hidden rounded-3xl bg-zinc-100">{children}</div>
      <p className="mt-5 text-lg font-semibold text-zinc-900">{title}</p>
      <p className="mt-1.5 text-base leading-relaxed text-zinc-500">
        {description}
      </p>
    </div>
  );
}

export function Steps() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-24">
      <div className="flex flex-col gap-12 md:flex-row md:items-start md:gap-20">
        <div className="md:sticky md:top-28 md:flex-1">
          <h2 className="text-3xl font-medium tracking-tight text-zinc-900 sm:text-5xl">
            <WordReveal lines={["Get started in", "3 simple steps."]} />
          </h2>
          <Reveal delay={0.1}>
            <p className="mt-4 max-w-sm text-lg text-zinc-500">
              A more intentional life starts here.
            </p>
          </Reveal>
        </div>

        <RevealGroup
          className="relative space-y-12 sm:space-y-16 border-l border-dashed border-zinc-300 pl-8 md:flex-1"
          stagger={0.15}
        >
          {steps.map((step, i) => (
            <RevealItem key={step.title} className="relative">
              <span className="absolute -left-[49px] top-0 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <StepCard title={step.title} description={step.description}>
                <img
                  src={`${import.meta.env.BASE_URL}${encodeURIComponent(step.image)}`}
                  alt={step.title}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full object-cover"
                />
              </StepCard>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
