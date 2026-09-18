"""API routes for activity parsing, management, and health check."""

import logging
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.database import DatabaseNotConfiguredError, check_db_connection, get_db
from app.db.repositories import activity_repository
from app.schemas.activity import (
    ActivityCategory,
    ActivityCreateResponse,
    ActivityDeleteResponse,
    ActivityListResponse,
    ActivityParseRequest,
    ActivityParseResponse,
    ActivityRead,
    ActivitySingleResponse,
    ActivityStatus,
    ActivityUpdate,
    HealthResponse,
)
from app.services.ai_parser import (
    AIParserConfigError,
    AIParserConnectionError,
    AIParserResponseError,
    AIParserValidationError,
    parse_activity_command,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["activities"])


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Service health check",
)
async def health_check() -> HealthResponse:
    """Return health status of API and database connection."""
    db_health = await check_db_connection()
    return HealthResponse(
        status="ok",
        database=db_health.get("status", "unconfigured"),
    )


@router.post(
    "/activities/parse",
    response_model=ActivityParseResponse,
    status_code=status.HTTP_200_OK,
    summary="Parse natural language activity input (in-memory, text only)",
)
async def parse_activity(payload: ActivityParseRequest) -> ActivityParseResponse:
    """
    Parse a user's natural language command and return structured activity information.
    Does NOT save activity to database.
    """
    try:
        extraction = await parse_activity_command(user_text=payload.text)
        return ActivityParseResponse(
            success=True,
            data=extraction,
            error=None,
        )
    except AIParserValidationError as e:
        logger.warning("Validation error on parse request: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except AIParserConfigError as e:
        logger.error("AI parser configuration error: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except AIParserConnectionError as e:
        logger.error("AI parser connection error: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        )
    except AIParserResponseError as e:
        logger.error("AI parser response error: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to extract structured activity from AI response.",
        )
    except Exception as e:
        logger.exception("Unhandled server error processing activity parse request")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal server error occurred while processing the request.",
        )


@router.post(
    "/activities",
    response_model=ActivityCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Parse and persist an activity to Supabase",
)
async def create_activity_from_text(
    payload: ActivityParseRequest,
    db: AsyncSession = Depends(get_db),
) -> ActivityCreateResponse:
    """
    Parse natural language text using Ollama Cloud and persist the resulting activity to Supabase.
    If parsing fails, no record is saved.
    """
    # 1. Parse via Ollama Cloud
    try:
        extraction = await parse_activity_command(user_text=payload.text)
    except AIParserValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except AIParserConfigError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except (AIParserConnectionError, AIParserResponseError) as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    # 2. Persist to Supabase PostgreSQL
    try:
        saved = await activity_repository.create_activity(db, extraction)
        return ActivityCreateResponse(
            success=True,
            data=ActivityRead.model_validate(saved),
            error=None,
        )
    except DatabaseNotConfiguredError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.exception("Failed to persist activity to database: %s", type(e).__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while persisting activity.",
        )


@router.get(
    "/activities",
    response_model=ActivityListResponse,
    status_code=status.HTTP_200_OK,
    summary="List activities with filtering, sorting, and pagination",
)
async def list_activities(
    status_filter: Optional[ActivityStatus] = Query(None, alias="status"),
    category_filter: Optional[ActivityCategory] = Query(None, alias="category"),
    limit: int = Query(20, ge=1, le=100, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    sort_by: str = Query("start_datetime", pattern="^(start_datetime|created_at|due_datetime)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
) -> ActivityListResponse:
    """Retrieve paginated activities with optional filters and sorting."""
    try:
        items, total = await activity_repository.list_activities(
            session=db,
            status=status_filter.value if status_filter else None,
            category=category_filter.value if category_filter else None,
            limit=limit,
            offset=offset,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        return ActivityListResponse(
            success=True,
            data=[ActivityRead.model_validate(item) for item in items],
            total=total,
            limit=limit,
            offset=offset,
        )
    except DatabaseNotConfiguredError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.exception("Error listing activities: %s", type(e).__name__)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve activities.")


@router.get(
    "/activities/today",
    response_model=ActivityListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get activities scheduled for today in configured timezone",
)
async def get_today_activities(
    db: AsyncSession = Depends(get_db),
) -> ActivityListResponse:
    """Retrieve all activities starting today within APP_TIMEZONE boundaries."""
    try:
        items = await activity_repository.get_activities_for_today(
            session=db,
            timezone_str=settings.APP_TIMEZONE,
        )
        return ActivityListResponse(
            success=True,
            data=[ActivityRead.model_validate(item) for item in items],
            total=len(items),
            limit=len(items),
            offset=0,
        )
    except DatabaseNotConfiguredError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.exception("Error retrieving today's activities: %s", type(e).__name__)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve today's activities.")


@router.get(
    "/activities/{activity_id}",
    response_model=ActivitySingleResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a single activity by UUID",
)
async def get_activity(
    activity_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> ActivitySingleResponse:
    """Retrieve an activity by UUID."""
    try:
        activity = await activity_repository.get_activity_by_id(db, activity_id)
        if not activity:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
        return ActivitySingleResponse(
            success=True,
            data=ActivityRead.model_validate(activity),
            error=None,
        )
    except HTTPException:
        raise
    except DatabaseNotConfiguredError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.exception("Error retrieving activity %s: %s", activity_id, type(e).__name__)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve activity.")


@router.patch(
    "/activities/{activity_id}",
    response_model=ActivitySingleResponse,
    status_code=status.HTTP_200_OK,
    summary="Update an existing activity",
)
async def update_activity(
    activity_id: UUID,
    payload: ActivityUpdate,
    db: AsyncSession = Depends(get_db),
) -> ActivitySingleResponse:
    """Perform a partial update on an existing activity."""
    try:
        updated = await activity_repository.update_activity(db, activity_id, payload)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
        return ActivitySingleResponse(
            success=True,
            data=ActivityRead.model_validate(updated),
            error=None,
        )
    except HTTPException:
        raise
    except DatabaseNotConfiguredError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.exception("Error updating activity %s: %s", activity_id, type(e).__name__)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update activity.")


@router.delete(
    "/activities/{activity_id}",
    response_model=ActivityDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete an activity",
)
async def delete_activity(
    activity_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> ActivityDeleteResponse:
    """Delete an activity by UUID."""
    try:
        deleted = await activity_repository.delete_activity(db, activity_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
        return ActivityDeleteResponse(success=True, message="Activity deleted successfully")
    except HTTPException:
        raise
    except DatabaseNotConfiguredError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.exception("Error deleting activity %s: %s", activity_id, type(e).__name__)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete activity.")
