"""
808 Studio scraper — Mindbody 7-day widget.

Each branch page renders a .bw-widget div with plain text in this pattern:

    Tuesday, May 26
    5:30 PM – 6:15 PM PST
    808 STEP: LEVEL 1: BTS THROUGH THE YEARS
    Niña A.
    808 Studio - Podium
    View details          ← optional
    Book
    6:30 PM – 7:15 PM PST
    ...
"""

import re
from datetime import datetime

SITES = [
    {
        "id":        "808_podium",
        "name":      "808 Studio",
        "branch":    "Podium",
        "address":   "The Podium, Ortigas Center, Mandaluyong",
        "url":       "https://808studio.ph/book-now-in-podium/",
        "website":   "https://808studio.ph",
        "instagram": "https://www.instagram.com/808studioph",
        "photo_url": None,
    },
    {
        "id":        "808_bgc",
        "name":      "808 Studio",
        "branch":    "BGC",
        "address":   "Bonifacio Global City, Taguig",
        "url":       "https://808studio.ph/book-now-in-bgc/",
        "website":   "https://808studio.ph",
        "instagram": "https://www.instagram.com/808studioph",
        "photo_url": None,
    },
]

# "Tuesday, May 26" or "Monday, June 2"
DAY_RE = re.compile(
    r"^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+)\s+(\d{1,2})$",
    re.IGNORECASE,
)

# "5:30 PM – 6:15 PM PST"  (em-dash or hyphen, optional timezone suffix)
TIME_RE = re.compile(r"^\d{1,2}:\d{2}\s*[AP]M\s*[–\-]\s*\d{1,2}:\d{2}\s*[AP]M", re.IGNORECASE)

MONTH_MAP = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
}

# Lines that are chrome/navigation and carry no class data
SKIP_SET = {"View details", "Book", "Find a Class", "My Account", "Full Calendar"}


def _is_location(line):
    return line.startswith("808 Studio")


def parse_text(raw_text):
    today = datetime.now()
    lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
    classes = []
    current_date = None

    for i, line in enumerate(lines):
        # ── Day header ────────────────────────────────────────────
        m = DAY_RE.match(line)
        if m:
            month_num = MONTH_MAP.get(m.group(2).lower())
            day_num   = int(m.group(3))
            if month_num:
                year = today.year
                # Roll over to next year if the month has clearly passed
                if month_num < today.month - 1:
                    year += 1
                current_date = f"{year}-{month_num:02d}-{day_num:02d}"
            continue

        # ── Time line = start of a class block ────────────────────
        if not TIME_RE.match(line) or current_date is None:
            continue

        # Strip timezone suffix ("PST", "PHT", etc.)
        time_str = re.sub(r"\s+[A-Z]{2,4}$", "", line).strip()

        # The next non-blank line is the class name
        class_name = None
        instructor = None

        if i + 1 < len(lines):
            nxt = lines[i + 1]
            if nxt not in SKIP_SET and not _is_location(nxt) and not TIME_RE.match(nxt) and not DAY_RE.match(nxt):
                class_name = nxt

        if class_name and i + 2 < len(lines):
            nxt2 = lines[i + 2]
            if nxt2 not in SKIP_SET and not _is_location(nxt2) and not TIME_RE.match(nxt2) and not DAY_RE.match(nxt2):
                # Strip "(substitute)" or "(sub)" qualifier — kept in display name per db.py convention
                instructor = re.sub(r"\s*\(substitute\)", "", nxt2, flags=re.IGNORECASE).strip()

        if class_name:
            classes.append({
                "date":       current_date,
                "instructor": instructor or None,
                "class_name": class_name,
                "genre":      None,
                "time":       time_str,
                "venue":      None,
            })

    return classes


async def scrape(page, site):
    print(f"  Fetching {site['name']} ({site['branch']})...")
    await page.goto(site["url"], wait_until="load", timeout=40000)

    # Wait for the Mindbody widget container to appear in the DOM
    try:
        await page.wait_for_selector(".bw-widget", timeout=30000)
    except Exception:
        pass

    # Extra buffer for the widget JS to populate class rows
    await page.wait_for_timeout(5000)

    widget = page.locator(".bw-widget")
    if await widget.count() == 0:
        raise Exception("Mindbody widget (.bw-widget) not found — page may have blocked the scraper")

    raw_text = await widget.inner_text()

    classes = parse_text(raw_text)
    print(f"    → {len(classes)} classes found")

    return {
        "id":         site["id"],
        "name":       site["name"],
        "branch":     site["branch"],
        "address":    site["address"],
        "source_url": site["url"],
        "classes":    classes,
    }


async def scrape_all(page):
    results = []
    for site in SITES:
        try:
            results.append(await scrape(page, site))
        except Exception as e:
            print(f"    ERROR scraping {site['id']}: {e}")
            results.append({
                "id":         site["id"],
                "name":       site["name"],
                "branch":     site["branch"],
                "address":    site["address"],
                "source_url": site["url"],
                "classes":    [],
                "error":      str(e),
            })
    return results
