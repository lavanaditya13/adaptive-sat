"""Tests for app/services/scoring_service.py.

Pure functions -- no DB needed. This is a heuristic score estimator (see the
module's own docstring disclaimer), so these tests pin down the documented
behavior (floor/ceiling clamping, baseline-when-no-data) rather than any
particular "correct" SAT score.
"""

from app.services.scoring_service import (
    estimate_section_score,
    estimate_total_score,
    get_estimated_score,
)


def test_estimate_section_score_at_zero_accuracy_is_the_floor():
    assert estimate_section_score(0.0) == 200


def test_estimate_section_score_at_full_accuracy_is_the_ceiling():
    assert estimate_section_score(1.0) == 800


def test_estimate_section_score_rounds_to_nearest_ten():
    score = estimate_section_score(0.53)
    assert score % 10 == 0


def test_estimate_total_score_uses_baseline_accuracy_when_no_data():
    # No attempts in either section -> both fall back to the 0.5 baseline.
    total = estimate_total_score({})
    assert total == estimate_section_score(0.5) * 2


def test_estimate_total_score_clamps_to_valid_sat_range():
    perfect = {
        "math": {"attempted": 10, "correct": 10, "accuracy": 1.0},
        "reading_writing": {"attempted": 10, "correct": 10, "accuracy": 1.0},
    }
    assert estimate_total_score(perfect) <= 1600

    zero = {
        "math": {"attempted": 10, "correct": 0, "accuracy": 0.0},
        "reading_writing": {"attempted": 10, "correct": 0, "accuracy": 0.0},
    }
    assert estimate_total_score(zero) >= 400


def test_get_estimated_score_uses_default_target_when_none_given():
    result = get_estimated_score({}, target_score=None)
    assert result.target_score == 1520


def test_get_estimated_score_computes_points_to_go():
    result = get_estimated_score({}, target_score=1600)
    assert result.points_to_go == max(1600 - result.estimated_score, 0)


def test_get_estimated_score_caps_percent_to_goal_at_100():
    result = get_estimated_score(
        {
            "math": {"attempted": 10, "correct": 10, "accuracy": 1.0},
            "reading_writing": {"attempted": 10, "correct": 10, "accuracy": 1.0},
        },
        target_score=400,
    )
    assert result.percent_to_goal <= 100.0
