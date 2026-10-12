import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, List, Mail, Section } from '@/components/site/legal';

export const metadata: Metadata = {
  title: 'Terms & Conditions — tapaway',
  description: 'The terms for using the tapaway app and website, and for buying tapaway tags.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      updated="October 12, 2026"
      intro={
        <p>
          These terms apply to the tapaway iPhone app, tapaway.today and tapaway tags.
        </p>
      }
    >
      <Section id="agreement" title="Agreement to Terms">
        <p>
          By accessing or using tapaway, you agree to be bound by these terms and by our{' '}
          <Link href="/privacy" className="font-medium text-[var(--ink)] underline underline-offset-4">
            Privacy Policy
          </Link>
          . If you do not agree, please do not use the service. You must be at least 13 to use tapaway, and if you’re
          under 18 you need a parent or guardian’s permission.
        </p>
      </Section>

      <Section id="use" title="Use of Service">
        <p>
          tapaway is an app and NFC tags that block the apps you choose until you tap a tag again. You agree to:
        </p>
        <List>
          <li>provide accurate information and keep access to the email you sign in with</li>
          <li>keep your account and devices secure</li>
          <li>not use the service for any illegal or unauthorised purpose</li>
          <li>not try to break into, overload or reverse-engineer the app, website or our systems</li>
          <li>not use someone else’s account without permission</li>
        </List>
      </Section>

      <Section id="blocking" title="App Blocking">
        <p>
          tapaway uses Apple’s Screen Time to block apps. That’s the point, but it means you may not be able to open
          blocked apps when you want to. You understand that:
        </p>
        <List>
          <li>
            Each account has a limited number of emergency unlocks for when you can’t reach your tag. Once they’re used
            up, you’ll need a tag to unlock.
          </li>
          <li>
            You should keep your tags somewhere safe. If you lose them, an emergency unlock gets you back in so you can
            add a new one.
          </li>
          <li>
            You shouldn’t block apps you might need in an emergency. Phone calls and emergency services stay available,
            but tapaway is a focus tool, not a safety device.
          </li>
          <li>
            Blocking depends on iOS and Screen Time, which Apple can change. We’ll keep tapaway working as best we can,
            but we can’t guarantee it.
          </li>
        </List>
      </Section>

      <Section id="orders" title="Orders and Payment">
        <List>
          <li>
            You pay the full price at checkout. Prices are shown in US dollars, and the price you see when you order is
            the price you pay.
          </li>
          <li>
            Payments are processed by Dodo Payments, which acts as the merchant of record and may appear on your
            statement.
          </li>
          <li>
            We’ll email you when your order ships, with tracking details. Delivery times are estimates; if yours is
            delayed we’ll tell you.
          </li>
          <li>
            Please give a correct shipping address and phone number. Once your order ships, the carrier is responsible
            for delivery.
          </li>
        </List>
      </Section>

      <Section id="refunds" title="Cancellations, Returns and Refunds">
        <List>
          <li>
            You can cancel your order for a full refund any time before it ships. Email <Mail /> with your order
            reference (it starts with TA-).
          </li>
          <li>
            You can return unused tags in their original packaging within 14 days of delivery for a refund of the price
            you paid for them. Email us first; return shipping is yours to cover.
          </li>
          <li>
            If a tag arrives damaged or doesn’t work, tell us within 14 days of delivery and we’ll replace it or refund
            you in full, including shipping.
          </li>
          <li>We’ll refund you in full if we cancel your order or can’t deliver to your address.</li>
        </List>
        <p>
          Refunds go back to the original payment method and can take 5–10 business days to appear. Nothing here limits
          your rights under consumer law.
        </p>
      </Section>

      <Section id="ownership" title="Content Ownership">
        <p>
          Your data stays yours. The tapaway app, website, name and designs belong to us, and you may use them for your
          personal use under these terms.
        </p>
      </Section>

      <Section id="termination" title="Account Termination">
        <p>
          You can delete your account at any time from Settings in the app, or at{' '}
          <Link href="/account/delete" className="font-medium text-[var(--ink)] underline underline-offset-4">
            tapaway.today/account/delete
          </Link>
          . Deletion is immediate and permanent, and your tags keep working with a new account. We may suspend or close
          your account if you break these terms.
        </p>
      </Section>

      <Section id="liability" title="Limitation of Liability">
        <p>
          tapaway is provided “as is”, without warranties beyond those the law requires. To the extent the law allows,
          we will not be liable for any indirect, incidental, special or consequential damages resulting from your use
          of, or inability to use, the service, and our total liability to you is limited to what you’ve paid us in the
          12 months before the claim.
        </p>
      </Section>

      <Section id="law" title="Governing Law">
        <p>
          These terms are governed by the laws of India, and disputes go to the courts of India. If you live elsewhere,
          you keep any consumer protections your local law gives you.
        </p>
      </Section>

      <Section id="changes" title="Modifications to Terms">
        <p>
          We may update these terms from time to time. We’ll change the date at the top, and tell you in the app or by
          email if a change is significant. Continuing to use tapaway after a change means you accept the updated
          terms.
        </p>
      </Section>

      <Section id="contact" title="Contact Information">
        <p>
          If you have any questions about these Terms & Conditions, please contact us at <Mail />.
        </p>
      </Section>
    </LegalPage>
  );
}
