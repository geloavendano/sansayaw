import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

_client = None


def get_client():
    global _client
    if _client is None:
        _client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_KEY"],
        )
    return _client


def seed_studios(studios):
    """Upsert studio metadata. Safe to call on every run."""
    client = get_client()
    rows = [
        {
            "id":         s["id"],
            "name":       s["name"],
            "branch":     s.get("branch"),
            "address":    s.get("address"),
            "source_url": s.get("source_url") or s.get("url"),
            "website":    s.get("website"),
            "instagram":  s.get("instagram"),
            # maps_url / photo_url may be set manually — never overwrite with None
            **({"maps_url": s["maps_url"]} if s.get("maps_url") else {}),
            **({"photo_url": s["photo_url"]} if s.get("photo_url") else {}),
        }
        for s in studios
    ]
    try:
        client.schema("sansayaw").table("studios").upsert(rows).execute()
    except Exception:
        # maps_url column may not exist yet (migration_studios_maps_url.sql)
        for r in rows:
            r.pop("maps_url", None)
        client.schema("sansayaw").table("studios").upsert(rows).execute()


def resolve_instructors(pairs):
    """
    Look up (display_name, studio_id) pairs against the instructor_aliases
    rules table (like email filters: "this name at this studio is person #N").

    Only pairs with a confirmed rule resolve to an id — unknown pairs are
    left out, so their classes keep a NULL instructor_id until confirmed
    with `python3 manage_instructors.py review`. The scraper never invents
    identities on its own.

    Sub instructors ("Abby (Sub)") resolve under their base name ("Abby")
    at the same studio. The display name with "(Sub)" is kept in the
    classes.instructor column for context.

    Returns {(display_name, studio_id): instructor_id}.
    """
    client = get_client()

    # Map display pair → canonical pair (strip " (Sub)" suffix for keying)
    canonical = {}
    for name, studio_id in pairs:
        if name and studio_id:
            base = name.replace(" (Sub)", "").strip()
            canonical[(name, studio_id)] = (base, studio_id)

    if not canonical:
        return {}

    base_names = list({n for n, _ in canonical.values()})
    existing = (
        client.schema("sansayaw").table("instructor_aliases")
        .select("name, studio_id, instructor_id")
        .in_("name", base_names)
        .execute()
    )
    alias_map = {(r["name"], r["studio_id"]): r["instructor_id"] for r in existing.data}

    return {display: alias_map[base] for display, base in canonical.items() if base in alias_map}


def update_instructor_photos(photos_by_id):
    """
    Fill photo_url per instructor id from scraped Elfsight cards.
    Manually curated photos (non-Elfsight URLs) are never overwritten.
    """
    if not photos_by_id:
        return
    client = get_client()
    s = client.schema("sansayaw")
    current = (
        s.table("instructors").select("id, photo_url")
        .in_("id", list(photos_by_id)).execute()
    )
    for row in current.data:
        url = photos_by_id.get(row["id"])
        existing = row.get("photo_url") or ""
        # Photos on elfsight domains (files.elfsight.com / files.elfsightcdn.com)
        # are scraper-managed and refreshable; anything else was set manually.
        if url and url != existing and (not existing or "elfsight" in existing):
            s.table("instructors").update({"photo_url": url}).eq("id", row["id"]).execute()


def create_scrape_run():
    client = get_client()
    result = client.schema("sansayaw").table("scrape_runs").insert({"status": "running"}).execute()
    return result.data[0]["id"]


def finish_scrape_run(run_id, status="success"):
    client = get_client()
    client.schema("sansayaw").table("scrape_runs").update({"status": status}).eq("id", run_id).execute()


def insert_classes(rows):
    """Bulk-insert class rows. Supabase accepts up to 1000 rows per call."""
    if not rows:
        return
    client = get_client()
    # Insert in chunks to stay safely under API limits
    chunk = 500
    for i in range(0, len(rows), chunk):
        client.schema("sansayaw").table("classes").insert(rows[i : i + chunk]).execute()
