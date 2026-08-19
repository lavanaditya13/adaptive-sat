"""Tests for app/services/mastery_model.py.

Pure math, no DB — every case here is built from plain MasteryAttemptInput
tuples so the Bayesian Knowledge Tracing update can be verified without a
database or a running app.
"""

from datetime import datetime, timedelta, timezone

from app.services.mastery_model import (
    DEFAULT_PARAMETERS,
    BktParameters,
    MasteryAttemptInput,
    get_parameters_for_skill,
    weighted_mastery_score,
)

_NOW = datetime(2026, 1, 1, tzinfo=timezone.utc)


def _attempts(pattern: list[bool], difficulty: str = "medium") -> list[MasteryAttemptInput]:
    """Builds a chronological attempt sequence, oldest first, one second
    apart -- order matters to BKT, timestamps' exact spacing doesn't."""
    return [
        MasteryAttemptInput(is_correct=is_correct, difficulty=difficulty, created_at=_NOW + timedelta(seconds=i))
        for i, is_correct in enumerate(pattern)
    ]


# --- empty / trivial cases -------------------------------------------------


def test_no_attempts_is_the_zero_estimate():
    estimate = weighted_mastery_score([])

    assert estimate.score == 0.0
    assert estimate.mastered is False
    assert estimate.sample_size == 0
    assert estimate.raw_accuracy == 0.0


# --- single-attempt direction ----------------------------------------------


def test_a_single_correct_answer_raises_belief_above_the_prior():
    estimate = weighted_mastery_score(_attempts([True]))

    assert estimate.score > DEFAULT_PARAMETERS.p_l0
    assert estimate.raw_accuracy == 1.0
    assert estimate.sample_size == 1


def test_a_single_wrong_answer_lowers_belief_below_the_prior():
    estimate = weighted_mastery_score(_attempts([False]))

    assert estimate.score < DEFAULT_PARAMETERS.p_l0
    assert estimate.raw_accuracy == 0.0


# --- convergence / mastery threshold ----------------------------------------


def test_a_short_correct_run_does_not_yet_clear_mastery():
    """Two correct answers raise belief a lot, but not enough to call it
    mastered off two data points -- BKT's guess rate keeps a short streak
    from reading as certain knowledge."""
    estimate = weighted_mastery_score(_attempts([True, True]))

    assert estimate.mastered is False
    assert estimate.score < DEFAULT_PARAMETERS.mastery_threshold


def test_a_sustained_correct_run_clears_mastery():
    estimate = weighted_mastery_score(_attempts([True, True, True, True, True]))

    assert estimate.mastered is True
    assert estimate.score >= DEFAULT_PARAMETERS.mastery_threshold


def test_belief_climbs_monotonically_over_a_correct_run():
    scores = [
        weighted_mastery_score(_attempts([True] * n)).score for n in range(1, 6)
    ]

    assert scores == sorted(scores)


def test_a_wrong_answer_after_a_correct_run_pulls_the_score_back_down():
    mastered_run = weighted_mastery_score(_attempts([True, True, True, True, True]))
    with_a_slip = weighted_mastery_score(_attempts([True, True, True, True, True, False]))

    assert with_a_slip.score < mastered_run.score


def test_a_long_wrong_run_never_reads_as_mastered():
    estimate = weighted_mastery_score(_attempts([False] * 8))

    assert estimate.mastered is False
    assert estimate.raw_accuracy == 0.0


# --- attempt order ------------------------------------------------------


def test_result_does_not_depend_on_the_order_attempts_are_passed_in():
    """The BKT update is order-sensitive (it's a sequential belief
    revision), but the function sorts by created_at itself, so callers
    don't have to hand it attempts in chronological order."""
    chronological = _attempts([False, True, True])
    shuffled = list(reversed(chronological))

    assert weighted_mastery_score(chronological) == weighted_mastery_score(shuffled)


# --- difficulty weighting via slip rate -------------------------------------


def test_a_correct_answer_on_a_harder_question_is_less_convincing():
    """Higher assumed slip rate on hard questions makes a correct answer
    slightly less diagnostic of "knowing it" than the same answer on an
    easy question -- a correct guess is more plausible when a slip was
    already more likely to explain a wrong one."""
    easy = weighted_mastery_score(_attempts([True], difficulty="easy"))
    hard = weighted_mastery_score(_attempts([True], difficulty="hard"))

    assert hard.score < easy.score


def test_unknown_difficulty_falls_back_to_the_default_slip_rate():
    unknown = weighted_mastery_score(_attempts([True], difficulty="extreme"))
    missing = weighted_mastery_score(_attempts([True], difficulty=None))
    default_slip = weighted_mastery_score(_attempts([True], difficulty="__uses_default__"))

    assert unknown.score == missing.score == default_slip.score


# --- BktParameters -----------------------------------------------------


def test_p_slip_falls_back_to_default_for_an_unrecognized_difficulty():
    params = BktParameters(
        p_l0=0.3,
        p_transition=0.1,
        p_slip_by_difficulty={"easy": 0.05},
        default_p_slip=0.2,
        p_guess=0.25,
        mastery_threshold=0.9,
    )

    assert params.p_slip("easy") == 0.05
    assert params.p_slip("nonexistent") == 0.2
    assert params.p_slip(None) == 0.2


def test_a_degenerate_parameter_set_does_not_divide_by_zero():
    """A future per-skill fit could hand in a slip rate of exactly 0 — "if
    you know it, you never get it wrong." Paired with p(L0)=1 ("already
    certainly knows it"), a wrong answer is then a contradiction with
    probability-zero evidence: the Bayes update's denominator is exactly
    0. That has to leave the belief unchanged, not crash the request."""
    degenerate = BktParameters(
        p_l0=1.0,
        p_transition=0.0,
        p_slip_by_difficulty={},
        default_p_slip=0.0,
        p_guess=0.25,
        mastery_threshold=0.9,
    )

    estimate = weighted_mastery_score(_attempts([False]), parameters=degenerate)

    assert estimate.score == 1.0
    assert estimate.raw_accuracy == 0.0


def test_get_parameters_for_skill_returns_the_shared_defaults_for_now():
    """No per-skill fitting exists yet -- every skill uses the same
    generic parameters until a calibration job starts populating this
    lookup. Locking this in as a test so that day's change is a
    deliberate, visible diff here, not a silent behavior shift."""
    assert get_parameters_for_skill("Linear Equations") is DEFAULT_PARAMETERS
    assert get_parameters_for_skill(None) is DEFAULT_PARAMETERS
