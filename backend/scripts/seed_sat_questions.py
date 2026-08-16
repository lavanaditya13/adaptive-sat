from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

ROOT_DIR = Path(__file__).resolve().parents[1]
# insert (not append): must win over an editable install of this same
# package elsewhere on sys.path (e.g. `poetry install` having registered
# backend/ from a different checkout/worktree) — otherwise `import app...`
# below silently resolves to that other copy instead of this one.
sys.path.insert(0, str(ROOT_DIR))

from app.core.database import get_db
from app.models.question import Question
from app.models.section import Section
from app.models.topic import Topic
from app.services.practice_service import SECTION_CODES, SECTION_DISPLAY_NAMES


DEFAULT_SEED_FILE = ROOT_DIR / "data" / "sample_sat_questions_seed.jsonl"


async def seed_sections(db: AsyncSession) -> tuple[int, int]:
    """
    Seed the constant `sections` rows (id -> code, from SECTION_CODES).

    Sections aren't in the JSONL seed file -- they're fixed reference data
    practice_service.py keys off of directly (SECTION_CODES maps a numeric
    section_id to a code without ever querying this table), so the ids must
    match exactly. A schema-only branch fork (e.g. a fresh preview database)
    copies table structure but no rows, which leaves `sections` empty and
    section selection broken until this is seeded -- unlike topics/questions,
    there's no separate data file to re-run, so this always runs as part of
    this script instead.
    """
    created = 0
    skipped = 0

    for section_id, code in SECTION_CODES.items():
        existing = await db.get(Section, section_id)

        if existing is not None:
            skipped += 1
            continue

        db.add(
            Section(
                id=section_id,
                name=code,
                display_name=SECTION_DISPLAY_NAMES[code],
            )
        )
        created += 1

    await db.flush()

    if created:
        await db.execute(
            text("SELECT setval('sections_id_seq', (SELECT MAX(id) FROM sections))")
        )

    await db.commit()

    return created, skipped


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed SAT questions from a JSONL file.")
    parser.add_argument(
        "--file",
        type=str,
        default=str(DEFAULT_SEED_FILE),
        help="Path to a JSONL file containing SAT questions.",
    )
    parser.add_argument(
        "--commit-every",
        type=int,
        default=500,
        help="Commit after this many created questions.",
    )
    return parser.parse_args()


def normalize_seed_item(item: dict[str, Any]) -> dict[str, Any]:
    """Accepts either the original minimal field names or the richer
    Sample_questions_1.json shape, and maps the latter onto the former so
    the rest of the script only ever deals with one set of keys:
      question -> prompt, category -> topic_name, topic -> skill
    Both shapes can coexist in the same seed file.
    """
    item = dict(item)
    item.setdefault("prompt", item.get("question"))
    item.setdefault("topic_name", item.get("category"))
    item.setdefault("skill", item.get("topic"))
    return item


_LATEX_COMMAND_RE = re.compile(r"\\[a-zA-Z]+")
_MATH_MARKUP_RE = re.compile(r"[\$\\{}^_]")
_WHITESPACE_RE = re.compile(r"\s+")


def normalize_prompt(prompt: str) -> str:
    """Collapses a prompt to its content-only identity, stripping $...$ /
    LaTeX markup and normalizing whitespace/case. Two prompts differing only
    in math notation (e.g. a plain "x^2" vs. "$x^2$") normalize to the same
    key, so re-seeding after a pure notation/formatting fix updates the
    existing row in place instead of matching nothing and inserting a
    duplicate — the seed script previously matched on the raw `prompt`
    string, which meant every notation revision (ASCII -> regex-converted
    LaTeX -> hand-fixed LaTeX, in this project's case) silently left the
    old rows in place and inserted a fresh copy alongside them.
    """
    text_value = prompt.lower()
    text_value = _LATEX_COMMAND_RE.sub("", text_value)
    text_value = _MATH_MARKUP_RE.sub("", text_value)
    return _WHITESPACE_RE.sub(" ", text_value).strip()


def validate_seed_item(item: dict[str, Any], line_number: int) -> None:
    required_fields = [
        "section",
        "topic_code",
        "topic_name",
        "prompt",
        "choices",
        "correct_answer",
        "difficulty",
    ]

    missing_fields = [field for field in required_fields if item.get(field) is None]

    if missing_fields:
        raise ValueError(
            f"Line {line_number} is missing required fields: {missing_fields}"
        )

    if not isinstance(item["choices"], dict):
        raise ValueError(f"Line {line_number} has invalid choices. Expected object.")

    if item["correct_answer"] not in item["choices"]:
        raise ValueError(
            f"Line {line_number} correct_answer must match one of the choices keys."
        )


async def seed_sat_questions(seed_file: Path, commit_every: int) -> None:
    if not seed_file.exists():
        raise FileNotFoundError(f"Seed file not found: {seed_file}")

    created_topics = 0
    skipped_topics = 0
    created_questions = 0
    updated_questions = 0
    skipped_questions = 0
    processed_lines = 0

    topic_cache: dict[str, Topic] = {}
    # Per topic_id, existing questions keyed by normalize_prompt(prompt) --
    # populated lazily (once per topic) on first use below.
    question_cache: dict[int, dict[str, Question]] = {}

    async for db in get_db():
        created_sections, skipped_sections = await seed_sections(db)

        with seed_file.open("r", encoding="utf-8") as file:
            for line_number, raw_line in enumerate(file, start=1):
                line = raw_line.strip()

                if not line:
                    continue

                processed_lines += 1

                try:
                    item = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise ValueError(f"Invalid JSON on line {line_number}: {exc}") from exc

                item = normalize_seed_item(item)
                validate_seed_item(item, line_number)

                topic_code = item["topic_code"]

                topic = topic_cache.get(topic_code)

                if topic is None:
                    topic_result = await db.execute(
                        select(Topic).where(Topic.code == topic_code)
                    )
                    topic = topic_result.scalar_one_or_none()

                    if topic is None:
                        topic = Topic(
                            name=item["topic_name"],
                            code=topic_code,
                            description=item.get("topic_description"),
                            section=item["section"],
                        )
                        db.add(topic)
                        await db.flush()
                        created_topics += 1
                    else:
                        skipped_topics += 1

                    topic_cache[topic_code] = topic

                topic_questions = question_cache.get(topic.id)
                if topic_questions is None:
                    existing_result = await db.execute(
                        select(Question).where(Question.topic_id == topic.id)
                    )
                    topic_questions = {
                        normalize_prompt(q.prompt): q
                        for q in existing_result.scalars().all()
                    }
                    question_cache[topic.id] = topic_questions

                normalized_key = normalize_prompt(item["prompt"])
                existing_question = topic_questions.get(normalized_key)

                if existing_question is not None:
                    changed = (
                        existing_question.prompt != item["prompt"]
                        or existing_question.choices != item["choices"]
                        or existing_question.correct_answer != item["correct_answer"]
                        or existing_question.explanation != item.get("explanation")
                        or existing_question.difficulty != item.get("difficulty", "medium")
                        or existing_question.skill != item.get("skill")
                    )
                    if changed:
                        existing_question.prompt = item["prompt"]
                        existing_question.choices = item["choices"]
                        existing_question.correct_answer = item["correct_answer"]
                        existing_question.explanation = item.get("explanation")
                        existing_question.difficulty = item.get("difficulty", "medium")
                        existing_question.skill = item.get("skill")
                        updated_questions += 1
                    else:
                        skipped_questions += 1
                    continue

                question = Question(
                    section=item["section"],
                    prompt=item["prompt"],
                    choices=item["choices"],
                    correct_answer=item["correct_answer"],
                    explanation=item.get("explanation"),
                    difficulty=item.get("difficulty", "medium"),
                    skill=item.get("skill"),
                    topic_id=topic.id,
                )

                db.add(question)
                topic_questions[normalized_key] = question
                created_questions += 1

                if created_questions > 0 and created_questions % commit_every == 0:
                    await db.commit()
                    print(f"Committed {created_questions} created questions so far...")

        await db.commit()
        break

    print("SAT question seed complete.")
    print(f"Seed file: {seed_file}")
    print(f"Sections created: {created_sections}")
    print(f"Sections skipped: {skipped_sections}")
    print(f"Lines processed: {processed_lines}")
    print(f"Topics created: {created_topics}")
    print(f"Topics skipped: {skipped_topics}")
    print(f"Questions created: {created_questions}")
    print(f"Questions updated: {updated_questions}")
    print(f"Questions skipped (unchanged): {skipped_questions}")


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(
        seed_sat_questions(
            seed_file=Path(args.file),
            commit_every=args.commit_every,
        )
    )