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
            # photo_url is managed manually — never overwrite with None
            **({"photo_url": s["photo_url"]} if s.get("photo_url") else {}),
        }
        for s in studios
    ]
    client.table("studios").upsert(rows).execute()


def upsert_instructors(names):
    """
    Upsert a list of normalized instructor names.
    Returns a dict of {display_name: id}.

    Sub instructors ("Abby (Sub)") are stored under their base name ("Abby")
    so they don't create duplicate instructor records. The display name with
    "(Sub)" is kept in the classes.instructor column for context.
    """
    client = get_client()

    # Map display name → canonical name (strip " (Sub)" suffix for DB keying)
    canonical = {}
    for n in names:
        if n:
            base = n.replace(" (Sub)", "").strip()
            canonical[n] = base

    unique_bases = list({v for v in canonical.values()})
    if not unique_bases:
        return {}

    client.table("instructors").upsert(
        [{"name": n} for n in unique_bases],
        on_conflict="name",
        ignore_duplicates=True,
    ).execute()

    result = client.table("instructors").select("id, name").in_("name", unique_bases).execute()
    base_to_id = {row["name"]: row["id"] for row in result.data}

    # Return mapping from original display name → id
    return {display: base_to_id[base] for display, base in canonical.items() if base in base_to_id}


def create_scrape_run():
    client = get_client()
    result = client.table("scrape_runs").insert({"status": "running"}).execute()
    return result.data[0]["id"]


def finish_scrape_run(run_id, status="success"):
    client = get_client()
    client.table("scrape_runs").update({"status": status}).eq("id", run_id).execute()


def insert_classes(rows):
    """Bulk-insert class rows. Supabase accepts up to 1000 rows per call."""
    if not rows:
        return
    client = get_client()
    # Insert in chunks to stay safely under API limits
    chunk = 500
    for i in range(0, len(rows), chunk):
        client.table("classes").insert(rows[i : i + chunk]).execute()
