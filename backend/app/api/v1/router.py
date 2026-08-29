from fastapi import APIRouter

from app.api.v1.endpoints import auth, dashboard, health, practice, settings, study_plan, topics

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(practice.router, prefix="/practice", tags=["practice"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(topics.router, prefix="/topics", tags=["topics"])
api_router.include_router(study_plan.router, prefix="/study-plan", tags=["study-plan"])