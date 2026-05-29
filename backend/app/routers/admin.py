from datetime import datetime, timezone
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import require_admin
from app.models.models import (
    Application, Campaign, Evaluation, Round, RoundSubmission, User
)
from app.schemas.schemas import (
    ApplicationOut, CampaignCreate, CampaignOut, CampaignUpdate,
    EvaluationCreate, EvaluationOut, RoundCreate, RoundOut, RoundUpdate,
    SubmissionOut,
)
from app.services.evaluation import run_ai_evaluation

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Campaigns ─────────────────────────────────────────────────────────────────

@router.get("/campaigns", response_model=List[CampaignOut])
def list_campaigns(admin=Depends(require_admin), db: Session = Depends(get_db)):
    profile = admin.admin_profile
    campaigns = db.query(Campaign).filter(Campaign.admin_id == profile.id).all()
    result = []
    for c in campaigns:
        out = CampaignOut.model_validate(c)
        out.company_name = profile.company_name
        out.round_count = len(c.rounds)
        result.append(out)
    return result


@router.post("/campaigns", response_model=CampaignOut, status_code=201)
def create_campaign(body: CampaignCreate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    c = Campaign(admin_id=admin.admin_profile.id, **body.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    out = CampaignOut.model_validate(c)
    out.company_name = admin.admin_profile.company_name
    out.round_count = 0
    return out


@router.get("/campaigns/{campaign_id}", response_model=CampaignOut)
def get_campaign(campaign_id: UUID, admin=Depends(require_admin), db: Session = Depends(get_db)):
    c = _get_own_campaign(campaign_id, admin, db)
    out = CampaignOut.model_validate(c)
    out.company_name = admin.admin_profile.company_name
    out.round_count = len(c.rounds)
    return out


@router.put("/campaigns/{campaign_id}", response_model=CampaignOut)
def update_campaign(
    campaign_id: UUID, body: CampaignUpdate,
    admin=Depends(require_admin), db: Session = Depends(get_db)
):
    c = _get_own_campaign(campaign_id, admin, db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(c, field, value)
    db.commit()
    db.refresh(c)
    out = CampaignOut.model_validate(c)
    out.company_name = admin.admin_profile.company_name
    out.round_count = len(c.rounds)
    return out


@router.post("/campaigns/{campaign_id}/publish", response_model=CampaignOut)
def publish_campaign(campaign_id: UUID, admin=Depends(require_admin), db: Session = Depends(get_db)):
    c = _get_own_campaign(campaign_id, admin, db)
    c.status = "active"
    db.commit()
    db.refresh(c)
    out = CampaignOut.model_validate(c)
    out.company_name = admin.admin_profile.company_name
    out.round_count = len(c.rounds)
    return out


# ── Rounds ────────────────────────────────────────────────────────────────────

@router.get("/campaigns/{campaign_id}/rounds", response_model=List[RoundOut])
def list_rounds(campaign_id: UUID, admin=Depends(require_admin), db: Session = Depends(get_db)):
    c = _get_own_campaign(campaign_id, admin, db)
    return [RoundOut.model_validate(r) for r in c.rounds]


@router.post("/campaigns/{campaign_id}/rounds", response_model=RoundOut, status_code=201)
def create_round(
    campaign_id: UUID, body: RoundCreate,
    admin=Depends(require_admin), db: Session = Depends(get_db)
):
    c = _get_own_campaign(campaign_id, admin, db)
    next_order = (max((r.order for r in c.rounds), default=0)) + 1
    r = Round(campaign_id=c.id, order=next_order, **body.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return RoundOut.model_validate(r)


@router.put("/rounds/{round_id}", response_model=RoundOut)
def update_round(round_id: UUID, body: RoundUpdate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    r = _get_own_round(round_id, admin, db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(r, field, value)
    db.commit()
    db.refresh(r)
    return RoundOut.model_validate(r)


@router.delete("/rounds/{round_id}", status_code=204)
def delete_round(round_id: UUID, admin=Depends(require_admin), db: Session = Depends(get_db)):
    r = _get_own_round(round_id, admin, db)
    db.delete(r)
    db.commit()


# ── Applications ──────────────────────────────────────────────────────────────

@router.get("/campaigns/{campaign_id}/applications", response_model=List[ApplicationOut])
def list_applications(campaign_id: UUID, admin=Depends(require_admin), db: Session = Depends(get_db)):
    _get_own_campaign(campaign_id, admin, db)
    apps = db.query(Application).filter(Application.campaign_id == campaign_id).all()
    result = []
    for app in apps:
        out = ApplicationOut.model_validate(app)
        out.candidate_name = app.candidate.full_name
        result.append(out)
    return result


@router.get("/applications/{application_id}", response_model=ApplicationOut)
def get_application(application_id: UUID, admin=Depends(require_admin), db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(404, "Application not found")
    _get_own_campaign(app.campaign_id, admin, db)
    out = ApplicationOut.model_validate(app)
    out.candidate_name = app.candidate.full_name
    return out


@router.get("/applications/{application_id}/submissions", response_model=List[SubmissionOut])
def get_submissions(application_id: UUID, admin=Depends(require_admin), db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(404, "Application not found")
    _get_own_campaign(app.campaign_id, admin, db)
    return [SubmissionOut.model_validate(s) for s in app.submissions]


@router.post("/submissions/{submission_id}/evaluate", response_model=EvaluationOut)
def manual_evaluate(
    submission_id: UUID, body: EvaluationCreate,
    admin=Depends(require_admin), db: Session = Depends(get_db)
):
    sub = db.query(RoundSubmission).filter(RoundSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(404, "Submission not found")
    if sub.evaluation:
        sub.evaluation.score = body.score
        sub.evaluation.feedback = body.feedback
        sub.evaluation.evaluated_by = "manual"
    else:
        ev = Evaluation(
            submission_id=sub.id, score=body.score,
            feedback=body.feedback, evaluated_by="manual"
        )
        db.add(ev)
    sub.status = "evaluated"
    db.commit()
    db.refresh(sub)
    return EvaluationOut.model_validate(sub.evaluation)


@router.post("/rounds/{round_id}/trigger-ai-eval")
async def trigger_ai_eval(round_id: UUID, admin=Depends(require_admin), db: Session = Depends(get_db)):
    r = _get_own_round(round_id, admin, db)
    pending = (
        db.query(RoundSubmission)
        .filter(
            RoundSubmission.round_id == round_id,
            RoundSubmission.status == "submitted",
        )
        .all()
    )
    evaluated = 0
    for sub in pending:
        ev_result = await run_ai_evaluation(r, sub.content)
        if sub.evaluation:
            sub.evaluation.score = ev_result["score"]
            sub.evaluation.feedback = ev_result["feedback"]
            sub.evaluation.evaluated_by = "ai"
        else:
            ev = Evaluation(
                submission_id=sub.id,
                score=ev_result["score"],
                feedback=ev_result["feedback"],
                evaluated_by="ai",
            )
            db.add(ev)
        sub.status = "evaluated"
        evaluated += 1
    db.commit()
    return {"evaluated": evaluated}


@router.post("/rounds/{round_id}/shortlist")
def shortlist(round_id: UUID, admin=Depends(require_admin), db: Session = Depends(get_db)):
    r = _get_own_round(round_id, admin, db)
    if not r.shortlist_count:
        raise HTTPException(400, "shortlist_count not set for this round")

    evaluated_subs = (
        db.query(RoundSubmission)
        .join(Evaluation)
        .filter(RoundSubmission.round_id == round_id)
        .order_by(Evaluation.score.desc())
        .all()
    )

    shortlisted_ids = []
    rejected_ids = []
    for i, sub in enumerate(evaluated_subs):
        if i < r.shortlist_count:
            if r.auto_select:
                sub.application.status = "shortlisted"
            shortlisted_ids.append(str(sub.application_id))
        else:
            if r.auto_select:
                sub.application.status = "rejected"
            rejected_ids.append(str(sub.application_id))

    db.commit()
    return {
        "shortlisted": shortlisted_ids,
        "rejected": rejected_ids,
        "auto_applied": r.auto_select,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_own_campaign(campaign_id: UUID, admin, db: Session) -> Campaign:
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c or c.admin_id != admin.admin_profile.id:
        raise HTTPException(404, "Campaign not found")
    return c


def _get_own_round(round_id: UUID, admin, db: Session) -> Round:
    r = db.query(Round).filter(Round.id == round_id).first()
    if not r:
        raise HTTPException(404, "Round not found")
    _get_own_campaign(r.campaign_id, admin, db)
    return r
