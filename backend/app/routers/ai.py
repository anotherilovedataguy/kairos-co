import json
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models.models import Application, ChatMessage, Round
from app.schemas.schemas import CellExecuteRequest, CellOutput, ChatRequest
from app.services.ai_service import stream_chat
from app.services.notebook import execute_cell

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/chat")
async def chat(
    body: ChatRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = db.query(Application).filter(
        Application.id == body.application_id,
        Application.candidate_id == current_user.id,
    ).first()
    if not app:
        raise HTTPException(404, "Application not found")

    round_ = db.query(Round).filter(
        Round.id == body.round_id,
        Round.campaign_id == app.campaign_id,
    ).first()
    if not round_:
        raise HTTPException(404, "Round not found")

    # Persist user message
    if body.messages:
        last = body.messages[-1]
        if last.role == "user":
            db.add(ChatMessage(
                application_id=app.id,
                round_id=round_.id,
                role="user",
                content=last.content,
            ))
            db.commit()

    campaign = app.campaign
    system_prompt = (
        f"You are an AI interview assistant helping a candidate during their {round_.type} interview round.\n"
        f"Job: {campaign.title}\n"
        f"Company: {campaign.admin.company_name}\n"
        f"Job description: {campaign.job_posting or campaign.description}\n\n"
        "Help the candidate perform their best. You can answer questions, clarify requirements, "
        "review their work, and provide guidance. Be concise and professional."
    )

    provider = round_.ai_provider or "claude"
    messages = [{"role": m.role, "content": m.content} for m in body.messages]

    async def event_stream():
        full_response = ""
        async for chunk in stream_chat(provider, messages, system_prompt):
            full_response += chunk
            yield f"data: {json.dumps({'content': chunk})}\n\n"

        # Persist assistant response
        db_session = db
        db_session.add(ChatMessage(
            application_id=app.id,
            round_id=round_.id,
            role="assistant",
            content=full_response,
        ))
        db_session.commit()
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/execute-cell", response_model=CellOutput)
def execute(body: CellExecuteRequest, _=Depends(get_current_user)):
    result = execute_cell(body.code)
    return CellOutput(**result)
