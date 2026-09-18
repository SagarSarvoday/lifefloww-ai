"""Tests for database models, repository CRUD, transaction safety, and API endpoints."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.db.database import get_db
from app.db.models import Activity
from app.db.repositories import activity_repository
from app.main import app
from app.schemas.activity import (
    ActivityCategory,
    ActivityExtraction,
    ActivityPriority,
    ActivityStatus,
    ActivityUpdate,
    RecurrenceFrequency,
    RecurrenceRule,
)


# ---------------------------------------------------------------------------
# Repository Unit Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_activity_repository():
    """Verify repository creation maps all fields and serializes recurrence to JSON/dict."""
    start_dt = datetime(2026, 9, 18, 18, 0, 0, tzinfo=timezone.utc)
    extraction = ActivityExtraction(
        title="Study DSA",
        description="Solve graph algorithms",
        category=ActivityCategory.STUDY,
        priority=ActivityPriority.HIGH,
        status=ActivityStatus.PENDING,
        start_datetime=start_dt,
        duration_minutes=120,
        recurrence=RecurrenceRule(
            frequency=RecurrenceFrequency.WEEKLY,
            days_of_week=["MONDAY", "WEDNESDAY"],
            interval=1,
        ),
        reminder_minutes_before=15,
        confidence=0.95,
    )

    mock_session = MagicMock()
    mock_session.add = MagicMock()
    mock_session.flush = AsyncMock()
    mock_session.refresh = AsyncMock()

    activity = await activity_repository.create_activity(mock_session, extraction)

    assert activity.title == "Study DSA"
    assert activity.category == "STUDY"
    assert activity.priority == "HIGH"
    assert activity.status == "PENDING"
    assert activity.duration_minutes == 120
    assert activity.recurrence == {
        "frequency": "WEEKLY",
        "days_of_week": ["MONDAY", "WEDNESDAY"],
        "interval": 1,
        "end_date": None,
    }
    mock_session.add.assert_called_once_with(activity)
    mock_session.flush.assert_awaited_once()
    mock_session.refresh.assert_awaited_once_with(activity)


@pytest.mark.asyncio
async def test_get_activity_by_id_repository():
    """Verify get_activity_by_id executes select query with target UUID."""
    test_id = uuid.uuid4()
    mock_activity = Activity(id=test_id, title="Dentist Appointment", category="HEALTH")

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_activity

    mock_session = MagicMock()
    mock_session.execute = AsyncMock(return_value=mock_result)

    result = await activity_repository.get_activity_by_id(mock_session, test_id)
    assert result == mock_activity
    mock_session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_list_activities_repository():
    """Verify list_activities constructs filtering and pagination correctly."""
    mock_items = [
        Activity(id=uuid.uuid4(), title="Task 1", category="WORK", status="PENDING"),
        Activity(id=uuid.uuid4(), title="Task 2", category="WORK", status="PENDING"),
    ]

    mock_count_result = MagicMock()
    mock_count_result.scalar_one.return_value = 2

    mock_items_result = MagicMock()
    mock_items_result.scalars.return_value.all.return_value = mock_items

    mock_session = MagicMock()
    mock_session.execute = AsyncMock(side_effect=[mock_count_result, mock_items_result])

    items, total = await activity_repository.list_activities(
        session=mock_session,
        status="PENDING",
        category="WORK",
        limit=10,
        offset=0,
        sort_by="created_at",
        sort_order="desc",
    )

    assert total == 2
    assert len(items) == 2
    assert mock_session.execute.await_count == 2


@pytest.mark.asyncio
async def test_update_activity_repository():
    """Verify update_activity applies partial changes and refreshes."""
    test_id = uuid.uuid4()
    existing = Activity(
        id=test_id,
        title="Old Title",
        category="OTHER",
        priority="LOW",
        status="PENDING",
    )

    with patch("app.db.repositories.activity_repository.get_activity_by_id", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = existing
        mock_session = MagicMock()
        mock_session.flush = AsyncMock()
        mock_session.refresh = AsyncMock()

        update_payload = ActivityUpdate(
            title="New Title",
            priority=ActivityPriority.URGENT,
            status=ActivityStatus.COMPLETED,
        )

        updated = await activity_repository.update_activity(mock_session, test_id, update_payload)

        assert updated is not None
        assert updated.title == "New Title"
        assert updated.priority == "URGENT"
        assert updated.status == "COMPLETED"
        mock_session.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_activity_repository():
    """Verify delete_activity deletes existing activity and returns True, or False if missing."""
    test_id = uuid.uuid4()
    existing = Activity(id=test_id, title="To Delete")

    with patch("app.db.repositories.activity_repository.get_activity_by_id", new_callable=AsyncMock) as mock_get:
        # Case 1: found and deleted
        mock_get.return_value = existing
        mock_session = MagicMock()
        mock_session.delete = AsyncMock()
        mock_session.flush = AsyncMock()

        deleted = await activity_repository.delete_activity(mock_session, test_id)
        assert deleted is True
        mock_session.delete.assert_awaited_once_with(existing)

        # Case 2: not found
        mock_get.return_value = None
        deleted_none = await activity_repository.delete_activity(mock_session, uuid.uuid4())
        assert deleted_none is False


@pytest.mark.asyncio
async def test_get_activities_for_today_timezone():
    """Verify get_activities_for_today queries timezone-aware boundaries."""
    mock_items = [Activity(id=uuid.uuid4(), title="Morning Standup")]
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = mock_items

    mock_session = MagicMock()
    mock_session.execute = AsyncMock(return_value=mock_result)

    items = await activity_repository.get_activities_for_today(mock_session, "Asia/Kolkata")
    assert len(items) == 1
    mock_session.execute.assert_awaited_once()


# ---------------------------------------------------------------------------
# Database Safety & Transaction Rollback Test
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_database_rollback_on_exception():
    """Verify that get_db rolls back the transaction when an exception is raised."""
    mock_session = AsyncMock()
    mock_session.commit = AsyncMock()
    mock_session.rollback = AsyncMock()

    mock_factory = MagicMock()
    mock_factory.return_value.__aenter__.return_value = mock_session
    mock_factory.return_value.__aexit__.return_value = None

    with patch("app.db.database.async_session_factory", return_value=mock_factory):
        db_gen = get_db()
        session = await anext(db_gen)
        assert session == mock_session

        # Simulate exception during execution
        with pytest.raises(RuntimeError):
            try:
                raise RuntimeError("Simulated failure during DB work")
            except RuntimeError:
                await db_gen.athrow(RuntimeError("Simulated failure during DB work"))

        mock_session.rollback.assert_awaited_once()
        mock_session.commit.assert_not_awaited()


# ---------------------------------------------------------------------------
# API Endpoints Integration Tests (with mocked DB session & parser)
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_db_session():
    """Fixture providing a mock AsyncSession."""
    session = AsyncMock()
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.refresh = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    return session


@pytest.mark.asyncio
async def test_api_post_activity_creates_and_persists(mock_db_session):
    """POST /api/v1/activities parses text and persists to DB returning 201."""
    parsed_extraction = ActivityExtraction(
        title="Study DSA",
        category=ActivityCategory.STUDY,
        priority=ActivityPriority.HIGH,
        duration_minutes=120,
    )

    created_db_record = Activity(
        id=uuid.uuid4(),
        title="Study DSA",
        category="STUDY",
        priority="HIGH",
        status="PENDING",
        duration_minutes=120,
        confidence=1.0,
        needs_clarification=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    app.dependency_overrides[get_db] = lambda: mock_db_session
    try:
        with patch("app.routes.activities.parse_activity_command", new_callable=AsyncMock) as mock_parse, \
             patch("app.routes.activities.activity_repository.create_activity", new_callable=AsyncMock) as mock_create:

            mock_parse.return_value = parsed_extraction
            mock_create.return_value = created_db_record

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.post(
                    "/api/v1/activities",
                    json={"text": "Remind me to study DSA tomorrow at 6 PM for 2 hours."},
                )

                assert resp.status_code == 201
                body = resp.json()
                assert body["success"] is True
                assert body["data"]["title"] == "Study DSA"
                assert body["data"]["id"] == str(created_db_record.id)
                assert body["data"]["duration_minutes"] == 120
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_api_get_activities_list(mock_db_session):
    """GET /api/v1/activities returns paginated list."""
    test_id = uuid.uuid4()
    records = [
        Activity(
            id=test_id,
            title="Meeting with doctor",
            category="HEALTH",
            priority="MEDIUM",
            status="PENDING",
            confidence=1.0,
            needs_clarification=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
    ]

    app.dependency_overrides[get_db] = lambda: mock_db_session
    try:
        with patch("app.routes.activities.activity_repository.list_activities", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = (records, 1)

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get("/api/v1/activities?status=PENDING&category=HEALTH&limit=10&offset=0")
                assert resp.status_code == 200
                body = resp.json()
                assert body["success"] is True
                assert body["total"] == 1
                assert len(body["data"]) == 1
                assert body["data"][0]["id"] == str(test_id)
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_api_get_activity_by_id(mock_db_session):
    """GET /api/v1/activities/{id} returns single activity or 404."""
    test_id = uuid.uuid4()
    record = Activity(
        id=test_id,
        title="Dentist",
        category="APPOINTMENT",
        priority="MEDIUM",
        status="PENDING",
        confidence=1.0,
        needs_clarification=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    app.dependency_overrides[get_db] = lambda: mock_db_session
    try:
        with patch("app.routes.activities.activity_repository.get_activity_by_id", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = record

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                # Success
                resp = await client.get(f"/api/v1/activities/{test_id}")
                assert resp.status_code == 200
                assert resp.json()["data"]["title"] == "Dentist"

                # 404 Not Found
                mock_get.return_value = None
                resp_404 = await client.get(f"/api/v1/activities/{uuid.uuid4()}")
                assert resp_404.status_code == 404
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_api_patch_activity(mock_db_session):
    """PATCH /api/v1/activities/{id} updates fields and returns updated record."""
    test_id = uuid.uuid4()
    updated_record = Activity(
        id=test_id,
        title="Updated Title",
        category="STUDY",
        priority="URGENT",
        status="COMPLETED",
        confidence=1.0,
        needs_clarification=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    app.dependency_overrides[get_db] = lambda: mock_db_session
    try:
        with patch("app.routes.activities.activity_repository.update_activity", new_callable=AsyncMock) as mock_update:
            mock_update.return_value = updated_record

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.patch(
                    f"/api/v1/activities/{test_id}",
                    json={"title": "Updated Title", "priority": "URGENT", "status": "COMPLETED"},
                )
                assert resp.status_code == 200
                body = resp.json()
                assert body["data"]["title"] == "Updated Title"
                assert body["data"]["priority"] == "URGENT"
                assert body["data"]["status"] == "COMPLETED"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_api_delete_activity(mock_db_session):
    """DELETE /api/v1/activities/{id} deletes record or returns 404."""
    test_id = uuid.uuid4()
    app.dependency_overrides[get_db] = lambda: mock_db_session
    try:
        with patch("app.routes.activities.activity_repository.delete_activity", new_callable=AsyncMock) as mock_del:
            mock_del.return_value = True

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                # 200 OK on deletion
                resp = await client.delete(f"/api/v1/activities/{test_id}")
                assert resp.status_code == 200
                assert resp.json()["success"] is True

                # 404 when not found
                mock_del.return_value = False
                resp_404 = await client.delete(f"/api/v1/activities/{uuid.uuid4()}")
                assert resp_404.status_code == 404
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_api_get_today_activities(mock_db_session):
    """GET /api/v1/activities/today returns list of activities for today."""
    records = [
        Activity(
            id=uuid.uuid4(),
            title="Gym at 7 AM",
            category="FITNESS",
            priority="MEDIUM",
            status="PENDING",
            confidence=1.0,
            needs_clarification=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
    ]

    app.dependency_overrides[get_db] = lambda: mock_db_session
    try:
        with patch("app.routes.activities.activity_repository.get_activities_for_today", new_callable=AsyncMock) as mock_today:
            mock_today.return_value = records

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                resp = await client.get("/api/v1/activities/today")
                assert resp.status_code == 200
                body = resp.json()
                assert body["success"] is True
                assert body["total"] == 1
                assert body["data"][0]["title"] == "Gym at 7 AM"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_api_invalid_uuid_returns_422(mock_db_session):
    """Verify that passing an invalid UUID string to endpoints returns 422."""
    app.dependency_overrides[get_db] = lambda: mock_db_session
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/activities/not-a-valid-uuid")
            assert resp.status_code == 422
    finally:
        app.dependency_overrides.pop(get_db, None)
