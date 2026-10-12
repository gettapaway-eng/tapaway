'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ComponentProps,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { Controller, useForm, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Check, ChevronDown, Copy, Minus, Plus, X } from 'lucide-react';
import { ShopHeader } from '@/components/shop/shop-header';
import { TagStack, TagTurntable } from '@/components/shop/tag-turntable';
import { ShippingLabel, type LabelValues } from '@/components/shop/shipping-label';
import { Combobox, Field, Flag, TextInput, describedBy, type ComboOption } from '@/components/shop/form-controls';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useCart } from '@/lib/cart';
import { cn } from '@/lib/utils';
import {
  DEPOSIT_CENTS,
  MAX_QUANTITY_PER_PACK,
  balanceCents,
  formatPrice,
  type PricedLine,
} from '@shared/packs';
import {
  SHIPS_TO,
  addressFormat,
  findCountry,
  flagEmoji,
  formatNational,
  nationalDigits,
  normalizePostal,
  regionsFor,
  splitInternational,
} from '@shared/address';
import { LIMITS, orderFieldsSchema, type OrderField, type OrderFields, type OrderFieldsInput } from '@shared/order';

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

const ERROR_COPY: Record<string, string> = {
  invalid_input: 'A few details need another look.',
  invalid_cart: 'Your selection changed since this page loaded. Go back to the tags, choose again, and retry.',
  rate_limited: 'Too many attempts from this connection. Wait a few minutes and try again.',
  timeout: 'That took too long to go through. Check your connection and try again — you won’t be charged twice.',
  // Anything that failed on our side. The server says no more than that.
  unavailable: 'We couldn’t save your pre-order just now. Nothing was charged — try again in a moment.',
};
const FALLBACK_ERROR = 'Your pre-order didn’t go through, and nothing was charged. Check your connection and try again.';
const DISPOSABLE_COPY = 'That looks like a temporary address. Use one you’ll still have when your tags ship.';

const SUBMIT_TIMEOUT_MS = 20_000;

// ---------------------------------------------------------------------------
// Draft: an unsent form survives a reload or a trip back to change packs.
// sessionStorage, so it's gone when the tab is — addresses don't linger.
// ---------------------------------------------------------------------------

const DRAFT_KEY = 'tapaway.checkout.draft.v1';
const FIELD_NAMES: OrderField[] = [
  'email',
  'fullName',
  'phoneCountry',
  'phone',
  'country',
  'addressLine1',
  'addressLine2',
  'city',
  'region',
  'postalCode',
];

function guessCountry(): string {
  try {
    for (const tag of navigator.languages ?? [navigator.language]) {
      const region = new Intl.Locale(tag).maximize().region;
      if (region && SHIPS_TO.some((country) => country.code === region)) return region;
    }
  } catch {
    // Old browser without Intl.Locale — fall through.
  }
  return 'US';
}

function blankForm(): OrderFieldsInput {
  const country = guessCountry();
  return {
    email: '',
    fullName: '',
    phoneCountry: country,
    phone: '',
    country,
    addressLine1: '',
    addressLine2: '',
    city: '',
    region: '',
    postalCode: '',
  };
}

function loadDraft(): (OrderFieldsInput & { dialPicked?: boolean }) | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const draft = blankForm();
    for (const name of FIELD_NAMES) {
      const value = (parsed as Record<string, unknown>)[name];
      if (typeof value === 'string' && value.length <= 2000) draft[name] = value;
    }
    if (!findCountry(draft.country)) draft.country = blankForm().country;
    if (!findCountry(draft.phoneCountry)) draft.phoneCountry = draft.country;
    return { ...draft, dialPicked: (parsed as Record<string, unknown>).dialPicked === true };
  } catch {
    return null;
  }
}

function saveDraft(values: Partial<OrderFieldsInput>, dialPicked: boolean) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...values, dialPicked }));
  } catch {
    // Storage full or blocked: the form still works, it just won't survive a reload.
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear.
  }
}

// ---------------------------------------------------------------------------
// "Did you mean gmail.com?" — catches the typos that would otherwise mean we
// can never reach someone about the tags they reserved.
// ---------------------------------------------------------------------------

const COMMON_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'yahoo.co.uk',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'rediffmail.com',
];

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

function suggestEmail(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const domain = email.slice(at + 1).toLowerCase();
  if (domain.length < 4 || COMMON_DOMAINS.includes(domain)) return null;
  let best: { domain: string; score: number } | null = null;
  for (const candidate of COMMON_DOMAINS) {
    const score = distance(domain, candidate);
    if (score <= 2 && (!best || score < best.score)) best = { domain: candidate, score };
  }
  return best ? `${email.slice(0, at)}@${best.domain}` : null;
}

// ---------------------------------------------------------------------------
// Steps: three short screens instead of one long one. Each step validates
// only its own fields before moving on; the URL carries the step so the
// browser's back button walks back through them.
// ---------------------------------------------------------------------------

type Step = 'contact' | 'shipping' | 'review';

const STEPS: { id: Step; label: string; title: string; fields: OrderField[] }[] = [
  { id: 'contact', label: 'Contact', title: 'Your details', fields: ['email', 'fullName', 'phoneCountry', 'phone'] },
  {
    id: 'shipping',
    label: 'Delivery',
    title: 'Delivery address',
    fields: ['country', 'addressLine1', 'addressLine2', 'city', 'region', 'postalCode'],
  },
  { id: 'review', label: 'Review', title: 'Review your pre-order', fields: [] },
];

const stepIndex = (step: Step) => STEPS.findIndex((entry) => entry.id === step);
const stepOfField = (field: OrderField): Step => STEPS.find((entry) => entry.fields.includes(field))?.id ?? 'contact';

function stepFromUrl(): Step {
  const value = new URLSearchParams(window.location.search).get('step');
  return STEPS.some((entry) => entry.id === value) ? (value as Step) : 'contact';
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export interface Placed {
  reference: string;
  email: string;
  lines: PricedLine[];
  totalTags: number;
  subtotalCents: number;
  label: LabelValues;
}

// What the customer reserved, kept for the trip to Dodo's checkout and back,
// so the return page can show the stamped label. sessionStorage: same tab
// only, gone when it closes.
const PENDING_KEY = 'tapaway.checkout.pending.v1';

function savePending(placed: Placed) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(placed));
  } catch {
    // Without storage the return page shows a plainer confirmation.
  }
}

export function loadPending(reference: string): Placed | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? 'null') as Placed | null;
    return parsed?.reference === reference && parsed.label && Array.isArray(parsed.lines) ? parsed : null;
  } catch {
    return null;
  }
}

/** Once the pre-order is paid: forget the selection, the draft and the snapshot. */
export function clearAfterPayment() {
  clearDraft();
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Nothing to clear.
  }
}

export default function Checkout() {
  const { priced, ready } = useCart();

  // The saved cart loads after mount; don't flash "empty" before it has.
  if (!ready) return <div className="min-h-svh bg-white" />;
  if (priced.lines.length === 0) return <EmptyCart />;
  return <CheckoutForm />;
}

function CheckoutForm() {
  const { lines, priced } = useCart();
  const draft = useMemo(loadDraft, []);
  // Until someone picks a dial code themselves, it follows the shipping country.
  const dialPicked = useRef(draft?.dialPicked ?? false);
  const honeypot = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [banner, setBanner] = useState<string | null>(null);
  // Keep the last message while the banner collapses, so it doesn't blank first.
  const lastBanner = useRef<string | null>(null);
  if (banner) lastBanner.current = banner;

  const form = useForm<OrderFieldsInput, unknown, OrderFields>({
    resolver: zodResolver(orderFieldsSchema),
    defaultValues: draft ?? blankForm(),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    shouldFocusError: true,
  });
  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    setFocus,
    trigger,
    getFieldState,
    formState: { errors, isSubmitting, isSubmitted },
  } = form;

  const values = useWatch({ control }) as OrderFieldsInput;
  const country = values.country;
  const format = addressFormat(country);
  const regions = regionsFor(country);

  // Which steps would pass right now — decides how far the breadcrumb lets you jump.
  const issues = useMemo(() => {
    const result = orderFieldsSchema.safeParse(values);
    return new Set(result.success ? [] : result.error.issues.map((issue) => issue.path[0] as OrderField));
  }, [values]);
  const stepValid = (index: number) => STEPS[index].fields.every((field) => !issues.has(field));
  const furthest = stepValid(0) ? (stepValid(1) ? 2 : 1) : 0;

  // --- step + history ------------------------------------------------------

  const [step, setStep] = useState<Step>(() => STEPS[Math.min(stepIndex(stepFromUrl()), furthest)].id);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const stepChanged = useRef(false);
  const furthestRef = useRef(furthest);
  furthestRef.current = furthest;

  const goTo = useCallback(
    (next: Step, { push = true } = {}) => {
      setStep((current) => {
        if (current === next) return current;
        setDirection(stepIndex(next) > stepIndex(current) ? 'forward' : 'back');
        stepChanged.current = true;
        return next;
      });
      setBanner(null);
      if (push) window.history.pushState({ step: next }, '', `?step=${next}`);
    },
    [],
  );

  useEffect(() => {
    window.history.replaceState({ step }, '', `?step=${step}`);
    // A deep link to a step you haven't earned lands on the furthest one you have.
    const onPop = () => {
      const target = STEPS[Math.min(stepIndex(stepFromUrl()), furthestRef.current)].id;
      if (target !== stepFromUrl()) window.history.replaceState({ step: target }, '', `?step=${target}`);
      goTo(target, { push: false });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Land focus somewhere useful on each new step: the first field with a mouse
  // and keyboard, the heading on touch (so the keyboard doesn't leap up).
  useEffect(() => {
    if (!stepChanged.current) return;
    stepChanged.current = false;
    window.scrollTo({ top: 0 });
    const first = STEPS[stepIndex(step)].fields.find((field) => field !== 'phoneCountry');
    if (first && window.matchMedia('(pointer: fine)').matches) setFocus(first);
    else headingRef.current?.focus({ preventScroll: true });
  }, [step, setFocus]);

  async function next() {
    const current = STEPS[stepIndex(step)];
    if (!(await trigger(current.fields, { shouldFocus: true }))) return;
    goTo(STEPS[stepIndex(step) + 1].id);
  }

  // --- persistence ---------------------------------------------------------

  // Debounced so typing doesn't hammer storage, and flushed on pagehide so a
  // reload inside the debounce loses nothing.
  const latest = useRef(values);
  latest.current = values;
  const [redirecting, setRedirecting] = useState(false);
  // Back from Dodo's checkout, the browser may restore this page from its
  // back/forward cache mid-"redirecting"; unlock the form when it does.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => event.persisted && setRedirecting(false);
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);
  const pendingFocus = useRef<OrderField | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => saveDraft(values, dialPicked.current), 300);
    return () => window.clearTimeout(timer);
  }, [values]);
  useEffect(() => {
    const flush = () => saveDraft(latest.current, dialPicked.current);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  // --- options -------------------------------------------------------------

  const countryOptions = useMemo<ComboOption[]>(
    () =>
      SHIPS_TO.map((entry) => ({
        value: entry.code,
        label: entry.name,
        keywords: [entry.code, `+${entry.dial}`],
        leading: <Flag emoji={flagEmoji(entry.code)} />,
      })),
    [],
  );
  const dialOptions = useMemo<ComboOption[]>(
    () =>
      SHIPS_TO.map((entry) => ({
        value: entry.code,
        label: entry.name,
        detail: `+${entry.dial}`,
        keywords: [entry.code, entry.dial, `+${entry.dial}`],
        leading: <Flag emoji={flagEmoji(entry.code)} />,
      })),
    [],
  );
  const regionOptions = useMemo<ComboOption[] | undefined>(
    () => regions?.map((region) => ({ value: region.code, label: region.name, keywords: [region.code] })),
    [regions],
  );

  // --- country-dependent fields --------------------------------------------

  /** Re-check fields that depend on the country — but only ones the person has already met. */
  function revalidateDependents() {
    const seen = (name: OrderField) => isSubmitted || getFieldState(name).isTouched;
    const dependents = (['region', 'postalCode', 'phone'] as const).filter(seen);
    if (dependents.length) void trigger(dependents);
  }

  function changeCountry(code: string) {
    const nextRegions = regionsFor(code);
    setValue('country', code, { shouldDirty: true, shouldValidate: true });
    // A Texas "region" makes no sense once the country is Canada.
    if (nextRegions ? !nextRegions.some((region) => region.code === values.region) : regions) {
      setValue('region', '', { shouldDirty: true });
    }
    if (!dialPicked.current) setValue('phoneCountry', code, { shouldDirty: true });
    queueMicrotask(revalidateDependents);
  }

  // Browser autofill writes the country and state into hidden inputs as text
  // ("India", "IN", "Karnataka", "KA"); map them back onto the dropdowns.
  function autofillCountry(text: string) {
    const needle = text.trim().toLowerCase();
    const match = SHIPS_TO.find((entry) => entry.code.toLowerCase() === needle || entry.name.toLowerCase() === needle);
    if (match && match.code !== values.country) changeCountry(match.code);
  }
  function autofillRegion(text: string) {
    const needle = text.trim().toLowerCase();
    const list = regionsFor(form.getValues('country'));
    if (!list) {
      setValue('region', text, { shouldDirty: true });
      return;
    }
    const match = list.find((region) => region.code.toLowerCase() === needle || region.name.toLowerCase() === needle);
    if (match) setValue('region', match.code, { shouldDirty: true, shouldValidate: isSubmitted });
  }

  // --- submit --------------------------------------------------------------

  /** Send someone back to the step that owns a field, and focus it once the form unlocks. */
  function sendBackTo(field: OrderField) {
    goTo(stepOfField(field));
    pendingFocus.current = field;
  }

  async function submit(fields: OrderFields) {
    setBanner(null);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ fields, items: lines, company: honeypot.current?.value || undefined }),
      });
      const body = (await response.json().catch(() => null)) as
        | { ok: true; reference: string; checkoutUrl: string }
        | { ok: false; error: string; fields?: Partial<Record<OrderField, string>> }
        | null;

      if (response.ok && body?.ok) {
        // Off to Dodo's hosted checkout. The cart and draft stay until the
        // return page confirms payment, so backing out loses nothing.
        savePending({
          reference: body.reference,
          email: fields.email,
          lines: priced.lines,
          totalTags: priced.totalTags,
          subtotalCents: priced.subtotalCents,
          label: fields,
        });
        setRedirecting(true);
        window.location.assign(body.checkoutUrl);
        return;
      }

      if (body && !body.ok && body.error === 'disposable_email') {
        setError('email', { type: 'server', message: DISPOSABLE_COPY });
        sendBackTo('email');
        return;
      }
      if (body && !body.ok && body.fields) {
        const entries = Object.entries(body.fields) as [OrderField, string][];
        for (const [name, message] of entries) setError(name, { type: 'server', message });
        if (entries[0]) {
          sendBackTo(entries[0][0]);
          return;
        }
      }
      setBanner((body && !body.ok && ERROR_COPY[body.error]) || FALLBACK_ERROR);
    } catch (error) {
      setBanner(error instanceof DOMException && error.name === 'AbortError' ? ERROR_COPY.timeout : FALLBACK_ERROR);
    } finally {
      window.clearTimeout(timer);
    }
  }

  function onInvalid(invalid: FieldErrors<OrderFieldsInput>) {
    // Steps validate as you go, so this only fires if something slipped past
    // (an edited draft, say): take them to it.
    const first = FIELD_NAMES.find((name) => name in invalid);
    if (first) sendBackTo(first);
  }

  // Server-flagged fields can't take focus mid-request (the fieldset is
  // disabled), so focus lands once the form unlocks and the step has rendered.
  useEffect(() => {
    if (isSubmitting || !pendingFocus.current) return;
    const field = pendingFocus.current;
    pendingFocus.current = null;
    requestAnimationFrame(() => setFocus(field));
  }, [isSubmitting, step, setFocus]);

  // --- render --------------------------------------------------------------

  const emailSuggestion = !errors.email ? suggestEmail(values.email.trim()) : null;
  // Digits-only formats get the number pad — unless a hyphen is mandatory
  // (PL "00-000"), which iOS's number pad can't type.
  const postalSource = format.postalPattern?.source ?? '';
  const postalNumeric =
    Boolean(postalSource) && !/[A-Za-z]/.test(postalSource.replace(/\\d/g, '')) && !postalSource.includes('}-\\d');
  const index = stepIndex(step);

  return (
    <Shell>
      <main className="mx-auto grid max-w-6xl gap-8 px-4 pb-20 pt-1 sm:px-8 lg:grid-cols-[minmax(0,27rem)_minmax(0,30rem)] lg:justify-between lg:gap-16 lg:pt-3">
        <form
          onSubmit={(event) => {
            // Enter on steps 1–2 means "Continue", not "place the order".
            if (step !== 'review') {
              event.preventDefault();
              void next();
              return;
            }
            void handleSubmit(submit, onInvalid)(event);
          }}
          noValidate
          className="min-w-0 lg:col-start-2 lg:row-start-1 lg:pt-4"
        >
          <Breadcrumb>
            <BreadcrumbList className="gap-1.5 text-[13px] text-zinc-400 sm:gap-2">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/shop" className="focus-ring rounded-sm hover:text-zinc-900">
                    Tags
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {STEPS.map((entry, i) => (
                <Crumb
                  key={entry.id}
                  label={entry.label}
                  state={i === index ? 'current' : i <= furthest ? 'reachable' : 'locked'}
                  onSelect={() => goTo(entry.id)}
                />
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mt-4 text-[2rem] leading-[1.1] font-semibold tracking-[-0.03em] text-[var(--ink)] outline-none sm:text-[2.25rem]"
          >
            {STEPS[index].title}
          </h1>

          {step !== 'review' ? <MobileSummary /> : null}

          {/* Disabled while sending: nothing can change under an in-flight order. */}
          <fieldset disabled={isSubmitting || redirecting} className="contents">
            <div key={step} data-dir={direction} className="shop-step mt-7 space-y-4">
              {step === 'contact' ? (
                <>
                  <Field
                    id="email"
                    label="Email"
                    error={errors.email?.message}
                    hint={
                      emailSuggestion ? (
                        <span>
                          Did you mean{' '}
                          <button
                            type="button"
                            onClick={() =>
                              setValue('email', emailSuggestion, { shouldValidate: true, shouldDirty: true })
                            }
                            className="focus-ring rounded font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900"
                          >
                            {emailSuggestion}
                          </button>
                          ?
                        </span>
                      ) : null
                    }
                  >
                    <TextInput
                      {...register('email')}
                      {...describedBy('email', errors.email?.message)}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="off"
                      spellCheck={false}
                      placeholder="you@example.com"
                      maxLength={LIMITS.email}
                    />
                  </Field>

                  <Field id="fullName" label="Full name" error={errors.fullName?.message}>
                    <TextInput
                      {...register('fullName')}
                      {...describedBy('fullName', errors.fullName?.message)}
                      autoComplete="name"
                      autoCapitalize="words"
                      maxLength={LIMITS.fullName}
                    />
                  </Field>

                  <Field id="phone" label="Mobile number" error={errors.phone?.message}>
                    <PhoneInput
                      countryCode={values.phoneCountry}
                      dialOptions={dialOptions}
                      invalid={Boolean(errors.phone)}
                      onCountryChange={(code) => {
                        dialPicked.current = true;
                        setValue('phoneCountry', code, { shouldDirty: true });
                        if (getFieldState('phone').isTouched || isSubmitted) void trigger('phone');
                      }}
                      input={
                        <Controller
                          control={control}
                          name="phone"
                          render={({ field }) => (
                            <input
                              ref={field.ref}
                              name={field.name}
                              value={field.value}
                              onChange={(event) => {
                                const raw = event.target.value;
                                // A pasted or autofilled "+44 7700…" carries its own country.
                                const split = splitInternational(raw, values.phoneCountry);
                                if (split) {
                                  dialPicked.current = true;
                                  setValue('phoneCountry', split.countryCode, { shouldDirty: true });
                                  field.onChange(formatNational(split.countryCode, split.national));
                                  return;
                                }
                                field.onChange(raw.replace(/[^\d\s()-]/g, '').slice(0, LIMITS.phone + 6));
                              }}
                              onBlur={() => {
                                const digits = nationalDigits(field.value);
                                if (digits) field.onChange(formatNational(values.phoneCountry, digits));
                                field.onBlur();
                              }}
                              {...describedBy('phone', errors.phone?.message)}
                              type="tel"
                              inputMode="tel"
                              autoComplete="tel"
                              placeholder={
                                values.phoneCountry === 'US' || values.phoneCountry === 'CA' ? '(415) 555-0123' : ''
                              }
                              className="h-full min-w-0 flex-1 bg-transparent pr-3.5 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400"
                            />
                          )}
                        />
                      }
                    />
                  </Field>
                </>
              ) : null}

              {step === 'shipping' ? (
                <>
                  <Field id="country" label="Country or region" error={errors.country?.message}>
                    <Controller
                      control={control}
                      name="country"
                      render={({ field }) => (
                        <Combobox
                          ref={field.ref}
                          {...describedBy('country', errors.country?.message)}
                          options={countryOptions}
                          value={field.value}
                          onChange={changeCountry}
                          onBlur={field.onBlur}
                          placeholder="Choose a country"
                          searchPlaceholder="Search countries"
                          emptyText="We don’t ship there yet"
                        />
                      )}
                    />
                    <HiddenAutofill autoComplete="country" onFill={autofillCountry} />
                  </Field>

                  <Field id="addressLine1" label="Address line 1" error={errors.addressLine1?.message}>
                    <TextInput
                      {...register('addressLine1')}
                      {...describedBy('addressLine1', errors.addressLine1?.message)}
                      autoComplete="address-line1"
                      placeholder="House number and street"
                      maxLength={LIMITS.addressLine}
                    />
                  </Field>
                  <Field id="addressLine2" label="Address line 2" optional error={errors.addressLine2?.message}>
                    <TextInput
                      {...register('addressLine2')}
                      {...describedBy('addressLine2', errors.addressLine2?.message)}
                      autoComplete="address-line2"
                      placeholder="Apartment, suite, floor"
                      maxLength={LIMITS.addressLine}
                    />
                  </Field>

                  <Field id="city" label={format.cityLabel} error={errors.city?.message}>
                    <TextInput
                      {...register('city')}
                      {...describedBy('city', errors.city?.message)}
                      autoComplete="address-level2"
                      maxLength={LIMITS.city}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <Field
                      id="region"
                      label={format.regionLabel}
                      optional={!regionOptions}
                      error={errors.region?.message}
                    >
                      {regionOptions ? (
                        <>
                          <Controller
                            control={control}
                            name="region"
                            render={({ field }) => (
                              <Combobox
                                ref={field.ref}
                                {...describedBy('region', errors.region?.message)}
                                options={regionOptions}
                                value={field.value}
                                onChange={(code) => field.onChange(code)}
                                onBlur={field.onBlur}
                                placeholder="Choose"
                                searchPlaceholder={`Search ${format.regionLabel.toLowerCase()}s`}
                                contentClassName="min-w-[18rem]"
                              />
                            )}
                          />
                          <HiddenAutofill autoComplete="address-level1" onFill={autofillRegion} />
                        </>
                      ) : (
                        <TextInput
                          {...register('region')}
                          {...describedBy('region', errors.region?.message)}
                          autoComplete="address-level1"
                          maxLength={LIMITS.region}
                        />
                      )}
                    </Field>

                    <Field
                      id="postalCode"
                      label={format.postalLabel}
                      optional={format.postalOptional}
                      error={errors.postalCode?.message}
                    >
                      <TextInput
                        {...register('postalCode', {
                          onBlur: (event) => {
                            const normalized = normalizePostal(country, event.target.value);
                            if (normalized !== event.target.value)
                              setValue('postalCode', normalized, { shouldValidate: true });
                          },
                        })}
                        {...describedBy('postalCode', errors.postalCode?.message)}
                        autoComplete="postal-code"
                        inputMode={postalNumeric ? 'numeric' : 'text'}
                        autoCapitalize={format.postalUppercase ? 'characters' : 'off'}
                        spellCheck={false}
                        placeholder={format.postalPlaceholder}
                        maxLength={LIMITS.postalCode}
                        className={cn('tabular', format.postalUppercase && 'uppercase placeholder:normal-case')}
                      />
                    </Field>
                  </div>
                </>
              ) : null}

              {step === 'review' ? (
                <>
                  {/* On desktop the label lives in the panel beside the form. */}
                  <div className="rounded-[22px] bg-[var(--sky)] p-4 lg:hidden">
                    <ShippingLabel values={values} />
                  </div>
                  <div className="flex gap-4 text-[14px]">
                    <TextButton onClick={() => goTo('contact')}>Edit details</TextButton>
                    <TextButton onClick={() => goTo('shipping')}>Edit address</TextButton>
                  </div>
                  <div className="pt-2">
                    <h2 className="text-[15px] font-semibold text-[var(--ink)]">Your pre-order</h2>
                    <OrderSummary />
                  </div>
                </>
              ) : null}
            </div>
          </fieldset>

          {/* Honeypot: hidden from people and screen readers; bots fill it. */}
          <input
            ref={honeypot}
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute h-0 w-0 opacity-0"
          />

          <div
            className={cn(
              'grid transition-[grid-template-rows,opacity] duration-200 ease-[var(--ease-out-strong)]',
              banner ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="overflow-hidden">
              <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-[14px] leading-snug text-red-700">
                {banner ?? lastBanner.current}
              </p>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            {index > 0 ? (
              <button
                type="button"
                onClick={() => goTo(STEPS[index - 1].id)}
                disabled={isSubmitting}
                className="press focus-ring h-12 rounded-full border border-zinc-200 px-5 text-[15px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Back
              </button>
            ) : null}
            {step === 'review' ? (
              <SubmitButton
                submitting={isSubmitting || redirecting}
                label={`Pre-order · Pay ${formatPrice(DEPOSIT_CENTS)}`}
              />
            ) : (
              <button
                type="submit"
                className="press focus-ring h-12 flex-1 rounded-full bg-[var(--ink)] px-6 text-[15px] font-semibold text-white hover:bg-[#3a3d42]"
              >
                Continue
              </button>
            )}
          </div>
          {step === 'review' ? (
            <p className="mt-3 text-center text-[13px] text-zinc-500">
              You’ll pay {formatPrice(DEPOSIT_CENTS)} securely with Dodo Payments.{' '}
              {balanceCents(priced.subtotalCents) > 0
                ? `The remaining ${formatPrice(balanceCents(priced.subtotalCents))} is due when we ship.`
                : null}
            </p>
          ) : null}
        </form>

        <ObjectPanel values={values} />
      </main>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-white text-zinc-900">
      <ShopHeader />
      {children}
    </div>
  );
}

function Crumb({
  label,
  state,
  onSelect,
}: {
  label: string;
  state: 'current' | 'reachable' | 'locked';
  onSelect: () => void;
}) {
  return (
    <>
      <BreadcrumbSeparator className="text-zinc-300" />
      <BreadcrumbItem>
        {state === 'current' ? (
          <BreadcrumbPage className="font-medium text-zinc-900">{label}</BreadcrumbPage>
        ) : state === 'reachable' ? (
          <BreadcrumbLink asChild>
            <button type="button" onClick={onSelect} className="focus-ring rounded-sm hover:text-zinc-900">
              {label}
            </button>
          </BreadcrumbLink>
        ) : (
          // Not yet: the steps before it still need finishing.
          <span aria-disabled="true" className="text-zinc-300">
            {label}
          </span>
        )}
      </BreadcrumbItem>
    </>
  );
}

function PhoneInput({
  countryCode,
  dialOptions,
  invalid,
  onCountryChange,
  input,
}: {
  countryCode: string;
  dialOptions: ComboOption[];
  invalid: boolean;
  onCountryChange: (code: string) => void;
  input: ReactNode;
}) {
  const dial = findCountry(countryCode)?.dial ?? '';
  return (
    <div
      data-invalid={invalid || undefined}
      className={cn(
        'flex h-12 items-stretch rounded-xl border border-zinc-200 bg-white transition-[border-color,box-shadow] duration-150 hover:border-zinc-300',
        'has-[:focus-visible]:border-[var(--focus-blue)] has-[:focus-visible]:shadow-[0_0_0_3px_rgb(47_123_246/0.18)]',
        'data-[invalid]:border-red-400 data-[invalid]:has-[:focus-visible]:border-red-500 data-[invalid]:has-[:focus-visible]:shadow-[0_0_0_3px_rgb(239_68_68/0.16)]',
      )}
    >
      <Combobox
        id="phoneCountry"
        variant="bare"
        aria-label={`Country code, ${findCountry(countryCode)?.name ?? 'none'} +${dial}`}
        options={dialOptions}
        value={countryCode}
        onChange={onCountryChange}
        placeholder="+"
        searchPlaceholder="Search countries or codes"
        renderValue={(option) => (
          <>
            {option.leading}
            <span className="tabular text-zinc-600">+{dial}</span>
          </>
        )}
        className="shrink-0 gap-1.5 rounded-l-xl pl-3 pr-2 [&>svg]:ml-0 [&>svg]:size-3.5"
        contentClassName="w-[20rem]"
      />
      <span className="my-3 w-px shrink-0 bg-zinc-200" aria-hidden="true" />
      <span className="w-2.5 shrink-0" aria-hidden="true" />
      {input}
    </div>
  );
}

/**
 * An off-screen text input that browsers will autofill (they skip custom
 * dropdowns). Whatever lands here is mapped onto the real control.
 */
function HiddenAutofill({ autoComplete, onFill }: { autoComplete: string; onFill: (value: string) => void }) {
  return (
    <input
      type="text"
      tabIndex={-1}
      aria-hidden="true"
      autoComplete={autoComplete}
      defaultValue=""
      onChange={(event) => event.target.value && onFill(event.target.value)}
      className="pointer-events-none absolute size-px overflow-hidden opacity-0"
    />
  );
}

function SubmitButton({ submitting, label }: { submitting: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      aria-busy={submitting}
      className="press focus-ring relative grid h-12 flex-1 place-items-center overflow-hidden rounded-full bg-[var(--ink)] px-6 text-[15px] font-semibold text-white hover:bg-[#3a3d42] disabled:cursor-wait"
    >
      {/* Two labels crossfading through a slight blur read as one label changing. */}
      <span
        className={cn(
          'col-start-1 row-start-1 transition-[opacity,filter] duration-200',
          submitting ? 'opacity-0 blur-[2px]' : 'opacity-100 blur-0',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'col-start-1 row-start-1 flex items-center gap-2.5 transition-[opacity,filter] duration-200',
          submitting ? 'opacity-100 blur-0' : 'opacity-0 blur-[2px]',
        )}
        aria-hidden={!submitting}
      >
        <Spinner /> Opening secure payment…
      </span>
    </button>
  );
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin [animation-duration:650ms]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** The object you're reserving, and the label you're writing for it. Sticky beside the form on desktop. */
function ObjectPanel({ values }: { values: OrderFieldsInput }) {
  const { priced } = useCart();
  return (
    <aside
      aria-label="Your parcel"
      className="relative hidden h-[calc(100svh-7rem)] max-h-[780px] min-h-[600px] flex-col overflow-hidden rounded-[28px] bg-[var(--sky)] p-6 lg:sticky lg:top-4 lg:col-start-1 lg:row-start-1 lg:flex"
    >
      {/* Tag and label sit together in the open space; totals anchor the bottom. */}
      <div className="flex flex-1 flex-col justify-center">
        <div className="relative mx-auto w-[min(100%,270px)]">
          <TagTurntable />
        </div>
        <ShippingLabel values={values} className="-mt-8" />
      </div>
      <div className="flex items-end justify-between gap-4 pt-6 text-[var(--ink)]">
        <div>
          <p className="text-[15px] font-semibold">{summaryLine(priced.lines)}</p>
          <p className="mt-0.5 text-[13px] text-[var(--ink)]/70">Pay {formatPrice(DEPOSIT_CENTS)} today</p>
        </div>
        <p className="text-right">
          <span className="tabular block text-[1.625rem] leading-none font-semibold tracking-[-0.02em]">
            {formatPrice(priced.subtotalCents)}
          </span>
          <span className="mt-1 block text-[13px] text-[var(--ink)]/70">total</span>
        </p>
      </div>
    </aside>
  );
}

/** "2 tags" or "3 tags, in 2 packs". */
function summaryLine(lines: PricedLine[]): string {
  const tags = lines.reduce((sum, line) => sum + line.tags * line.quantity, 0);
  const packs = lines.reduce((sum, line) => sum + line.quantity, 0);
  return `${tags} tag${tags === 1 ? '' : 's'}${packs > 1 ? `, in ${packs} packs` : ''}`;
}

function TextButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring rounded-sm font-medium text-[var(--ink)] underline decoration-zinc-300 underline-offset-[5px] transition-[text-decoration-color] duration-150 hover:decoration-[var(--ink)]"
    >
      {children}
    </button>
  );
}

function OrderSummary() {
  const { priced, setQuantity, remove } = useCart();
  return (
    <>
      <ul className="mt-3 divide-y divide-zinc-100 border-y border-zinc-100">
        {priced.lines.map((line) => (
          <li key={line.packId} className="flex items-center gap-3 py-3">
            <TagStack count={line.tags} />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-[var(--ink)]">{line.name}</p>
              <p className="tabular text-[12px] text-zinc-500">{formatPrice(line.unitPriceCents)} per pack</p>
            </div>
            <div className="flex items-center rounded-full border border-zinc-200">
              <IconButton
                label={line.quantity === 1 ? `Remove ${line.name}` : `One fewer ${line.name}`}
                onClick={() => (line.quantity === 1 ? remove(line.packId) : setQuantity(line.packId, line.quantity - 1))}
              >
                {line.quantity === 1 ? <X className="size-3.5" /> : <Minus className="size-3.5" />}
              </IconButton>
              <span className="tabular w-5 text-center text-[14px] font-semibold" aria-live="polite">
                {line.quantity}
              </span>
              <IconButton
                label={`One more ${line.name}`}
                onClick={() => setQuantity(line.packId, line.quantity + 1)}
                disabled={line.quantity >= MAX_QUANTITY_PER_PACK}
              >
                <Plus className="size-3.5" />
              </IconButton>
            </div>
          </li>
        ))}
      </ul>

      <dl className="tabular mt-3 space-y-1.5 text-[14px]">
        <div className="flex justify-between text-zinc-500">
          <dt>Total</dt>
          <dd>{formatPrice(priced.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between text-zinc-500">
          <dt>Due when we ship</dt>
          <dd>{formatPrice(balanceCents(priced.subtotalCents))}</dd>
        </div>
        <div className="flex justify-between pt-1 text-[16px] font-semibold text-[var(--ink)]">
          <dt>Pay today</dt>
          <dd>{formatPrice(DEPOSIT_CENTS)}</dd>
        </div>
      </dl>
    </>
  );
}

/** Below lg the panel folds into a sky strip at the top, with the order inside. */
function MobileSummary() {
  const { priced } = useCart();
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5 rounded-[20px] bg-[var(--sky)] text-[var(--ink)] lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-summary"
        className="press focus-ring flex w-full items-center gap-3 rounded-[20px] py-2.5 pl-2.5 pr-4 text-left"
      >
        <img
          src={`/tag/tag-thumb.webp`}
          alt=""
          className="size-11 drop-shadow-[0_4px_8px_rgba(18,52,86,0.25)]"
        />
        <span className="flex-1 text-[14px] font-semibold">{summaryLine(priced.lines)}</span>
        <span className="tabular text-[15px] font-semibold">{formatPrice(priced.subtotalCents)}</span>
        <ChevronDown
          className={cn('size-4 transition-transform duration-200 ease-[var(--ease-out-strong)]', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
      <div
        id="mobile-summary"
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-[var(--ease-out-strong)]',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
        inert={!open}
      >
        <div className="overflow-hidden">
          <div className="mx-2 mb-2 rounded-[14px] bg-white px-3.5 pb-3.5">
            <OrderSummary />
          </div>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  label,
  className,
  ...props
}: { label: string } & Omit<ComponentProps<'button'>, 'aria-label' | 'type'>) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
      className={cn(
        'press focus-ring grid size-8 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30',
        className,
      )}
    />
  );
}

function EmptyCart() {
  return (
    <Shell>
      <main className="mx-auto max-w-md px-5 pt-16 text-center sm:pt-24">
        <img src={`/tag/tag-thumb.webp`} alt="" className="mx-auto size-20 opacity-60" />
        <h1 className="mt-5 text-[2rem] font-semibold tracking-[-0.03em] text-[var(--ink)]">No tags chosen yet</h1>
        <p className="mt-2 text-[15px] text-zinc-600">Choose how many tags you’d like to pre-order.</p>
        <Link
          href="/shop"
          className="press focus-ring mt-7 inline-flex h-12 items-center rounded-full bg-[var(--ink)] px-7 text-[15px] font-semibold text-white hover:bg-[#3a3d42]"
        >
          Choose tags
        </Link>
      </main>
    </Shell>
  );
}

export function Confirmation({ placed }: { placed: Placed }) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);
  useEffect(() => () => void (copiedTimer.current && window.clearTimeout(copiedTimer.current)), []);

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(placed.reference);
      setCopied(true);
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked: the reference is still on the label to select by hand.
    }
  }

  const rise = (i: number) => ({ '--i': i }) as CSSProperties;

  return (
    <Shell>
      <main className="mx-auto max-w-[27rem] px-4 pb-24 pt-6 sm:pt-12">
        <h1 className="shop-rise text-[2.25rem] leading-[1.05] font-semibold tracking-[-0.03em] text-[var(--ink)]">
          Your pre-order is confirmed
        </h1>
        <p className="shop-rise mt-3 text-[15px] leading-relaxed text-pretty text-zinc-600" style={rise(1)}>
          You paid {formatPrice(DEPOSIT_CENTS)} today. We’ll email{' '}
          <span className="font-medium text-[var(--ink)]">{placed.email}</span> before anything ships
          {balanceCents(placed.subtotalCents) > 0
            ? `, when the remaining ${formatPrice(balanceCents(placed.subtotalCents))} is due.`
            : '.'}
        </p>

        <div className="shop-rise mt-7 rounded-[28px] bg-[var(--sky)] p-4 sm:p-5" style={rise(2)}>
          <ShippingLabel values={placed.label} reference={placed.reference} stamped />
          <div className="mt-4 flex items-center justify-between gap-3 px-1 text-[var(--ink)]">
            <p className="text-[14px]">
              <span className="font-semibold">{summaryLine(placed.lines)}</span>
              <span className="tabular text-[var(--ink)]/70"> · {formatPrice(placed.subtotalCents)} total</span>
            </p>
            <button
              type="button"
              onClick={copyReference}
              className="press focus-ring relative grid h-9 shrink-0 place-items-center rounded-full bg-white/55 px-3.5 text-[13px] font-semibold hover:bg-white/75"
            >
              {/* Label swap through a slight blur reads as one label changing. */}
              <span
                className={cn(
                  'col-start-1 row-start-1 flex items-center gap-1.5 transition-[opacity,filter] duration-200',
                  copied ? 'opacity-0 blur-[2px]' : 'opacity-100',
                )}
              >
                <Copy className="size-3.5" /> Copy reference
              </span>
              <span
                className={cn(
                  'col-start-1 row-start-1 flex items-center gap-1.5 transition-[opacity,filter] duration-200',
                  copied ? 'opacity-100' : 'opacity-0 blur-[2px]',
                )}
                aria-hidden={!copied}
              >
                <Check className="size-3.5" strokeWidth={2.5} /> Copied
              </span>
              <span className="sr-only" aria-live="polite">
                {copied ? 'Reference copied' : ''}
              </span>
            </button>
          </div>
        </div>

        <Link
          href="/"
          className="shop-rise focus-ring mt-6 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-zinc-600 transition-colors duration-150 hover:text-zinc-900"
          style={rise(3)}
        >
          <ArrowLeft className="size-4" /> Back to tapaway
        </Link>
      </main>
    </Shell>
  );
}
