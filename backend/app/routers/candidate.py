from datetime import datetime, timezone
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import require_candidate
from app.models.models import Application, Campaign, Round, RoundSubmission
from app.schemas.schemas import (
    ApplicationOut, CampaignOut, RoundPublicOut, SubmissionOut, SubmissionContentUpdate
)

router = APIRouter(prefix="/api/candidate", tags=["candidate"])


@router.get("/campaigns", response_model=List[CampaignOut])
def list_active_campaigns(db: Session = Depends(get_db), _=Depends(require_candidate)):
    campaigns = db.query(Campaign).filter(Campaign.status == "active").all()
    result = []
    for c in campaigns:
        out = CampaignOut.model_validate(c)
        out.company_name = c.admin.company_name
        out.round_count = len(c.rounds)
        result.append(out)
    return result


@router.get("/campaigns/{campaign_id}", response_model=CampaignOut)
def get_campaign(campaign_id: UUID, db: Session = Depends(get_db), _=Depends(require_candidate)):
    c = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.status == "active").first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    out = CampaignOut.model_validate(c)
    out.company_name = c.admin.company_name
    out.round_count = len(c.rounds)
    return out


@router.get("/campaigns/{campaign_id}/rounds", response_model=List[RoundPublicOut])
def get_campaign_rounds(campaign_id: UUID, db: Session = Depends(get_db), _=Depends(require_candidate)):
    c = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.status == "active").first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    return [RoundPublicOut.model_validate(r) for r in c.rounds]


@router.post("/campaigns/{campaign_id}/apply", response_model=ApplicationOut, status_code=201)
def apply(campaign_id: UUID, candidate=Depends(require_candidate), db: Session = Depends(get_db)):
    c = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.status == "active").first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    existing = db.query(Application).filter(
        Application.candidate_id == candidate.id,
        Application.campaign_id == campaign_id,
    ).first()
    if existing:
        raise HTTPException(400, "Already applied to this campaign")
    app = Application(candidate_id=candidate.id, campaign_id=campaign_id, status="in_progress")
    db.add(app)
    db.commit()
    db.refresh(app)
    return ApplicationOut.model_validate(app)


@router.get("/applications/{application_id}", response_model=ApplicationOut)
def get_application(application_id: UUID, candidate=Depends(require_candidate), db: Session = Depends(get_db)):
    app = _get_own_app(application_id, candidate, db)
    return ApplicationOut.model_validate(app)


@router.get("/applications/{application_id}/rounds/{round_id}/submission", response_model=SubmissionOut)
def get_or_create_submission(
    application_id: UUID, round_id: UUID,
    candidate=Depends(require_candidate), db: Session = Depends(get_db)
):
    app = _get_own_app(application_id, candidate, db)
    round_ = db.query(Round).filter(Round.id == round_id, Round.campaign_id == app.campaign_id).first()
    if not round_:
        raise HTTPException(404, "Round not found")
    if round_.order != app.current_round_order:
        raise HTTPException(403, "This round is not currently active for your application")

    sub = db.query(RoundSubmission).filter(
        RoundSubmission.application_id == app.id,
        RoundSubmission.round_id == round_id,
    ).first()
    if not sub:
        sub = RoundSubmission(application_id=app.id, round_id=round_id)
        db.add(sub)
        db.commit()
        db.refresh(sub)
    return SubmissionOut.model_validate(sub)


@router.put("/applications/{application_id}/rounds/{round_id}/submission", response_model=SubmissionOut)
def save_submission(
    application_id: UUID, round_id: UUID, body: SubmissionContentUpdate,
    candidate=Depends(require_candidate), db: Session = Depends(get_db)
):
    app = _get_own_app(application_id, candidate, db)
    sub = _get_active_submission(app, round_id, db)
    if sub.status == "submitted":
        raise HTTPException(400, "Submission already finalized")
    sub.content = body.content
    db.commit()
    db.refresh(sub)
    return SubmissionOut.model_validate(sub)


@router.post("/applications/{application_id}/rounds/{round_id}/submit", response_model=ApplicationOut)
def submit_round(
    application_id: UUID, round_id: UUID,
    candidate=Depends(require_candidate), db: Session = Depends(get_db)
):
    app = _get_own_app(application_id, candidate, db)
    sub = _get_active_submission(app, round_id, db)
    if sub.status == "submitted":
        raise HTTPException(400, "Already submitted")

    sub.status = "submitted"
    sub.submitted_at = datetime.now(timezone.utc)

    # Advance to next round or mark complete
    campaign = app.campaign
    rounds = sorted(campaign.rounds, key=lambda r: r.order)
    current_orders = [r.order for r in rounds]
    try:
        next_order = current_orders[current_orders.index(app.current_round_order) + 1]
        app.current_round_order = next_order
    except IndexError:
        app.status = "applied"  # all rounds done; awaiting admin decision

    db.commit()
    db.refresh(app)
    return ApplicationOut.model_validate(app)


def _get_own_app(application_id: UUID, candidate, db: Session) -> Application:
    app = db.query(Application).filter(
        Application.id == application_id,
        Application.candidate_id == candidate.id,
    ).first()
    if not app:
        raise HTTPException(404, "Application not found")
    return app


def _get_active_submission(app: Application, round_id: UUID, db: Session) -> RoundSubmission:
    round_ = db.query(Round).filter(Round.id == round_id, Round.campaign_id == app.campaign_id).first()
    if not round_:
        raise HTTPException(404, "Round not found")
    if round_.order != app.current_round_order:
        raise HTTPException(403, "This round is not currently active")
    sub = db.query(RoundSubmission).filter(
        RoundSubmission.application_id == app.id,
        RoundSubmission.round_id == round_id,
    ).first()
    if not sub:
        raise HTTPException(404, "Submission not found — fetch it first via GET")
    return sub
