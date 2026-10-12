import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, List, Mail, Section } from '@/components/site/legal';

export const metadata: Metadata = {
  title: 'Privacy Policy — tapaway',
  description: 'How tapaway collects, uses and protects your personal data, and your rights over it.',
  alternates: { canonical: '/privacy' },
};

const B = ({ children }: { children: string }) => (
  <strong className="font-semibold text-[var(--ink)]">{children}</strong>
);

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="October 12, 2026"
      intro={
        <p>
          Welcome to tapaway. We respect your privacy and are committed to protecting your personal data. This policy explains how we look after your
          data when you use the tapaway iPhone app or visit tapaway.today, and tells you about your privacy rights.
        </p>
      }
    >
      <Section id="collect" title="Information We Collect">
        <p>We may collect, use and store the following kinds of personal data:</p>
        <List>
          <li>
            <B>Identity Data:</B> your email address and an account ID, used to sign you in.
          </li>
          <li>
            <B>App Data:</B> the tags you add (their names and the keys that let the app recognise them), your
            schedules, your settings and your remaining emergency unlocks, synced so your setup works across devices.
          </li>
          <li>
            <B>Order Data:</B> your name, email, phone number, shipping address, what you ordered and its payment
            status.
          </li>
          <li>
            <B>Waitlist Data:</B> your email address, if you join the waitlist.
          </li>
          <li>
            <B>Technical Data:</B> your IP address and basic request information, used briefly to keep the service
            secure and prevent abuse.
          </li>
        </List>
        <p>
          Some things never leave your iPhone: your focus sessions, your modes and the apps you choose to block.
          Apple’s Screen Time doesn’t even tell us which apps those are. We never see or store your card details;
          payments are handled by our payment provider.
        </p>
        <p>
          We don’t use advertising, third-party analytics or tracking in the app or on the website, and the website
          sets no tracking cookies. Your browser keeps your cart locally on your device so it isn’t lost on a refresh.
        </p>
      </Section>

      <Section id="use" title="How We Use Your Information">
        <p>We use your personal data to:</p>
        <List>
          <li>provide and maintain the app and website</li>
          <li>sign you in and sync your setup between your devices</li>
          <li>process your payment, and pack, ship and update you about your order</li>
          <li>email you about launch and updates if you joined the waitlist</li>
          <li>respond to your support requests</li>
          <li>detect and prevent fraud or abuse</li>
          <li>keep records the law requires, such as for tax</li>
        </List>
      </Section>

      <Section id="sharing" title="Data Sharing">
        <p>
          We do not sell your personal data. We share it only with trusted service providers who help us run tapaway
          (hosting, database, payments and email) and with shipping carriers, who receive the name, address and phone
          number on your order to deliver it. They may use your data only to provide their service to us. Some of them
          store data outside India. We may also disclose information when the law requires it.
        </p>
      </Section>

      <Section id="retention" title="Data Retention">
        <List>
          <li>
            <B>Account and App Data</B> is kept until you delete your account. Deletion is immediate; copies in our
            backups expire shortly after.
          </li>
          <li>
            <B>Order Data</B> is kept as long as needed for delivery, support, refunds, and tax and accounting
            records.
          </li>
          <li>
            <B>Waitlist Data</B> is kept until launch, or until you unsubscribe or ask us to remove it.
          </li>
        </List>
      </Section>

      <Section id="deletion" title="Deleting Your Account">
        <p>
          You can delete your account at any time from Settings in the app, or at{' '}
          <Link href="/account/delete" className="font-medium text-[var(--ink)] underline underline-offset-4">
            tapaway.today/account/delete
          </Link>
          . This permanently removes your account, tags, schedules and settings, and frees your tags so they can be set
          up again. Orders you’ve placed aren’t affected.
        </p>
      </Section>

      <Section id="security" title="Data Security">
        <p>
          We have put appropriate security measures in place to prevent your personal data from being lost, used or
          accessed without authorisation. Data is encrypted in transit, and access is limited to the people and
          services that need it to run tapaway. If a breach affects your data, we’ll let you know.
        </p>
      </Section>

      <Section id="children" title="Children">
        <p>
          tapaway is not meant for children under 13, and we don’t knowingly collect their data. If you believe a child
          has given us personal data, contact us and we’ll delete it.
        </p>
      </Section>

      <Section id="rights" title="Your Rights">
        <p>You have the right to:</p>
        <List>
          <li>access your personal data</li>
          <li>correct inaccurate data</li>
          <li>request deletion of your data</li>
          <li>object to processing of your data</li>
          <li>request a copy of your data to transfer elsewhere</li>
          <li>withdraw consent at any time</li>
        </List>
        <p>
          To use any of these rights, email <Mail />. We’ll respond within 30 days.
        </p>
      </Section>

      <Section id="changes" title="Changes to This Policy">
        <p>
          We may update this policy from time to time. We’ll change the date at the top, and tell you in the app or by
          email if a change is significant.
        </p>
      </Section>

      <Section id="contact" title="Contact Us">
        <p>
          If you have any questions about this Privacy Policy, please contact us at <Mail />.
        </p>
      </Section>
    </LegalPage>
  );
}
