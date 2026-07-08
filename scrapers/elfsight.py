import os
import re
from datetime import datetime

# ── Timezone correction ───────────────────────────────────────────────────────
# Elfsight uses IP-geolocation for timezone detection, not the browser JS clock.
# GitHub Actions IPs resolve to UTC, so scraped times are always UTC regardless
# of browser flags. We detect CI explicitly rather than inferring from the
# system timezone (which can be unreliable depending on environment variables).
#
# Proof: run #4 (bare Playwright, no special flags) and run #10 (with user-agent
# + viewport) both stored times like "05:00 AM – 06:30 AM" for classes that
# Manila dance studios schedule in the afternoon/evening — consistently UTC.

_PHT_OFFSET_H = 8


def _pht_correction():
    """
    Return hours to add to convert Elfsight UTC times to PHT.
    GITHUB_ACTIONS=true is always set by GitHub-hosted runners → +8h.
    Assumed PHT (UTC+8) locally → 0h.
    """
    if os.getenv("GITHUB_ACTIONS") == "true":
        return _PHT_OFFSET_H
    return 0


def _shift_time_range(time_str, hours):
    """
    Shift every clock component in a range string by `hours`.
    '11:00 AM – 12:30 PM' + 8 → '7:00 PM – 8:30 PM'
    Returns the string unchanged when hours == 0.
    """
    if not time_str or hours == 0:
        return time_str

    def _shift_one(t, h):
        m = re.match(r'(\d{1,2}):(\d{2})\s*(AM|PM)', t.strip(), re.IGNORECASE)
        if not m:
            return t
        hr, mn = int(m.group(1)), int(m.group(2))
        ap = m.group(3).upper()
        if ap == 'PM' and hr != 12:
            hr += 12
        if ap == 'AM' and hr == 12:
            hr = 0
        hr = (hr + h) % 24
        new_ap = 'PM' if hr >= 12 else 'AM'
        new_hr = hr % 12 or 12
        return f"{new_hr}:{mn:02d} {new_ap}"

    parts = re.split(r'\s*[–\-]\s*', time_str, maxsplit=1)
    return ' – '.join(_shift_one(p, hours) for p in parts)


MONTHS = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
    "JANUARY": 1, "FEBRUARY": 2, "MARCH": 3, "APRIL": 4, "JUNE": 6,
    "JULY": 7, "AUGUST": 8, "SEPTEMBER": 9, "OCTOBER": 10,
    "NOVEMBER": 11, "DECEMBER": 12,
}

REGISTER_RE = re.compile(
    r"^(PRE-REGISTER|REGISTER NOW|REGISTER HERE|BUY TICKETS|REGISTER)$",
    re.IGNORECASE,
)
TIME_RE = re.compile(r"^\d{1,2}:\d{2}\s*[AP]M\s*[-–]\s*\d{1,2}:\d{2}\s*[AP]M$")

SITES = [
    {
        "id": "zero_studio_qc",
        "name": "ZERØ Studio",
        "branch": "Quezon City",
        "address": "3/F, A&A Building, 37 Scout Borromeo St. Brgy South Triangle Quezon City",
        "url": "https://zerostudioph.com/pages/schedule",
        "website": "https://zerostudioph.com",
        "instagram": "https://www.instagram.com/zerostudioph",
        "photo_url": None,
    },
    {
        "id": "zero_studio_mandaluyong",
        "name": "ZERØ Studio",
        "branch": "Mandaluyong",
        "address": "Level 1, Greenfield Tower, Mandaluyong",
        "url": "https://zerostudioph.com/pages/mandaluyong-schedule",
        "website": "https://zerostudioph.com",
        "instagram": "https://www.instagram.com/zerostudioph",
        "photo_url": None,
    },
    {
        "id": "playground",
        "name": "The Playground Studios",
        "branch": None,
        "address": "103 Corazon De Jesus, San Juan, Metro Manila, Philippines",
        "url": "https://theplaygroundstudiosph.com/pages/classes",
        "website": "https://theplaygroundstudiosph.com",
        "instagram": "https://www.instagram.com/theplayground.studios.ph",
        "photo_url": None,
    },
    {
        "id": "spac3",
        "name": "SPAC3 Studios",
        "branch": None,
        "address": "Pacific Century Tower, G/F Scout Borromeo St, Diliman, Quezon City",
        "url": "https://spacestudiosph.com/pages/classes",
        "website": "https://spacestudiosph.com",
        "instagram": "https://www.instagram.com/spac3_ph",
        "maps_url": "https://maps.app.goo.gl/ZfewEFxPdZwwqNWL9",
        "photo_url": None,
        # Cards stack "CLASS STYLE / INSTRUCTOR / LEVEL" on separate lines
        # instead of the "INSTRUCTOR: CLASS" title format
        "stacked_title": True,
    },
]


def _split_instructor(title):
    """'INSTRUCTOR: CLASS' → ('INSTRUCTOR', 'CLASS'). Returns (None, title) if no colon."""
    if ":" in title:
        parts = title.split(":", 1)
        return parts[0].strip(), parts[1].strip()
    return None, title


def parse_text(raw_text, tz_correction=None, stacked_title=False):
    """
    Parse Elfsight Events Calendar rendered text into a list of class dicts.

    Each event block in the rendered text looks like:
        MONTH
        DAY
        [GENRE]           ← optional, no colon
        INSTRUCTOR: CLASS
        HH:MM AM - HH:MM PM
        [VENUE]           ← optional
        REGISTER ...      ← button text, marks end of block

    With stacked_title=True (SPAC3), the lines before the time are instead:
        CLASS STYLE       ← e.g. "Basic Femme", "Open Choreography"
        INSTRUCTOR        ← e.g. "ZEN"
        LEVEL             ← e.g. "BEGINNERS" (becomes the genre)
    """
    if tz_correction is None:
        tz_correction = _pht_correction()
        print(f"    [tz] Elfsight correction: +{tz_correction}h (GITHUB_ACTIONS={os.getenv('GITHUB_ACTIONS')!r})")
    lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
    classes = []
    today = datetime.now()
    i = 0

    while i < len(lines):
        line = lines[i]

        # Detect month header
        if line.upper() not in MONTHS:
            i += 1
            continue

        month_num = MONTHS[line.upper()]

        # Next line must be a day number
        if i + 1 >= len(lines) or not lines[i + 1].isdigit():
            i += 1
            continue

        day_num = int(lines[i + 1])
        if not (1 <= day_num <= 31):
            i += 1
            continue

        # Year: assume current year; roll over if month already passed
        year = today.year
        if month_num < today.month - 1:
            year = today.year + 1

        date_str = f"{year}-{month_num:02d}-{day_num:02d}"
        i += 2  # skip month + day lines

        # Collect lines for this event until next month marker or end
        event_lines = []
        while i < len(lines):
            l = lines[i]
            if l.upper() in MONTHS:
                break
            if REGISTER_RE.match(l):
                i += 1  # consume the register button
                break
            event_lines.append(l)
            i += 1

        # Find time line as anchor
        time_str = None
        time_idx = None
        for k, el in enumerate(event_lines):
            if TIME_RE.match(el):
                time_str = el
                time_idx = k
                break

        if time_str is None:
            continue

        before = event_lines[:time_idx]
        after = event_lines[time_idx + 1:]

        # Lines before time: last line is the title, earlier lines are genre
        if not before:
            continue

        # Optional venue: first line after time if it's not a register button
        venue = None
        if after and not REGISTER_RE.match(after[0]):
            venue = after[0]

        if stacked_title and len(before) >= 2:
            level = before[-1]
            instructor = before[-2]
            style_parts = before[:-2]
            class_name = " / ".join(style_parts) if style_parts else level
            genre = level if style_parts else None
        else:
            title_raw = before[-1]
            genre = " / ".join(before[:-1]) if len(before) > 1 else None
            instructor, class_name = _split_instructor(title_raw)

        classes.append({
            "date": date_str,
            "instructor": instructor,
            "class_name": class_name,
            "genre": genre,
            "time": _shift_time_range(time_str, tz_correction),
            "venue": venue,
        })

    return classes


async def scrape(page, site):
    """Scrape one Elfsight-powered site. Returns studio dict with classes list."""
    print(f"  Fetching {site['name']} ({site.get('branch') or 'main'})...")
    await page.goto(site["url"], wait_until="domcontentloaded")

    # Wait for the Elfsight events widget to populate
    try:
        await page.wait_for_selector(".eapps-events-calendar-events-item", timeout=20000)
    except Exception:
        # Fall back: wait for any Elfsight container, then pause briefly
        try:
            await page.wait_for_selector(".eapps-events-calendar", timeout=10000)
        except Exception:
            pass
        await page.wait_for_timeout(4000)

    main = page.locator("main")
    raw_text = await main.inner_text()

    classes = parse_text(raw_text, stacked_title=site.get("stacked_title", False))
    print(f"    → {len(classes)} classes found")

    # Extract instructor photos from Elfsight card images.
    # Each card renders: <img class="eapp-events-calendar-media-image" alt="..." src="...">
    # The alt is the card title — either "INSTRUCTOR: CLASS" or just the
    # instructor's name — so split it the same way as class titles.
    photo_map = {}
    imgs = await page.locator("img.eapp-events-calendar-media-image").all()
    for img in imgs:
        alt = (await img.get_attribute("alt") or "").strip()
        src = await img.get_attribute("src") or ""
        name, _ = _split_instructor(alt)
        name = name or alt
        if name and src and name not in photo_map:
            photo_map[name] = src
    if photo_map:
        print(f"    → {len(photo_map)} instructor photo(s) found")

    return {
        "id": site["id"],
        "name": site["name"],
        "branch": site["branch"],
        "address": site["address"],
        "source_url": site["url"],
        "classes": classes,
        "instructor_photos": photo_map,
    }


async def scrape_all(page):
    results = []
    for site in SITES:
        try:
            results.append(await scrape(page, site))
        except Exception as e:
            print(f"    ERROR: {e}")
            results.append({
                "id": site["id"],
                "name": site["name"],
                "branch": site["branch"],
                "address": site["address"],
                "source_url": site["url"],
                "classes": [],
                "error": str(e),
            })
    return results
