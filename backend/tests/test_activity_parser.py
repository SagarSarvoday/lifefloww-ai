"""Unit and integration tests for AI activity parser and API endpoint."""

import json
import os
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from zoneinfo import ZoneInfo

import httpx
import ollama
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app
from app.schemas.activity import ActivityCategory, ActivityExtraction, ActivityPriority
from app.services.ai_parser import (
    AIParserConfigError,
    AIParserConnectionError,
    AIParserResponseError,
    AIParserValidationError,
    extract_json_object,
    parse_activity_command,
)


class MockChatMessage:
    """Mock object for Ollama ChatResponse message."""
    def __init__(self, content: str):
        self.content = content


class MockChatResponse:
    """Mock object for Ollama ChatResponse."""
    def __init__(self, content: str):
        self.message = MockChatMessage(content)


# ---------------------------------------------------------------------------
# Helper / Unit tests
# ---------------------------------------------------------------------------

def test_extract_json_object():
    """Verify JSON object extraction from plain JSON, markdown code blocks, and surrounded text."""
    plain = '{"title": "Test"}'
    assert extract_json_object(plain) == '{"title": "Test"}'

    with_markdown = '```json\n{"title": "Test"}\n```'
    assert extract_json_object(with_markdown) == '{"title": "Test"}'

    with_surrounding = 'Here is your JSON:\n{"title": "Test"}\nHope this helps!'
    assert extract_json_object(with_surrounding) == '{"title": "Test"}'


@pytest.mark.asyncio
async def test_empty_or_whitespace_input():
    """Verify that empty or whitespace input raises AIParserValidationError."""
    with pytest.raises(AIParserValidationError):
        await parse_activity_command("")

    with pytest.raises(AIParserValidationError):
        await parse_activity_command("   \n\t  ")


@pytest.mark.asyncio
async def test_missing_api_key_raises_config_error(monkeypatch):
    """Verify that unconfigured API key raises AIParserConfigError."""
    monkeypatch.setattr(settings, "OLLAMA_API_KEY", None)
    with pytest.raises(AIParserConfigError) as exc_info:
        await parse_activity_command("Study DSA")
    assert "OLLAMA_API_KEY" in str(exc_info.value)


@pytest.mark.asyncio
async def test_successful_parsing_with_mocked_ollama():
    """Verify extraction for 'Remind me to study DSA tomorrow at 6 PM for 2 hours.'"""
    mock_payload = {
        "title": "Study DSA",
        "description": "Study Data Structures and Algorithms",
        "category": "STUDY",
        "priority": "HIGH",
        "status": "PENDING",
        "start_datetime": "2026-09-18T18:00:00+05:30",
        "due_datetime": None,
        "duration_minutes": 120,
        "recurrence": None,
        "reminder_minutes_before": 15,
        "confidence": 0.95,
        "needs_clarification": False,
        "clarification_question": None,
    }

    mock_client = MagicMock(spec=ollama.AsyncClient)
    mock_client.chat = AsyncMock(return_value=MockChatResponse(json.dumps(mock_payload)))

    ref_time = datetime(2026, 9, 17, 21, 0, 0, tzinfo=ZoneInfo("Asia/Kolkata"))
    result = await parse_activity_command(
        user_text="Remind me to study DSA tomorrow at 6 PM for 2 hours.",
        current_datetime=ref_time,
        timezone_str="Asia/Kolkata",
        client=mock_client,
    )

    assert isinstance(result, ActivityExtraction)
    assert result.title == "Study DSA"
    assert result.category == ActivityCategory.STUDY
    assert result.priority == ActivityPriority.HIGH
    assert result.duration_minutes == 120
    assert result.start_datetime.isoformat() == "2026-09-18T18:00:00+05:30"
    assert result.needs_clarification is False
    assert mock_client.chat.await_count == 1


@pytest.mark.asyncio
async def test_relative_date_handling():
    """Verify extraction for relative expression 'Remind me to call mom in 30 minutes.'"""
    mock_payload = {
        "title": "Call mom",
        "description": None,
        "category": "PERSONAL",
        "priority": "MEDIUM",
        "status": "PENDING",
        "start_datetime": "2026-09-17T21:30:00+05:30",
        "due_datetime": None,
        "duration_minutes": 15,
        "recurrence": None,
        "reminder_minutes_before": 0,
        "confidence": 0.9,
        "needs_clarification": False,
        "clarification_question": None,
    }

    mock_client = MagicMock(spec=ollama.AsyncClient)
    mock_client.chat = AsyncMock(return_value=MockChatResponse(json.dumps(mock_payload)))

    ref_time = datetime(2026, 9, 17, 21, 0, 0, tzinfo=ZoneInfo("Asia/Kolkata"))
    result = await parse_activity_command(
        user_text="Remind me to call mom in 30 minutes.",
        current_datetime=ref_time,
        timezone_str="Asia/Kolkata",
        client=mock_client,
    )

    assert result.title == "Call mom"
    assert result.category == ActivityCategory.PERSONAL
    assert result.start_datetime.isoformat() == "2026-09-17T21:30:00+05:30"


@pytest.mark.asyncio
async def test_ambiguous_command_handling():
    """Verify that ambiguous commands trigger needs_clarification=True and clarification_question."""
    mock_payload = {
        "title": "Study",
        "description": None,
        "category": "STUDY",
        "priority": "MEDIUM",
        "status": "PENDING",
        "start_datetime": None,
        "due_datetime": None,
        "duration_minutes": None,
        "recurrence": None,
        "reminder_minutes_before": None,
        "confidence": 0.5,
        "needs_clarification": True,
        "clarification_question": "What time should I remind you to study tomorrow?",
    }

    mock_client = MagicMock(spec=ollama.AsyncClient)
    mock_client.chat = AsyncMock(return_value=MockChatResponse(json.dumps(mock_payload)))

    result = await parse_activity_command(
        user_text="Remind me to study tomorrow.",
        client=mock_client,
    )

    assert result.needs_clarification is True
    assert result.clarification_question == "What time should I remind you to study tomorrow?"
    assert result.start_datetime is None


@pytest.mark.asyncio
async def test_malformed_json_retry_success():
    """Verify that parser retries once upon receiving malformed JSON and succeeds if retry returns valid JSON."""
    valid_payload = {
        "title": "Cricket practice",
        "description": None,
        "category": "FITNESS",
        "priority": "MEDIUM",
        "status": "PENDING",
        "start_datetime": "2026-09-17T17:00:00+05:30",
        "due_datetime": None,
        "duration_minutes": 60,
        "recurrence": None,
        "reminder_minutes_before": 10,
        "confidence": 0.9,
        "needs_clarification": False,
        "clarification_question": None,
    }

    mock_client = MagicMock(spec=ollama.AsyncClient)
    # First response is invalid JSON; second response is valid JSON
    mock_client.chat = AsyncMock(
        side_effect=[
            MockChatResponse("This is not JSON at all!"),
            MockChatResponse(json.dumps(valid_payload)),
        ]
    )

    result = await parse_activity_command(
        user_text="Schedule cricket practice today at 5 PM.",
        client=mock_client,
    )

    assert result.title == "Cricket practice"
    assert result.category == ActivityCategory.FITNESS
    assert mock_client.chat.await_count == 2


@pytest.mark.asyncio
async def test_malformed_json_retry_failure():
    """Verify that parser raises AIParserResponseError if retry also fails."""
    mock_client = MagicMock(spec=ollama.AsyncClient)
    mock_client.chat = AsyncMock(
        side_effect=[
            MockChatResponse("Invalid JSON 1"),
            MockChatResponse("Invalid JSON 2"),
        ]
    )

    with pytest.raises(AIParserResponseError):
        await parse_activity_command(
            user_text="Some activity command",
            client=mock_client,
        )

    assert mock_client.chat.await_count == 2


@pytest.mark.asyncio
async def test_ollama_api_authentication_failure():
    """Verify that a 401 ResponseError raises AIParserConfigError."""
    mock_client = MagicMock(spec=ollama.AsyncClient)
    err = ollama.ResponseError("Unauthorized")
    err.status_code = 401
    mock_client.chat = AsyncMock(side_effect=err)

    with pytest.raises(AIParserConfigError) as exc_info:
        await parse_activity_command(
            user_text="Finish report",
            client=mock_client,
        )

    assert "Authentication failed" in str(exc_info.value)


@pytest.mark.asyncio
async def test_ollama_api_timeout():
    """Verify that request timeout raises AIParserConnectionError."""
    mock_client = MagicMock(spec=ollama.AsyncClient)
    mock_client.chat = AsyncMock(side_effect=httpx.TimeoutException("Read timed out"))

    with pytest.raises(AIParserConnectionError) as exc_info:
        await parse_activity_command(
            user_text="Finish report",
            client=mock_client,
        )

    assert "timed out" in str(exc_info.value)


# ---------------------------------------------------------------------------
# API Route Endpoint Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_api_parse_endpoint_success():
    """Verify POST /api/v1/activities/parse with valid input returns 200 and parsed data."""
    mock_payload = {
        "title": "Study DSA",
        "description": None,
        "category": "STUDY",
        "priority": "HIGH",
        "status": "PENDING",
        "start_datetime": "2026-09-18T18:00:00+05:30",
        "due_datetime": None,
        "duration_minutes": 120,
        "recurrence": None,
        "reminder_minutes_before": 15,
        "confidence": 1.0,
        "needs_clarification": False,
        "clarification_question": None,
    }

    mock_client = MagicMock(spec=ollama.AsyncClient)
    mock_client.chat = AsyncMock(return_value=MockChatResponse(json.dumps(mock_payload)))

    with patch("app.routes.activities.parse_activity_command") as mock_parse:
        mock_parse.return_value = ActivityExtraction(**mock_payload)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/activities/parse",
                json={"text": "Remind me to study DSA tomorrow at 6 PM for 2 hours."},
            )

            assert resp.status_code == 200
            body = resp.json()
            assert body["success"] is True
            assert body["data"]["title"] == "Study DSA"
            assert body["data"]["category"] == "STUDY"
            assert body["data"]["duration_minutes"] == 120


@pytest.mark.asyncio
async def test_api_parse_endpoint_empty_input():
    """Verify POST /api/v1/activities/parse with empty or whitespace text returns 422 Unprocessable Entity."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Empty string
        resp1 = await client.post("/api/v1/activities/parse", json={"text": ""})
        assert resp1.status_code == 422
        assert resp1.json()["success"] is False

        # Whitespace only
        resp2 = await client.post("/api/v1/activities/parse", json={"text": "   "})
        assert resp2.status_code == 422
        assert resp2.json()["success"] is False


@pytest.mark.asyncio
async def test_api_parse_endpoint_service_errors():
    """Verify that internal service errors map to appropriate HTTP status codes."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.routes.activities.parse_activity_command") as mock_parse:
            # 503 for config error
            mock_parse.side_effect = AIParserConfigError("Missing key")
            r1 = await client.post("/api/v1/activities/parse", json={"text": "Workout"})
            assert r1.status_code == 503

            # 502 for connection error
            mock_parse.side_effect = AIParserConnectionError("Gateway error")
            r2 = await client.post("/api/v1/activities/parse", json={"text": "Workout"})
            assert r2.status_code == 502

            # 502 for response error
            mock_parse.side_effect = AIParserResponseError("Malformed AI response")
            r3 = await client.post("/api/v1/activities/parse", json={"text": "Workout"})
            assert r3.status_code == 502


# ---------------------------------------------------------------------------
# Optional Live Ollama Cloud Integration Test
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.skipif(
    os.getenv("RUN_OLLAMA_INTEGRATION_TESTS", "false").lower() != "true",
    reason="RUN_OLLAMA_INTEGRATION_TESTS is not enabled",
)
async def test_live_ollama_cloud_integration():
    """Live integration test against Ollama Cloud (runs only when explicitly enabled)."""
    assert settings.api_key_str is not None, "OLLAMA_API_KEY must be set for live integration test"
    command = "Remind me to study DSA tomorrow at 6 PM for 2 hours."
    result = await parse_activity_command(user_text=command)
    assert result.title is not None
    assert result.category in ActivityCategory
    assert result.confidence >= 0.0
