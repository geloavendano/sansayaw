"""
Ember Dance and Arts scraper — Wix Bookings Daily Agenda widget.

The widget at #stickyContainer renders classes in agenda order:
    July 7
    Tuesday
    Waacking - JB
    5:45 pm
    (1 hr 30 min)
    Book
    ...

"Load more sessions" paginates; we click it once to cover ~2 weeks.
"""

import re
from datetime import date as _date

SITE = {
    "id":         "ember",
    "name":       "Ember Dance and Arts",
    "branch":     None,
    "address":    "2F Greenhills Promenade, San Juan, Metro Manila",
    "source_url": "https://www.emberdanceandarts.com/book-a-class",
    "website":    "https://www.emberdanceandarts.com",
    "instagram":  "https://www.instagram.com/emberdanceandarts",
    "photo_url":  None,
}

MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
}
DAYS_OF_WEEK = {
    "sunday", "monday", "tuesday", "wednesday",
    "thursday", "friday", "saturday",
}

DATE_RE    = re.compile(r'^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d+)$', re.IGNORECASE)
TIME_RE    = re.compile(r'^(\d{1,2}):(\d{2})\s*(am|pm)$', re.IGNORECASE)
DUR_RE     = re.compile(r'^\((\d+)\s+hr(?:\s+(\d+)\s+min)?\)$', re.IGNORECASE)
DUR_MIN_RE = re.compile(r'^\((\d+)\s+min\)$', re.IGNORECASE)
STATUS_RE  = re.compile(r'^(Book|Registration closed|Fully booked|Waitlist)$', re.IGNORECASE)


def _end_time(h, m, ampm, dur_line):
    h24 = h % 12 + (12 if ampm.lower() == "pm" else 0)
    dm = DUR_RE.match(dur_line or "")
    if dm:
        dur_min = int(dm.group(1)) * 60 + int(dm.group(2) or 0)
    else:
        dm2 = DUR_MIN_RE.match(dur_line or "")
        if dm2:
            dur_min = int(dm2.group(1))
        else:
            return None
    total = h24 * 60 + m + dur_min
    eh, em = divmod(total % (24 * 60), 60)
    ap = "PM" if eh >= 12 else "AM"
    return f"{eh % 12 or 12}:{em:02d} {ap}"


def _parse(text, year):
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    classes = []
    current_date = None
    i = 0

    while i < len(lines):
        line = lines[i]

        dm = DATE_RE.match(line)
        if dm:
            month = MONTHS[dm.group(1).lower()]
            day   = int(dm.group(2))
            current_date = f"{year}-{month:02d}-{day:02d}"
            i += 1
            if i < len(lines) and lines[i].lower() in DAYS_OF_WEEK:
                i += 1
            continue

        if current_date is None:
            i += 1
            continue

        # A class entry starts when the NEXT line is a time
        if i + 1 < len(lines) and TIME_RE.match(lines[i + 1]):
            class_line = line
            i += 1

            if " - " in class_line:
                split_at   = class_line.rfind(" - ")
                class_name = class_line[:split_at].strip()
                instructor = class_line[split_at + 3:].strip()
            else:
                class_name = class_line
                instructor = None

            tm = TIME_RE.match(lines[i])
            sh, sm, ampm = int(tm.group(1)), int(tm.group(2)), tm.group(3)
            start_fmt = f"{sh}:{sm:02d} {ampm.upper()}"
            i += 1

            dur_line = None
            if i < len(lines) and (DUR_RE.match(lines[i]) or DUR_MIN_RE.match(lines[i])):
                dur_line = lines[i]
                i += 1

            if i < len(lines) and STATUS_RE.match(lines[i]):
                i += 1

            end_fmt    = _end_time(sh, sm, ampm, dur_line)
            time_range = f"{start_fmt} – {end_fmt}" if end_fmt else start_fmt

            classes.append({
                "date":       current_date,
                "time":       time_range,
                "class_name": class_name,
                "instructor": instructor,
                "venue":      None,
                "genre":      None,
            })
        else:
            i += 1

    return classes


async def scrape(page):
    print("  Fetching Ember Dance and Arts...")
    await page.goto(SITE["source_url"], wait_until="domcontentloaded", timeout=60000)

    try:
        await page.wait_for_selector("#stickyContainer ul", timeout=30000)
    except Exception:
        raise Exception("Ember: Wix Bookings agenda widget not found")

    await page.wait_for_timeout(2000)

    # Click "Load more sessions" once to pull in the second week
    try:
        btn = page.get_by_text("Load more sessions", exact=True)
        if await btn.count() > 0:
            await btn.click()
            await page.wait_for_timeout(2000)
    except Exception:
        pass

    container = page.locator("#stickyContainer ul").first
    text = await container.inner_text(timeout=10000)

    # Derive year from the widget text (e.g. "July 2026")
    ym = re.search(r"\b(20\d\d)\b", text)
    year = int(ym.group(1)) if ym else _date.today().year

    today_str   = _date.today().strftime("%Y-%m-%d")
    all_classes = [c for c in _parse(text, year) if c["date"] >= today_str]

    print(f"    → {len(all_classes)} total Ember classes")
    return {
        "id":         SITE["id"],
        "name":       SITE["name"],
        "branch":     SITE.get("branch"),
        "address":    SITE["address"],
        "source_url": SITE["source_url"],
        "classes":    all_classes,
    }
