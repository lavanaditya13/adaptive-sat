"""
Estimated SAT score heuristic.

This is NOT a real SAT scoring model — no item response theory, no
question-difficulty weighting, no adjustment for guessing. It exists
purely to give students a motivational, directional sense of where they
stand by linearly mapping recent per-section accuracy onto the SAT's
200-800 section scale.
"""

from __future__ import annotations

from app.schemas.practice import EstimatedScoreResponse

DEFAULT_TARGET_SCORE = 1520
SECTION_FLOOR = 200
SECTION_CEILING = 800
BASELINE_ACCURACY_WHEN_NO_DATA = 0.5

SCORED_SECTIONS = ("math", "reading_writing")


def estimate_section_score(accuracy: float) -> int:
    raw = SECTION_FLOOR + accuracy * (SECTION_CEILING - SECTION_FLOOR)
    return round(raw / 10) * 10


def estimate_total_score(section_accuracies: dict[str, dict]) -> int:
    total = 0

    for section in SCORED_SECTIONS:
        stats = section_accuracies.get(section)
        accuracy = (
            stats["accuracy"]
            if stats and stats.get("attempted", 0) > 0
            else BASELINE_ACCURACY_WHEN_NO_DATA
        )
        total += estimate_section_score(accuracy)

    return max(400, min(1600, total))


def get_estimated_score(
    section_accuracies: dict[str, dict],
    target_score: int | None,
) -> EstimatedScoreResponse:
    estimated = estimate_total_score(section_accuracies)
    target = target_score or DEFAULT_TARGET_SCORE
    points_to_go = max(target - estimated, 0)
    percent_to_goal = min(100.0, round(estimated / target * 100, 1)) if target else 100.0

    return EstimatedScoreResponse(
        estimated_score=estimated,
        target_score=target,
        points_to_go=points_to_go,
        percent_to_goal=percent_to_goal,
    )
