from fastapi import APIRouter

from app.api.v1.endpoints import (
    health,
    users,
    topics,
    questions,
    practice_sessions,
    attempts,
    study_plans,
    progress,
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(topics.router, prefix="/topics", tags=["topics"])
api_router.include_router(questions.router, prefix="/questions", tags=["questions"])
api_router.include_router(
    practice_sessions.router,
    prefix="/practice-sessions",
    tags=["practice-sessions"],
)
api_router.include_router(attempts.router, prefix="/attempts", tags=["attempts"])
api_router.include_router(study_plans.router, prefix="/study-plans", tags=["study-plans"])
api_router.include_router(progress.router, prefix="/students", tags=["progress"])