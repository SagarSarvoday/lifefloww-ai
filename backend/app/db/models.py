"""SQLAlchemy declarative models for LifeFlow AI."""

import uuid
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Activity(Base):
    """
    Activity database model representing scheduled tasks, habits, and events.
    """
    __tablename__ = "activities"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        nullable=False,
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, index=True, default="OTHER")
    priority = Column(String(50), nullable=False, default="MEDIUM")
    status = Column(String(50), nullable=False, index=True, default="PENDING")
    
    start_datetime = Column(DateTime(timezone=True), nullable=True, index=True)
    due_datetime = Column(DateTime(timezone=True), nullable=True, index=True)
    duration_minutes = Column(Integer, nullable=True)

    # Recurrence rules stored as JSONB for PostgreSQL
    # JSONB provides fast indexing, binary decomposition, and full schema flexibility
    recurrence = Column(JSONB, nullable=True)
    reminder_minutes_before = Column(Integer, nullable=True)

    confidence = Column(Float, nullable=False, default=1.0)
    needs_clarification = Column(Boolean, nullable=False, default=False)
    clarification_question = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    def __repr__(self) -> str:
        return f"<Activity(id={self.id}, title='{self.title}', category='{self.category}', status='{self.status}')>"
