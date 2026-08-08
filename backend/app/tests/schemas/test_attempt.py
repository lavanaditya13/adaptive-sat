"""Tests for app/schemas/attempt.py's field constraints."""

import pytest
from pydantic import ValidationError

from app.schemas.attempt import AttemptCreate


def test_attempt_create_rejects_negative_time_spent():
    with pytest.raises(ValidationError):
        AttemptCreate(practice_session_id=1, question_id=1, time_spent_seconds=-5)


@pytest.mark.parametrize("confidence_level", [0, 6])
def test_attempt_create_rejects_out_of_range_confidence(confidence_level):
    with pytest.raises(ValidationError):
        AttemptCreate(practice_session_id=1, question_id=1, confidence_level=confidence_level)


def test_attempt_create_requires_session_and_question_ids():
    with pytest.raises(ValidationError):
        AttemptCreate(question_id=1)
