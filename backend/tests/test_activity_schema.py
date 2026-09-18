"""Tests for activity Pydantic models and validation logic."""

from datetime import date, datetime, timezone
import pytest
from pydantic import ValidationError

from app.schemas.activity import (
    ActivityCategory,
    ActivityExtraction,
    ActivityParseRequest,
    ActivityPriority,
    ActivityStatus,
    RecurrenceFrequency,
    RecurrenceRule,
)


def test_valid_activity_extraction():
    """Verify that a complete, valid activity model is instantiated correctly."""
    now = datetime(2026, 9, 18, 18, 0, 0, tzinfo=timezone.utc)
    extraction = ActivityExtraction(
        title="Study DSA",
        description="Solve 2 tree problems",
        category=ActivityCategory.STUDY,
        priority=ActivityPriority.HIGH,
        status=ActivityStatus.PENDING,
        start_datetime=now,
        duration_minutes=120,
        recurrence=None,
        reminder_minutes_before=15,
        confidence=0.95,
        needs_clarification=False,
    )

    assert extraction.title == "Study DSA"
    assert extraction.category == ActivityCategory.STUDY
    assert extraction.priority == ActivityPriority.HIGH
    assert extraction.duration_minutes == 120
    assert extraction.reminder_minutes_before == 15
    assert extraction.confidence == 0.95
    assert extraction.needs_clarification is False


def test_missing_optional_fields():
    """Ensure omitted optional fields default to None or appropriate defaults."""
    extraction = ActivityExtraction(title="Quick workout")
    assert extraction.title == "Quick workout"
    assert extraction.description is None
    assert extraction.category == ActivityCategory.OTHER
    assert extraction.priority == ActivityPriority.MEDIUM
    assert extraction.status == ActivityStatus.PENDING
    assert extraction.start_datetime is None
    assert extraction.due_datetime is None
    assert extraction.duration_minutes is None
    assert extraction.recurrence is None
    assert extraction.reminder_minutes_before is None
    assert extraction.confidence == 1.0
    assert extraction.needs_clarification is False
    assert extraction.clarification_question is None


def test_category_normalization_and_fallback():
    """Test that lowercase categories are normalized and invalid ones fall back to OTHER."""
    # Case insensitivity
    ext1 = ActivityExtraction(title="Gym", category="fitness")
    assert ext1.category == ActivityCategory.FITNESS

    # Unknown category falls back to OTHER
    ext2 = ActivityExtraction(title="Something weird", category="UNKNOWN_CUSTOM_CATEGORY")
    assert ext2.category == ActivityCategory.OTHER


def test_priority_and_status_normalization():
    """Test priority and status normalization and fallback."""
    ext = ActivityExtraction(
        title="Emergency Task",
        priority="urgent",
        status="completed",
    )
    assert ext.priority == ActivityPriority.URGENT
    assert ext.status == ActivityStatus.COMPLETED

    # Fallbacks for unknown
    ext_fallback = ActivityExtraction(
        title="Normal Task",
        priority="INVALID_PRIORITY",
        status="INVALID_STATUS",
    )
    assert ext_fallback.priority == ActivityPriority.MEDIUM
    assert ext_fallback.status == ActivityStatus.PENDING


def test_confidence_range_validation():
    """Verify confidence must be between 0.0 and 1.0."""
    with pytest.raises(ValidationError):
        ActivityExtraction(title="Invalid", confidence=1.5)

    with pytest.raises(ValidationError):
        ActivityExtraction(title="Invalid", confidence=-0.1)


def test_recurrence_rule_normalization():
    """Verify days_of_week normalization and interval validation."""
    rule = RecurrenceRule(
        frequency=RecurrenceFrequency.WEEKLY,
        days_of_week=["monday", "wednesday", "friday"],
        interval=1,
        end_date=date(2026, 12, 31),
    )
    assert rule.frequency == RecurrenceFrequency.WEEKLY
    assert rule.days_of_week == ["MONDAY", "WEDNESDAY", "FRIDAY"]
    assert rule.interval == 1
    assert rule.end_date == date(2026, 12, 31)

    # Invalid interval (< 1)
    with pytest.raises(ValidationError):
        RecurrenceRule(frequency=RecurrenceFrequency.DAILY, interval=0)


def test_needs_clarification_default_question():
    """Verify that if needs_clarification is True, a default clarification question is provided if missing."""
    ext = ActivityExtraction(
        title="Meeting",
        needs_clarification=True,
    )
    assert ext.needs_clarification is True
    assert ext.clarification_question is not None
    assert len(ext.clarification_question) > 0


def test_activity_parse_request_validation():
    """Test API request body validation for empty, whitespace, or excessively long text."""
    # Valid
    req = ActivityParseRequest(text="Remind me to study DSA")
    assert req.text == "Remind me to study DSA"

    # Whitespace only
    with pytest.raises(ValidationError):
        ActivityParseRequest(text="   ")

    # Empty string
    with pytest.raises(ValidationError):
        ActivityParseRequest(text="")

    # Excessively long text (> 1000 chars)
    with pytest.raises(ValidationError):
        ActivityParseRequest(text="A" * 1001)
