"""AI Parser Service for LifeFlow AI using Ollama Cloud."""

import json
import logging
import re
from datetime import datetime
from typing import Any, Dict, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx
import ollama
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.activity import ActivityExtraction

logger = logging.getLogger(__name__)


class AIParserError(Exception):
    """Base exception for AI parsing operations."""
    pass


class AIParserConfigError(AIParserError):
    """Raised when parser configuration (such as API key or model) is missing or invalid."""
    pass


class AIParserConnectionError(AIParserError):
    """Raised when connection to Ollama Cloud fails, times out, or is unavailable."""
    pass


class AIParserResponseError(AIParserError):
    """Raised when Ollama returns an invalid response or malformed JSON that cannot be parsed."""
    pass


class AIParserValidationError(AIParserError):
    """Raised when user input validation fails."""
    pass


def extract_json_object(raw_text: str) -> str:
    """Safely extract a JSON object from text, stripping markdown code blocks or surrounding text."""
    trimmed = raw_text.strip()
    # Remove markdown code fences if present (e.g. ```json ... ```)
    if trimmed.startswith("```"):
        trimmed = re.sub(r"^```(?:json)?\s*", "", trimmed, flags=re.IGNORECASE)
        trimmed = re.sub(r"\s*```$", "", trimmed)
        trimmed = trimmed.strip()

    # If the text still contains leading/trailing text outside the first { and last }, extract that span
    start_idx = trimmed.find("{")
    end_idx = trimmed.rfind("}")
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        return trimmed[start_idx : end_idx + 1]

    return trimmed


def build_system_prompt(current_datetime: datetime, timezone_str: str) -> str:
    """Construct the system prompt instructing the model to extract activity information."""
    formatted_dt = current_datetime.strftime("%Y-%m-%d %H:%M:%S")
    day_name = current_datetime.strftime("%A")

    return f"""You are the AI Activity Extraction Assistant for LifeFlow AI, a personal activity organizer.
Your sole job is to analyze the user's natural language command and extract structured activity information as a valid JSON object.

CURRENT REFERENCE INFORMATION:
- Current Datetime: {formatted_dt} ({day_name})
- ISO Datetime: {current_datetime.isoformat()}
- Timezone: {timezone_str}

REQUIRED JSON SCHEMA:
{{
  "title": "Concise activity title (string, required)",
  "description": "Optional details or context (string or null)",
  "category": "One of: STUDY, WORK, HEALTH, FITNESS, PERSONAL, SHOPPING, TRAVEL, APPOINTMENT, FINANCE, SOCIAL, OTHER",
  "priority": "One of: LOW, MEDIUM, HIGH, URGENT (estimate from urgency/importance words; default MEDIUM)",
  "status": "PENDING",
  "start_datetime": "ISO-8601 string with timezone offset (e.g. '2026-09-18T18:00:00+05:30') or null",
  "due_datetime": "ISO-8601 string with timezone offset or null (used when user specifies a deadline, e.g. 'by Sunday')",
  "duration_minutes": "Integer duration in minutes (e.g., 2 hours -> 120) or null",
  "recurrence": {{
    "frequency": "One of: NONE, DAILY, WEEKLY, MONTHLY, CUSTOM",
    "days_of_week": ["MONDAY", "WEDNESDAY", "FRIDAY"] or null,
    "interval": 1,
    "end_date": "YYYY-MM-DD or null"
  }} or null,
  "reminder_minutes_before": "Integer advance reminder in minutes or null",
  "confidence": 0.0 to 1.0 (float reflecting certainty of extraction),
  "needs_clarification": true or false,
  "clarification_question": "Specific question if required information is ambiguous or missing, otherwise null"
}}

CRITICAL RULES:
1. Return RAW JSON ONLY. Do NOT output markdown code blocks, backticks, or any conversational text.
2. NEVER invent dates or times. If the user does not provide a date or time, set the field to null.
3. RELATIVE TIME CALCULATIONS:
   - Use the Current Reference Datetime and Timezone provided above.
   - For example: "tomorrow at 6 PM" -> calculate tomorrow's date relative to {formatted_dt} at 18:00:00 with {timezone_str} offset.
   - "in 30 minutes" -> add 30 minutes to Current Datetime.
   - "next week" / "this weekend" / "Friday": calculate strictly against current day {day_name}.
4. AMBIGUITY HANDLING:
   - If the user provides a time without AM/PM (e.g. "meeting at 5") and context does not clearly imply morning or evening, set "needs_clarification": true and "clarification_question": "Did you mean 5:00 AM or 5:00 PM?".
   - If the user says "remind me to study tomorrow" without a specific time, set "needs_clarification": true and "clarification_question": "What time should I remind you tomorrow?".
   - If ambiguous, still populate whatever fields are certain (e.g., title, category).
5. RECURRENCE:
   - "every Monday, Wednesday and Friday at 7 AM" -> frequency: "WEEKLY", days_of_week: ["MONDAY", "WEDNESDAY", "FRIDAY"], interval: 1, start_datetime: next occurrence at 07:00:00.
6. Scope: This service only extracts activity information. Do not claim that reminders or calendar events were created.
"""


def get_current_datetime(timezone_str: str) -> datetime:
    """Get the current datetime in the specified timezone."""
    try:
        tz = ZoneInfo(timezone_str)
        return datetime.now(tz)
    except (ZoneInfoNotFoundError, ValueError):
        logger.warning("Invalid timezone '%s', falling back to UTC.", timezone_str)
        return datetime.now(ZoneInfo("UTC"))


async def parse_activity_command(
    user_text: str,
    current_datetime: Optional[datetime] = None,
    timezone_str: Optional[str] = None,
    client: Optional[ollama.AsyncClient] = None,
) -> ActivityExtraction:
    """
    Parse a natural-language activity command into structured ActivityExtraction using Ollama Cloud.

    Args:
        user_text: The natural language command string.
        current_datetime: Optional reference datetime; defaults to now in configured timezone.
        timezone_str: Optional IANA timezone string; defaults to APP_TIMEZONE setting.
        client: Optional pre-configured AsyncClient (primarily for testing and mocking).

    Returns:
        ActivityExtraction instance.

    Raises:
        AIParserValidationError: If user_text is empty or invalid.
        AIParserConfigError: If Ollama credentials or settings are not properly configured.
        AIParserConnectionError: If connection to Ollama fails or times out.
        AIParserResponseError: If Ollama returns malformed or invalid JSON after retrying.
    """
    if not user_text or not user_text.strip():
        raise AIParserValidationError("Input command text cannot be empty.")

    clean_text = user_text.strip()
    active_tz_str = timezone_str or settings.APP_TIMEZONE

    if current_datetime is None:
        ref_datetime = get_current_datetime(active_tz_str)
    else:
        if current_datetime.tzinfo is None:
            try:
                ref_datetime = current_datetime.replace(tzinfo=ZoneInfo(active_tz_str))
            except Exception:
                ref_datetime = current_datetime.replace(tzinfo=ZoneInfo("UTC"))
        else:
            ref_datetime = current_datetime

    # Setup Ollama client if not injected
    if client is None:
        api_key = settings.api_key_str
        if not api_key or api_key == "your_ollama_cloud_api_key":
            raise AIParserConfigError(
                "Ollama Cloud API key is not configured. Please set OLLAMA_API_KEY in backend/.env"
            )

        client = ollama.AsyncClient(
            host=settings.OLLAMA_HOST,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=settings.OLLAMA_TIMEOUT,
        )

    system_prompt = build_system_prompt(ref_datetime, active_tz_str)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": clean_text},
    ]

    raw_response_content = ""
    # First attempt
    try:
        logger.info("Sending parsing request to Ollama Cloud (model: %s)", settings.OLLAMA_MODEL)
        response = await client.chat(
            model=settings.OLLAMA_MODEL,
            messages=messages,
            format="json",
            options={"temperature": 0.1},
        )
        raw_response_content = response.message.content or ""
    except ollama.ResponseError as e:
        logger.error("Ollama API responded with an error (status: %s)", getattr(e, "status_code", "unknown"))
        if getattr(e, "status_code", None) in (401, 403):
            raise AIParserConfigError("Authentication failed with Ollama Cloud. Please verify your OLLAMA_API_KEY.") from e
        raise AIParserConnectionError("Ollama Cloud service error occurred.") from e
    except (httpx.TimeoutException, TimeoutError) as e:
        logger.error("Ollama request timed out after %s seconds", settings.OLLAMA_TIMEOUT)
        raise AIParserConnectionError("Request to Ollama Cloud timed out.") from e
    except (httpx.ConnectError, httpx.RequestError, ConnectionError) as e:
        logger.error("Failed to connect to Ollama host: %s", settings.OLLAMA_HOST)
        raise AIParserConnectionError("Failed to connect to Ollama Cloud service.") from e
    except Exception as e:
        logger.error("Unexpected error communicating with Ollama: %s", type(e).__name__)
        raise AIParserConnectionError("Unexpected error communicating with Ollama.") from e

    # Parse and validate JSON
    initial_error_msg = ""
    try:
        cleaned_json = extract_json_object(raw_response_content)
        return ActivityExtraction.model_validate_json(cleaned_json)
    except (json.JSONDecodeError, ValidationError) as initial_err:
        initial_error_msg = str(initial_err)
        logger.warning(
            "Initial JSON parsing or validation failed (%s). Retrying once with correction prompt.",
            type(initial_err).__name__,
        )

    # Retry attempt with error feedback
    retry_correction_msg = (
        "The previous response did not adhere to the required JSON schema or was malformed JSON.\n"
        f"Validation error details: {initial_error_msg}\n"
        "Please output ONLY the corrected JSON object matching the schema. Do not output anything else."
    )

    retry_messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": clean_text},
        {"role": "assistant", "content": raw_response_content},
        {"role": "user", "content": retry_correction_msg},
    ]

    try:
        logger.info("Sending retry request to Ollama Cloud")
        retry_response = await client.chat(
            model=settings.OLLAMA_MODEL,
            messages=retry_messages,
            format="json",
            options={"temperature": 0.0},
        )
        retry_raw_content = retry_response.message.content or ""
        retry_cleaned_json = extract_json_object(retry_raw_content)
        return ActivityExtraction.model_validate_json(retry_cleaned_json)
    except (json.JSONDecodeError, ValidationError) as retry_err:
        logger.error("Retry parsing failed: %s", str(retry_err))
        raise AIParserResponseError(
            "AI response was malformed or failed validation after retry."
        ) from retry_err
    except Exception as e:
        logger.error("Error during parser retry: %s", type(e).__name__)
        raise AIParserConnectionError("Error during retry communication with Ollama.") from e
