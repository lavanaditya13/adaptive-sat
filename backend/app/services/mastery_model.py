from dataclasses import dataclass
from datetime import datetime
from typing import NamedTuple, Sequence

# Named so MasteryRuleResponse.model (app/schemas/practice.py) and any
# other reporting surface point at one string instead of each inlining
# their own description of the rule.
MODEL_NAME = "bayesian_knowledge_tracing"


class MasteryAttemptInput(NamedTuple):
    """One attempt's inputs to the BKT update, in the order they were made.

    Deliberately not the Attempt ORM model — this module never touches a
    database or session, so the update can be tested with plain tuples.
    """

    is_correct: bool
    difficulty: str | None
    created_at: datetime


@dataclass(frozen=True)
class BktParameters:
    """Bayesian Knowledge Tracing parameters for one skill (or, today,
    the whole app — see DEFAULT_PARAMETERS).

    Kept as data rather than module-level constants baked into the update
    functions on purpose: the same update math applies whether the
    parameters come from these generic defaults or from a future per-skill
    fit, so this is the seam that swap slots into later without touching
    weighted_mastery_score itself. See get_parameters_for_skill.
    """

    # p(L0): prior probability a student already knows the skill before
    # any practice on it.
    p_l0: float

    # p(T): probability of transitioning from "doesn't know" to "knows" on
    # each practice opportunity — the model's notion of "just learned it."
    p_transition: float

    # p(S): probability of answering incorrectly despite knowing the skill
    # ("slip" — a careless mistake), keyed by Question.difficulty.
    p_slip_by_difficulty: dict[str, float]
    default_p_slip: float

    # p(G): probability of answering correctly despite not knowing the
    # skill ("guess").
    p_guess: float

    # A student reads as having mastered the skill once the model's
    # estimate of p(know) clears this bar.
    mastery_threshold: float

    def p_slip(self, difficulty: str | None) -> float:
        return self.p_slip_by_difficulty.get(difficulty or "", self.default_p_slip)


# Generic parameters, not fitted per skill — this app doesn't have
# per-skill attempt volume to fit from yet, and these are the correct
# starting point for BKT at this stage, not a stopgap:
#   - p_guess is derived from the SAT's 4-choice multiple-choice format,
#     not a free parameter — one in four random guesses lands correct.
#   - p_l0, p_transition, and p_slip are standard Corbett & Anderson-style
#     ITS defaults, with p_slip bumped up slightly for hard questions
#     since a momentary slip is more plausible on a harder item.
#   - mastery_threshold of 0.90 matches the same lineage's usual mastery-
#     learning cutoff.
DEFAULT_PARAMETERS = BktParameters(
    p_l0=0.3,
    p_transition=0.1,
    p_slip_by_difficulty={"easy": 0.08, "medium": 0.10, "hard": 0.15},
    default_p_slip=0.10,
    p_guess=0.25,
    mastery_threshold=0.90,
)


def get_parameters_for_skill(skill: str | None) -> BktParameters:  # noqa: ARG001
    """Parameter lookup for one skill (or topic, at the domain level).

    Every skill uses DEFAULT_PARAMETERS today — there's no fitted data
    yet. This function exists so that seam is already in place: a future
    per-skill calibration job can start returning fitted parameters here
    without any caller of weighted_mastery_score changing.
    """
    return DEFAULT_PARAMETERS


@dataclass(frozen=True)
class MasteryEstimate:
    score: float  # p(know) after the last attempt, 0-1
    mastered: bool
    sample_size: int  # attempt count — surfaced for debugging/UI, not used by the model itself
    raw_accuracy: float  # unweighted correct/attempted, 0-1 — the plain number for display


_ZERO_ESTIMATE = MasteryEstimate(score=0.0, mastered=False, sample_size=0, raw_accuracy=0.0)


def _bayes_update_know_given_outcome(
    p_know: float, is_correct: bool, difficulty: str | None, parameters: BktParameters
) -> float:
    """P(knew it | observed outcome) via Bayes' rule, using this attempt's
    slip/guess rates. This is the "evidence" half of the BKT step — it
    revises the belief about whether the student already knew the skill
    *before* this attempt, given what they just did."""
    p_slip = parameters.p_slip(difficulty)

    if is_correct:
        # P(correct | knew) = 1 - slip; P(correct | didn't know) = guess.
        numerator = p_know * (1 - p_slip)
        denominator = numerator + (1 - p_know) * parameters.p_guess
    else:
        # P(wrong | knew) = slip; P(wrong | didn't know) = 1 - guess.
        numerator = p_know * p_slip
        denominator = numerator + (1 - p_know) * (1 - parameters.p_guess)

    if denominator <= 0:
        return p_know

    return numerator / denominator


def _apply_learning_transition(p_know_given_evidence: float, parameters: BktParameters) -> float:
    """The "learning" half of the BKT step — after revising the belief
    given this attempt's evidence, the student has one more opportunity to
    have transitioned from not-knowing to knowing before the *next*
    attempt."""
    return p_know_given_evidence + (1 - p_know_given_evidence) * parameters.p_transition


def weighted_mastery_score(
    attempts: Sequence[MasteryAttemptInput],
    parameters: BktParameters = DEFAULT_PARAMETERS,
) -> MasteryEstimate:
    """Bayesian Knowledge Tracing estimate of p(know) for one topic or
    skill, replaying its attempts in chronological order.

    Unlike a recency-decay model, BKT doesn't need "now" — each attempt
    updates the belief state relative to the one before it, not relative
    to the current date, so there's no "as of" concept to accept here.
    """
    if not attempts:
        return _ZERO_ESTIMATE

    ordered = sorted(attempts, key=lambda attempt: attempt.created_at)

    p_know = parameters.p_l0
    raw_correct = 0

    for attempt in ordered:
        p_know = _bayes_update_know_given_outcome(
            p_know, attempt.is_correct, attempt.difficulty, parameters
        )
        p_know = _apply_learning_transition(p_know, parameters)

        if attempt.is_correct:
            raw_correct += 1

    return MasteryEstimate(
        score=p_know,
        mastered=p_know >= parameters.mastery_threshold,
        sample_size=len(ordered),
        raw_accuracy=raw_correct / len(ordered),
    )
