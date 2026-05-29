from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str  # "admin" | "candidate"
    company_name: Optional[str] = None  # required when role=admin


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    created_at: datetime
    company_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Campaigns ─────────────────────────────────────────────────────────────────

class CampaignCreate(BaseModel):
    title: str
    description: str = ""
    job_posting: str = ""


class CampaignUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    job_posting: Optional[str] = None


class CampaignOut(BaseModel):
    id: UUID
    title: str
    description: str
    job_posting: str
    status: str
    created_at: datetime
    company_name: Optional[str] = None
    round_count: Optional[int] = None

    class Config:
        from_attributes = True


# ── Rounds ────────────────────────────────────────────────────────────────────

class RoundCreate(BaseModel):
    name: str
    type: str           # "resume" | "coding"
    evaluation_mode: str = "ai"   # "ai" | "manual"
    ai_provider: Optional[str] = None  # "claude" | "gemini" | "chatgpt"
    evaluation_criteria: str = ""
    shortlist_count: Optional[int] = None
    auto_select: bool = False


class RoundUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    evaluation_mode: Optional[str] = None
    ai_provider: Optional[str] = None
    evaluation_criteria: Optional[str] = None
    shortlist_count: Optional[int] = None
    auto_select: Optional[bool] = None


class RoundOut(BaseModel):
    id: UUID
    campaign_id: UUID
    order: int
    name: str
    type: str
    evaluation_mode: str
    ai_provider: Optional[str]
    evaluation_criteria: str
    shortlist_count: Optional[int]
    auto_select: bool
    created_at: datetime

    class Config:
        from_attributes = True


class RoundPublicOut(BaseModel):
    """Round info exposed to candidates — no criteria."""
    id: UUID
    order: int
    name: str
    type: str

    class Config:
        from_attributes = True


# ── Applications ──────────────────────────────────────────────────────────────

class ApplicationOut(BaseModel):
    id: UUID
    candidate_id: UUID
    campaign_id: UUID
    status: str
    current_round_order: int
    created_at: datetime
    candidate_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Submissions ───────────────────────────────────────────────────────────────

class SubmissionContentUpdate(BaseModel):
    content: str


class SubmissionOut(BaseModel):
    id: UUID
    application_id: UUID
    round_id: UUID
    content: str
    status: str
    submitted_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Evaluations ───────────────────────────────────────────────────────────────

class EvaluationCreate(BaseModel):
    score: Optional[float] = None
    feedback: str


class EvaluationOut(BaseModel):
    id: UUID
    submission_id: UUID
    score: Optional[float]
    feedback: str
    evaluated_by: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── AI Chat ───────────────────────────────────────────────────────────────────

class ChatMessageIn(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    application_id: UUID
    round_id: UUID
    messages: List[ChatMessageIn]


class ChatMessageOut(BaseModel):
    id: UUID
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Notebook execution ────────────────────────────────────────────────────────

class CellExecuteRequest(BaseModel):
    code: str


class CellOutput(BaseModel):
    stdout: str
    stderr: str
    error: Optional[str] = None
