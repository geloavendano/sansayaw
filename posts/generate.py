"""
Generate sansayaw Instagram schedule posts (transparent overlay or 1080×1350 PNG).

Usage:
    python posts/generate.py                            # uses posts/input.json
    python posts/generate.py my-input.json              # custom input file
    python posts/generate.py --from-db                  # list instructors with classes this week
    python posts/generate.py --from-db "Caila Santos"   # generate straight from Supabase
    python posts/generate.py --from-db "Caila Santos" "Rex Villanueva" --format portrait
    python posts/generate.py --tag                      # list genres with classes this week
    python posts/generate.py --tag "K-POP"               # every K-POP class this week, all studios
    python posts/generate.py --tag "K-POP" "Heels"

Input format:
    {
      "weekLabel": "July 7 – 13, 2025",
      "choreographers": [
        {
          "name": "Caila Santos",
          "handle": "@cailasantos",
          "bio": "Choreographer · HipHop & Jazz",
          "photo": "photos/caila.jpg",        # optional — local path or URL
          "photoOffset": {"x": 0, "y": 0},     # optional — % nudge of the photo
          "photoScale": 1,                     # optional — zoom factor
          "placeholderIndex": 0,               # optional — gradient when no photo
          "classes": [
            {"day": "Mon", "time": "7:00 PM", "name": "...", "location": "..."}
          ]
        }
      ]
    }

Photos given as local paths are embedded as data URLs so no server is needed.
Output goes to posts/out/sansayaw-<slug>.png.
"""

import argparse
import asyncio
import base64
import json
import mimetypes
import re
import sys
from datetime import date, timedelta
from pathlib import Path

from playwright.async_api import async_playwright

POSTS_DIR = Path(__file__).parent
REPO_ROOT = POSTS_DIR.parent
TEMPLATE = POSTS_DIR / "template.html"
OUT_DIR = POSTS_DIR / "out"


def _slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def _resolve_photo(photo, base_dir):
    """Local file path → data URL; http(s) URLs pass through untouched."""
    if not photo:
        return None
    if photo.startswith(("http://", "https://", "data:")):
        return photo
    path = Path(photo)
    if not path.is_absolute():
        path = base_dir / path
    if not path.exists():
        print(f"    WARNING: photo not found: {path} — using placeholder")
        return None
    mime = mimetypes.guess_type(path.name)[0] or "image/jpeg"
    b64 = base64.b64encode(path.read_bytes()).decode()
    return f"data:{mime};base64,{b64}"


def _week_bounds(today=None):
    """Monday–Sunday of the current week."""
    today = today or date.today()
    monday = today - timedelta(days=today.weekday())
    return monday, monday + timedelta(days=6)


def _week_label(monday, sunday):
    """'July 7 – 13, 2025' or 'June 30 – July 6, 2025' across months."""
    if monday.month == sunday.month:
        return f"{monday.strftime('%B')} {monday.day} – {sunday.day}, {sunday.year}"
    return f"{monday.strftime('%B')} {monday.day} – {sunday.strftime('%B')} {sunday.day}, {sunday.year}"


def _start_minutes(time_range):
    """'7:00 PM – 8:30 PM' → minutes since midnight, for sorting."""
    m = re.match(r"(\d{1,2}):(\d{2})\s*([AP]M)", (time_range or "").strip(), re.IGNORECASE)
    if not m:
        return 0
    h = int(m.group(1)) % 12 + (12 if m.group(3).upper() == "PM" else 0)
    return h * 60 + int(m.group(2))


def _connect_db():
    sys.path.insert(0, str(REPO_ROOT))
    from dotenv import load_dotenv
    load_dotenv(REPO_ROOT / ".env")
    from scrapers.db import get_client
    return get_client().schema("sansayaw")


def _week_rows(s):
    """All classes in the latest successful scrape run, within the current week."""
    run = (
        s.table("scrape_runs").select("id")
        .eq("status", "success").order("scraped_at", desc=True).limit(1)
        .execute()
    )
    if not run.data:
        sys.exit("No successful scrape run found in the database.")
    run_id = run.data[0]["id"]

    monday, sunday = _week_bounds()
    return (
        s.table("classes").select("*")
        .eq("scrape_run_id", run_id)
        .gte("date", monday.isoformat()).lte("date", sunday.isoformat())
        .execute()
    ).data


def _row_location(studios, r):
    studio = studios.get(r["studio_id"], {})
    location = studio.get("name", "")
    if studio.get("branch"):
        location += f" · {studio['branch']}"
    return location


def _row_start(r):
    return re.split(r"\s*[–\-]\s*", r["time_range"] or "", maxsplit=1)[0].strip()


def _fetch_from_db(names, week_label):
    """Build choreographer dicts from the latest scrape run in Supabase."""
    s = _connect_db()
    rows = _week_rows(s)

    studios = {r["id"]: r for r in s.table("studios").select("id, name, branch").execute().data}
    instructors = {
        r["id"]: r
        for r in s.table("instructors")
        .select("id, name, display_name, bio, instagram, photo_url")
        .execute().data
    }

    # Group this week's classes by instructor identity (id), falling back to
    # the raw name for rows scraped before the alias migration.
    by_key = {}
    for r in rows:
        key = r.get("instructor_id") or r.get("instructor")
        if key:
            by_key.setdefault(key, []).append(r)

    def person_name(key):
        rec = instructors.get(key) if isinstance(key, int) else None
        return (rec and (rec.get("display_name") or rec.get("name"))) or str(key)

    def studios_of(cls):
        return sorted({studios.get(r["studio_id"], {}).get("name", r["studio_id"]) for r in cls})

    # No names given → list who's available and exit
    if not names:
        print(f"Instructors with classes this week ({week_label}):\n")
        for key, cls in sorted(by_key.items(), key=lambda kv: -len(kv[1])):
            n = len(cls)
            print(f"  {person_name(key)}  ({n} class{'es' if n != 1 else ''} · {', '.join(studios_of(cls))})")
        sys.exit(0)

    people = []
    for name in names:
        # Accept a numeric instructor id, or a case-insensitive name.
        # A name may match several distinct people (after an unmerge).
        if name.isdigit() and int(name) in by_key:
            matches = [int(name)]
        else:
            matches = [k for k in by_key if person_name(k).lower() == name.lower()]
        if not matches:
            print(f"  WARNING: no classes this week for '{name}' — skipping")
            continue
        if len(matches) > 1:
            print(f"  NOTE: '{name}' matches {len(matches)} separate instructors — generating one post each")

        for key in matches:
            cls = sorted(by_key[key], key=lambda r: (r["date"], _start_minutes(r["time_range"])))
            classes = [{
                "day": date.fromisoformat(r["date"]).strftime("%a"),
                "time": _row_start(r),
                "name": r["class_name"],
                "location": _row_location(studios, r),
            } for r in cls]

            rec = instructors.get(key, {}) if isinstance(key, int) else {}
            handle = (rec.get("instagram") or "").strip()
            if handle.startswith(("http://", "https://")):
                handle = handle.rstrip("/").rsplit("/", 1)[-1]
            if handle and not handle.startswith("@"):
                handle = f"@{handle}"

            person = {
                "name": person_name(key),
                "handle": handle,
                "bio": rec.get("bio") or "Choreographer",
                "photo": rec.get("photo_url"),
                "classes": classes,
            }
            if len(matches) > 1:
                person["slug_suffix"] = studios_of(cls)[0]
            people.append(person)
    return people


def _fetch_by_tag(tags, week_label):
    """
    Build one card per genre tag — every matching class this week across
    every studio, not scoped to a single instructor. Each row shows its
    own instructor since the card itself isn't about one person.
    """
    s = _connect_db()
    rows = _week_rows(s)
    studios = {r["id"]: r for r in s.table("studios").select("id, name, branch").execute().data}

    by_genre = {}
    for r in rows:
        g = (r.get("genre") or "").strip()
        if g:
            by_genre.setdefault(g, []).append(r)

    # No tags given → list what's available and exit
    if not tags:
        print(f"Genres with classes this week ({week_label}):\n")
        for g, cls in sorted(by_genre.items(), key=lambda kv: -len(kv[1])):
            n = len(cls)
            print(f"  {g}  ({n} class{'es' if n != 1 else ''})")
        sys.exit(0)

    cards = []
    for tag in tags:
        matches = [g for g in by_genre if g.lower() == tag.lower()]
        if not matches:
            print(f"  WARNING: no classes tagged '{tag}' this week — skipping")
            continue

        for genre in matches:
            cls = sorted(by_genre[genre], key=lambda r: (r["date"], _start_minutes(r["time_range"])))
            classes = [{
                "day": date.fromisoformat(r["date"]).strftime("%a"),
                "time": _row_start(r),
                "name": r["class_name"],
                "location": _row_location(studios, r),
                "instructor": r.get("instructor"),
            } for r in cls]

            n = len(classes)
            cards.append({
                "name": genre,
                "handle": "",
                "bio": f"{n} class{'es' if n != 1 else ''} this week across Metro Manila",
                "photo": None,
                "classes": classes,
            })
    return cards


async def main():
    parser = argparse.ArgumentParser(description="Generate sansayaw Instagram schedule posts")
    parser.add_argument("input", nargs="?", help="input JSON file (default: posts/input.json)")
    parser.add_argument("--from-db", nargs="*", metavar="NAME", default=None,
                        help="pull this week's classes from Supabase; no names = list available instructors")
    parser.add_argument("--tag", nargs="*", metavar="GENRE", default=None,
                        help="post of every class this week tagged with this genre, across all studios; no tags = list available genres")
    parser.add_argument("--format", choices=["overlay", "portrait"], default=None,
                        help="output format (default: overlay, or the input file's setting)")
    args = parser.parse_args()

    monday, sunday = _week_bounds()

    if args.tag is not None:
        week_label = _week_label(monday, sunday)
        choreographers = _fetch_by_tag(args.tag, week_label)
        default_format = args.format or "overlay"
        input_dir = POSTS_DIR
        if not choreographers:
            sys.exit("Nothing to generate.")
    elif args.from_db is not None:
        week_label = _week_label(monday, sunday)
        choreographers = _fetch_from_db(args.from_db, week_label)
        default_format = args.format or "overlay"
        input_dir = POSTS_DIR
        if not choreographers:
            sys.exit("Nothing to generate.")
    else:
        input_path = Path(args.input) if args.input else POSTS_DIR / "input.json"
        config = json.loads(input_path.read_text())
        week_label = config.get("weekLabel") or _week_label(monday, sunday)
        default_format = args.format or config.get("format", "overlay")
        choreographers = config["choreographers"]
        input_dir = input_path.parent

    OUT_DIR.mkdir(exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(
            viewport={"width": 540, "height": 675},
            device_scale_factor=2,  # 540×675 CSS px → 1080×1350 PNG
        )
        await page.goto(TEMPLATE.as_uri())
        await page.evaluate("document.fonts.ready")

        for person in choreographers:
            fmt = person.get("format", default_format)
            data = {
                "format": fmt,
                "weekLabel": person.get("weekLabel", week_label),
                "name": person["name"],
                "handle": person.get("handle", ""),
                "bio": person.get("bio", ""),
                "photo": _resolve_photo(person.get("photo"), input_dir),
                "photoOffset": person.get("photoOffset", {"x": 0, "y": 0}),
                "photoScale": person.get("photoScale", 1),
                "placeholderIndex": person.get("placeholderIndex", 0),
                "classes": person.get("classes", []),
            }
            await page.evaluate("data => render(data)", data)
            # Let images decode before screenshotting
            if data["photo"]:
                await page.wait_for_timeout(500)

            slug = _slug(person["name"])
            if person.get("slug_suffix"):
                slug += f"-{_slug(person['slug_suffix'])}"
            out_path = OUT_DIR / f"sansayaw-{slug}.png"
            await page.locator("#card").screenshot(
                path=str(out_path),
                omit_background=(fmt == "overlay"),
            )
            print(f"  ✓ {out_path.relative_to(POSTS_DIR.parent)} ({fmt})")

        await browser.close()

    print(f"\nDone — {len(choreographers)} post(s) in {OUT_DIR.relative_to(POSTS_DIR.parent)}/")


if __name__ == "__main__":
    asyncio.run(main())
