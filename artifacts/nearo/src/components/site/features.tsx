import { Reveal, RevealGroup, RevealItem, WordReveal } from "@/components/site/motion";

const cards = [
  {
    title: "Life on pause.",
    description:
      "Notifications interrupt work, conversations, and quiet moments.",
    image: "lifedistracted.png",
  },
  {
    title: "Life reclaimed.",
    description: "Block distractions with a tap and be present where you are.",
    video: "tap to activate.mp4",
  },
];

export function Features() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 sm:px-8">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-3xl font-medium tracking-tight text-zinc-900 sm:text-5xl">
          <WordReveal lines={["A physical key to focus."]} />
        </h2>
        <Reveal delay={0.1}>
          <p className="mt-4 text-lg text-zinc-500">
            TapAway uses a physical NFC device to lock distracting apps,
            helping you focus on what matters.
          </p>
        </Reveal>
      </div>

      <RevealGroup
        className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2"
        stagger={0.12}
      >
        {cards.map((card) => (
          <RevealItem key={card.title}>
            <div className="aspect-square overflow-hidden rounded-3xl bg-zinc-100">
              {card.video ? (
                <video
                  className="h-full w-full object-cover"
                  src={`${import.meta.env.BASE_URL}${encodeURIComponent(card.video)}`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls={false}
                />
              ) : (
                <img
                  src={`${import.meta.env.BASE_URL}${encodeURIComponent(card.image!)}`}
                  alt={card.title}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <p className="mt-5 text-lg font-semibold text-zinc-900">
              {card.title}
            </p>
            <p className="mt-1.5 text-base leading-relaxed text-zinc-500">
              {card.description}
            </p>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
