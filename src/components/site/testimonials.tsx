const testimonials = [
  {
    quote:
      "Every day was a mess of priorities, but this tool organizes my workflow and keeps me on track. A game-changer for my output!",
    name: "Mia Lopez",
    role: "Design Lead",
    gradient: "from-orange-200 to-orange-400",
  },
  {
    quote:
      "I always missed deadlines before, yet I'm consistently hitting targets and feel less stressed. Truly boosts my daily concentration!",
    name: "Alex Rivera",
    role: "Marketing Head",
    gradient: "from-zinc-300 to-zinc-500",
  },
  {
    quote:
      "Switching between apps was a headache, but the unified dashboard cuts through the noise and simplifies my process. Excellent value!",
    name: "Tom Kinsley",
    role: "Sales Director",
    gradient: "from-blue-200 to-blue-400",
  },
  {
    quote:
      "The constant distractions were overwhelming, but now I maintain a deep focus and finish complex projects faster. Can't live without it!",
    name: "Sarah Jones",
    role: "Freelance Writer",
    gradient: "from-rose-200 to-rose-400",
  },
];

function TestimonialCard({
  quote,
  name,
  role,
  gradient,
}: (typeof testimonials)[number]) {
  return (
    <div className="flex w-[300px] shrink-0 gap-4 rounded-3xl bg-zinc-100 p-5 sm:w-auto">
      <div
        className={`h-20 w-20 shrink-0 rounded-2xl bg-gradient-to-br ${gradient}`}
      />
      <div className="flex flex-col justify-between">
        <p className="text-[12px] leading-relaxed text-zinc-700">
          &ldquo;{quote}&rdquo;
        </p>
        <div className="mt-3">
          <p className="text-[12px] font-semibold text-zinc-900">{name}</p>
          <p className="text-[11px] text-zinc-500">{role}</p>
        </div>
      </div>
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 sm:px-10">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          What our beta
          <br />
          clients are saying
        </h2>
        <p className="mt-4 text-[13px] text-zinc-500">
          Our financial management platform is transforming the way people
          manage their money. Here&apos;s what some of our users have to say
          about their experience.
        </p>
      </div>

      <div className="mt-14 flex gap-6 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
        {testimonials.map((t) => (
          <TestimonialCard key={t.name} {...t} />
        ))}
      </div>
    </section>
  );
}
