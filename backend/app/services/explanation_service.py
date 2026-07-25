from typing import Any


class ExplanationService:
    """
    Service responsible for generating explanations for student answers.

    MVP note:
    This is currently a placeholder. Later, this can call an LLM or a more advanced
    explanation engine using the question, selected answer, correct answer, and mistake type.
    """

    async def generate_explanation(
        self,
        question_id: int,
        selected_answer: str | None,
        correct_answer: str,
        is_correct: bool,
        mistake_type: str | None = None,
    ) -> dict[str, Any]:
        if is_correct:
            explanation = "Correct. Nice work — keep practicing to build consistency."
        else:
            explanation = (
                "Review the concept behind this question and compare your selected answer "
                "with the correct answer. A more detailed explanation engine will be added later."
            )

        return {
            "question_id": question_id,
            "selected_answer": selected_answer,
            "correct_answer": correct_answer,
            "is_correct": is_correct,
            "mistake_type": mistake_type,
            "explanation": explanation,
        }