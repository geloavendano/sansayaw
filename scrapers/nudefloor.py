import re
from datetime import datetime

SITE = {
    "id": "nudefloor",
    "name": "Nude Floor",
    "branch": None,
    "address": "Nude Floor, Manila",
    "url": "https://www.nudefloor.com/book-a-class",
    "website": "https://www.nudefloor.com",
    "instagram": "https://www.instagram.com/nudefloor",
    "photo_url": None,
}

# "5:00 PM – 6:00 PM" or "5:00 PM - 6:00 PM"
RANGE_RE = re.compile(r"^\d{1,2}:\d{2}\s*[AP]M\s*[–-]\s*\d{1,2}:\d{2}\s*[AP]M$")

# Standalone start time only: "5:00 PM"
START_RE = re.compile(r"^\d{1,2}:\d{2}\s*[AP]M$")

MONTH_MAP = {
    "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
    "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12,
}

SKIP_LINES = {
    "SU", "MO", "TU", "WE", "TH", "FR", "SA",
    "How to Book a Class", "Booking Guide",
    "Buy A Class Pack", "Class Packs", "Cancellation Policy", "Studio Walk-ins",
    "Maximize learning.",
    "STEP 01 : Buy Credits", "Step 02 : Book a Class", "02 Book a Class",
    "BUY A CLASS PACK",
}


def _extract_instructor(title):
    """'Hip Hop (Beg) with Aica Basa' → ('Aica Basa', 'Hip Hop (Beg)')"""
    marker = " with "
    idx = title.lower().rfind(marker)
    if idx != -1:
        return title[idx + len(marker):].strip(), title[:idx].strip()
    return None, title


def parse_text(raw_text, year, month_num):
    """
    Parse nudefloor's rendered calendar text.

    The widget renders each day twice:
      - compact view: alternating  START_TIME / CLASS_NAME
      - detailed view: alternating CLASS_NAME / FULL_TIME_RANGE

    We use only the detailed view (anchored on RANGE_RE matches) to avoid
    duplicates and to get complete time ranges.
    """
    lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
    classes = []
    current_day = None

    for i, line in enumerate(lines):
        if line in SKIP_LINES:
            continue

        # Detect day number (1–31).  Guard against times like "5:00 PM" bleeding in.
        if line.isdigit():
            val = int(line)
            if 1 <= val <= 31:
                current_day = val
            continue

        # Detailed-view anchor: a full time range
        if RANGE_RE.match(line) and current_day is not None:
            # The line immediately before should be the class name.
            # Walk back to find it, skipping any stray whitespace that got stripped.
            class_name_line = None
            for k in range(i - 1, max(i - 4, -1), -1):
                prev = lines[k]
                if prev in SKIP_LINES:
                    continue
                if prev.isdigit():
                    break  # hit a day number — no class name found
                if RANGE_RE.match(prev) or START_RE.match(prev):
                    break  # hit another time — no class name found
                class_name_line = prev
                break

            if not class_name_line:
                continue

            instructor, class_name = _extract_instructor(class_name_line)

            classes.append({
                "date": f"{year}-{month_num:02d}-{current_day:02d}",
                "instructor": instructor,
                "class_name": class_name,
                "genre": None,
                "time": line,
                "venue": None,
            })

    return classes


async def scrape(page):
    """
    Nudefloor is a Squarespace site. Each class is an
    <article class="eventlist-event eventlist-event--upcoming"> element.
    """
    print(f"  Fetching {SITE['name']}...")
    await page.goto(SITE["url"], wait_until="domcontentloaded")
    await page.wait_for_timeout(2000)

    events = page.locator("article.eventlist-event--upcoming")
    count = await events.count()
    classes = []

    for i in range(count):
        event = events.nth(i)
        try:
            # Date: Squarespace puts it in .eventlist-datetag-inner or .eventlist-meta-date
            date_text = ""
            for date_sel in [
                ".eventlist-datetag-inner",
                ".eventlist-meta-date",
                "time[datetime]",
            ]:
                try:
                    el = event.locator(date_sel).first
                    if await el.count() > 0:
                        dt_attr = await el.get_attribute("datetime")
                        if dt_attr:
                            # datetime attr is like "2026-05-24"
                            date_text = dt_attr[:10]
                            break
                        date_text = (await el.inner_text()).strip()
                        break
                except Exception:
                    continue

            # Title: .eventlist-title a
            title_text = ""
            for title_sel in [".eventlist-title a", ".eventlist-title", "h1.entry-title"]:
                try:
                    el = event.locator(title_sel).first
                    if await el.count() > 0:
                        title_text = (await el.inner_text()).strip()
                        break
                except Exception:
                    continue

            # Time: Squarespace splits start/end into separate spans inside .event-time-12hr
            time_text = ""
            try:
                start_el = event.locator(".event-time-12hr-start").first
                end_el = event.locator(".event-time-12hr-end").first
                start = (await start_el.inner_text()).strip() if await start_el.count() > 0 else ""
                end = (await end_el.inner_text()).strip() if await end_el.count() > 0 else ""
                if start and end:
                    time_text = f"{start} – {end}"
                elif start:
                    time_text = start
            except Exception:
                pass

            if not time_text:
                for time_sel in [".event-time-12hr", ".eventlist-meta-time"]:
                    try:
                        el = event.locator(time_sel).first
                        if await el.count() > 0:
                            raw = (await el.inner_text()).strip()
                            collapsed = " ".join(raw.split())
                            # Insert em dash between two adjacent times: "4:30 PM 6:00 PM"
                            time_text = re.sub(
                                r"(\d{1,2}:\d{2}\s*[AP]M)\s+(\d{1,2}:\d{2})",
                                r"\1 – \2",
                                collapsed,
                            )
                            break
                    except Exception:
                        continue

            # Parse date string if we got a raw text instead of datetime attr
            parsed_date = date_text
            if date_text and not re.match(r"^\d{4}-\d{2}-\d{2}$", date_text):
                # Try to parse "May 24, 2026" or "May 24"
                today = datetime.now()
                for fmt in ["%B %d, %Y", "%B %d", "%b %d, %Y", "%b %d"]:
                    try:
                        d = datetime.strptime(date_text, fmt)
                        year = d.year if d.year != 1900 else today.year
                        parsed_date = f"{year}-{d.month:02d}-{d.day:02d}"
                        break
                    except ValueError:
                        continue

            if not title_text:
                continue

            instructor, class_name = _extract_instructor(title_text)

            classes.append({
                "date": parsed_date,
                "instructor": instructor,
                "class_name": class_name,
                "genre": None,
                "time": time_text or None,
                "venue": None,
            })

        except Exception as e:
            continue

    print(f"    → {len(classes)} classes found")

    return {
        "id": SITE["id"],
        "name": SITE["name"],
        "branch": SITE["branch"],
        "address": SITE["address"],
        "source_url": SITE["url"],
        "classes": classes,
    }
