# LifeFlow AI — Frontend Dashboard & Progressive Web App (PWA)

A modern, responsive Next.js web dashboard and installable Progressive Web App (PWA) for **LifeFlow AI**, allowing users to manage schedules and activities through natural language typing or real-time voice speech, powered by Ollama Cloud and persisted in Supabase PostgreSQL.

---

## 🌟 Key Features

### 🎙️ Voice-Based Activity Creation
- **Web Speech API Integration**: Speak naturally (e.g., *"Remind me to study DSA tomorrow at 6 PM for two hours"*).
- **Interim Speech Feedback**: Visual streaming feedback as words are spoken.
- **Resilient State Management**: Explicit idle, active listening (`[🔴 Listening... Stop]`), error recovery, and permission handling.
- **Editable Before Submitting**: Spoken text populates the natural language prompt; users can freely edit, append, or correct text before triggering AI parsing.
- **No Automatic Saves**: AI extractions always pass through a structured preview card (`POST /activities/parse`) before explicit confirmation (`POST /activities`) persists anything to Supabase.
- **Accessibility**: Includes `aria-labels`, min 44x44px touch targets, and visual keyboard-accessible indicators.

### 📱 Progressive Web App (PWA)
- **Installable**: Full Web App Manifest (`manifest.json`) supporting standalone display mode on Android, Chrome, Edge, and iOS Safari.
- **Custom Crisp Icons**: Authentic 192x192, 512x512, maskable icons, Apple touch icons (180x180), and favicons.
- **Service Worker (`/sw.js`)**: Caches critical UI shells and static assets for fast loading. **Explicitly bypasses and never caches sensitive `/api/v1/*` database requests**.
- **Smart Install UX**:
  - Automatically captures `beforeinstallprompt` on Chromium browsers to show a non-intrusive install prompt.
  - Detects iOS devices and shows native "Share → Add to Home Screen" instructions.
  - Automatically suppresses prompts if already running in standalone mode or recently dismissed.

### ⚡ Activity Management
- **Today's Schedule (`/today`)**: Activities scheduled or due today in your timezone (`Asia/Kolkata`).
- **All Activities (`/activities`)**: Filter by category (`STUDY`, `WORK`, `HEALTH`, `FITNESS`, etc.) or status (`PENDING`, `COMPLETED`, `CANCELLED`), real-time search, sorting, and pagination.
- **System Settings (`/settings`)**: Live health status monitoring the FastAPI backend gateway and Supabase PostgreSQL connection pool.

---

## 🌐 Browser Compatibility for Voice Input

| Browser / Platform | Voice Input Support | Notes |
| :--- | :--- | :--- |
| **Google Chrome (Desktop & Android)** | ✅ Supported | Uses Google Speech Services. Fast and accurate. Requires microphone permission. |
| **Microsoft Edge (Desktop & Android)** | ✅ Supported | Native support via Chromium engine. |
| **Apple Safari (iOS & macOS)** | ✅ Supported | Native speech recognition (`webkitSpeechRecognition`). Requires user speech permission. |
| **Mozilla Firefox** | ⚠️ Limited / Disabled by default | Web Speech API is experimental behind `media.webspeech.recognition.enable`. Gracefully shows "Voice unsupported" button with full typing capability. |
| **In-App WebViews (Instagram, etc.)** | ⚠️ Restricted | Often blocks microphone permissions. Standard typing fallback is always active. |

> [!NOTE]
> Speech recognition requires an active internet connection and access to a working microphone. If microphone access is denied, a helpful message prompts the user to check browser permissions.

---

## 📲 PWA Installation Instructions

### Android (Chrome / Edge)
1. Open LifeFlow AI in Google Chrome or Microsoft Edge.
2. An **"Install LifeFlow AI"** banner will appear at the bottom right.
3. Click **"Install App"** (or tap the 3-dots browser menu and select **"Add to Home Screen"** / **"Install app"**).
4. LifeFlow AI will install as a standalone app with its own app icon and splash screen.

### iOS / iPadOS (Safari)
1. Open LifeFlow AI in **Safari**.
2. Tap the **Share** button (the square with an arrow pointing up at the bottom of the screen).
3. Scroll down and tap **"Add to Home Screen"**.
4. Confirm by tapping **"Add"** in the upper right.
5. LifeFlow AI launches in full-screen standalone mode without Safari browser chrome.

---

## 🧪 Network Configuration & Local Mobile Testing

### 1. Local Desktop Testing
Default setup runs on localhost:
- Backend: `http://127.0.0.1:8000/api/v1`
- Frontend: `http://localhost:3000`

### 2. Mobile Testing over Wi-Fi Network
To test on a physical smartphone connected to the same Wi-Fi:
1. Find your host machine's local IP address (e.g. `192.168.1.50`):
   ```bash
   ipconfig getifaddr en0   # macOS
   hostname -I             # Linux
   ```
2. Start the backend bound to `0.0.0.0`:
   ```bash
   uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
   ```
3. Update `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://192.168.1.50:8000/api/v1
   ```
4. Start the frontend:
   ```bash
   npm run dev -- -H 0.0.0.0 -p 3000
   ```

> [!IMPORTANT]
> **HTTPS Security Requirement**:
> Modern mobile browsers (especially Chrome and Safari) **disable both the Web Speech API and Service Workers on unencrypted HTTP connections** (except on `localhost`).
> To test voice recognition or PWA installation from a physical mobile device over local Wi-Fi, you must either:
> 1. Use an HTTPS reverse proxy (e.g., `ngrok http 3000` or `cloudflared tunnel`).
> 2. Or connect your Android phone via USB and enable **Chrome Port Forwarding** (`chrome://inspect`) mapping `localhost:3000 -> localhost:3000`.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
```bash
cp .env.local.example .env.local
```
Inside `.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

### 3. Run Checks & Build
```bash
npm run lint
npm run typecheck
npm run build
npm run start
```
