"""
First Block Studios scraper — Fillout form JSON (no browser required).

The studio doesn't run a real booking system — its schedule lives as a
manually-curated "pick your class" question inside a Fillout intake form
(https://firstblockstudios.fillout.com/services, service = "DANCE CLASS").
Fillout serves the whole form definition (every step/widget) as a public
Next.js data payload, keyed by a build id embedded in the plain HTML page.
So this needs no headless browser, just two HTTP requests:

  1. GET the form page and pull "buildId" out of it (redeployed by Fillout
     whenever the studio edits the form, so it's re-derived every run
     rather than hardcoded).
  2. GET /_next/data/<buildId>/services.json?flowPublicIdentifier=<id>.
  3. Walk the "Dance Class Details" step's ImagePicker widgets — one per
     day of the week — where each option is one class:
       label:   "<Name> ( <Month> <Day> )"
       caption: usually "<ClassName> (<Level>) <start> - <end>", but
                sometimes just "<start> to <end>" with no instructor
                called out (e.g. Yoga), or "<Level> (<start> to <end>)"
                (e.g. Kids Class). _parse_option tells these apart by
                where the time range sits relative to the parentheses,
                not by guessing whether the option's name looks like a
                person's — see its docstring.

The studio hand-edits these options for the upcoming week or two, so dates
carry no year ("Aug 18" — assumed current year) and the time formatting is
inconsistent (missing spaces, "to" vs "-") since it's typed, not generated.
There's also a stale duplicate "TUESDAY DANCE CLASS" widget left over with
placeholder "Option 1"/"Option 2" entries; those have empty captions and
are dropped by _parse_option like any other unparseable option.
"""

import json
import re
import urllib.request
from datetime import date as _date

SITE = {
    "id":         "firstblock",
    "name":       "First Block Studios",
    "branch":     None,
    "address":    "2nd Floor, The Hub Mayon, 18 Mayon St, Quezon City",
    "source_url": "https://firstblockstudios.fillout.com/services",
    "website":    "https://firstblockstudios.fillout.com/services",
    "instagram":  "https://www.instagram.com/firstblock.studios",
    "maps_url":   None,
    "photo_url":  None,
}

_FORM_HOST = "https://firstblockstudios.fillout.com"
_FLOW_ID   = "exjppPVfHjus"
_STEP_NAME = "dance class"  # case-insensitive substring match on step name

_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

_TAG_RE         = re.compile(r"<[^>]+>")
_DAY_RE         = re.compile(r"^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\b", re.IGNORECASE)
_LABEL_RE       = re.compile(r"^(.*)\(\s*([A-Za-z]+)\s+(\d{1,2})\s*(?:,\s*(\d{4}))?\s*\)\s*$")
_TIME_RE        = re.compile(r"\d{1,2}:\d{2}\s*[AP]M", re.IGNORECASE)
_TIME_RANGE_RE  = re.compile(
    r"(\d{1,2}:\d{2}\s*[AP]M)\s*(?:-|–|to)\s*(\d{1,2}:\d{2}\s*[AP]M)", re.IGNORECASE
)

MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def _get_build_id(html):
    m = re.search(r'"buildId":"([^"]+)"', html)
    if not m:
        raise Exception("firstblock: buildId not found on page — Fillout markup may have changed")
    return m.group(1)


def _fetch_html(timeout=30):
    req = urllib.request.Request(SITE["source_url"], headers={"User-Agent": _UA})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8")


def _fetch_form_json(build_id, timeout=30):
    url = f"{_FORM_HOST}/_next/data/{build_id}/services.json?flowPublicIdentifier={_FLOW_ID}"
    req = urllib.request.Request(url, headers={"User-Agent": _UA, "x-nextjs-data": "1"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


def _parse_date(month_str, day_str, year_str):
    month = MONTHS.get(month_str[:3].lower())
    if not month:
        return None
    year = int(year_str) if year_str else _date.today().year
    try:
        return _date(year, month, int(day_str)).isoformat()
    except ValueError:
        return None


def _parse_option(name, caption):
    """
    Split one schedule option into (instructor, class_name, genre, time).

    The option's own name ("Franc", "Yoga", "Kids Class"...) sometimes
    names an instructor and sometimes names the class/offering itself —
    there's no reliable way to tell from the text alone which a given name
    is. Instead this reads the caption's *shape*, which is unambiguous:

      "Open (Beg-Int) 6:00 PM - 7:30 PM"   time OUTSIDE parens → the name
                                            is the instructor; class name
                                            and level come from the caption.
      "Beginner (1:30 PM to 3:00 PM)"      time INSIDE parens → the name
                                            is the class itself (e.g. "Kids
                                            Class"); no instructor is called
                                            out.
      "12:30 PM to 1:30 PM"                bare time, nothing else → same
                                            as above (e.g. "Yoga").
    """
    caption = (caption or "").strip()
    if not caption:
        return None

    range_m = _TIME_RANGE_RE.search(caption)
    if not range_m:
        return None
    time_range = f"{range_m.group(1).upper()} – {range_m.group(2).upper()}"

    paren_m = re.search(r"\(([^)]*)\)", caption)
    time_in_parens = bool(paren_m and _TIME_RE.search(paren_m.group(1)))

    if time_in_parens:
        genre = caption[:paren_m.start()].strip() or None
        return {"instructor": None, "class_name": name, "genre": genre, "time": time_range}

    before_time = caption[:range_m.start()].strip()
    if paren_m and paren_m.start() < range_m.start():
        class_name = caption[:paren_m.start()].strip()
        genre = paren_m.group(1).strip() or None
    elif before_time:
        class_name, genre = before_time, None
    else:
        return {"instructor": None, "class_name": name, "genre": None, "time": time_range}

    return {"instructor": name, "class_name": class_name, "genre": genre, "time": time_range}


def _extract_classes(form_json):
    """Returns (classes, instructor_photos) — photos keyed by raw instructor name."""
    steps = form_json["pageProps"]["flowSnapshot"]["template"]["steps"]
    classes = []
    photo_map = {}

    for step in steps.values():
        if _STEP_NAME not in (step.get("name") or "").lower():
            continue
        for widget in step.get("template", {}).get("widgets", {}).values():
            if widget.get("type") != "ImagePicker":
                continue
            widget_label = _TAG_RE.sub("", widget["template"]["label"]["logic"]["value"]).strip()
            if not _DAY_RE.match(widget_label):
                continue

            for opt in widget["template"]["options"]["staticOptions"]:
                raw_label = opt["label"]["logic"]["value"]
                caption = opt["caption"]["logic"]["value"]

                m = _LABEL_RE.match(raw_label.strip())
                if not m:
                    continue
                name, month_str, day_str, year_str = m.groups()
                date_iso = _parse_date(month_str, day_str, year_str)
                if not date_iso:
                    continue

                parsed = _parse_option(name.strip(), caption)
                if not parsed:
                    continue

                classes.append({
                    "date":       date_iso,
                    "time":       parsed["time"],
                    "class_name": parsed["class_name"],
                    "instructor": parsed["instructor"],
                    "venue":      None,
                    "genre":      parsed["genre"],
                })

                # The photo is the option's own image — only meaningful when
                # the option names an instructor (see _parse_option), not
                # when it names a class/offering like "Yoga".
                instructor = parsed["instructor"]
                image_url = (opt.get("imageUrl") or {}).get("logic", {}).get("value")
                if instructor and image_url and instructor not in photo_map:
                    photo_map[instructor] = image_url

    return classes, photo_map


async def scrape(page=None):
    """Scrape First Block Studios via its Fillout form JSON. page arg unused — no browser needed."""
    print("  Fetching First Block Studios (Fillout form)...")
    html = _fetch_html()
    build_id = _get_build_id(html)
    form_json = _fetch_form_json(build_id)

    today_str = _date.today().isoformat()
    all_classes, photo_map = _extract_classes(form_json)
    classes = [c for c in all_classes if c["date"] >= today_str]
    if not classes:
        raise Exception("no classes parsed — Fillout form structure may have changed")

    scraped_names = {c["instructor"] for c in classes if c["instructor"]}
    instructor_photos = {name: url for name, url in photo_map.items() if name in scraped_names}

    print(f"    → {len(classes)} total First Block Studios classes")
    if instructor_photos:
        print(f"    → {len(instructor_photos)} instructor photo(s) found")
    return {
        "id":                 SITE["id"],
        "name":               SITE["name"],
        "branch":             SITE.get("branch"),
        "address":            SITE["address"],
        "source_url":         SITE["source_url"],
        "classes":            classes,
        "instructor_photos":  instructor_photos,
    }
