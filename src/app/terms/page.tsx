import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, List, Mail, Section } from '@/components/site/legal';

export const metadata: Metadata = {
  title: 'Terms — tapaway',
  description: 'The terms for using the tapaway app and website, and for tapaway pre-orders.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      updated="12 October 2026"
      intro={
        <p>
          These terms apply when you use the tapaway iPhone app, tapaway.today, or pre-order tapaway tags. tapaway is
          run by Aaqif Shafi, an individual based in India (“we”). By using tapaway you agree to these terms and to
          our{' '}
          <Link href="/privacy" className="font-medium text-[var(--ink)] underline underline-offset-4">
            privacy policy
          </Link>
          .
        </p>
      }
    >
      <Section id="using" title="Using tapaway">
        <p>
          You need to be at least 13 to use tapaway, and if you’re under 18 you need a parent or guardian’s permission.
          You’re responsible for your account and for keeping access to the email you sign in with, since that’s how
          you get back in.
        </p>
      </Section>

      <Section id="blocking" title="How blocking works">
        <p>
          tapaway uses Apple’s Screen Time to block the apps you choose until you tap one of your tags again. That’s
          the point, but it means you may not be able to open those apps when you want to. Please keep in mind:
        </p>
        <List>
          <li>
            Each account has a limited number of emergency unlocks for when you can’t reach your tag. Once they’re used
            up, you’ll need a tag to unlock.
          </li>
          <li>
            Keep your tags somewhere safe. If you lose them, an emergency unlock gets you back in so you can add a new one.
          </li>
          <li>
            Don’t block apps you might need in an emergency. Phone calls and emergency services stay available, but
            tapaway is a focus tool, not a safety device.
          </li>
          <li>
            Blocking depends on iOS and Screen Time, which Apple can change. We’ll keep tapaway working as best we
            can, but we can’t promise it always will.
          </li>
        </List>
      </Section>

      <Section id="pre-orders" title="Pre-orders">
        <List>
          <li>
            A pre-order reserves tags from our first production run. You pay a $5.00 deposit at checkout; the rest
            of the price is due when we ship. We’ll email you before then.
          </li>
          <li>
            Prices are shown in US dollars at checkout. The price you see when you pre-order is the price you pay.
          </li>
          <li>
            Payments are processed by Dodo Payments, which acts as the merchant of record and may show on your
            statement.
          </li>
          <li>
            Ship dates are estimates. If yours changes we’ll tell you, and you can cancel for a refund if it no longer
            works for you.
          </li>
          <li>
            Please give a correct shipping address and phone number. Once your order ships we’ll send tracking details,
            and the carrier is responsible for delivery from then.
          </li>
        </List>
      </Section>

      <Section id="refunds" title="Cancellations and refunds">
        <p>
          You can cancel a pre-order and get your $5.00 deposit back within 14 days of paying. Email <Mail /> with your
          order reference (it starts with TA-). After 14 days the deposit isn’t refundable, except in the cases below.
        </p>
        <p>
          We’ll refund your deposit in full if we cancel your order, can’t deliver to your address, or move your ship
          date and you no longer want to wait. Refunds go back to the original payment method and can take 5–10
          business days to appear. Nothing here limits any rights you have under consumer law.
        </p>
      </Section>

      <Section id="acceptable-use" title="Fair use">
        <p>Please don’t:</p>
        <List>
          <li>try to break into, overload or reverse-engineer the app, the website or our systems</li>
          <li>use someone else’s account or email without permission</li>
          <li>use tapaway to break the law</li>
        </List>
        <p>If you do, we may suspend or close your account.</p>
      </Section>

      <Section id="ownership" title="Ownership">
        <p>
          The tapaway app, website, name and designs belong to us. You may use them for your own personal use under
          these terms. Your data stays yours.
        </p>
      </Section>

      <Section id="ending" title="Ending your account">
        <p>
          You can delete your account at any time in the app’s Settings, or at{' '}
          <Link href="/account/delete" className="font-medium text-[var(--ink)] underline underline-offset-4">
            tapaway.today/account/delete
          </Link>
          . Deletion is immediate and permanent. Your tags keep working with a new account.
        </p>
      </Section>

      <Section id="liability" title="Warranty and liability">
        <p>
          We work hard to make tapaway reliable, but it’s provided “as is”, without warranties beyond those the law
          requires. To the extent the law allows, we aren’t liable for indirect or consequential losses, and our total
          liability to you is limited to what you’ve paid us in the 12 months before the claim.
        </p>
      </Section>

      <Section id="law" title="Governing law">
        <p>
          These terms are governed by the laws of India, and disputes go to the courts of India. If you live elsewhere,
          you keep any consumer protections your local law gives you.
        </p>
      </Section>

      <Section id="changes" title="Changes and contact">
        <p>
          We may update these terms. We’ll change the date at the top, and tell you in the app or by email if the change
          matters. Questions? Email <Mail />.
        </p>
      </Section>
    </LegalPage>
  );
}
