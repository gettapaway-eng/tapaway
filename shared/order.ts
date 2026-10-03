import { z } from 'zod';
import {
  addressFormat,
  findCountry,
  isValidPostal,
  nationalDigits,
  normalizePostal,
  postalNoun,
  regionsFor,
  shipsTo,
  toE164,
} from './address.js';

// The pre-order form's rules, in one place. The checkout page validates with
// this schema as you type; api/orders.ts parses the request with the very same
// schema. Parsing is idempotent — the output is the same shape as the input,
// just trimmed and normalised — so the browser can send exactly what it
// validated and the server re-checks it without anything drifting.

export const LIMITS = {
  email: 254,
  fullName: 120,
  phone: 20,
  addressLine: 200,
  city: 100,
  region: 100,
  postalCode: 12,
} as const;

// Letters from any script, combining marks, spaces, and the punctuation real
// names carry (O’Brien, Jean-Luc, J. R.). No digits, no symbols.
const NAME = /^[\p{L}\p{M}][\p{L}\p{M}'’ .-]*$/u;
const HAS_LETTER = /\p{L}/u;
const HAS_ALNUM = /[\p{L}\p{N}]/u;
// Printable text only: no control characters sneaking into labels or emails.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
// Close to the WHATWG input[type=email] rule, plus a real TLD.
const EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/;

const collapse = (value: string) => value.trim().replace(/\s+/g, ' ');

// Every field is a plain string at the type level and all rules live in one
// superRefine below. That matters: zod skips object-level refinements when a
// field-level check fails, which would hide the postal-code error until the
// email was fixed. Here every field reports on the same pass.
const str = z.string().max(2000);

export const orderFieldsSchema = z
  .object({
    email: str,
    fullName: str,
    phoneCountry: str,
    phone: str,
    country: str,
    addressLine1: str,
    addressLine2: str,
    city: str,
    region: str,
    postalCode: str,
  })
  .transform((value) => ({
    email: value.email.trim().toLowerCase(),
    fullName: collapse(value.fullName),
    phoneCountry: value.phoneCountry.trim().toUpperCase(),
    phone: nationalDigits(value.phone),
    country: value.country.trim().toUpperCase(),
    addressLine1: collapse(value.addressLine1),
    addressLine2: collapse(value.addressLine2),
    city: collapse(value.city),
    region: collapse(value.region),
    postalCode: normalizePostal(value.country.trim().toUpperCase(), value.postalCode),
  }))
  .superRefine((value, ctx) => {
    const fail = (path: OrderField, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });

    for (const key of Object.keys(value) as OrderField[]) {
      if (CONTROL.test(value[key])) fail(key, 'Remove any unusual characters.');
    }

    if (!value.email) fail('email', 'Enter your email address.');
    else if (value.email.length > LIMITS.email) fail('email', 'That email address is too long.');
    else if (!EMAIL.test(value.email) || value.email.includes('..'))
      fail('email', 'Enter a valid email, like name@example.com.');

    if (value.fullName.length < 2) fail('fullName', 'Enter your full name.');
    else if (value.fullName.length > LIMITS.fullName) fail('fullName', `Keep this under ${LIMITS.fullName} characters.`);
    else if (!NAME.test(value.fullName)) fail('fullName', 'Use letters only — no numbers or symbols.');

    const country = findCountry(value.country);
    if (!value.country) fail('country', 'Choose a country.');
    else if (!country || !shipsTo(country.code)) fail('country', "We can't ship there yet.");

    if (value.addressLine1.length < 3 || !HAS_ALNUM.test(value.addressLine1))
      fail('addressLine1', 'Enter the first line of your address.');
    else if (value.addressLine1.length > LIMITS.addressLine)
      fail('addressLine1', `Keep this under ${LIMITS.addressLine} characters.`);
    if (value.addressLine2.length > LIMITS.addressLine)
      fail('addressLine2', `Keep this under ${LIMITS.addressLine} characters.`);

    if (value.city.length < 2) fail('city', 'Enter your city.');
    else if (value.city.length > LIMITS.city) fail('city', `Keep this under ${LIMITS.city} characters.`);
    else if (!HAS_LETTER.test(value.city)) fail('city', 'Enter a city name, not a number.');

    // Required: the courier needs a number to reach the recipient.
    if (!value.phone) fail('phone', 'Enter your mobile number.');
    else if (value.phone.length > LIMITS.phone) fail('phone', 'That number is too long.');
    else if (!findCountry(value.phoneCountry)) fail('phone', 'Choose a country code.');
    else if (!toE164(value.phoneCountry, value.phone)) fail('phone', 'Check the number — it looks too short or too long.');

    // Region and postal rules depend on the country; skip them until it's set.
    if (!country) return;
    const format = addressFormat(country.code);

    const regions = regionsFor(country.code);
    const regionNoun = format.regionLabel.toLowerCase();
    if (regions) {
      if (!value.region) fail('region', `Choose a ${regionNoun}.`);
      else if (!regions.some((region) => region.code === value.region)) fail('region', `Choose a ${regionNoun} from the list.`);
    } else if (value.region.length > LIMITS.region) {
      fail('region', `Keep this under ${LIMITS.region} characters.`);
    }

    const postal = postalNoun(country.code);
    if (value.postalCode.length > LIMITS.postalCode) fail('postalCode', `That ${postal} is too long.`);
    else if (!value.postalCode && !format.postalOptional) fail('postalCode', `Enter your ${postal}.`);
    else if (!isValidPostal(country.code, value.postalCode)) {
      const example = format.postalPlaceholder ? `, like ${format.postalPlaceholder}` : '';
      fail('postalCode', `Enter a valid ${postal}${example}.`);
    }
  });

export type OrderFieldsInput = z.input<typeof orderFieldsSchema>;
export type OrderFields = z.output<typeof orderFieldsSchema>;
export type OrderField = keyof OrderFieldsInput;

/** The row we store: names spelled out for people reading the admin, phone in E.164. */
export function toOrderContact(fields: OrderFields) {
  const country = findCountry(fields.country)!;
  const region = regionsFor(fields.country)?.find((candidate) => candidate.code === fields.region);
  return {
    email: fields.email,
    fullName: fields.fullName,
    phone: toE164(fields.phoneCountry, fields.phone)!,
    addressLine1: fields.addressLine1,
    addressLine2: fields.addressLine2 || null,
    city: fields.city,
    region: region?.name ?? (fields.region || null),
    // The column is NOT NULL; countries without postal codes store ''.
    postalCode: fields.postalCode,
    country: country.name,
    notes: null,
  };
}

/** Flattens zod issues to the first message per field, for the API's 400 body. */
export function fieldErrors(error: z.ZodError): Partial<Record<OrderField, string>> {
  const out: Partial<Record<OrderField, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in out)) out[key as OrderField] = issue.message;
  }
  return out;
}
