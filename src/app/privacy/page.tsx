import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, List, Mail, Section } from '@/components/site/legal';

export const metadata: Metadata = {
  title: 'Privacy — tapaway',
  description: 'What tapaway collects in the app and on this website, why, and how to delete it.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      updated="12 October 2026"
      intro={
        <p>
          tapaway is run by Aaqif Shafi, an individual based in India (“we”). This page covers the tapaway iPhone app
          and tapaway.today. The short version: we collect only what the app and your orders need, we don’t track
          you, we don’t sell or share your data for advertising, and you can delete your account at any time.
        </p>
      }
    >
      <Section id="app" title="In the app">
        <p>To sign in and keep your setup in sync across devices, we store:</p>
        <List>
          <li>
            <strong className="font-semibold text-[var(--ink)]">Your email address</strong>, used to send your
            sign-in code.
          </li>
          <li>
            <strong className="font-semibold text-[var(--ink)]">An account ID</strong> that links your data to you.
          </li>
          <li>
            <strong className="font-semibold text-[var(--ink)]">Your app setup</strong>: the tags you’ve added (their
            names and the keys that let the app recognise them), your schedules, your settings, and how many emergency
            unlocks you have left.
          </li>
        </List>
        <p>
          Some things never leave your iPhone: your focus sessions, your modes, and the apps you choose to block.
          Apple’s Screen Time doesn’t even tell the app which apps those are. The app has no ads, no third-party
          analytics and no tracking.
        </p>
      </Section>

      <Section id="website" title="On this website">
        <List>
          <li>
            <strong className="font-semibold text-[var(--ink)]">Waitlist.</strong> If you join, we keep your email
            address to tell you when tapaway launches. You can unsubscribe from any email we send.
          </li>
          <li>
            <strong className="font-semibold text-[var(--ink)]">Pre-orders.</strong> To ship your order we keep your
            name, email, phone number, shipping address, what you ordered and its payment status. Payments are handled
            by Dodo Payments; we never see or store your card details.
          </li>
          <li>
            <strong className="font-semibold text-[var(--ink)]">Abuse protection.</strong> Your IP address is used
            briefly to limit how often forms can be submitted.
          </li>
        </List>
        <p>
          The site sets no advertising or analytics cookies. Your browser keeps your cart and checkout progress
          locally so you don’t lose them on a refresh; that data stays on your device.
        </p>
      </Section>

      <Section id="use" title="How we use it">
        <p>Only to run tapaway:</p>
        <List>
          <li>signing you in and syncing your setup between devices</li>
          <li>taking payment for, packing and shipping your order, and keeping you updated about it</li>
          <li>sending launch news to people on the waitlist</li>
          <li>answering you when you contact us, and keeping the service secure</li>
          <li>keeping records the law requires, such as for tax</li>
        </List>
      </Section>

      <Section id="sharing" title="Who else handles it">
        <p>We don’t sell personal data. These services process it on our behalf, only as needed to do their job:</p>
        <List>
          <li>Supabase: database and sign-in</li>
          <li>Vercel: website hosting</li>
          <li>Dodo Payments: payments, as merchant of record</li>
          <li>AutoSend: waitlist emails</li>
          <li>Upstash: rate limiting</li>
          <li>shipping carriers: the name, address and phone number on your order, to deliver it</li>
        </List>
        <p>
          Some of these providers store data outside India. We may also disclose information if the law requires it.
        </p>
      </Section>

      <Section id="retention" title="How long we keep it">
        <List>
          <li>
            <strong className="font-semibold text-[var(--ink)]">Your account</strong> is kept until you delete it.
            Deleting it removes your account and app data straight away; copies in our database backups expire
            shortly after.
          </li>
          <li>
            <strong className="font-semibold text-[var(--ink)]">Orders</strong> are kept for as long as we need them
            for delivery, support, refunds, and tax and accounting records.
          </li>
          <li>
            <strong className="font-semibold text-[var(--ink)]">Waitlist emails</strong> are kept until launch, or
            until you unsubscribe or ask us to remove yours.
          </li>
        </List>
      </Section>

      <Section id="choices" title="Your choices">
        <p>
          You can delete your account at any time from Settings in the app, or at{' '}
          <Link href="/account/delete" className="font-medium text-[var(--ink)] underline underline-offset-4">
            tapaway.today/account/delete
          </Link>
          . Deleting it removes your tags, schedules and settings, and frees your tags so they can be set up again.
          Pre-orders aren’t affected.
        </p>
        <p>
          To get a copy of your data, correct it, or remove an order or waitlist entry, email <Mail />. We’ll reply
          within 30 days.
        </p>
      </Section>

      <Section id="children" title="Children">
        <p>
          tapaway isn’t meant for children under 13, and we don’t knowingly collect their data. If you think a child
          has given us information, email us and we’ll delete it.
        </p>
      </Section>

      <Section id="security" title="Security">
        <p>
          Data is encrypted in transit, and access to it is limited to the people and services that run tapaway. No
          system is perfectly secure, but we work to keep yours safe and will tell you if a breach affects you.
        </p>
      </Section>

      <Section id="changes" title="Changes and contact">
        <p>
          If we change this policy, we’ll update the date at the top, and tell you in the app or by email if the change
          matters. For any question about your privacy, email <Mail />.
        </p>
      </Section>
    </LegalPage>
  );
}
