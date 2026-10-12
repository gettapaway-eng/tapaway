'use client';

import { useState, type SubmitEvent } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Trash2 } from 'lucide-react';
import HoldButton from '@/components/registry/hold-button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Logomark } from '@/components/site/logo';

// The web half of "Delete account" in the iOS app. Signing in uses the app's
// emailed code; the session lives only in memory, so nothing lingers in this
// browser once the tab closes. The deletion itself happens server-side.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
);

type Step = 'email' | 'code' | 'confirm' | 'done';

const WHAT_GOES = [
  'Your account and sign-in email',
  'Your tags — they can be set up again on any account',
  'Your schedules, settings and emergency unlocks',
];

export default function AccountDelete() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedEmail = email.trim().toLowerCase();

  async function sendCode(event?: SubmitEvent<HTMLFormElement>) {
    event?.preventDefault();
    setBusy(true);
    setError(null);
    // shouldCreateUser: false — this page must never create an account.
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (sendError) {
      setError(
        sendError.status === 429
          ? 'Too many codes requested. Wait a minute, then try again.'
          : 'No code was sent. Use the email you sign in to the tapaway app with.',
      );
      return;
    }
    setCode('');
    setStep('code');
  }

  async function verify(value: string) {
    setBusy(true);
    setError(null);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: value,
      type: 'email',
    });
    setBusy(false);
    if (verifyError || !data.session) {
      setError("That code didn't work. It may have expired — send a new one.");
      setCode('');
      return;
    }
    setToken(data.session.access_token);
    setStep('confirm');
  }

  async function deleteAccount() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (body.ok) {
        setToken(null);
        setStep('done');
        return;
      }
      if (body.error === 'not_signed_in') {
        setToken(null);
        setStep('code');
        setError('Your code timed out. Send a new one to continue.');
      } else if (body.error === 'admin_account') {
        setError('This is a staff account, so it can’t be deleted here. Ask another admin to remove it.');
      } else if (body.error === 'rate_limited') {
        setError('Too many attempts. Wait a few minutes, then try again.');
      } else {
        setError('We couldn’t delete your account just now. Nothing was removed — try again in a moment.');
      }
    } catch {
      setError('We couldn’t reach tapaway. Check your connection, then try again.');
    } finally {
      setBusy(false);
    }
  }

  function back(to: Step) {
    setError(null);
    setStep(to);
  }

  return (
    <main className="grid min-h-svh place-items-center bg-white px-4 py-12 text-[var(--ink)]">
      <div className="w-full max-w-[24rem]">
        <Link href="/" className="focus-ring inline-flex items-center gap-1.5 rounded-md text-[15px] font-semibold">
          <Logomark className="h-5 w-auto [&_path]:fill-[var(--ink)]" />
          tapaway
        </Link>

        <div className="mt-6 rounded-[20px] border border-zinc-200/80 p-6 shadow-[0_1px_0_rgb(0_0_0/0.03),0_18px_40px_-24px_rgb(18_52_86/0.35)]">
          {step === 'email' ? (
            <form onSubmit={sendCode}>
              <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Delete your account</h1>
              <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-600">
                First, confirm it’s you. We’ll email a 6-digit code to the address you use in the app.
              </p>
              <label className="mt-5 block">
                <span className="mb-1.5 block text-[13px] font-medium">Email</span>
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="focus-ring block h-12 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-[15px] hover:border-zinc-300"
                />
              </label>
              <button
                type="submit"
                disabled={busy || !normalizedEmail}
                className="press focus-ring mt-4 h-12 w-full rounded-full bg-[var(--ink)] text-[15px] font-semibold text-white hover:bg-[#3a3d42] disabled:opacity-50"
              >
                {busy ? 'Sending code…' : 'Email me a code'}
              </button>
            </form>
          ) : null}

          {step === 'code' ? (
            <div>
              <BackButton onClick={() => back('email')}>Change email</BackButton>
              <h1 className="mt-3 text-[22px] font-semibold tracking-[-0.02em]">Check your email</h1>
              <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-600">
                Enter the code sent to <span className="font-medium text-[var(--ink)]">{normalizedEmail}</span>.
              </p>
              <div className="mt-5">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  onComplete={verify}
                  disabled={busy}
                  autoFocus
                  inputMode="numeric"
                  pattern="^[0-9]*$"
                  aria-label="6-digit code"
                >
                  <InputOTPGroup className="w-full justify-between gap-2">
                    {Array.from({ length: 6 }, (_, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="h-12 w-11 rounded-xl border border-zinc-200 text-[18px] font-semibold shadow-none first:rounded-xl last:rounded-xl"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="mt-4 text-[13px] text-zinc-500">
                {busy ? (
                  'Checking…'
                ) : (
                  <>
                    Didn’t get it?{' '}
                    <button
                      type="button"
                      onClick={() => sendCode()}
                      className="focus-ring rounded font-medium text-[var(--ink)] underline underline-offset-4"
                    >
                      Send a new code
                    </button>
                  </>
                )}
              </p>
            </div>
          ) : null}

          {step === 'confirm' ? (
            <div>
              <h1 className="text-[22px] font-semibold tracking-[-0.02em]">This can’t be undone</h1>
              <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-600">
                Deleting <span className="font-medium text-[var(--ink)]">{normalizedEmail}</span> removes right away:
              </p>
              <ul className="mt-3 space-y-2 text-[14px]">
                {WHAT_GOES.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#e5484d]" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[13px] leading-relaxed text-zinc-500">
                Unlock in the app first if a session is running. Pre-orders aren’t affected and will still ship.
              </p>
              <HoldButton
                size="lg"
                radius={999}
                holdTime={1500}
                disabled={busy}
                backgroundColor="#fdecec"
                textColor="#d9343a"
                fillColor="#e5484d"
                fillTextColor="#ffffff"
                icon={<Trash2 className="size-4" />}
                glow={false}
                wave={false}
                resetAfter={0}
                doneLabel="Deleting…"
                className="mt-5 w-full"
                onHold={deleteAccount}
              >
                Hold to delete account
              </HoldButton>
              <button
                type="button"
                onClick={() => {
                  setToken(null);
                  back('email');
                }}
                className="focus-ring mt-2 h-11 w-full rounded-full text-[14px] font-medium text-zinc-600 hover:text-[var(--ink)]"
              >
                Keep my account
              </button>
            </div>
          ) : null}

          {step === 'done' ? (
            <div role="status">
              <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Your account is deleted</h1>
              <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-600">
                Everything tied to {normalizedEmail} is gone. The app signs you out the next time it connects — you can
                delete it from your phone.
              </p>
              <Link
                href="/"
                className="press focus-ring mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--ink)] text-[15px] font-semibold text-white hover:bg-[#3a3d42]"
              >
                Go to tapaway
              </Link>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function BackButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring -ml-1 inline-flex items-center gap-1 rounded-md px-1 text-[13px] text-zinc-500 hover:text-[var(--ink)]"
    >
      <ArrowLeft className="size-3.5" /> {children}
    </button>
  );
}
