"""
TADS (The Addlib Dance Studio) scraper — Wix Bookings widget.

The weekly calendar shows one day at a time. We iterate through each day
cell that has available slots (current week + next week), click it, and
parse the class list.

Each class entry in the inner_text looks like:
    1:30 pm
    10:48 pm          ← current-page-load time artifact; skipped
    ⚪️⚪️⚪️ FEMME BASIC
    🌈 TADS Rainbow
    Joe Abuda
    1 hr 30 min
    ₱400
    23 spots left
    Book
"""

import re
from datetime import date as _date

SITE = {
    "id":        "tads",
    "name":      "The Addlib Dance Studio",
    "branch":    None,
    "address":   "2F New Frontier Theater Arcade, 7 Gen. Malvar Ave., Araneta City, Quezon City",
    "source_url": "https://www.tadsph.com/booknow",
    "website":   "https://www.tadsph.com",
    "instagram": "https://www.instagram.com/tads.ph",
    "maps_url":  "https://maps.app.goo.gl/C2Rdt7vVYPppzQQ98",
    "photo_url": None,
}

MONTH_MAP = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
}

TIME_RE      = re.compile(r"^(\d{1,2}):(\d{2})\s*(am|pm)$", re.IGNORECASE)
DUR_RE       = re.compile(r"^(\d+)\s+hr(?:\s+(\d+)\s+min)?", re.IGNORECASE)
PRICE_RE     = re.compile(r"^₱\d+")
SPOTS_RE     = re.compile(r"^\d+\s+spots?\s+left$", re.IGNORECASE)
DATE_CELL_RE = re.compile(r"\w+,\s+(\w+)\s+(\d+),\s+(\d{4})")


def _strip_emoji(s):
    """'⚪️⚪️⚪️ FEMME BASIC' → 'FEMME BASIC'; '🌈 TADS Rainbow' → 'TADS Rainbow'"""
    m = re.search(r"[A-Za-z0-9*]", s)
    return s[m.start():].strip() if m else s.strip()


def _has_emoji(s):
    return bool(re.search(r"[^\x00-\x7F]", s))


def _end_time(hour, minute, ampm, dur_line):
    """Compute '3:00 PM' from start=1:30pm + '1 hr 30 min'."""
    m = DUR_RE.match(dur_line or "")
    if not m:
        return None
    h24 = hour % 12 + (12 if ampm.lower() == "pm" else 0)
    total = h24 * 60 + minute + int(m.group(1)) * 60 + int(m.group(2) or 0)
    eh, em = divmod(total % (24 * 60), 60)
    ap = "PM" if eh >= 12 else "AM"
    return f"{eh % 12 or 12}:{em:02d} {ap}"


def _parse_classes(lines, date_str):
    classes = []
    i = 0
    while i < len(lines):
        tm = TIME_RE.match(lines[i])
        if not tm:
            i += 1
            continue

        hour, minute, ampm = int(tm.group(1)), int(tm.group(2)), tm.group(3)
        start_fmt = f"{hour}:{minute:02d} {ampm.upper()}"
        i += 1

        # Skip the "current time" artifact (any immediately-following time lines)
        while i < len(lines) and TIME_RE.match(lines[i]):
            i += 1

        if i >= len(lines):
            break

        # Class name (always first non-time line, strip emoji difficulty prefix)
        class_name = _strip_emoji(lines[i]); i += 1

        venue = instructor = dur_line = None

        # Consume fields until "Book" button
        while i < len(lines) and lines[i] != "Book":
            l = lines[i]; i += 1
            if PRICE_RE.match(l) or SPOTS_RE.match(l):
                continue
            if DUR_RE.match(l):
                dur_line = l
                continue
            # Emoji-prefixed lines are venue/room names
            if _has_emoji(l) and venue is None:
                venue = _strip_emoji(l)
            elif instructor is None:
                instructor = l

        if i < len(lines) and lines[i] == "Book":
            i += 1

        end_fmt = _end_time(hour, minute, ampm, dur_line)
        time_range = f"{start_fmt} – {end_fmt}" if end_fmt else start_fmt

        classes.append({
            "date":       date_str,
            "time":       time_range,
            "class_name": class_name,
            "instructor": instructor,
            "venue":      venue,
            "genre":      None,
        })

    return classes


async def _cell_dates(page):
    """Return list of (idx, ISO-date) for all gridcells that have a data-date.

    Wix's calendar widget writes the data-date attribute with a 0-indexed
    month (JS Date.getMonth() convention: Jan=0 ... Dec=11), while every
    other date on the page — including the panel that actually opens when
    you click the cell — uses normal 1-indexed months. A cell attributed
    data-date="2026-7-25" opens the panel for August 25, not July 25;
    confirmed live against the real site across multiple dates. Left
    uncorrected, this both mislabeled every scraped class by a month and
    inflated the "how many weeks behind is the calendar" math elsewhere in
    this file, causing the scraper to land on the wrong week entirely.
    """
    grid_cells = page.locator('[role="gridcell"]')
    n = await grid_cells.count()
    result = []
    for idx in range(n):
        cell = grid_cells.nth(idx)
        data_date = await cell.get_attribute("data-date")
        if not data_date:
            continue
        parts = data_date.split("-")
        if len(parts) == 3:
            year, month0, day = int(parts[0]), int(parts[1]), int(parts[2])
            month = month0 + 1
            if month > 12:
                month -= 12
                year += 1
            result.append((idx, f"{year}-{month:02d}-{day:02d}"))
    return result


async def scrape(page):
    print("  Fetching TADS...")
    await page.goto(SITE["source_url"], wait_until="domcontentloaded", timeout=60000)

    try:
        await page.wait_for_selector('[role="grid"]', timeout=30000)
    except Exception:
        raise Exception("Wix Bookings grid not found — page may have blocked the scraper")

    await page.wait_for_timeout(2000)

    today = _date.today()
    today_str = today.strftime("%Y-%m-%d")

    # Wix headless often loads on a past week. Read the first displayed date,
    # calculate how many weeks behind today it is, and advance exactly that many
    # times so we land on today's week before scraping.
    initial_dates = await _cell_dates(page)
    if initial_dates:
        first_str = min(d for _, d in initial_dates)
        first_date = _date.fromisoformat(first_str)
        weeks_behind = max(0, (today - first_date).days // 7)
        print(f"    Calendar at {first_str}, advancing {weeks_behind} week(s) to reach today")
        for _ in range(weeks_behind):
            await page.get_by_label("Show next week").click()
            await page.wait_for_timeout(1500)

    all_classes = []

    # Scrape today's week + next week (2 weeks of upcoming classes)
    for week in range(2):
        if week > 0:
            await page.get_by_label("Show next week").click()
            await page.wait_for_timeout(2000)

        days_to_scrape = [
            (idx, date_str)
            for idx, date_str in await _cell_dates(page)
            if date_str >= today_str
        ]

        for idx, date_str in days_to_scrape:
            cell = page.locator('[role="gridcell"]').nth(idx)
            await cell.click()
            await page.wait_for_timeout(1500)

            try:
                container = page.locator('[role="group"]').filter(has_text="Book").first
                section_text = await container.inner_text(timeout=5000)
            except Exception:
                print(f"    {date_str}: could not read class list")
                continue

            lines = [l.strip() for l in section_text.split("\n") if l.strip()]
            day_classes = _parse_classes(lines, date_str)
            all_classes.extend(day_classes)
            print(f"    {date_str}: {len(day_classes)} classes")

    print(f"    → {len(all_classes)} total TADS classes")

    return {
        "id":         SITE["id"],
        "name":       SITE["name"],
        "branch":     SITE.get("branch"),
        "address":    SITE["address"],
        "source_url": SITE["source_url"],
        "classes":    all_classes,
    }
