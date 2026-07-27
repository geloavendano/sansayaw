"""
Elfsight Events Calendar scraper.

These studios run Shopify storefronts with an Elfsight events widget. We used
to load the storefront in Playwright and parse the widget's rendered text, but
Shopify rate-limits datacenter IPs — from 2026-07-17 every GitHub Actions run
got a page whose entire body was "local_rate_limited", so all four studios
silently returned nothing.

Instead we call the same JSONP endpoint the widget itself boots from:

    https://shy.elfsight.com/p/boot/?callback=X&shop=<store>.myshopify.com&w=<widget-id>

That's Elfsight's own host, so Shopify's rate limiting doesn't apply, and no
browser is needed. It also returns exact epoch-millisecond timestamps, which
removed a longstanding hack: the rendered widget localised times to the
visitor's IP, so times had to be shifted +8h when running on CI.

Two title layouts, per `stacked_title`:
    ZERØ / Playground — name is "INSTRUCTOR: CLASS", eventType is the genre
    SPAC3            — name is the instructor, eventType is the class,
                       tags[0] is the level
"""

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

# Only publish classes from today onward; the horizon guards against a studio
# posting a far-future one-off and dragging the whole payload along with it.
_HORIZON_DAYS = 120

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
        "shop": "zero-studio-e8d1.myshopify.com",
        "widget_id": "74b6be01-e8ce-45a4-970c-3b0346f91895",
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
        "shop": "zero-studio-e8d1.myshopify.com",
        "widget_id": "900fb78e-a7e9-4585-8c3d-a95389e48e19",
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
        "shop": "idntzf-3a.myshopify.com",
        "widget_id": "8244257e-1f96-4cd4-b082-84863f34cbcd",
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
        "shop": "fpjcvt-1e.myshopify.com",
        "widget_id": "54bcef57-c43e-4be9-90e8-4faeed9eeb05",
        # Cards stack "CLASS STYLE / INSTRUCTOR / LEVEL" instead of using the
        # "INSTRUCTOR: CLASS" title format
        "stacked_title": True,
    },
]


def _split_instructor(title):
    """'INSTRUCTOR: CLASS' → ('INSTRUCTOR', 'CLASS'). Returns (None, title) if no colon."""
    if ":" in title:
        parts = title.split(":", 1)
        return parts[0].strip(), parts[1].strip()
    return None, title


def _fmt_time(dt):
    """datetime → '7:00 PM'"""
    return f"{dt.hour % 12 or 12}:{dt.minute:02d} {'PM' if dt.hour >= 12 else 'AM'}"


def _option_names(entries):
    """
    Elfsight stores dropdown options as a list mixing real options
    ({'value': <uuid>, 'name': ...}) with a schema descriptor object.
    Keep only the real options.
    """
    out = {}
    for e in entries or []:
        if isinstance(e, dict) and e.get("value"):
            out[e["value"]] = e.get("name")
    return out


def fetch_settings(site, timeout=30):
    """Fetch and unwrap the widget's JSONP boot payload."""
    url = (
        "https://shy.elfsight.com/p/boot/"
        f"?callback=cb&shop={site['shop']}&w={site['widget_id']}"
    )
    req = urllib.request.Request(
        url, headers={"User-Agent": _UA, "Referer": site["website"] + "/"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8")

    # Body is `/**/cb({...});` — strip the JSONP wrapper
    body = re.sub(r"^\s*/\*\*/\s*\w+\(", "", raw).rstrip().rstrip(";").rstrip(")")
    payload = json.loads(body)

    widget = payload["data"]["widgets"][site["widget_id"]]
    return widget["data"]["settings"]


def parse_settings(settings, site, today=None):
    """Turn a widget payload into class dicts (today → +_HORIZON_DAYS, PHT)."""
    stacked = site.get("stacked_title", False)
    locations = _option_names(settings.get("locations"))
    event_types = _option_names(settings.get("eventTypes"))

    today = today or datetime.now(PHT).date()
    horizon = today + timedelta(days=_HORIZON_DAYS)

    classes = []
    for e in settings.get("events", []):
        start_ms = e.get("start")
        if not start_ms:
            continue
        start = datetime.fromtimestamp(start_ms / 1000, PHT)
        if not (today <= start.date() <= horizon):
            continue

        time_str = _fmt_time(start)
        if e.get("end"):
            time_str += " – " + _fmt_time(datetime.fromtimestamp(e["end"] / 1000, PHT))

        title = (e.get("name") or "").strip()
        type_name = event_types.get(e.get("eventType"))
        tags = [t for t in (e.get("tags") or []) if t]

        if stacked:
            instructor = title or None
            class_name = type_name or title
            genre = tags[0] if tags else None
        else:
            instructor, class_name = _split_instructor(title)
            genre = type_name or (tags[0] if tags else None)

        classes.append({
            "date": start.date().isoformat(),
            "instructor": instructor,
            "class_name": class_name,
            "genre": genre,
            "time": time_str,
            "venue": locations.get(e.get("location")),
            "media": e.get("media") or None,
        })

    classes.sort(key=lambda c: (c["date"], c["time"]))
    return classes


def scrape(site):
    """Scrape one Elfsight-powered site. Returns a studio dict with classes."""
    print(f"  Fetching {site['name']} ({site.get('branch') or 'main'})...")
    settings = fetch_settings(site)
    classes = parse_settings(settings, site)
    print(f"    → {len(classes)} classes found")

    # Instructor photos ride along on each event, so no separate DOM pass.
    photo_map = {}
    for c in classes:
        media = c.pop("media", None)
        instructor = c.get("instructor")
        if media and instructor and instructor not in photo_map:
            photo_map[instructor] = media
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


def scrape_all():
    results = []
    for site in SITES:
        try:
            results.append(scrape(site))
        except Exception as e:
            print(f"    ERROR: {e}")
            results.append({
                "id": site["id"],
                "name": site["name"],
                "branch": site["branch"],
                "address": site["address"],
                "source_url": site["url"],
                "classes": [],
                "instructor_photos": {},
                "error": str(e),
            })
    return results
