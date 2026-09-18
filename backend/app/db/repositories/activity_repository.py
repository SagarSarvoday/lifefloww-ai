"""Activity database repository containing CRUD operations."""

from datetime import datetime, time
from typing import List, Optional, Tuple
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Activity
from app.schemas.activity import ActivityExtraction, ActivityUpdate


async def create_activity(
    session: AsyncSession,
    activity_in: ActivityExtraction,
) -> Activity:
    """
    Persist an extracted activity into the database.
    """
    recurrence_dict = None
    if activity_in.recurrence is not None:
        recurrence_dict = activity_in.recurrence.model_dump(mode="json")

    db_activity = Activity(
        title=activity_in.title,
        description=activity_in.description,
        category=activity_in.category.value,
        priority=activity_in.priority.value,
        status=activity_in.status.value,
        start_datetime=activity_in.start_datetime,
        due_datetime=activity_in.due_datetime,
        duration_minutes=activity_in.duration_minutes,
        recurrence=recurrence_dict,
        reminder_minutes_before=activity_in.reminder_minutes_before,
        confidence=activity_in.confidence,
        needs_clarification=activity_in.needs_clarification,
        clarification_question=activity_in.clarification_question,
    )

    session.add(db_activity)
    await session.flush()
    await session.refresh(db_activity)
    return db_activity


async def get_activity_by_id(
    session: AsyncSession,
    activity_id: UUID,
) -> Optional[Activity]:
    """Retrieve an activity by its UUID primary key."""
    query = select(Activity).where(Activity.id == activity_id)
    result = await session.execute(query)
    return result.scalar_one_or_none()


async def list_activities(
    session: AsyncSession,
    status: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    sort_by: str = "start_datetime",
    sort_order: str = "asc",
) -> Tuple[List[Activity], int]:
    """
    List activities with optional status/category filtering, pagination, and sorting.
    Returns (items, total_count).
    """
    base_query = select(Activity)

    if status is not None:
        base_query = base_query.where(Activity.status == status.upper())
    if category is not None:
        base_query = base_query.where(Activity.category == category.upper())

    # Count total matching records
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await session.execute(count_query)
    total = total_result.scalar_one()

    # Determine sort field
    sort_column = Activity.start_datetime
    if sort_by == "created_at":
        sort_column = Activity.created_at
    elif sort_by == "due_datetime":
        sort_column = Activity.due_datetime

    if sort_order.lower() == "desc":
        order_expr = desc(sort_column).nulls_last()
    else:
        order_expr = sort_column.asc().nulls_last()

    paged_query = base_query.order_by(order_expr).limit(limit).offset(offset)
    result = await session.execute(paged_query)
    items = list(result.scalars().all())

    return items, total


async def get_activities_for_today(
    session: AsyncSession,
    timezone_str: str,
) -> List[Activity]:
    """
    Retrieve all activities scheduled for the current day in the given timezone.
    Boundary spans from 00:00:00.000000 to 23:59:59.999999 local time.
    """
    tz = ZoneInfo(timezone_str)
    now = datetime.now(tz)

    start_of_today = datetime.combine(now.date(), time.min, tzinfo=tz)
    end_of_today = datetime.combine(now.date(), time.max, tzinfo=tz)

    query = (
        select(Activity)
        .where(
            Activity.start_datetime >= start_of_today,
            Activity.start_datetime <= end_of_today,
        )
        .order_by(Activity.start_datetime.asc())
    )

    result = await session.execute(query)
    return list(result.scalars().all())


async def update_activity(
    session: AsyncSession,
    activity_id: UUID,
    update_data: ActivityUpdate,
) -> Optional[Activity]:
    """
    Perform a partial update on an activity.
    """
    db_activity = await get_activity_by_id(session, activity_id)
    if db_activity is None:
        return None

    update_dict = update_data.model_dump(exclude_unset=True)

    for field, value in update_dict.items():
        if field == "category" and value is not None:
            setattr(db_activity, field, value.value if hasattr(value, "value") else str(value))
        elif field == "priority" and value is not None:
            setattr(db_activity, field, value.value if hasattr(value, "value") else str(value))
        elif field == "status" and value is not None:
            setattr(db_activity, field, value.value if hasattr(value, "value") else str(value))
        elif field == "recurrence":
            setattr(db_activity, field, value if isinstance(value, dict) or value is None else value.model_dump(mode="json"))
        else:
            setattr(db_activity, field, value)

    await session.flush()
    await session.refresh(db_activity)
    return db_activity


async def delete_activity(
    session: AsyncSession,
    activity_id: UUID,
) -> bool:
    """
    Delete an activity by its UUID. Returns True if deleted, False if not found.
    """
    db_activity = await get_activity_by_id(session, activity_id)
    if db_activity is None:
        return False

    await session.delete(db_activity)
    await session.flush()
    return True
