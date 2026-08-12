"""One-off cleanup for duplicate `questions` rows created by the old
seed_sat_questions.py, which matched purely on the raw `prompt` string.
Every math-notation revision to the seed data (plain ASCII -> regex-
converted LaTeX -> hand-fixed LaTeX) changed that string, so each of the
three deployments most likely *inserted a fresh copy* of the same 49 math
questions into the database instead of updating the existing row --
seed_sat_questions.py now matches on a markup-normalized prompt instead
(see normalize_prompt there) so this can't recur going forward, but it
doesn't retroactively fix rows a database already has from before that fix.

This script finds duplicate groups (same topic_id + loosely-normalized
prompt), keeps the most recently updated row in each group (the newest
content -- under the old bug, later deploys always *inserted*, never
updated, so the newest row is also the most-recently-fixed content), and
deletes the others -- but ONLY those with zero Attempt/PracticeSessionQuestion
rows referencing them. Attempt.question_id and PracticeSessionQuestion.question_id
both cascade-delete on their question, so removing a row a student has
actually answered would silently wipe that attempt from their history --
this script will never do that. Any duplicate with real usage is reported
instead, for a human to look at.

Uses a *looser* normalization than seed_sat_questions.normalize_prompt:
strips LaTeX commands and then every remaining non-alphanumeric character
(not just the $, backslash, braces, ^, and _ that the stricter one targets).
That's necessary here specifically because one of
the historical duplicate copies has an actual bug -- a stray, unmatched
")" left over from the old broken conversion (see the earlier "(x+5)^2"
fragmentation issue) -- that survives the stricter normalization and would
stop it from matching its own clean counterpart. The stricter version
stays in seed_sat_questions.py since it only needs to match clean,
well-formed prompts against each other going forward. Verified this
loose form still produces zero cross-question collisions within a topic
across the current 104-row seed file before relying on it here.

Defaults to a dry run (prints what it would do, changes nothing). Pass
--execute to actually delete.

Usage:
    poetry run python scripts/dedupe_questions.py            # dry run
    poetry run python scripts/dedupe_questions.py --execute  # apply
"""

from __future__ import annotations

import argparse
import asyncio
import re
import sys
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from app.core.database import get_db  # noqa: E402
from app.models.attempt import Attempt  # noqa: E402
from app.models.practice_session_question import PracticeSessionQuestion  # noqa: E402
from app.models.question import Question  # noqa: E402

_LATEX_COMMAND_RE = re.compile(r"\\[a-zA-Z]+")
_NON_ALNUM_RE = re.compile(r"[^a-z0-9 ]")
_WHITESPACE_RE = re.compile(r"\s+")


def normalize_prompt_loose(prompt: str) -> str:
    text_value = prompt.lower()
    text_value = _LATEX_COMMAND_RE.sub("", text_value)
    text_value = _NON_ALNUM_RE.sub("", text_value)
    return _WHITESPACE_RE.sub(" ", text_value).strip()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Remove duplicate seeded questions.")
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually delete unused duplicates (default: dry run, changes nothing).",
    )
    return parser.parse_args()


async def usage_count(db: AsyncSession, question_id: int) -> int:
    attempt_count = (
        await db.execute(
            select(func.count()).select_from(Attempt).where(Attempt.question_id == question_id)
        )
    ).scalar_one()
    session_question_count = (
        await db.execute(
            select(func.count())
            .select_from(PracticeSessionQuestion)
            .where(PracticeSessionQuestion.question_id == question_id)
        )
    ).scalar_one()
    return attempt_count + session_question_count


async def dedupe_questions(execute: bool) -> None:
    async for db in get_db():
        result = await db.execute(select(Question))
        all_questions = result.scalars().all()

        groups: dict[tuple[int, str], list[Question]] = {}
        for q in all_questions:
            key = (q.topic_id, normalize_prompt_loose(q.prompt))
            groups.setdefault(key, []).append(q)

        duplicate_groups = {k: v for k, v in groups.items() if len(v) > 1}

        if not duplicate_groups:
            print(f"Checked {len(all_questions)} questions across {len(groups)} groups — no duplicates found.")
            return

        deleted = 0
        flagged_for_review = 0

        for (topic_id, _normalized), rows in duplicate_groups.items():
            rows_sorted = sorted(rows, key=lambda q: q.updated_at, reverse=True)
            keeper = rows_sorted[0]
            print(f"\nTopic {topic_id} — {len(rows)} copies of: {keeper.prompt[:80]}...")
            print(f"  KEEP  id={keeper.id} updated_at={keeper.updated_at}")

            for row in rows_sorted[1:]:
                usage = await usage_count(db, row.id)
                if usage > 0:
                    flagged_for_review += 1
                    print(
                        f"  SKIP  id={row.id} updated_at={row.updated_at} "
                        f"-- has {usage} attempt/session references, needs manual review"
                    )
                    continue

                deleted += 1
                if execute:
                    print(f"  DELETE id={row.id} updated_at={row.updated_at} (unused)")
                    await db.delete(row)
                else:
                    print(f"  WOULD DELETE id={row.id} updated_at={row.updated_at} (unused, dry run)")

        if execute:
            await db.commit()

        print(
            f"\n{'Deleted' if execute else 'Would delete'} {deleted} unused duplicate rows. "
            f"{flagged_for_review} duplicate rows have real usage and were left in place for manual review."
        )
        if not execute:
            print("Dry run only — re-run with --execute to apply.")
        break


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(dedupe_questions(execute=args.execute))
