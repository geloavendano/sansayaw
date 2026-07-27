import asyncio
import os
import urllib.request

from playwright.async_api import async_playwright

from scrapers import elfsight, nudefloor, studio808, tads, kidlat, ember
from scrapers import normalize
from scrapers.db import (
    seed_studios,
    resolve_instructors,
    update_instructor_photos,
    create_scrape_run,
    finish_scrape_run,
    insert_classes,
)

ALL_STUDIO_META = elfsight.SITES + [nudefloor.SITE] + studio808.SITES + [tads.SITE] + [kidlat.SITE] + [ember.SITE]


def _revalidate_frontend():
    """POST to the Next.js revalidation webhook to bust the ISR cache."""
    url = os.getenv("NEXT_PUBLIC_SITE_URL", "https://www.sansayaw.org")
    secret = os.getenv("REVALIDATE_SECRET", "")
    if not secret:
        print("  [revalidate] Skipping — REVALIDATE_SECRET not set")
        return
    try:
        req = urllib.request.Request(
            f"{url}/api/revalidate",
            data=b"",
            method="POST",
            headers={"x-revalidate-secret": secret},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            print(f"  [revalidate] Cache busted — {resp.status} {resp.read().decode()}")
    except Exception as e:
        print(f"  [revalidate] WARNING: could not bust cache: {e}")


def _build_class_rows(studio_data, instructor_map, run_id, is_caps, text_is_caps=None):
    """
    is_caps controls the instructor field; text_is_caps controls class_name
    and genre, defaulting to is_caps when not given. Split for studios like
    TADS where class names are ALL CAPS at the source but instructor names
    are already properly cased (including initials like "JB", "RD") — title
    -casing those would wrongly lowercase them to "Jb", "Rd".
    """
    if text_is_caps is None:
        text_is_caps = is_caps
    rows = []
    for cls in studio_data["classes"]:
        raw_instructor = cls.get("instructor")
        norm_instructor = normalize.instructor(raw_instructor, is_caps=is_caps)
        norm_class_name = normalize.class_name(cls["class_name"], is_caps=text_is_caps)
        norm_genre = normalize.genre(cls.get("genre"), is_caps=text_is_caps)
        rows.append({
            "scrape_run_id": run_id,
            "studio_id":     studio_data["id"],
            "instructor_id": instructor_map.get(norm_instructor) if norm_instructor else None,
            "instructor":    norm_instructor,
            "date":          cls["date"],
            "class_name":    norm_class_name,
            "genre":         normalize.apply_genre_overrides(norm_class_name, norm_genre),
            "time_range":    cls.get("time"),
            "venue":         cls.get("venue"),
        })
    return rows


async def main():
    print("Starting scrape...\n")

    seed_studios(ALL_STUDIO_META)
    run_id = create_scrape_run()
    print(f"Scrape run #{run_id}\n")

    all_rows = []
    errors = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                # NOTE: do NOT add --disable-blink-features=AutomationControlled here.
                # Elfsight checks navigator.webdriver and, when it looks like a real
                # browser, converts times to the visitor's IP-detected timezone (UTC on
                # GitHub Actions). When detected as automation it serves absolute PHT
                # times from the widget config — which is what we want.
            ]
        )
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
        )
        page = await context.new_page()

        # ── Nude Floor (already mixed-case source) ─────────────────────────
        try:
            nude_data = await nudefloor.scrape(page)
            all_rows += _build_class_rows(nude_data, {}, run_id, is_caps=False)
        except Exception as e:
            errors.append(f"nudefloor: {e}")
            print(f"  Nude Floor ERROR: {e}")

        # ── 808 Studio — Mindbody (ALL CAPS source) ─────────────────────────
        studio808_results = await studio808.scrape_all(page)
        for studio_data in studio808_results:
            if studio_data.get("error"):
                errors.append(f"{studio_data['id']}: {studio_data['error']}")
            all_rows += _build_class_rows(studio_data, {}, run_id, is_caps=True)

        # ── TADS — Wix Bookings (ALL CAPS class names, mixed-case instructors) ──
        tads_data = None
        try:
            tads_data = await tads.scrape(page)
            all_rows += _build_class_rows(tads_data, {}, run_id, is_caps=False, text_is_caps=True)
        except Exception as e:
            errors.append(f"tads: {e}")
            print(f"  TADS ERROR: {e}")

        # ── Ember Dance and Arts — Wix Bookings daily agenda ─────────────────
        ember_data = None
        try:
            ember_data = await ember.scrape(page)
            all_rows += _build_class_rows(ember_data, {}, run_id, is_caps=False)
        except Exception as e:
            errors.append(f"ember: {e}")
            print(f"  Ember ERROR: {e}")

        await browser.close()

    # ── Elfsight sites — widget JSON API, no browser (ALL CAPS source) ─────
    elfsight_results = elfsight.scrape_all()
    for studio_data in elfsight_results:
        if studio_data.get("error"):
            errors.append(f"{studio_data['id']}: {studio_data['error']}")
        elif not studio_data["classes"]:
            # These studios always have classes — an empty result means the
            # fetch was blocked or the widget config changed, not a quiet week.
            # Treat it as an error so the run is marked partial instead of
            # silently reporting success with missing studios.
            errors.append(f"{studio_data['id']}: 0 classes parsed (blocked or widget changed)")
        all_rows += _build_class_rows(studio_data, {}, run_id, is_caps=True)

    # ── Kidlat — Rezerv API (no browser needed) ───────────────────────────
    kidlat_data = None
    try:
        kidlat_data = await kidlat.scrape()
        all_rows += _build_class_rows(kidlat_data, {}, run_id, is_caps=False)
    except Exception as e:
        errors.append(f"kidlat: {e}")
        print(f"  Kidlat ERROR: {e}")

    # Resolve (instructor, studio) pairs to ids via confirmed alias rules
    all_pairs = list({(r["instructor"], r["studio_id"]) for r in all_rows if r["instructor"]})
    instructor_map = resolve_instructors(all_pairs)
    unmatched = [p for p in all_pairs if p not in instructor_map]
    if unmatched:
        print(f"\n  {len(unmatched)} instructor/studio pair(s) unassigned — run: python3 manage_instructors.py review")

    # Update instructor photos from Elfsight scrapers.
    # Elfsight alt text is ALL CAPS — normalize with is_caps=True to match stored names.
    elfsight_photos = {}
    for data in elfsight_results:
        for raw_name, url in data.get("instructor_photos", {}).items():
            norm = normalize.instructor(raw_name, is_caps=True)
            instructor_id = instructor_map.get((norm, data["id"]))
            if instructor_id and instructor_id not in elfsight_photos:
                elfsight_photos[instructor_id] = url
    update_instructor_photos(elfsight_photos)

    for row in all_rows:
        if row["instructor"]:
            row["instructor_id"] = instructor_map.get((row["instructor"], row["studio_id"]))

    insert_classes(all_rows)

    # 808 Studio and TADS are best-effort; failures don't degrade the run.
    # Only mark partial if a core scraper (elfsight / nudefloor) errored.
    core_errors = [e for e in errors if not e.startswith(("808_podium", "808_bgc", "tads", "kidlat", "ember"))]
    status = "partial" if core_errors else "success"
    finish_scrape_run(run_id, status)

    # Bust the Next.js ISR cache so the frontend shows fresh data immediately
    _revalidate_frontend()

    print(f"\n{'─'*50}")
    print(f"Status : {status}")
    print(f"Run ID : {run_id}")
    print(f"Classes: {len(all_rows)}")
    all_summary = elfsight_results + studio808_results
    if tads_data:
        all_summary.append(tads_data)
    if kidlat_data:
        all_summary.append(kidlat_data)
    if ember_data:
        all_summary.append(ember_data)
    for s in all_summary:
        branch = f" ({s['branch']})" if s.get("branch") else ""
        flag = " ⚠" if s.get("error") else ""
        print(f"  {s['name']}{branch}: {len(s['classes'])}{flag}")
    if errors:
        print("\nErrors:")
        for e in errors:
            print(f"  {e}")


if __name__ == "__main__":
    asyncio.run(main())
