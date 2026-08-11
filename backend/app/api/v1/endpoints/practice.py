from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import IDEMPOTENCY_KEY_HEADER, IdempotentEndpoint
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.practice import (
    PracticeAbandonResponse,
    PracticeCompleteResponse,
    PracticeQuestionResponse,
    PracticeStartRequest,
    PracticeStartResponse,
    SectionSelectionRequest,
    SectionSelectionResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    UpdateAttemptRequest,
    UpdateAttemptResponse,
)
from app.services.idempotency_service import compute_request_fingerprint, run_idempotent
from app.services.practice_service import (
    abandon_practice_session,
    complete_practice_session,
    get_current_question,
    get_next_question,
    set_selected_section,
    start_practice_session,
    submit_answer,
    update_attempt_answer,
)

router = APIRouter()


@router.post("/context/section", response_model=SectionSelectionResponse)
async def select_section(
    request: SectionSelectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await set_selected_section(db=db, student=current_user, section_id=request.section_id)


@router.post("/start", response_model=PracticeStartResponse, status_code=201)
async def start_practice(
    request: PracticeStartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    idempotency_key: str | None = Header(default=None, alias=IDEMPOTENCY_KEY_HEADER),
):
    return await run_idempotent(
        db,
        student_id=current_user.id,
        endpoint=IdempotentEndpoint.PRACTICE_START,
        idempotency_key=idempotency_key,
        request_fingerprint=compute_request_fingerprint(request),
        response_model=PracticeStartResponse,
        execute=lambda: start_practice_session(db=db, request=request, student=current_user),
    )


@router.post("/abandon", response_model=PracticeAbandonResponse)
async def abandon_session(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await abandon_practice_session(db=db, student=current_user)


@router.post("/answer", response_model=SubmitAnswerResponse)
async def answer_question(
    request: SubmitAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    idempotency_key: str | None = Header(default=None, alias=IDEMPOTENCY_KEY_HEADER),
):
    return await run_idempotent(
        db,
        student_id=current_user.id,
        endpoint=IdempotentEndpoint.PRACTICE_ANSWER,
        idempotency_key=idempotency_key,
        request_fingerprint=compute_request_fingerprint(request),
        response_model=SubmitAnswerResponse,
        execute=lambda: submit_answer(db=db, student=current_user, request=request),
    )


@router.get("/question", response_model=PracticeQuestionResponse)
async def current_question(
    questionId: int | None = Query(default=None, alias="questionId"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_current_question(db=db, student=current_user, question_id=questionId)


@router.get("/next", response_model=PracticeQuestionResponse)
async def next_question(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_next_question(db=db, student=current_user)


@router.post("/complete", response_model=PracticeCompleteResponse)
async def complete_session(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await complete_practice_session(db=db, student=current_user)


@router.put("/attempts/{attempt_id}", response_model=UpdateAttemptResponse)
async def update_attempt(
    attempt_id: int,
    request: UpdateAttemptRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await update_attempt_answer(
        db=db, student=current_user, attempt_id=attempt_id, request=request
    )