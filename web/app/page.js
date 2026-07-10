import { getAppData } from '@/lib/data';
import { joinNames, buildEventJsonLd } from '@/lib/seo';
import DanceApp from '@/components/DanceApp';

// ISR: allow cache to stay fresh up to 24 hours.
// Vercel/Next.js will revalidate on the next request after 86400 s.
export const revalidate = 86400;

// ── JSON-LD ──────────────────────────────────────────────────────

function buildJsonLd(classes, studios) {
  const events = buildEventJsonLd(classes, studios, { days: 14 });

  const studioOrgs = studios.map(s => ({
    '@type':       'DanceGroup',
    name:          s.branch ? `${s.name} ${s.branch}` : s.name,
    url:           s.website || undefined,
    address: {
      '@type':         'PostalAddress',
      streetAddress:   s.address || undefined,
      addressLocality: 'Metro Manila',
      addressRegion:   'NCR',
      addressCountry:  'PH',
    },
    ...(s.instagram ? { sameAs: [s.instagram] } : {}),
  }));

  const studioNames = [...new Set(studios.map(s => s.name))].sort();
  const studioList  = joinNames(studioNames) || 'studios across Metro Manila';

  const faq = {
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name:    'What dance classes are available in Metro Manila?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:    `sa'nsayaw lists open dance classes from ${studioList}. Styles include hip hop, K-pop cover, heels, femme, open choreography, dancehall, breaking, jazz funk, and more.`,
        },
      },
      {
        '@type': 'Question',
        name:    'Which dance studios in Manila have open classes?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:    `Studios with open drop-in dance classes tracked by sa'nsayaw include ${studioList}, across Quezon City, Mandaluyong, San Juan, Makati, and Taguig.`,
        },
      },
      {
        '@type': 'Question',
        name:    'How often is the dance class schedule updated?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:    "The schedule is scraped and updated every morning automatically. You can always see the freshest available schedules from all participating studios.",
        },
      },
      {
        '@type': 'Question',
        name:    'Are there beginner dance classes in Manila?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:    `Yes. Most studios on sa'nsayaw, including ${studioList}, regularly offer beginner and beginner-intermediate level classes in styles like hip hop, K-pop, heels, and femme.`,
        },
      },
    ],
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type':       'WebSite',
        name:          "sa'nsayaw",
        url:           'https://www.sansayaw.org',
        description:   `Metro Manila dance class schedule aggregator. Find open classes at ${studioList}. Updated daily.`,
        potentialAction: {
          '@type':       'SearchAction',
          target:        'https://www.sansayaw.org/?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
      faq,
      ...studioOrgs,
      ...events,
    ],
  };
}

// ── Page ───────────────────────────────────────────────────────

export default async function Home() {
  const data   = await getAppData();
  const jsonLd = buildJsonLd(data.classes, data.studios);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DanceApp
        studios={data.studios}
        instrs={data.instrs}
        classes={data.classes}
        lastUpdated={data.lastUpdated}
      />
    </>
  );
}
