import { PhoneFrame } from "@/components/site/phone-frame";
import { TaskRow } from "@/components/site/mockup-bits";

const steps = [
  {
    title: "Download the app.",
    description:
      "Explore the features designed to keep you organized and on track.",
  },
  {
    title: "Set up your workspace.",
    description:
      "Explore the features designed to keep you organized and on track.",
  },
  {
    title: "Get to work.",
    description:
      "Explore the features designed to keep you organized and on track.",
  },
];

function StepsList() {
  return (
    <div>
      <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
        Get started in
        <br />
        3 simple steps.
      </h2>

      <ol className="relative mt-10 space-y-10 border-l border-dashed border-zinc-300 pl-8">
        {steps.map((step, i) => (
          <li key={step.title} className="relative">
            {i === 0 && (
              <span className="absolute -left-[41px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white">
                1
              </span>
            )}
            <p className="text-lg font-semibold text-zinc-900">
              {step.title}
            </p>
            <p className="mt-1 max-w-xs text-[13px] text-zinc-500">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function GetToWorkMock() {
  return (
    <div className="relative flex justify-center pb-6 pt-10">
      <div className="absolute -top-2 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        <span className="rounded-full bg-black px-3 py-1.5 text-[9px] font-semibold text-white shadow-lg">
          App store
        </span>
        <span className="rounded-full bg-white px-3 py-1.5 text-[9px] font-semibold text-zinc-900 shadow-lg">
          Play store
        </span>
      </div>

      <PhoneFrame className="w-[220px]" screenClassName="min-h-[380px]">
        <div className="px-4 pt-1">
          <p className="text-[9px] text-zinc-400">Thu, 20 February</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-[13px] font-bold text-zinc-900">
              Good morning, Rona
            </p>
            <span className="text-sm">👋</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["10", "Consistent"],
              ["0", "Overdue"],
              ["4", "Completed"],
            ].map(([n, l]) => (
              <div key={l} className="rounded-xl bg-zinc-100 p-2 text-center">
                <p className="text-[13px] font-bold text-zinc-900">{n}</p>
                <p className="text-[7px] text-zinc-400">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </PhoneFrame>

      <div className="absolute bottom-2 left-[calc(50%+30px)] w-[170px] rounded-2xl bg-white p-3 shadow-xl">
        <p className="mb-1 text-[11px] font-semibold text-zinc-900">
          Get to work
        </p>
        <TaskRow title="Final Design Review" done />
        <TaskRow title="Landing page" />
        <TaskRow title="Wireframe Homepage" />
      </div>
    </div>
  );
}

export function Steps() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 sm:px-10">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <StepsList />
        <div className="rounded-3xl bg-zinc-100 pt-4">
          <GetToWorkMock />
          <div className="border-t border-zinc-200/70 bg-white px-8 py-7 text-center rounded-b-3xl">
            <p className="text-[15px] font-semibold text-zinc-900">
              Get to work
            </p>
            <p className="mt-1 text-[12px] text-zinc-500">
              Organize your tasks, track progress, and achieve more.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
