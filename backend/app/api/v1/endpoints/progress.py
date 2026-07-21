import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.services.skill_scoring_service import get_student_progress

router = APIRouter()


@router.get("/{student_id}/progress")
async def get_progress(
    student_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    student = await db.get(User, student_id)

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if student.role != "student":
        raise HTTPException(status_code=400, detail="User is not a student")

    return await get_student_progress(db=db, student_id=student_id)