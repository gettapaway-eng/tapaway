import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center bg-white px-6 text-center text-[var(--ink)]">
      <div>
        <h1 className="text-[2rem] font-semibold tracking-[-0.03em]">This page doesn’t exist</h1>
        <p className="mt-2 text-[15px] text-zinc-600">The link may be old, or the address mistyped.</p>
        <Link
          href="/"
          className="press focus-ring mt-7 inline-flex h-12 items-center rounded-full bg-[var(--ink)] px-7 text-[15px] font-semibold text-white hover:bg-[#3a3d42]"
        >
          Go to tapaway
        </Link>
      </div>
    </main>
  );
}
