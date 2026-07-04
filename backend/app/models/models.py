import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum("admin", "candidate", name="user_role"), nullable=False)
    full_name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    admin_profile = relationship("AdminProfile", back_populates="user", uselist=False)
    applications = relationship("Application", back_populates="candidate")


class AdminProfile(Base):
    __tablename__ = "admin_profiles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    company_name = Column(String, nullable=False)
    subscription_status = Column(String, default="active")

    user = relationship("User", back_populates="admin_profile")
    campaigns = relationship("Campaign", back_populates="admin")


class Campaign(Base):
    __tablename__ = "campaigns"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("admin_profiles.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    job_posting = Column(Text, default="")
    status = Column(
        Enum("draft", "active", "closed", name="campaign_status"),
        default="draft",
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), default=utcnow)

    admin = relationship("AdminProfile", back_populates="campaigns")
    rounds = relationship("Round", back_populates="campaign", order_by="Round.order")
    applications = relationship("Application", back_populates="campaign")


class Round(Base):
    __tablename__ = "rounds"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    order = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    type = Column(Enum("resume", "coding", name="round_type"), nullable=False)
    evaluation_mode = Column(
        Enum("ai", "manual", name="evaluation_mode"), nullable=False, default="ai"
    )
    ai_provider = Column(
        Enum("claude", "gemini", "chatgpt", name="ai_provider"), nullable=True
    )
    evaluation_criteria = Column(Text, default="")
    shortlist_count = Column(Integer, nullable=True)
    auto_select = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    campaign = relationship("Campaign", back_populates="rounds")
    submissions = relationship("RoundSubmission", back_populates="round")


class Application(Base):
    __tablename__ = "applications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    status = Column(
        Enum("applied", "in_progress", "shortlisted", "rejected", name="application_status"),
        default="applied",
        nullable=False,
    )
    current_round_order = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    candidate = relationship("User", back_populates="applications")
    campaign = relationship("Campaign", back_populates="applications")
    submissions = relationship("RoundSubmission", back_populates="application")
    chat_messages = relationship("ChatMessage", back_populates="application")


class RoundSubmission(Base):
    __tablename__ = "round_submissions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id"), nullable=False)
    round_id = Column(UUID(as_uuid=True), ForeignKey("rounds.id"), nullable=False)
    content = Column(Text, default="")
    status = Column(
        Enum("pending", "submitted", "evaluated", name="submission_status"),
        default="pending",
        nullable=False,
    )
    submitted_at = Column(DateTime(timezone=True), nullable=True)

    application = relationship("Application", back_populates="submissions")
    round = relationship("Round", back_populates="submissions")
    evaluation = relationship("Evaluation", back_populates="submission", uselist=False)


class Evaluation(Base):
    __tablename__ = "evaluations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("round_submissions.id"), unique=True, nullable=False)
    score = Column(Float, nullable=True)
    feedback = Column(Text, default="")
    evaluated_by = Column(Enum("ai", "manual", name="evaluator_type"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    submission = relationship("RoundSubmission", back_populates="evaluation")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id"), nullable=False)
    round_id = Column(UUID(as_uuid=True), ForeignKey("rounds.id"), nullable=False)
    role = Column(Enum("user", "assistant", name="message_role"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    application = relationship("Application", back_populates="chat_messages")
