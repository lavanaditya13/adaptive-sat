"""Tests for app/services/explanation_service.py.

Currently a placeholder (see the class's own MVP note) -- these tests pin
down its current contract (echoes the inputs back plus a canned message) so
a future real implementation has a known baseline to replace deliberately,
not accidentally.
"""

import pytest

from app.services.explanation_service import ExplanationService


@pytest.mark.asyncio
async def test_generate_explanation_for_correct_answer():
    service = ExplanationService()

    result = await service.generate_explanation(
        question_id=1,
        selected_answer="A",
        correct_answer="A",
        is_correct=True,
    )

    assert result["is_correct"] is True
    assert "Correct" in result["explanation"]


@pytest.mark.asyncio
async def test_generate_explanation_for_incorrect_answer_includes_mistake_type():
    service = ExplanationService()

    result = await service.generate_explanation(
        question_id=1,
        selected_answer="B",
        correct_answer="A",
        is_correct=False,
        mistake_type="concept_gap",
    )

    assert result["is_correct"] is False
    assert result["mistake_type"] == "concept_gap"
    assert result["question_id"] == 1
    assert result["selected_answer"] == "B"
    assert result["correct_answer"] == "A"
