import asyncio
from playwright.async_api import async_playwright

from scrapers import elfsight, nudefloor, studio808
from scrapers import normalize
from scrapers.db import (
    seed_studios,
    upsert_instructors,
    create_scrape_run,
    finish_scrape_run,
    insert_classes,
)

ALL_STUDIO_META = elfsight.SITES + [nudefloor.SITE] + studio808.SITES


def _build_class_rows(studio_data, instructor_map, run_id, is_caps):
    rows = []
    for cls in studio_data["classes"]:
        raw_instructor = cls.get("instructor")
        norm_instructor = normalize.instructor(raw_instructor, is_caps=is_caps)
        rows.append({
            "scrape_run_id": run_id,
            "studio_id":     studio_data["id"],
            "instructor_id": instructor_map.get(norm_instructor) if norm_instructor else None,
            "instructor":    norm_instructor,
            "date":          cls["date"],
            "class_name":    normalize.class_name(cls["class_name"], is_caps=is_caps),
            "genre":         normalize.genre(cls.get("genre"), is_caps=is_caps),
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
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # ── Elfsight sites (ALL CAPS source) ──────────────────────────────
        elfsight_results = await elfsight.scrape_all(page)
        for studio_data in elfsight_results:
            if studio_data.get("error"):
                errors.append(f"{studio_data['id']}: {studio_data['error']}")
            all_rows += _build_class_rows(studio_data, {}, run_id, is_caps=True)

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

        await browser.close()

    # Upsert all unique instructor names in one round-trip, then patch IDs
    all_names = list({r["instructor"] for r in all_rows if r["instructor"]})
    instructor_map = upsert_instructors(all_names)
    for row in all_rows:
        if row["instructor"]:
            row["instructor_id"] = instructor_map.get(row["instructor"])

    insert_classes(all_rows)

    status = "partial" if errors else "success"
    finish_scrape_run(run_id, status)

    print(f"\n{'─'*50}")
    print(f"Status : {status}")
    print(f"Run ID : {run_id}")
    print(f"Classes: {len(all_rows)}")
    for s in elfsight_results + studio808_results:
        branch = f" ({s['branch']})" if s.get("branch") else ""
        flag = " ⚠" if s.get("error") else ""
        print(f"  {s['name']}{branch}: {len(s['classes'])}{flag}")
    if errors:
        print("\nErrors:")
        for e in errors:
            print(f"  {e}")


if __name__ == "__main__":
    asyncio.run(main())
