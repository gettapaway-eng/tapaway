import { useState, type SubmitEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Logomark } from '@/components/site/logo';
import { supabase } from '@/lib/supabase';

// Same emailed-code sign-in the iOS app uses. `shouldCreateUser: false`, so
// this form can never mint an account — admins sign in with an existing one.
export function AdminSignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedEmail = email.trim().toLowerCase();

  async function sendCode(event?: SubmitEvent<HTMLFormElement>) {
    event?.preventDefault();
    setBusy(true);
    setError(null);
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (sendError) {
      setError(
        sendError.status === 429
          ? 'Too many codes requested. Wait a minute, then try again.'
          : "No code was sent. Check the address — it must belong to an account that has signed in to the app.",
      );
    } else {
      setCode('');
      setStep('code');
    }
  }

  async function verify(token: string) {
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({ email: normalizedEmail, token, type: 'email' });
    setBusy(false);
    if (verifyError) {
      setError("That code didn't work. It may have expired — request a new one.");
      setCode('');
    }
  }

  return (
    <div className="grid min-h-svh place-items-center px-5">
      <div className="w-full max-w-[22rem]">
        <div className="flex items-center gap-2">
          <Logomark className="h-6 w-auto [&_path]:fill-foreground" />
          <span className="text-lg font-semibold tracking-tight">tapaway</span>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">Admin</span>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.12)]">
          {step === 'email' ? (
            <form onSubmit={sendCode}>
              <h1 className="text-[17px] font-semibold">Sign in</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">We'll email you a 6-digit code.</p>
              <label className="mt-5 block">
                <span className="mb-1.5 block text-[13px] font-medium text-foreground">Email</span>
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="focus-ring block h-11 w-full rounded-xl bg-background border border-border px-3.5 text-[15px] hover:border-input"
                />
              </label>
              <button
                type="submit"
                disabled={busy || !normalizedEmail}
                className="press focus-ring mt-4 h-11 w-full rounded-xl bg-primary text-[14px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {busy ? 'Sending code…' : 'Email me a code'}
              </button>
            </form>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setError(null);
                }}
                className="focus-ring -ml-1 inline-flex items-center gap-1 rounded-md px-1 text-[13px] text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" /> Change email
              </button>
              <h1 className="mt-3 text-[17px] font-semibold">Check your email</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Enter the code sent to <span className="font-medium text-foreground">{normalizedEmail}</span>.
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
                        className="h-12 w-11 rounded-xl border border-border text-[18px] font-semibold shadow-none first:rounded-xl last:rounded-xl"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="mt-4 text-[13px] text-muted-foreground">
                {busy ? (
                  'Checking…'
                ) : (
                  <>
                    Didn't get it?{' '}
                    <button
                      type="button"
                      onClick={() => sendCode()}
                      className="focus-ring rounded font-medium text-foreground underline underline-offset-4"
                    >
                      Send a new code
                    </button>
                  </>
                )}
              </p>
            </div>
          )}

          {error ? (
            <p role="alert" className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
