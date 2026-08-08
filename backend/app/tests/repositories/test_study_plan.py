"""Tests for app/repositories/study_plan.py."""

import pytest

from app.core.database import SessionLocal
from app.models.study_plan import StudyPlan
from app.repositories.study_plan import study_plan_repository


@pytest.mark.asyncio
async def test_get_by_student_returns_all_plans_for_that_student(student):
    async with SessionLocal() as db:
        plan_one = StudyPlan(student_id=student.id, title="Plan One", status="active", items=[])
        plan_two = StudyPlan(student_id=student.id, title="Plan Two", status="active", items=[])
        db.add_all([plan_one, plan_two])
        await db.commit()

    async with SessionLocal() as db:
        results = await study_plan_repository.get_by_student(db, student_id=student.id)

    assert {p.id for p in results} == {plan_one.id, plan_two.id}


@pytest.mark.asyncio
async def test_get_by_student_returns_empty_list_for_student_with_no_plans(student):
    async with SessionLocal() as db:
        results = await study_plan_repository.get_by_student(db, student_id=student.id)

    assert results == []
