"""Tests for app/schemas/practice.py's field constraints.

These are plain Pydantic models with no custom validators, so the useful
thing to pin down is the Field(ge=..., le=...) boundaries and defaults --
not every passthrough field, which typing already covers.
"""

import pytest
from pydantic import ValidationError

from app.schemas.practice import (
    PracticeStartRequest,
    SubmitAnswerRequest,
    UpdateTargetScoreRequest,
)


def test_practice_start_request_defaults_to_adaptive_mode():
    request = PracticeStartRequest()

    assert request.mode == "adaptive"
    assert request.topic_id is None
    assert request.question_count is None


def test_practice_start_request_rejects_unknown_mode():
    with pytest.raises(ValidationError):
        PracticeStartRequest(mode="not-a-real-mode")


@pytest.mark.parametrize("question_count", [0, 101])
def test_practice_start_request_rejects_out_of_range_question_count(question_count):
    with pytest.raises(ValidationError):
        PracticeStartRequest(question_count=question_count)


@pytest.mark.parametrize("question_count", [1, 25, 100])
def test_practice_start_request_accepts_in_range_question_count(question_count):
    request = PracticeStartRequest(question_count=question_count)

    assert request.question_count == question_count


@pytest.mark.parametrize("confidence_level", [0, 6])
def test_submit_answer_request_rejects_out_of_range_confidence(confidence_level):
    with pytest.raises(ValidationError):
        SubmitAnswerRequest(confidence_level=confidence_level)


def test_submit_answer_request_rejects_negative_time_spent():
    with pytest.raises(ValidationError):
        SubmitAnswerRequest(time_spent_seconds=-1)


def test_submit_answer_request_allows_all_fields_optional():
    request = SubmitAnswerRequest()

    assert request.selected_answer is None
    assert request.time_spent_seconds is None
    assert request.confidence_level is None


@pytest.mark.parametrize("target_score", [399, 1601])
def test_update_target_score_request_rejects_out_of_range(target_score):
    with pytest.raises(ValidationError):
        UpdateTargetScoreRequest(target_score=target_score)


@pytest.mark.parametrize("target_score", [400, 1000, 1600])
def test_update_target_score_request_accepts_in_range(target_score):
    request = UpdateTargetScoreRequest(target_score=target_score)

    assert request.target_score == target_score
