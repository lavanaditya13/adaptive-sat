"""One-off conversion of ASCII math shorthand in the seed JSONL
(x^2, sqrt(...), a/b) into LaTeX wrapped in $...$ for MathText/KaTeX
rendering. Writes to a new file for review before overwriting the original
seed file by hand (mechanical regex conversion has edge cases: coordinate
pairs, ratios not meant as math, debatable fraction candidates like "-1/2"
slopes) that need eyeballing rather than blind trust.

Usage: poetry run python scripts/convert_seed_math_to_latex.py
Reads data/sample_sat_questions_seed.jsonl, writes
data/sample_sat_questions_seed.converted.jsonl.
"""

import json
import re
from pathlib import Path

SEED_PATH = Path(__file__).resolve().parent.parent / "data" / "sample_sat_questions_seed.jsonl"
OUTPUT_PATH = SEED_PATH.with_suffix(".converted.jsonl")

MATH_TOKEN_RE = re.compile(
    r"sqrt\((?P<sqrt>[^()]+)\)"
    r"|(?P<base>\(?[A-Za-z0-9.]+\)?)\^(?P<exp>-?\d+(?:\.\d+)?|[A-Za-z]|\([^()]+\))"
    r"|\(?(?P<fnum>-?\d+)/(?P<fden>\d+)\)?(?!\w)"
)

TEXT_FIELDS = ("prompt", "question", "explanation")


def _replace(match: re.Match[str]) -> str:
    if match.group("sqrt") is not None:
        return f"$\\sqrt{{{match.group('sqrt')}}}$"
    if match.group("base") is not None:
        return f"${match.group('base')}^{{{match.group('exp').strip('()')}}}$"
    return f"$\\frac{{{match.group('fnum')}}}{{{match.group('fden')}}}$"


def convert_math(text: str | None) -> str | None:
    if not text:
        return text
    # Escape any pre-existing literal "$" (currency amounts) first, so the
    # frontend's MathText component doesn't mistake them for math delimiters
    # once real "$...$" math spans are injected below.
    text = text.replace("$", "\\$")
    return MATH_TOKEN_RE.sub(_replace, text)


def convert_item(item: dict) -> dict:
    converted = dict(item)
    for field in TEXT_FIELDS:
        if field in converted:
            converted[field] = convert_math(converted[field])
    if isinstance(converted.get("choices"), dict):
        converted["choices"] = {
            label: convert_math(text) for label, text in converted["choices"].items()
        }
    return converted


def main() -> None:
    lines = SEED_PATH.read_text().splitlines()
    with OUTPUT_PATH.open("w") as out:
        for line in lines:
            if not line.strip():
                out.write("\n")
                continue
            item = json.loads(line)
            out.write(json.dumps(convert_item(item)) + "\n")
    print(f"Wrote {OUTPUT_PATH} — review the diff against {SEED_PATH} before replacing it.")


if __name__ == "__main__":
    main()
