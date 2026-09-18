# LifeFlow AI - Backend

LifeFlow AI is a personal AI activity organizer backend that extracts structured activities from natural-language user commands and persists them in Supabase PostgreSQL.

---

## 1. Project Overview

LifeFlow AI provides:
- **Natural Language Parsing**: Analyzes conversational scheduling requests using Ollama Cloud (e.g. `gpt-oss:20b`), extracting titles, categories, priorities, durations, recurrence rules, and dates/times.
- **Ambiguity Detection**: Flags unclear inputs (`needs_clarification = True`) and asks targeted follow-up questions.
- **Supabase PostgreSQL Persistence**: Uses async SQLAlchemy 2.x and `psycopg` (v3) to store activities with timezone-aware datetimes, UUID keys, and JSONB recurrence rules.
- **Alembic Database Migrations**: Version-controlled migrations for PostgreSQL schemas.
- **RESTful Activity API**: CRUD endpoints for parsing, creating, listing, filtering by status/category, today-view filtering, updating, and deleting activities.

---

## 2. Requirements

- **macOS** / Linux / Windows
- **Python**: 3.10+ (tested on Python 3.14.0)
- **Ollama Cloud Account**: API key from [ollama.com](https://ollama.com)
- **Supabase Account**: A PostgreSQL database project from [supabase.com](https://supabase.com)

---

## 3. Virtual Environment Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

---

## 4. Package Installation

```bash
pip install -r requirements.txt
```

Core dependencies:
- `fastapi`: Modern async web API framework
- `uvicorn[standard]`: High-performance ASGI web server
- `sqlalchemy`: Object-relational mapping (SQLAlchemy 2.x)
- `psycopg[binary]`: Next-generation async PostgreSQL driver
- `alembic`: Database migrations manager
- `ollama`: Official Python SDK for Ollama
- `pydantic` & `pydantic-settings`: Type safety and config management
- `pytest` & `httpx`: Automated testing suite

---

## 5. Supabase Database Configuration

### Step-by-Step Connection Guide

1. Sign in to your [Supabase Dashboard](https://supabase.com/dashboard) and open your project.
2. In the top navigation or project home, click **Connect** (or go to **Project Settings** -> **Database**).
3. Under the **Connection string** section, select:
   - **Method**: Select **Session pooler** (recommended for local development and IPv4 compatibility).
   - **Type**: URI (`postgresql://...`)
   - **Port**: `5432` (Session mode supports prepared statements and dedicated sessions).
4. Copy the connection string. It will look like:
   ```
   postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require
   ```
5. **Handle Special Characters**: If your database password contains characters such as `@`, `:`, `#`, `%`, or `/`, ensure they are URL-encoded (e.g. `@` becomes `%40`).
6. Add this value to your `backend/.env` file:
   ```ini
   DATABASE_URL=postgresql://postgres.yourprojectref:your_password@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
   ```

### Direct vs. Session vs. Transaction Pooler
- **Session Pooler (Port 5432 - Recommended)**: Provides full session-level PostgreSQL functionality over IPv4, fully supporting SQLAlchemy's prepared statements and schema migrations.
- **Transaction Pooler (Port 6543)**: Best for serverless scale (AWS Lambda / Vercel), but does not support prepared statements across transactions.
- **Direct Connection (Port 5432)**: Direct connection to `db.[project-ref].supabase.co:5432` (requires an IPv6 network or Supabase IPv4 addon).

---

## 6. Running Alembic Database Migrations

Before starting the server with a configured database, apply migrations:

```bash
# Check current migration head
alembic -c alembic.ini heads

# Apply all pending migrations to Supabase
alembic -c alembic.ini upgrade head

# Check current database revision
alembic -c alembic.ini current

# Downgrade one revision if needed
alembic -c alembic.ini downgrade -1
```

---

## 7. Starting the Backend Server

```bash
# Start backend on http://127.0.0.1:8000
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Interactive API documentation:
- Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 8. API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Health check (reports API and database status) |
| `POST` | `/api/v1/activities/parse` | Natural language parsing only (in-memory, no persistence) |
| `POST` | `/api/v1/activities` | Parse natural language AND persist activity to Supabase |
| `GET` | `/api/v1/activities` | List activities (filters: `status`, `category`, pagination, sorting) |
| `GET` | `/api/v1/activities/today` | Activities starting today in `APP_TIMEZONE` |
| `GET` | `/api/v1/activities/{id}` | Get single activity by UUID |
| `PATCH` | `/api/v1/activities/{id}` | Update activity fields (partial update) |
| `DELETE` | `/api/v1/activities/{id}` | Delete activity by UUID |

---

## 9. Example curl Requests

### 1. Health Check
```bash
curl -s http://127.0.0.1:8000/api/v1/health
```

### 2. Parse Only (No Persistence)
```bash
curl -X POST http://127.0.0.1:8000/api/v1/activities/parse \
  -H "Content-Type: application/json" \
  -d '{"text":"Remind me to study DSA tomorrow at 6 PM for 2 hours."}'
```

### 3. Parse and Save to Supabase
```bash
curl -X POST http://127.0.0.1:8000/api/v1/activities \
  -H "Content-Type: application/json" \
  -d '{"text":"Remind me to study DSA tomorrow at 6 PM for 2 hours."}'
```

### 4. List Activities (with Filtering & Pagination)
```bash
curl -s "http://127.0.0.1:8000/api/v1/activities?status=PENDING&category=STUDY&limit=10&offset=0"
```

### 5. Get Activities for Today
```bash
curl -s http://127.0.0.1:8000/api/v1/activities/today
```

### 6. Get Activity by UUID
```bash
curl -s http://127.0.0.1:8000/api/v1/activities/<ACTIVITY_UUID>
```

### 7. Update Activity
```bash
curl -X PATCH http://127.0.0.1:8000/api/v1/activities/<ACTIVITY_UUID> \
  -H "Content-Type: application/json" \
  -d '{"status":"COMPLETED","priority":"URGENT"}'
```

### 8. Delete Activity
```bash
curl -X DELETE http://127.0.0.1:8000/api/v1/activities/<ACTIVITY_UUID>
```

---

## 10. Automated Tests

```bash
# Run all unit and contract tests (37 tests):
PYTHONPATH=. pytest -v tests

# Run database tests specifically:
PYTHONPATH=. pytest -v tests/test_activity_db.py

# Run live Ollama integration test (requires live API key in .env):
RUN_OLLAMA_INTEGRATION_TESTS=true PYTHONPATH=. pytest -v tests/test_activity_parser.py -k test_live_ollama_cloud_integration
```

---

## 11. Database Schema Design Note: Why JSONB for Recurrence?

PostgreSQL's `JSONB` format is selected for recurrence data because:
1. **Decomposed Binary Storage**: JSONB is stored in a decomposed binary format, allowing fast indexing and key lookups without string parsing.
2. **Schema Flexibility**: Custom recurrence patterns (`days_of_week: ["MONDAY", "WEDNESDAY"]`, `interval: 2`, `end_date: "2026-12-31"`) vary greatly across recurring tasks. JSONB naturally maps to Pydantic's `RecurrenceRule` model without needing 2-3 extra relational join tables.
3. **Indexability**: If needed, PostgreSQL GIN indexes can be created directly on the JSONB column for querying specific recurrence frequencies or days.
