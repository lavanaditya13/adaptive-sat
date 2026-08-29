"""Tests for app/repositories/study_plan.py."""

from datetime import datetime, timedelta, timezone

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


@pytest.mark.asyncio
async def test_get_latest_active_by_student_returns_the_most_recently_created_active_plan(
    student,
):
    now = datetime.now(timezone.utc)

    async with SessionLocal() as db:
        older = StudyPlan(
            student_id=student.id,
            title="Older Plan",
            status="active",
            items=[],
            created_at=now - timedelta(days=1),
        )
        newer = StudyPlan(
            student_id=student.id,
            title="Newer Plan",
            status="active",
            items=[],
            created_at=now,
        )
        db.add_all([older, newer])
        await db.commit()
        await db.refresh(newer)

    async with SessionLocal() as db:
        result = await study_plan_repository.get_latest_active_by_student(
            db, student_id=student.id
        )

    assert result is not None
    assert result.id == newer.id


@pytest.mark.asyncio
async def test_get_latest_active_by_student_ignores_non_active_plans(student):
    async with SessionLocal() as db:
        archived = StudyPlan(
            student_id=student.id, title="Archived Plan", status="archived", items=[]
        )
        db.add(archived)
        await db.commit()

    async with SessionLocal() as db:
        result = await study_plan_repository.get_latest_active_by_student(
            db, student_id=student.id
        )

    assert result is None


@pytest.mark.asyncio
async def test_get_latest_active_by_student_returns_none_for_student_with_no_plans(student):
    async with SessionLocal() as db:
        result = await study_plan_repository.get_latest_active_by_student(
            db, student_id=student.id
        )

    assert result is None
