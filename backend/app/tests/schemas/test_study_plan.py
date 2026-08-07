"""Tests for app/schemas/study_plan.py."""

from app.schemas.study_plan import StudyPlanBase, StudyPlanUpdate


def test_study_plan_base_defaults_to_active_status_and_empty_items():
    plan = StudyPlanBase(student_id=1)

    assert plan.status == "active"
    assert plan.items == []


def test_study_plan_update_fields_are_all_optional():
    update = StudyPlanUpdate()

    assert update.title is None
    assert update.status is None
    assert update.items is None
