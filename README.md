# LifeFlow AI

LifeFlow AI is a cross-platform personal AI activity organizer designed to turn natural-language thoughts into structured, actionable schedules stored securely in Supabase PostgreSQL, accessible via a high-performance FastAPI backend and an installable Next.js Progressive Web App (PWA) with voice input support.

## Project Vision

Users can speak or type natural language commands such as:
- *"Remind me to study DSA tomorrow at 6 PM for 2 hours."*
- *"I have a dentist appointment on Friday at 10 AM."*
- *"Add gym every Monday, Wednesday and Friday at 7 AM."*
- *"Remind me to submit my assignment next week."*
- *"Schedule cricket practice today at 5 PM."*
- *"I need to finish my project by Sunday."*
- *"Remind me to call mom in 30 minutes."*

LifeFlow AI parses each sentence using Ollama Cloud, extracts structured activity objects, checks for ambiguities, presents a preview for user confirmation, and persists records in Supabase PostgreSQL.

---

## Architecture & Features

```
lifeflow-ai/
├── backend/                  # FastAPI Python backend
│   ├── alembic/              # Database migration scripts
│   ├── app/                  # Application core, db, schemas, services, routes
│   ├── tests/                # Pytest unit & integration test suite (38 tests)
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example          # Backend environment template
│   └── README.md             # Backend documentation
├── frontend/                 # Next.js 15 TypeScript PWA dashboard
│   ├── public/               # Manifest, icons (192, 512, maskable, apple-touch), sw.js
│   ├── src/
│   │   ├── app/              # Next.js App Router pages (Dashboard, Today, Activities, Settings)
│   │   ├── components/       # Voice button, PWA install prompt, cards, modals
│   │   ├── hooks/            # useSpeechRecognition Web Speech API hook
│   │   ├── lib/              # Centralized API client & utility functions
│   │   └── types/            # TypeScript schema interfaces matching backend
│   ├── .env.local.example    # Frontend environment template
│   ├── package.json          # Frontend dependencies (Next.js 15, React 19, Tailwind)
│   └── README.md             # Detailed PWA & Voice documentation
├── .gitignore
└── README.md
```

### Highlights
- **🎙️ Voice-to-Schedule**: Real-time voice recognition with interim preview, error handling, editing, and preview confirmation.
- **📱 Progressive Web App**: Fully installable on Android, iOS Safari, Chrome, and Edge with standalone display mode.
- **🛡️ Secure Boundary**: Zero client exposure of backend credentials; Service Worker explicitly bypasses caching sensitive `/api/v1/` activity requests.
- **⚡ Real Supabase Integration**: Alembic-migrated PostgreSQL schema with timezone awareness (`Asia/Kolkata`).

---

## Quickstart

### 1. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set OLLAMA_API_KEY and DATABASE_URL in backend/.env
alembic -c alembic.ini upgrade head
uvicorn app.main:app --port 8000 --reload
```

### 2. Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run build
npm run start
```
Open [http://localhost:3000](http://localhost:3000) to view the LifeFlow AI dashboard.

---

## Automated Tests

```bash
# Frontend typecheck & lint
cd frontend && npm run typecheck && npm run lint

# Backend pytest suite (38 tests)
cd backend && RUN_OLLAMA_INTEGRATION_TESTS=true pytest -v tests
```
