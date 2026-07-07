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
    "name":      "TADS",
    "branch":    None,
    "address":   "2F New Frontier Theater Arcade, 7 Gen. Malvar Ave., Araneta City, Quezon City",
    "source_url": "https://www.tadsph.com/booknow",
    "website":   "https://www.tadsph.com",
    "instagram": "https://www.instagram.com/tads.ph",
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


async def scrape(page):
    print("  Fetching TADS...")
    await page.goto(SITE["source_url"], wait_until="domcontentloaded", timeout=60000)

    # Wait for the Wix Bookings calendar grid to render
    try:
        await page.wait_for_selector('[role="grid"]', timeout=30000)
    except Exception:
        raise Exception("Wix Bookings grid not found — page may have blocked the scraper")

    await page.wait_for_timeout(2000)

    all_classes = []
    today_str = _date.today().strftime("%Y-%m-%d")

    # Wix may load the calendar on the last published week rather than the
    # current one. Advance up to 4 weeks to find a week with future dates.
    for week in range(4):
        if week > 0:
            try:
                await page.get_by_label("Show next week").click()
                await page.wait_for_timeout(2000)
            except Exception:
                break

        # Collect all day cells and their ISO dates
        # Note: "Available Spots" indicator is only visible in headed browsers;
        # in headless mode we click every day and check for actual class data.
        grid_cells = page.locator('[role="gridcell"]')
        n = await grid_cells.count()
        days_to_scrape = []

        for idx in range(n):
            cell = grid_cells.nth(idx)
            # Skip disabled cells (past dates)
            is_disabled = await cell.get_attribute("disabled")
            if is_disabled is not None:
                continue
            # Prefer data-date attribute (e.g. "2026-7-7") over parsing inner text
            data_date = await cell.get_attribute("data-date")
            if data_date:
                parts = data_date.split("-")
                if len(parts) == 3:
                    date_str = f"{parts[0]}-{int(parts[1]):02d}-{int(parts[2]):02d}"
                else:
                    continue
            else:
                text = await cell.inner_text()
                dm = DATE_CELL_RE.search(text)
                if not dm:
                    continue
                month_num = MONTH_MAP.get(dm.group(1).lower())
                if not month_num:
                    continue
                date_str = f"{dm.group(3)}-{month_num:02d}-{int(dm.group(2)):02d}"
            # Skip past dates — Wix may load on a historical week
            if date_str < today_str:
                continue
            days_to_scrape.append((idx, date_str))

        # If this whole week is in the past, keep advancing; otherwise scrape it
        if not days_to_scrape:
            continue
        # Once we've scraped 2 weeks of future dates, stop
        if len(all_classes) > 0 and week >= 2:
            break

        for idx, date_str in days_to_scrape:
            # Re-query cells each time (Wix may re-render the grid after click)
            cell = page.locator('[role="gridcell"]').nth(idx)
            await cell.click()
            await page.wait_for_timeout(1500)

            # The class list lives in the group element that contains "Book" buttons
            # Read inner_text of the first such group that has class data
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
