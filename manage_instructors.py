"""
Manage instructor identities — assignment rules, handles, photos, merges.

The instructor_aliases table works like email filters: each rule says
"this scraped name at this studio is instructor #N". Classes from
name+studio combos without a rule keep a NULL instructor_id until you
confirm them here.

Usage:
    python3 manage_instructors.py pending              # list unassigned name+studio pairs
    python3 manage_instructors.py review               # interactively confirm pending pairs
    python3 manage_instructors.py assign "Jaja" kidlat --to 123
    python3 manage_instructors.py assign "Jaja" kidlat --new
    python3 manage_instructors.py unassign "Jaja" kidlat   # remove a wrong rule
    python3 manage_instructors.py merge 123 456        # 456 was a duplicate of 123
    python3 manage_instructors.py set 123 --instagram @jajasagmayao --bio "HipHop · Femme"
    python3 manage_instructors.py add-reel 123 https://www.instagram.com/reel/XXXXXXXXXXX/
    python3 manage_instructors.py remove-reel 123 https://www.instagram.com/reel/XXXXXXXXXXX/
    python3 manage_instructors.py list [name-filter]
"""

import argparse
import sys

from scrapers.db import get_client


def _s():
    return get_client().schema("sansayaw")


def _base(name):
    return name.replace(" (Sub)", "").strip()


def _latest_run_id(s):
    run = (
        s.table("scrape_runs").select("id")
        .eq("status", "success").order("scraped_at", desc=True).limit(1)
        .execute()
    )
    if not run.data:
        sys.exit("No successful scrape run found.")
    return run.data[0]["id"]


def _fetch_instructors(s):
    return {
        r["id"]: r
        for r in s.table("instructors")
        .select("id, name, display_name, bio, instagram, photo_url, reel_urls")
        .execute().data
    }


def _fetch_aliases(s):
    return s.table("instructor_aliases").select("name, studio_id, instructor_id").execute().data


def _fetch_studios(s):
    return {r["id"]: r for r in s.table("studios").select("id, name, branch").execute().data}


def _studio_label(studios, studio_id):
    st = studios.get(studio_id, {})
    label = st.get("name", studio_id)
    if st.get("branch"):
        label += f" · {st['branch']}"
    return label


def _pending_pairs(s):
    """Distinct (base name, studio_id) pairs in the latest run without a rule."""
    run_id = _latest_run_id(s)
    rows = (
        s.table("classes").select("instructor, studio_id, class_name")
        .eq("scrape_run_id", run_id).not_.is_("instructor", "null")
        .execute()
    ).data
    ruled = {(a["name"], a["studio_id"]) for a in _fetch_aliases(s)}

    pending = {}
    for r in rows:
        key = (_base(r["instructor"]), r["studio_id"])
        if key not in ruled:
            pending.setdefault(key, []).append(r["class_name"])
    return pending


def _instructor_label(rec, aliases, studios):
    name = rec.get("display_name") or rec["name"]
    at = sorted({_studio_label(studios, a["studio_id"]) for a in aliases if a["instructor_id"] == rec["id"]})
    parts = [f"#{rec['id']} {name}"]
    if rec.get("instagram"):
        parts.append(rec["instagram"])
    if rec.get("reel_urls"):
        parts.append(f"{len(rec['reel_urls'])} reel(s)")
    if at:
        parts.append(f"teaches at {', '.join(at)}")
    return "  ·  ".join(parts)


def _suggestions(name, instructors):
    """Instructors whose name matches exactly, then loose word matches."""
    lname = name.lower()
    exact, loose = [], []
    for rec in instructors.values():
        candidates = {rec["name"].lower(), (rec.get("display_name") or "").lower()}
        if lname in candidates:
            exact.append(rec)
        elif any(lname in c or c in lname for c in candidates if c):
            loose.append(rec)
    return exact + loose


def _apply_rule(s, name, studio_id, instructor_id):
    """Create/replace the rule and backfill classes in every run."""
    s.table("instructor_aliases").upsert(
        {"name": name, "studio_id": studio_id, "instructor_id": instructor_id},
        on_conflict="name,studio_id",
    ).execute()
    for variant in (name, f"{name} (Sub)"):
        s.table("classes").update({"instructor_id": instructor_id}).eq(
            "studio_id", studio_id
        ).eq("instructor", variant).execute()


def _create_instructor(s, name):
    return s.table("instructors").insert({"name": name}).execute().data[0]["id"]


# ── Commands ──────────────────────────────────────────────────────────────────

def cmd_pending(args):
    s = _s()
    studios = _fetch_studios(s)
    pending = _pending_pairs(s)
    if not pending:
        print("Nothing pending — every instructor in the latest run is assigned.")
        return
    print(f"{len(pending)} unassigned name+studio pair(s):\n")
    for (name, studio_id), classes in sorted(pending.items()):
        print(f"  {name}  @ {_studio_label(studios, studio_id)}  ({len(classes)} class(es): {', '.join(sorted(set(classes))[:3])})")
    print(f"\nConfirm with: python3 manage_instructors.py review")


def cmd_review(args):
    s = _s()
    studios = _fetch_studios(s)
    pending = _pending_pairs(s)
    if not pending:
        print("Nothing pending — every instructor in the latest run is assigned.")
        return

    print(f"{len(pending)} pending pair(s). For each: number = assign to that instructor, n = new instructor, s = skip, q = quit.\n")
    for (name, studio_id), classes in sorted(pending.items()):
        instructors = _fetch_instructors(s)
        aliases = _fetch_aliases(s)
        print(f"─── {name}  @ {_studio_label(studios, studio_id)}")
        print(f"    classes: {', '.join(sorted(set(classes))[:4])}")
        sugg = _suggestions(name, instructors)
        for i, rec in enumerate(sugg, 1):
            print(f"    [{i}] {_instructor_label(rec, aliases, studios)}")
        choice = input("    → [1-9/n/s/q]: ").strip().lower()
        if choice == "q":
            return
        if choice == "s" or not choice:
            continue
        if choice == "n":
            new_id = _create_instructor(s, name)
            _apply_rule(s, name, studio_id, new_id)
            print(f"    ✓ created instructor #{new_id} and assigned\n")
        elif choice.isdigit() and 1 <= int(choice) <= len(sugg):
            rec = sugg[int(choice) - 1]
            _apply_rule(s, name, studio_id, rec["id"])
            print(f"    ✓ assigned to #{rec['id']} {rec.get('display_name') or rec['name']}\n")
        else:
            print("    skipped (unrecognized input)\n")


def cmd_assign(args):
    s = _s()
    name = _base(args.name)
    if args.new:
        instructor_id = _create_instructor(s, name)
        print(f"Created instructor #{instructor_id} '{name}'")
    elif args.to:
        instructor_id = args.to
    else:
        sys.exit("Specify --to <instructor_id> or --new")
    _apply_rule(s, name, args.studio_id, instructor_id)
    print(f"✓ Rule saved: '{name}' @ {args.studio_id} → instructor #{instructor_id} (classes backfilled)")


def cmd_unassign(args):
    s = _s()
    name = _base(args.name)
    s.table("instructor_aliases").delete().eq("name", name).eq("studio_id", args.studio_id).execute()
    for variant in (name, f"{name} (Sub)"):
        s.table("classes").update({"instructor_id": None}).eq(
            "studio_id", args.studio_id
        ).eq("instructor", variant).execute()
    print(f"✓ Rule removed: '{name}' @ {args.studio_id} (classes unassigned)")


def cmd_merge(args):
    s = _s()
    keep, dup = args.keep, args.dup
    instructors = _fetch_instructors(s)
    if keep not in instructors or dup not in instructors:
        sys.exit("Both ids must exist in the instructors table.")
    s.table("instructor_aliases").update({"instructor_id": keep}).eq("instructor_id", dup).execute()
    s.table("classes").update({"instructor_id": keep}).eq("instructor_id", dup).execute()
    # Carry over curated fields the kept record is missing
    patch = {}
    for field in ("display_name", "bio", "instagram", "photo_url"):
        if not instructors[keep].get(field) and instructors[dup].get(field):
            patch[field] = instructors[dup][field]
    # reel_urls is a list — union instead of only-copy-if-empty
    merged_reels = list(dict.fromkeys((instructors[keep].get("reel_urls") or []) + (instructors[dup].get("reel_urls") or [])))
    if merged_reels != (instructors[keep].get("reel_urls") or []):
        patch["reel_urls"] = merged_reels
    if patch:
        s.table("instructors").update(patch).eq("id", keep).execute()
    s.table("instructors").delete().eq("id", dup).execute()
    print(f"✓ Merged #{dup} into #{keep}")


def cmd_set(args):
    s = _s()
    patch = {}
    if args.instagram is not None:
        patch["instagram"] = args.instagram
    if args.bio is not None:
        patch["bio"] = args.bio
    if args.photo is not None:
        patch["photo_url"] = args.photo
    if args.display_name is not None:
        patch["display_name"] = args.display_name
    if not patch:
        sys.exit("Nothing to set — use --instagram / --bio / --photo / --display-name")
    s.table("instructors").update(patch).eq("id", args.id).execute()
    print(f"✓ Updated instructor #{args.id}: {patch}")


def cmd_add_reel(args):
    s = _s()
    rec = s.table("instructors").select("id, reel_urls").eq("id", args.id).execute().data
    if not rec:
        sys.exit(f"No instructor #{args.id}")
    urls = rec[0].get("reel_urls") or []
    if args.url in urls:
        print("Already added.")
        return
    urls.append(args.url)
    s.table("instructors").update({"reel_urls": urls}).eq("id", args.id).execute()
    print(f"✓ Added reel to instructor #{args.id} ({len(urls)} total)")


def cmd_remove_reel(args):
    s = _s()
    rec = s.table("instructors").select("id, reel_urls").eq("id", args.id).execute().data
    if not rec:
        sys.exit(f"No instructor #{args.id}")
    urls = [u for u in (rec[0].get("reel_urls") or []) if u != args.url]
    s.table("instructors").update({"reel_urls": urls}).eq("id", args.id).execute()
    print(f"✓ Removed. {len(urls)} reel(s) remain.")


def cmd_list(args):
    s = _s()
    studios = _fetch_studios(s)
    instructors = _fetch_instructors(s)
    aliases = _fetch_aliases(s)
    needle = (args.filter or "").lower()
    shown = 0
    for rec in sorted(instructors.values(), key=lambda r: (r.get("display_name") or r["name"]).lower()):
        label = _instructor_label(rec, aliases, studios)
        if needle and needle not in label.lower():
            continue
        print(f"  {label}")
        shown += 1
    print(f"\n{shown} instructor(s)")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("pending", help="list unassigned name+studio pairs")
    sub.add_parser("review", help="interactively confirm pending pairs")

    p = sub.add_parser("assign", help="create an assignment rule")
    p.add_argument("name")
    p.add_argument("studio_id")
    p.add_argument("--to", type=int, help="existing instructor id")
    p.add_argument("--new", action="store_true", help="create a new instructor")

    p = sub.add_parser("unassign", help="remove a rule and unassign its classes")
    p.add_argument("name")
    p.add_argument("studio_id")

    p = sub.add_parser("merge", help="merge duplicate instructors")
    p.add_argument("keep", type=int)
    p.add_argument("dup", type=int)

    p = sub.add_parser("set", help="set handle / bio / photo / display name")
    p.add_argument("id", type=int)
    p.add_argument("--instagram")
    p.add_argument("--bio")
    p.add_argument("--photo")
    p.add_argument("--display-name")

    p = sub.add_parser("add-reel", help="attach an Instagram reel/post URL to an instructor's page")
    p.add_argument("id", type=int)
    p.add_argument("url")

    p = sub.add_parser("remove-reel", help="detach a reel URL from an instructor")
    p.add_argument("id", type=int)
    p.add_argument("url")

    p = sub.add_parser("list", help="list instructors with rules and handles")
    p.add_argument("filter", nargs="?")

    args = parser.parse_args()
    {
        "pending": cmd_pending,
        "review": cmd_review,
        "assign": cmd_assign,
        "unassign": cmd_unassign,
        "merge": cmd_merge,
        "set": cmd_set,
        "add-reel": cmd_add_reel,
        "remove-reel": cmd_remove_reel,
        "list": cmd_list,
    }[args.cmd](args)


if __name__ == "__main__":
    main()
