import { useMemo } from 'react';
import { T } from '../lib/theme';
import { openExternal } from '../lib/links';
import { studioColor, studioLoc } from '../lib/studios';
import type { Studio } from '../types';
import { formatLastUpdated } from '../utils/date';
import { Icon } from './Icon';
import { SectionLabel, TopBar } from './Primitives';

const INSTAPAY_QR_URL = '/instapay-qr.jpg';

interface StudioGroup {
  id: string;
  name: string;
  cities: string[];
  website?: string | null;
  instagram?: string | null;
}

// Group studio rows (which can have one row per branch, e.g. ZERØ QC / Mandaluyong)
// into one card per studio name, listing all its cities together.
function groupStudiosByName(studios: Studio[]): StudioGroup[] {
  const groups = new Map<string, StudioGroup>();
  for (const s of studios) {
    const key = s.name;
    if (!groups.has(key)) {
      groups.set(key, { name: s.name, cities: [], website: s.website, instagram: s.instagram, id: s.id });
    }
    const g = groups.get(key)!;
    const city = studioLoc(s);
    if (city && !g.cities.includes(city)) g.cities.push(city);
    if (!g.website && s.website) g.website = s.website;
    if (!g.instagram && s.instagram) g.instagram = s.instagram;
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function StudioListRow({ studio, last }: { studio: StudioGroup; last: boolean }) {
  const igHandle = studio.instagram
    ? studio.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')
    : null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
      borderBottom: last ? 'none' : '1px solid ' + T.border,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: studioColor(studio.id), flex: '0 0 auto' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: T.headingFont, fontSize: 14.5, fontWeight: 600 }}>{studio.name}</div>
        {studio.cities.length > 0 && (
          <div style={{ fontSize: 12, color: T.textDim, marginTop: 1 }}>{studio.cities.join(' · ')}</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, flex: '0 0 auto' }}>
        {studio.website && (
          <button onClick={() => openExternal(studio.website)} aria-label={`${studio.name} website`}
            style={{ color: T.textDim, display: 'flex', alignItems: 'center', background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }}>
            <Icon.globe s={15} />
          </button>
        )}
        {igHandle && (
          <button onClick={() => openExternal(`https://www.instagram.com/${igHandle}`)} aria-label={`${studio.name} Instagram`}
            style={{ color: T.textDim, fontFamily: T.headingFont, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }}>@</button>
        )}
      </div>
    </div>
  );
}

function ContactRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid ' + T.border, color: T.text }}>
      <span style={{ color: T.accent, display: 'inline-flex', width: 22, justifyContent: 'center' }}>{icon}</span>
      <span style={{ fontSize: 13.5 }}>{label}</span>
    </div>
  );
}

export function ContactTab({ lastUpdated, studios }: { lastUpdated: string | null; studios: Studio[] }) {
  const studioGroups = useMemo(() => groupStudiosByName(studios || []), [studios]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar />
      <div style={{ flex: 1, overflowY: 'auto' }}>

        <div style={{ padding: '10px 18px 26px' }}>
          <div style={{ fontSize: 12, color: T.accent, marginBottom: 10, fontWeight: 500 }}>About sa&apos;nsayaw</div>
          <div style={{ fontFamily: T.headingFont, fontSize: 26, fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            One place to find every open dance class in Metro Manila.
          </div>
          <div style={{ marginTop: 14, fontSize: 14, lineHeight: 1.6, color: T.textDim }}>
            We pull schedules from {studioGroups.length} studios across the metro so
            you stop juggling six Instagram tabs at 11pm trying to find a 7am class.
          </div>
          <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6, color: T.textMute }}>
            This is a volunteer, community-driven project. All information is sourced from publicly available studio pages.
          </div>
        </div>

        <div style={{ padding: '22px 18px', borderTop: '1px solid ' + T.border }}>
          <SectionLabel>Studios we feature</SectionLabel>
          <div style={{ fontFamily: T.headingFont, fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 10 }}>
            {studioGroups.length} studios, one schedule
          </div>
          <div>
            {studioGroups.map((s, i) => (
              <StudioListRow key={s.id} studio={s} last={i === studioGroups.length - 1} />
            ))}
          </div>
        </div>

        <div style={{ padding: '22px 18px', borderTop: '1px solid ' + T.border }}>
          <SectionLabel>Support the floor</SectionLabel>
          <div style={{ fontFamily: T.headingFont, fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 10 }}>
            Keep the schedule live
          </div>
          <div style={{ fontSize: 13.5, color: T.textDim, lineHeight: 1.6, marginBottom: 22 }}>
            This project runs on weekend hours and one hosting bill. If it saves you time,
            tip any amount via InstaPay — every peso goes back into keeping it running.
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <img
              src={INSTAPAY_QR_URL}
              alt="InstaPay QR Code"
              style={{ width: 200, height: 'auto', borderRadius: T.radius, border: '1px solid ' + T.border, display: 'block' }}
            />
          </div>
          <div style={{ textAlign: 'center', fontSize: 12.5, color: T.textDim }}>
            Any amount · Scan with your bank or e-wallet app
          </div>
        </div>

        <div style={{ padding: '22px 18px', borderTop: '1px solid ' + T.border }}>
          <SectionLabel>Get in touch</SectionLabel>
          <div style={{ fontFamily: T.headingFont, fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 10 }}>
            Say hi
          </div>
          <div style={{ fontSize: 13.5, color: T.textDim, lineHeight: 1.55, marginBottom: 14 }}>
            Got a class we&apos;re missing? Bug to report? Find us on Instagram.
          </div>
          <ContactRow icon={<span style={{ fontFamily: T.headingFont, fontSize: 14 }}>@</span>} label="instagram · @sansayaw.mnl" />
        </div>

        <div style={{ padding: '22px 18px 110px', borderTop: '1px solid ' + T.border }}>
          <SectionLabel>Behind the project</SectionLabel>
          <div style={{ fontSize: 13.5, color: T.textDim, lineHeight: 1.65 }}>
            Made in 2026 by a small crew of Metro Manila dancers who kept missing classes
            because schedules lived in stories that disappeared in 24 hours. Not affiliated
            with any studio. Always double-check class details with the studio before going.
          </div>

          {lastUpdated && (
            <div style={{
              marginTop: 18, padding: '10px 14px', borderRadius: T.radius,
              background: T.panel, border: '1px solid ' + T.border,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Icon.clock s={13} />
              <div>
                <div style={{ fontSize: 10.5, color: T.textMute, fontWeight: 500, letterSpacing: '.05em', textTransform: 'uppercase' }}>
                  Schedule last updated
                </div>
                <div style={{ fontSize: 12, color: T.textDim, fontFamily: T.monoFont, marginTop: 2 }}>
                  {formatLastUpdated(lastUpdated)}
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, fontSize: 11, color: T.textMute }}>
            sa&apos;nsayaw · made in Manila · {new Date().getFullYear()}
          </div>
        </div>

      </div>
    </div>
  );
}
