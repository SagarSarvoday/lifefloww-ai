"""Activity extraction schemas and Pydantic models."""

from datetime import date, datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, model_validator


class ActivityCategory(str, Enum):
    """Categorization for extracted activities."""
    STUDY = "STUDY"
    WORK = "WORK"
    HEALTH = "HEALTH"
    FITNESS = "FITNESS"
    PERSONAL = "PERSONAL"
    SHOPPING = "SHOPPING"
    TRAVEL = "TRAVEL"
    APPOINTMENT = "APPOINTMENT"
    FINANCE = "FINANCE"
    SOCIAL = "SOCIAL"
    OTHER = "OTHER"


class ActivityPriority(str, Enum):
    """Priority levels for activities."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class ActivityStatus(str, Enum):
    """Lifecycle status of activities."""
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class RecurrenceFrequency(str, Enum):
    """Frequency types for recurring activities."""
    NONE = "NONE"
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    CUSTOM = "CUSTOM"


class RecurrenceRule(BaseModel):
    """Rule defining recurring activities."""
    frequency: RecurrenceFrequency = RecurrenceFrequency.NONE
    days_of_week: Optional[List[str]] = Field(
        default=None,
        description="Days of week for weekly or custom recurrence, e.g. ['MONDAY', 'WEDNESDAY', 'FRIDAY']"
    )
    interval: Optional[int] = Field(
        default=1,
        ge=1,
        description="Interval of recurrence, e.g. every 1 week or every 2 days"
    )
    end_date: Optional[date] = Field(
        default=None,
        description="End date for recurrence if specified"
    )

    @field_validator("days_of_week", mode="before")
    @classmethod
    def normalize_days(cls, v):
        if v is None:
            return v
        if isinstance(v, list):
            return [day.strip().upper() for day in v if isinstance(day, str)]
        return v


class ActivityExtraction(BaseModel):
    """Structured activity information extracted from user natural language commands."""
    title: str = Field(..., min_length=1, description="Concise activity title")
    description: Optional[str] = Field(default=None, description="Optional extended details or context")
    category: ActivityCategory = Field(
        default=ActivityCategory.OTHER,
        description="Assigned activity category"
    )
    priority: ActivityPriority = Field(
        default=ActivityPriority.MEDIUM,
        description="Priority level determined from context"
    )
    status: ActivityStatus = Field(
        default=ActivityStatus.PENDING,
        description="Activity status, default PENDING"
    )
    start_datetime: Optional[datetime] = Field(
        default=None,
        description="ISO-8601 start datetime with timezone offset when known"
    )
    due_datetime: Optional[datetime] = Field(
        default=None,
        description="ISO-8601 deadline or due datetime with timezone offset when known"
    )
    duration_minutes: Optional[int] = Field(
        default=None,
        ge=0,
        description="Estimated or requested duration in minutes"
    )
    recurrence: Optional[RecurrenceRule] = Field(
        default=None,
        description="Recurrence details if this is a recurring task"
    )
    reminder_minutes_before: Optional[int] = Field(
        default=None,
        ge=0,
        description="Advance reminder time in minutes"
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 and 1.0"
    )
    needs_clarification: bool = Field(
        default=False,
        description="True if critical information like ambiguous time or date is missing"
    )
    clarification_question: Optional[str] = Field(
        default=None,
        description="Question prompting user for missing information when needs_clarification is True"
    )

    @field_validator("category", mode="before")
    @classmethod
    def normalize_category(cls, v):
        if isinstance(v, str):
            v_upper = v.strip().upper()
            for item in ActivityCategory:
                if item.value == v_upper:
                    return item
            return ActivityCategory.OTHER
        return v

    @field_validator("priority", mode="before")
    @classmethod
    def normalize_priority(cls, v):
        if isinstance(v, str):
            v_upper = v.strip().upper()
            for item in ActivityPriority:
                if item.value == v_upper:
                    return item
            return ActivityPriority.MEDIUM
        return v

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, v):
        if isinstance(v, str):
            v_upper = v.strip().upper()
            for item in ActivityStatus:
                if item.value == v_upper:
                    return item
            return ActivityStatus.PENDING
        return v

    @model_validator(mode="after")
    def validate_clarification(self):
        if self.needs_clarification and not self.clarification_question:
            self.clarification_question = "Could you please provide more details for this activity?"
        return self


class ActivityRead(ActivityExtraction):
    """Schema representing a persisted activity loaded from database."""
    id: UUID = Field(..., description="Unique activity UUID")
    created_at: datetime = Field(..., description="Timestamp when record was created")
    updated_at: datetime = Field(..., description="Timestamp when record was last updated")

    model_config = {
        "from_attributes": True
    }


class ActivityUpdate(BaseModel):
    """Schema for partial update (PATCH) of an activity."""
    title: Optional[str] = Field(default=None, min_length=1)
    description: Optional[str] = None
    category: Optional[ActivityCategory] = None
    priority: Optional[ActivityPriority] = None
    status: Optional[ActivityStatus] = None
    start_datetime: Optional[datetime] = None
    due_datetime: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(default=None, ge=0)
    recurrence: Optional[RecurrenceRule] = None
    reminder_minutes_before: Optional[int] = Field(default=None, ge=0)
    needs_clarification: Optional[bool] = None
    clarification_question: Optional[str] = None

    @field_validator("category", mode="before")
    @classmethod
    def normalize_category(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            v_upper = v.strip().upper()
            for item in ActivityCategory:
                if item.value == v_upper:
                    return item
            return ActivityCategory.OTHER
        return v

    @field_validator("priority", mode="before")
    @classmethod
    def normalize_priority(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            v_upper = v.strip().upper()
            for item in ActivityPriority:
                if item.value == v_upper:
                    return item
            return ActivityPriority.MEDIUM
        return v

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            v_upper = v.strip().upper()
            for item in ActivityStatus:
                if item.value == v_upper:
                    return item
            return ActivityStatus.PENDING
        return v


class ActivityParseRequest(BaseModel):
    """API request payload for parsing an activity."""
    text: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Natural language activity input from user"
    )

    @field_validator("text")
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Input text cannot be empty or solely whitespace.")
        return trimmed


class ActivityParseResponse(BaseModel):
    """Standard API response for activity parsing (non-persisted)."""
    success: bool
    data: Optional[ActivityExtraction] = None
    error: Optional[str] = None


class ActivityCreateResponse(BaseModel):
    """API response for persisted activity creation."""
    success: bool
    data: Optional[ActivityRead] = None
    error: Optional[str] = None


class ActivitySingleResponse(BaseModel):
    """API response for single persisted activity."""
    success: bool
    data: Optional[ActivityRead] = None
    error: Optional[str] = None


class ActivityListResponse(BaseModel):
    """API response for paginated list of activities."""
    success: bool
    data: List[ActivityRead]
    total: int
    limit: int
    offset: int


class ActivityDeleteResponse(BaseModel):
    """API response for activity deletion."""
    success: bool = True
    message: str = "Activity deleted successfully"


class HealthResponse(BaseModel):
    """Health check response schema."""
    status: str = "ok"
    database: str = "unconfigured"
