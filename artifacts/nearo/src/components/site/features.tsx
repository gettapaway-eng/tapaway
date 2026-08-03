import { PhoneFrame } from "@/components/site/phone-frame";
import { AvatarDot, TaskRow } from "@/components/site/mockup-bits";

function FeatureCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl bg-zinc-100 pt-10">
      <div className="flex min-h-[280px] items-end justify-center px-8">
        {children}
      </div>
      <div className="mt-6 border-t border-zinc-200/70 bg-white px-8 py-7 text-center">
        <p className="text-[15px] font-semibold text-zinc-900">{title}</p>
        <p className="mt-1 text-[12px] text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

function TaskManagementMock() {
  return (
    <div className="w-[260px] rounded-2xl bg-white p-4 shadow-xl">
      <TaskRow title="User Testing" date="Feb 19" done strike />
      <TaskRow title="Wireframe Homepage" subtitle="Temlis" date="Feb 20" done />
      <div className="flex items-center gap-2 pt-2 opacity-40">
        <span className="h-4 w-4 rounded-full border-2 border-zinc-300" />
        <span className="h-2 w-24 rounded bg-zinc-200" />
      </div>
    </div>
  );
}

function TimeTrackingMock() {
  return (
    <PhoneFrame className="w-[220px]" screenClassName="min-h-[400px]">
      <div className="px-4 pt-1">
        <p className="text-[9px] text-zinc-400">Thu, 20 February</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-[13px] font-bold text-zinc-900">
            Good morning, Rona
          </p>
          <span className="text-sm">👋</span>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-zinc-900 px-3 py-2 text-white">
          <span className="text-[9px] font-medium">Work this week</span>
          <span className="text-[10px] font-semibold">12:09:07</span>
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
        <div className="mt-3">
          <TaskRow title="Final Design Review" subtitle="Produlis App" done />
        </div>
      </div>
    </PhoneFrame>
  );
}

function CollaborationMock() {
  return (
    <PhoneFrame className="w-[220px]" screenClassName="min-h-[400px]">
      <div className="px-4 pt-1">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold text-zinc-900">My tasks</p>
          <div className="flex -space-x-1.5">
            <AvatarDot />
            <AvatarDot />
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-zinc-900 text-[8px] font-semibold text-white">
              +3
            </span>
          </div>
        </div>
        <p className="mt-2 text-[9px] font-semibold tracking-wide text-zinc-400">
          TOP PRIORITY
        </p>
        <TaskRow title="Final Design Review" subtitle="Produlis App" done />
        <TaskRow title="Landing page" subtitle="Temlis" date="Feb 20" />
      </div>
    </PhoneFrame>
  );
}

function GoalSettingMock() {
  return (
    <div className="w-[260px] rounded-2xl bg-white p-4 shadow-xl">
      <div className="flex items-center gap-2">
        <span className="text-base">🏆</span>
        <div>
          <p className="text-[9px] text-zinc-400">Goals</p>
          <p className="text-[12px] font-semibold text-zinc-900">
            Rona Zepri
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ["Task", "10", "20"],
          ["Time", "10h", "20h"],
          ["Projects", "5", "10"],
        ].map(([label, done, total]) => (
          <div key={label} className="rounded-xl bg-zinc-50 p-2 text-center">
            <p className="text-[8px] text-zinc-400">{label}</p>
            <p className="text-[12px] font-bold text-zinc-900">
              {done}
              <span className="text-[9px] font-normal text-zinc-400">
                /{total}
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 sm:px-8">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Features designed
          <br />
          for your success.
        </h2>
        <p className="mt-4 text-[13px] text-zinc-500">
          Explore the features designed to
          <br />
          keep you organized and on track.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <FeatureCard
          title="Task Management"
          description="Stay on top of everything, from to-dos to long-term projects."
        >
          <TaskManagementMock />
        </FeatureCard>
        <FeatureCard
          title="Time Tracking"
          description="Stay on top of everything, from to-dos to long-term projects."
        >
          <TimeTrackingMock />
        </FeatureCard>
        <FeatureCard
          title="Collaboration Tools"
          description="Tools — Share tasks, track projects, and work efficiently with team."
        >
          <CollaborationMock />
        </FeatureCard>
        <FeatureCard
          title="Goal Setting"
          description="Break down your goals into actionable tasks and track progress."
        >
          <GoalSettingMock />
        </FeatureCard>
      </div>
    </section>
  );
}
