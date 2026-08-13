import Link from 'next/link';
import { T } from '@/lib/theme';

const TITLE = "Privacy Policy | sa'nsayaw";
const DESCRIPTION = "How sa'nsayaw collects and uses information, on the website and in the iOS app.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://www.sansayaw.org/privacy' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: 'https://www.sansayaw.org/privacy', type: 'website' },
  robots: { index: true, follow: true },
};

function Section({ title, children }) {
  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontFamily: T.headingFont, fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', margin: '0 0 10px' }}>
        {title}
      </h2>
      <div style={{ fontSize: 14.5, lineHeight: 1.7, color: T.textDim }}>
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: T.bodyFont, padding: '32px 20px 80px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link href="/" style={{ fontSize: 13, color: T.textDim, textDecoration: 'none' }}>← sa&apos;nsayaw</Link>

        <h1 style={{ fontFamily: T.headingFont, fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: '18px 0 4px' }}>
          Privacy Policy
        </h1>
        <div style={{ fontSize: 13, color: T.textMute }}>Last updated: August 2026</div>

        <Section title="Overview">
          <p>
            sa&apos;nsayaw is a free, volunteer-run directory of open dance class schedules in Metro
            Manila — on the web at sansayaw.org and as an iOS app. Neither the website nor the app
            requires an account, sign-up, or login. This page explains what information is collected
            when you use either one.
          </p>
        </Section>

        <Section title="Information you provide directly">
          <p>
            None. There are no forms, accounts, comments, or profile fields anywhere in the product —
            there is nothing to type in that we receive.
          </p>
        </Section>

        <Section title="Information collected automatically">
          <p style={{ marginBottom: 10 }}>
            <strong style={{ color: T.text }}>On the website</strong> — sansayaw.org uses Google
            Analytics to understand traffic: pages viewed, approximate location derived from IP
            address, device/browser type, and referring site. Google Analytics uses cookies to do
            this; see{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: 'underline', textUnderlineOffset: 2 }}>
              Google&apos;s Privacy Policy
            </a>{' '}
            for how Google itself handles that data.
          </p>
          <p>
            <strong style={{ color: T.text }}>In the iOS app</strong> — the app uses PostHog for
            analytics: a random device-generated identifier (not your name or any account, since none
            exists), which screens you view, what you type into search, which links and calendar
            actions you tap, and general interaction events. PostHog also processes your IP address
            to estimate an approximate location; we don&apos;t receive a precise location.
          </p>
        </Section>

        <Section title="Local device storage">
          <p>
            Your studio filter selections are saved locally on your device or browser (via
            localStorage on the web, or the device&apos;s standard app-preferences storage on iOS) so
            your choices persist between visits. That preference never leaves your device — it is not
            sent to us.
          </p>
        </Section>

        <Section title="How this information is used">
          <p>
            Solely to understand how the schedule and app are actually used — which studios and
            classes get the most attention, whether search is turning up useful results, which
            screens matter — so we can improve them. We don&apos;t sell any of it, and we don&apos;t
            build advertising profiles beyond whatever Google Analytics does on its own per its
            standard policy.
          </p>
        </Section>

        <Section title="Third-party services">
          <p style={{ marginBottom: 10 }}>The product relies on a few outside services:</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Google Analytics (web usage analytics)</li>
            <li>PostHog (iOS app usage analytics)</li>
            <li>Supabase (hosts the public studio/class schedule data; read-only, no personal data)</li>
            <li>Apple App Store (iOS app distribution, subject to Apple&apos;s own privacy practices)</li>
          </ul>
          <p style={{ marginTop: 10 }}>
            The app and site also link out to Google Maps, Google Calendar, Instagram, and individual
            studio websites. Once you tap or click through, you&apos;re on their site and their
            privacy policy applies — not this one.
          </p>
        </Section>

        <Section title="Data retention">
          <p>
            We don&apos;t keep a separate copy of analytics data ourselves — it lives with Google
            Analytics and PostHog under each provider&apos;s standard retention settings.
          </p>
        </Section>

        <Section title="Children's privacy">
          <p>
            sa&apos;nsayaw is not directed at children under 13, and we don&apos;t knowingly collect
            information from them.
          </p>
        </Section>

        <Section title="Your choices">
          <p>
            Browser tracking-prevention or ad-blocking tools will stop Google Analytics from running
            on the website, same as on any other site. Clearing your device&apos;s local storage
            resets your saved studio filter. Since there are no accounts, there is nothing to delete —
            using the app or site simply stops any further data collection.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this page occasionally as the product changes. The &ldquo;Last
            updated&rdquo; date above will always reflect the most recent version.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy: <a href="mailto:gelo@hey.com" style={{ color: T.accent, textDecoration: 'underline', textUnderlineOffset: 2 }}>gelo@hey.com</a>{' '}
            or Instagram{' '}
            <a href="https://www.instagram.com/sansayaw.mnl" target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: 'underline', textUnderlineOffset: 2 }}>
              @sansayaw.mnl
            </a>.
          </p>
        </Section>
      </div>
    </div>
  );
}
