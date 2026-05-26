import re

# Words to keep fully uppercase after title-casing
KEEP_UPPER = {"DHQ", "NF", "KPOP", "K-POP", "PWYC"}

# Small words to keep lowercase in the middle of a title
LOWERCASE_WORDS = {"a", "an", "the", "and", "or", "but", "for", "nor",
                   "on", "at", "to", "by", "in", "of", "up", "as", "x"}


def _title(text):
    """
    Title-case a string with three fixes over str.title():
      1. Small conjunctions/prepositions stay lowercase mid-title
      2. Apostrophe fix: "Don'T" → "Don't"
      3. Known abbreviations restored to uppercase
    """
    if not text:
        return text

    words = text.split()
    result = []
    for i, word in enumerate(words):
        upper = word.upper()

        # Restore known abbreviations
        if upper in KEEP_UPPER:
            result.append(upper)
            continue

        # Small words stay lowercase unless they're the first word
        core = re.sub(r"[^a-zA-Z]", "", word).lower()
        if i > 0 and core in LOWERCASE_WORDS:
            result.append(word.lower())
            continue

        # Standard title-case: capitalize first alpha char, lowercase the rest
        cased = re.sub(
            r"(['\-]?)([A-Za-z])",
            lambda m: m.group(1) + (m.group(2).upper() if m.start() == 0 or m.group(1) else m.group(2).lower()),
            word.lower(),
        )
        # Ensure first alpha character is uppercase
        cased = re.sub(r"^([^A-Za-z]*)([a-z])", lambda m: m.group(1) + m.group(2).upper(), cased)
        result.append(cased)

    return " ".join(result)


def _fix_sub(text):
    """'Abby - sub' → 'Abby (Sub)'"""
    if not text:
        return text
    return re.sub(r"\s*-\s*sub\b", " (Sub)", text, flags=re.IGNORECASE)


def instructor(name, is_caps=True):
    """Normalize an instructor name."""
    if not name:
        return None
    name = _fix_sub(name)
    if is_caps:
        name = _title(name)
    return name.strip()


def class_name(name, is_caps=True):
    """Normalize a class name."""
    if not name:
        return name
    if is_caps:
        return _title(name)
    return name.strip()


def genre(value, is_caps=True):
    """Normalize a genre/category label."""
    if not value:
        return None
    if is_caps:
        return _title(value)
    return value.strip()
