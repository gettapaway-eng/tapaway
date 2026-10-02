import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@/lib/utils';

// The tag, rotatable by hand. Frames are the same 36-step turntable bake the
// iOS app plays as its lock mark (tapaway-ios tools/tag-render), packed into
// one 6×6 WebP sprite so turning it never waits on a network request.

const FRAMES = 36;
const COLUMNS = 6;
const PX_PER_FRAME = 7; // drag distance per frame — about one full turn per 250px
const SPRITE = `${import.meta.env.BASE_URL}tag/turntable.webp`;

function wrap(frame: number): number {
  return ((Math.round(frame) % FRAMES) + FRAMES) % FRAMES;
}

export function TagTurntable({ className }: { className?: string }) {
  const [frame, setFrame] = useState(0);
  const frameRef = useRef(0);
  const drag = useRef<{ x: number; frame: number; lastX: number; lastT: number; velocity: number } | null>(null);
  const raf = useRef<number | null>(null);

  const show = (value: number) => {
    frameRef.current = value;
    setFrame(wrap(value));
  };

  const stopMotion = () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
  };

  // One turn on arrival, decelerating, to say "this rotates" — then it only
  // moves when someone moves it. Skipped entirely for reduced motion.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const duration = 1600;
    let start: number | null = null;
    const step = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      show(eased * FRAMES);
      raf.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    const delay = window.setTimeout(() => (raf.current = requestAnimationFrame(step)), 350);
    return () => {
      window.clearTimeout(delay);
      stopMotion();
    };
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (drag.current) return; // ignore a second finger mid-drag
    stopMotion();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      x: event.clientX,
      frame: frameRef.current,
      lastX: event.clientX,
      lastT: performance.now(),
      velocity: 0,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state) return;
    const now = performance.now();
    const dt = Math.max(1, now - state.lastT);
    state.velocity = (event.clientX - state.lastX) / dt; // px per ms
    state.lastX = event.clientX;
    state.lastT = now;
    // Dragging right turns the tag the way a hand would spin it.
    show(state.frame - (event.clientX - state.x) / PX_PER_FRAME);
  }

  function onPointerUp() {
    const state = drag.current;
    drag.current = null;
    if (!state || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // A flick keeps turning and slows down, rather than stopping dead.
    let velocity = (-state.velocity * 16) / PX_PER_FRAME; // frames per 16ms
    if (Math.abs(velocity) < 0.15) return;
    const step = () => {
      velocity *= 0.94;
      show(frameRef.current + velocity);
      raf.current = Math.abs(velocity) > 0.05 ? requestAnimationFrame(step) : null;
    };
    raf.current = requestAnimationFrame(step);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    stopMotion();
    show(frameRef.current + (event.key === 'ArrowRight' ? -2 : 2));
  }

  const column = frame % COLUMNS;
  const row = Math.floor(frame / COLUMNS);

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="tapaway tag — drag or use arrow keys to turn it"
      aria-valuemin={0}
      aria-valuemax={FRAMES - 1}
      aria-valuenow={frame}
      aria-valuetext={`${Math.round((frame / FRAMES) * 360)}°`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      className={cn(
        'focus-ring relative aspect-square w-full cursor-grab touch-pan-y select-none active:cursor-grabbing',
        className,
      )}
    >
      {/* Contact shadow: grounds a pale tag on a pale tile. */}
      <div
        className="pointer-events-none absolute bottom-[14%] left-1/2 h-[7%] w-[50%] -translate-x-1/2 rounded-[50%] bg-zinc-900/20 blur-2xl"
        aria-hidden="true"
      />
      <div
        className="absolute inset-[12%] bg-no-repeat"
        style={{
          backgroundImage: `url(${SPRITE})`,
          backgroundSize: `${COLUMNS * 100}% ${(FRAMES / COLUMNS) * 100}%`,
          backgroundPosition: `${(column / (COLUMNS - 1)) * 100}% ${(row / (FRAMES / COLUMNS - 1)) * 100}%`,
        }}
      />
    </div>
  );
}

/** A small stack of tags — how many are in a pack, shown rather than told. */
export function TagStack({ count, className }: { count: number; className?: string }) {
  return (
    <span className={cn('relative inline-flex h-8 items-center', className)} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <img
          key={index}
          src={`${import.meta.env.BASE_URL}tag/tag-thumb.webp`}
          alt=""
          className="size-8 drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]"
          style={{ marginLeft: index === 0 ? 0 : -18 }}
        />
      ))}
    </span>
  );
}
