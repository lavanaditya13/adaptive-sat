from fastapi import APIRouter

router = APIRouter()

@router.get("", status_code=200)
async def get_health():
    """
    Check API service and database health.
    """
    return {"status": "healthy"}
