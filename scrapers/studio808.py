"""
808 Studio scraper — Mindbody (Healcode) schedule widget.

We used to load 808studio.ph in Playwright and parse the widget's rendered
text. That broke for the BGC branch on 2026-07-13 — on CI the widget simply
never mounted (".bw-widget not found"), while Podium on the same domain, in
the same browser, kept working. Both branches worked fine locally, so it was
environment-specific rather than a markup change.

Instead we call the endpoint the widget itself loads its sessions from:

    https://widgets.mindbodyonline.com/widgets/schedules/<schedule-id>/load_markup
        ?options[start_date]=YYYY-MM-DD

That's Mindbody's own host and needs no browser. It returns a week of sessions
as structured HTML, including exact ISO datetimes — so no year-rollover
guessing from "Tuesday, May 26" and no stripping of the (mislabelled) "PST"
suffix Mindbody prints next to Manila times.

The numeric schedule id is embedded in the healcode widget id on the studio's
page: data-widget-id="d62207113b8c" → 220711.
"""

import html as _html
import json
import re
import urllib.request
from datetime import datetime, timedelta, timezone

PHT = timezone(timedelta(hours=8))

_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

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
        "schedule_id": "220714",
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
        "schedule_id": "220711",
    },
]

# A real class block; empty days render as "bw-session bw-session--empty",
# which this deliberately does not match.
_SESSION_RE = re.compile(r'<div class="bw-session"[^>]*>')
_START_RE   = re.compile(r'<time class="hc_starttime" datetime="([^"]+)"')
_END_RE     = re.compile(r'<time class="hc_endtime" datetime="([^"]+)"')
_NAME_RE    = re.compile(r'<div class="bw-session__name">(.*?)</div>', re.S)
_STAFF_RE   = re.compile(r'<div class="bw-session__staff"[^>]*>(.*?)</div>', re.S)
# The type span is display:none — its text duplicates the class name
_TYPE_SPAN_RE = re.compile(r'<span class="bw-session__type".*?</span>', re.S)
_TAG_RE     = re.compile(r"<[^>]+>")


def _text(fragment):
    """Strip tags/entities and collapse whitespace."""
    return " ".join(_html.unescape(_TAG_RE.sub("", fragment)).split())


def _fmt_time(dt):
    """datetime → '9:00 AM'"""
    return f"{dt.hour % 12 or 12}:{dt.minute:02d} {'PM' if dt.hour >= 12 else 'AM'}"


def parse_markup(markup):
    """Parse the widget's session HTML into class dicts."""
    classes = []
    bounds = [m.start() for m in _SESSION_RE.finditer(markup)] + [len(markup)]

    for i in range(len(bounds) - 1):
        block = markup[bounds[i]:bounds[i + 1]]

        start_m = _START_RE.search(block)
        if not start_m:
            continue
        try:
            start = datetime.fromisoformat(start_m.group(1))
        except ValueError:
            continue

        time_str = _fmt_time(start)
        end_m = _END_RE.search(block)
        if end_m:
            try:
                time_str += " – " + _fmt_time(datetime.fromisoformat(end_m.group(1)))
            except ValueError:
                pass

        name_m = _NAME_RE.search(block)
        class_name = _text(_TYPE_SPAN_RE.sub("", name_m.group(1))) if name_m else None
        if not class_name:
            continue

        staff_m = _STAFF_RE.search(block)
        instructor = _text(staff_m.group(1)) if staff_m else ""
        # "(substitute)" is dropped here; db.py keeps the "(Sub)" convention
        instructor = re.sub(r"\s*\(substitute\)", "", instructor, flags=re.IGNORECASE).strip()

        classes.append({
            "date":       start.date().isoformat(),
            "instructor": instructor or None,
            "class_name": class_name,
            "genre":      None,
            "time":       time_str,
            "venue":      None,
        })

    return classes


def fetch_markup(site, start_date, timeout=30):
    url = (
        f"https://widgets.mindbodyonline.com/widgets/schedules/{site['schedule_id']}"
        f"/load_markup?options%5Bstart_date%5D={start_date}"
    )
    req = urllib.request.Request(
        url, headers={"User-Agent": _UA, "Referer": site["website"] + "/"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))["class_sessions"]


def scrape(site):
    print(f"  Fetching {site['name']} ({site['branch']})...")
    today = datetime.now(PHT).date().isoformat()
    classes = parse_markup(fetch_markup(site, today))
    if not classes:
        raise Exception("no sessions parsed — widget markup may have changed")
    print(f"    → {len(classes)} classes found")

    return {
        "id":         site["id"],
        "name":       site["name"],
        "branch":     site["branch"],
        "address":    site["address"],
        "source_url": site["url"],
        "classes":    classes,
    }


def scrape_all():
    results = []
    for site in SITES:
        try:
            results.append(scrape(site))
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
