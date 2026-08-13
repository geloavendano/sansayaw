import Link from 'next/link';
import { T } from '@/lib/theme';

const TITLE = "Support | sa'nsayaw";
const DESCRIPTION = "Get help with sa'nsayaw — report a bug, fix a schedule, or ask a question.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://www.sansayaw.org/support' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: 'https://www.sansayaw.org/support', type: 'website' },
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

const linkStyle = { color: T.accent, textDecoration: 'underline', textUnderlineOffset: 2 };

export default function SupportPage() {
  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: T.bodyFont, padding: '32px 20px 80px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link href="/" style={{ fontSize: 13, color: T.textDim, textDecoration: 'none' }}>← sa&apos;nsayaw</Link>

        <h1 style={{ fontFamily: T.headingFont, fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: '18px 0 4px' }}>
          Support
        </h1>
        <div style={{ fontSize: 14.5, lineHeight: 1.7, color: T.textDim, marginTop: 14 }}>
          sa&apos;nsayaw is a free, volunteer-run schedule of open dance classes in Metro Manila — on
          the web and as an iOS app. If something&apos;s wrong or you need help, reach out:{' '}
          <a href="mailto:gelo@hey.com" style={linkStyle}>gelo@hey.com</a> or Instagram{' '}
          <a href="https://www.instagram.com/sansayaw.mnl" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            @sansayaw.mnl
          </a>. We&apos;re a small crew and read everything, but replies aren&apos;t instant.
        </div>

        <Section title="A class or time looks wrong">
          <p>
            All schedules are pulled automatically from each studio&apos;s own public booking page
            every morning, so an error usually means the studio itself changed something after that
            day&apos;s scrape ran, or their page listed something incorrectly. Always confirm with the
            studio directly before heading out. If you spot a schedule that&apos;s wrong for more than
            a day, let us know which studio and class and we&apos;ll take a look.
          </p>
        </Section>

        <Section title="A studio is missing">
          <p>
            Message us the studio name and Instagram or website, and we&apos;ll look into adding it.
            We only list studios with a public, drop-in-friendly booking page we can pull from
            automatically.
          </p>
        </Section>

        <Section title="The app or site is broken">
          <p>
            Tell us what happened, what device/iOS version (for the app) or browser (for the site) you
            were using, and what you expected instead — screenshots help a lot.
          </p>
        </Section>

        <Section title="Data and privacy questions">
          <p>
            See the <Link href="/privacy" style={linkStyle}>Privacy Policy</Link>{' '}
            for what&apos;s collected and how it&apos;s used.
          </p>
        </Section>

        <Section title="About the project">
          <p>
            Made by a small crew of Metro Manila dancers who kept missing classes because schedules
            lived in Instagram stories that disappeared in 24 hours. sa&apos;nsayaw isn&apos;t
            affiliated with any studio — it just aggregates what&apos;s already public.
          </p>
        </Section>
      </div>
    </div>
  );
}
