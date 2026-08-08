"""Tests for app/schemas/question.py's field constraints."""

import pytest
from pydantic import ValidationError

from app.schemas.question import QuestionCreate


def test_question_create_defaults_difficulty_to_medium():
    question = QuestionCreate(
        prompt="What is 2+2?",
        choices={"A": "3", "B": "4"},
        correct_answer="B",
        topic_id=1,
    )

    assert question.difficulty == "medium"


def test_question_create_requires_topic_id():
    with pytest.raises(ValidationError):
        QuestionCreate(prompt="What is 2+2?", choices={"A": "3", "B": "4"}, correct_answer="B")
