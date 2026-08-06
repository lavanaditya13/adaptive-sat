from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Any

from sqlalchemy import select

ROOT_DIR = Path(__file__).resolve().parents[1]
# insert (not append): must win over an editable install of this same
# package elsewhere on sys.path (e.g. `poetry install` having registered
# backend/ from a different checkout/worktree) — otherwise `import app...`
# below silently resolves to that other copy instead of this one.
sys.path.insert(0, str(ROOT_DIR))

from app.core.database import get_db
from app.models.question import Question
from app.models.topic import Topic


DEFAULT_SEED_FILE = ROOT_DIR / "data" / "sample_sat_questions_seed.jsonl"


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
    skipped_questions = 0
    processed_lines = 0

    topic_cache: dict[str, Topic] = {}

    async for db in get_db():
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
                        )
                        db.add(topic)
                        await db.flush()
                        created_topics += 1
                    else:
                        skipped_topics += 1

                    topic_cache[topic_code] = topic

                question_result = await db.execute(
                    select(Question)
                    .where(
                        Question.topic_id == topic.id,
                        Question.prompt == item["prompt"],
                    )
                    .limit(1)
                )
                existing_question = question_result.scalar_one_or_none()

                if existing_question is not None:
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
                created_questions += 1

                if created_questions > 0 and created_questions % commit_every == 0:
                    await db.commit()
                    print(f"Committed {created_questions} created questions so far...")

        await db.commit()
        break

    print("SAT question seed complete.")
    print(f"Seed file: {seed_file}")
    print(f"Lines processed: {processed_lines}")
    print(f"Topics created: {created_topics}")
    print(f"Topics skipped: {skipped_topics}")
    print(f"Questions created: {created_questions}")
    print(f"Questions skipped: {skipped_questions}")


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(
        seed_sat_questions(
            seed_file=Path(args.file),
            commit_every=args.commit_every,
        )
    )