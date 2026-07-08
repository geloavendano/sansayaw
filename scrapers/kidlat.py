"""
Kidlat Dance Studio scraper — Rezerv API (no browser required).

The Rezerv customer API is public; the studio is identified by the
Referer header. One POST per day with {"selectedDate": "YYYY-MM-DD"}.

Times in the API response are PHT stored as HH:MM:SS (no TZ offset applied).
"""

import json
import urllib.request
from datetime import datetime, timedelta

SITE = {
    "id":        "kidlat",
    "name":      "Kidlat Dance Studio",
    "branch":    None,
    "address":   "Unit 202 & 203 Sunrise Condominium I Building, Ortigas Avenue, San Juan City",
    "source_url": "https://kidlatdancestudio.com/timetable",
    "website":   "https://kidlatdancestudio.com",
    "instagram": "https://www.instagram.com/kidlatdancestudio",
    "maps_url":  "https://maps.app.goo.gl/XWDaWGU4hcZQ8Z2z5",
    "photo_url": None,
}

_API_URL = "https://customer-api.rezerv.co/v1/schedule/multi-select-filter"
_HEADERS = {
    "Content-Type": "application/json",
    "Referer":      "https://kidlatdancestudio.com/timetable",
    "Origin":       "https://kidlatdancestudio.com",
}


def _hms_to_12h(hms):
    """'20:00:00' → '8:00 PM'"""
    h, m, _ = hms.split(":")
    h, m = int(h), int(m)
    ap = "PM" if h >= 12 else "AM"
    return f"{h % 12 or 12}:{m:02d} {ap}"


def _add_duration(hms_start, hms_dur):
    """('20:00:00', '01:30:00') → '9:30 PM'"""
    sh, sm, _ = hms_start.split(":")
    dh, dm, _ = hms_dur.split(":")
    total = int(sh) * 60 + int(sm) + int(dh) * 60 + int(dm)
    eh, em = divmod(total % (24 * 60), 60)
    ap = "PM" if eh >= 12 else "AM"
    return f"{eh % 12 or 12}:{em:02d} {ap}"


def _fetch_day(date_str):
    payload = json.dumps({"selectedDate": date_str}).encode()
    req = urllib.request.Request(_API_URL, data=payload, method="POST", headers=_HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        envelope = json.loads(resp.read())

    if envelope.get("code") != 0:
        return []

    classes = []
    for item in (envelope.get("data") or {}).get("data") or []:
        start = item.get("startTime", "")
        dur   = item.get("duration", "")

        if start and dur:
            time_range = f"{_hms_to_12h(start)} – {_add_duration(start, dur)}"
        elif start:
            time_range = _hms_to_12h(start)
        else:
            time_range = ""

        trainers   = item.get("trainers") or []
        instructor = trainers[0]["trainerName"] if trainers else None

        classes.append({
            "date":       date_str,
            "time":       time_range,
            "class_name": item.get("className", ""),
            "instructor": instructor,
            "venue":      item.get("facilityName") or item.get("location"),
            "genre":      item.get("categoryName"),
        })

    return classes


async def scrape(page=None):
    """Scrape Kidlat via Rezerv API. page arg unused — no browser needed."""
    print("  Fetching Kidlat Dance Studio (Rezerv API)...")
    today = datetime.now()
    all_classes = []

    for offset in range(14):
        date_str = (today + timedelta(days=offset)).strftime("%Y-%m-%d")
        try:
            day = _fetch_day(date_str)
            if day:
                print(f"    {date_str}: {len(day)} classes")
            all_classes.extend(day)
        except Exception as e:
            print(f"    {date_str}: error — {e}")

    print(f"    → {len(all_classes)} total Kidlat classes")
    return {
        "id":         SITE["id"],
        "name":       SITE["name"],
        "branch":     SITE.get("branch"),
        "address":    SITE["address"],
        "source_url": SITE["source_url"],
        "classes":    all_classes,
    }
