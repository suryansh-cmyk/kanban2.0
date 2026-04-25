# Implementation Plan (Detailed)

This plan expands the high-level roadmap into practical, reviewable phases with:

- clear scope boundaries,
- checklists to track progress,
- practical test expectations,
- explicit success criteria for sign-off.

## Working Principles

- Keep the MVP simple and avoid extra features.
- Prefer root-cause-driven fixes over speculative patches.
- Keep docs concise and current as each phase lands.
- Validate each phase before starting the next.

---

## Part 1 - Planning and alignment ✅

### Scope

Produce approved planning artifacts before implementation.

### Checklist

- [x] Confirm this plan with the user.
- [x] Confirm practical interpretation choices:
  - SQLite as system of record.
  - Kanban payload stored as JSON in SQLite (best fit for MVP + future multi-user).
  - Structured AI outputs for chat response + optional board mutation.
- [x] Create `frontend/AGENTS.md` describing current frontend structure and conventions.
- [x] Define a lightweight test strategy doc section for frontend/backend/e2e.
- [x] Capture any non-goals explicitly (to prevent scope creep).

### Practical tests

- [x] Plan review pass with no open blocking questions.
- [x] `frontend/AGENTS.md` is clear enough for a new contributor to start work.

### Success criteria

- Plan is explicitly approved by the user. ✅
- Open design questions are reduced to zero or documented as deferred decisions. ✅

---

## Part 2 - Scaffolding (Docker + FastAPI + scripts) ✅

### Scope

Set up baseline runtime and deployment shape for local MVP development.

### Checklist

- [x] Create backend scaffold in `backend/` with FastAPI app entrypoint.
- [x] Add Dockerfile to build frontend assets and run backend service.
- [x] Add docker-compose for local convenience.
- [x] Add start/stop scripts for macOS/Linux/Windows under `scripts/`.
- [x] Serve a simple static page at `/` ("hello world" validation stage).
- [x] Add one sample API route (`/api/health`) and wire frontend fetch test.
- [x] Add environment variable wiring (including OpenRouter key presence checks but no AI call yet).

### Implementation decisions

- Single-stage Python Dockerfile at this point; Node stage added in Part 3.
- `uv` used as Python package manager inside the container.
- `docker compose up -d --build` used in start scripts for convenience.

### Practical tests

- [x] `docker build` succeeds from clean checkout.
- [x] `docker run` starts successfully and responds on configured port.
- [x] Browser loads `/` static page from container.
- [x] API health endpoint returns 200 JSON.
- [x] Start/stop scripts run without manual edits on target OS.

### Success criteria

- A new developer can clone, run one start command, and see both static page and API response. ✅

---

## Part 3 - Frontend integration (serve existing Kanban) ✅

### Scope

Replace hello-world page with built frontend demo served through backend.

### Checklist

- [x] Add frontend build step to container flow.
- [x] Configure FastAPI static serving for built frontend at `/`.
- [x] Ensure client-side routing fallback works.
- [x] Preserve current Kanban demo behavior.

### Implementation decisions

- `output: "export"` added to `next.config.ts` for static export mode.
- Multi-stage Dockerfile: Node 20 slim builds frontend → Python 3.12 slim runs backend.
- Built frontend copied from `/frontend/out` into `/app/frontend/out` in the Python image.
- FastAPI catch-all `/{full_path:path}` serves `index.html` for unknown routes.
- `/_next` assets served via `StaticFiles` mount on the `_next` path.

### Practical tests

- [x] Production build of frontend succeeds in container build.
- [x] Visiting `/` loads the Kanban demo UI (`<title>Kanban Studio</title>`).
- [x] Refreshing app routes does not 404.

### Success criteria

- The same Kanban UX works when served from the backend container. ✅

---

## Part 4 - Fake sign-in flow ✅

### Scope

Gate board access behind simple hardcoded credentials.

### Checklist

- [x] Add login UI at app entry (`LoginPage` component).
- [x] Validate credentials against `"user" / "password"` via `/api/login` backend route.
- [x] Add logged-in session handling via `localStorage` key `pm_session`.
- [x] Add logout control and session clear behavior.
- [x] Prevent direct board access without session.

### Implementation decisions

- `/api/login` POST endpoint added to FastAPI; returns 401 on wrong credentials.
- `localStorage` stores the username string (not just a boolean flag) so it can be passed to API calls.
- Login page uses the same design tokens (CSS variables) as the main board.
- Sign out button added to the board header.

### Practical tests

- [x] Wrong credentials show clear failure message.
- [x] Correct credentials grant board access.
- [x] Logout returns user to login screen.
- [x] Reload behavior is consistent with localStorage session.

### Success criteria

- Users must authenticate with MVP credentials to access board, and can reliably log out. ✅

---

## Part 5 - Data model and persistence design ✅

### Scope

Define and document how Kanban data is stored in SQLite with JSON board payloads.

### Checklist

- [x] Propose schema for users and boards (1 board per user for MVP).
- [x] Specify board JSON shape (columns/cards/order fields).
- [x] Document migration/bootstrapping behavior.
- [x] Document indexing and lookup strategy for user + board retrieval.
- [x] Get explicit user sign-off on schema doc before full API implementation.

### Implementation decisions

- Two tables: `users` (id, username) and `boards` (id, user_id, board_json, updated_at).
- Board JSON shape matches existing frontend `BoardData` type exactly: `{ columns: Column[], cards: Record<string, Card> }`.
- DB stored at `/app/data/pm.db` inside the container.
- Docker named volume `pm_data` mounted at `/app/data` to persist DB across container restarts.
- On first startup, DB is auto-created, `user` account seeded, and default board (5 columns, 8 cards) inserted.
- Lookup: `SELECT board_json FROM boards JOIN users WHERE username = ?`.

### Practical tests

- [x] Schema can be created on empty DB without manual intervention.
- [x] Seed/read/write roundtrip for one user board works.
- [x] JSON serialization/deserialization preserves ordering and IDs.

### Success criteria

- Schema and JSON contract are approved and stable enough for API implementation. ✅

---

## Part 6 - Backend CRUD APIs ✅

### Scope

Implement backend routes to fetch and mutate board data per user.

### Checklist

- [x] Create board read endpoint (`GET /api/board`).
- [x] Create board update endpoint (`PUT /api/board`).
- [x] Enforce user scoping on all board operations.
- [x] Initialize database automatically if missing.
- [x] Add validation and consistent error responses.

### Implementation decisions

- User identity passed via `x-username` request header (no JWT for MVP).
- `GET /api/board` returns full `BoardData` JSON for the authenticated user.
- `PUT /api/board` accepts full `BoardData` and overwrites the stored board.
- Missing or invalid `x-username` header returns 401.
- Invalid payload shape returns 422 (FastAPI/Pydantic validation).
- `database.py` module contains all DB logic: `init_db`, `get_board`, `save_board`.
- `init_db()` called via FastAPI `lifespan` context on startup.

### Practical tests

- [x] `GET /api/board` without auth header returns 401.
- [x] `GET /api/board` with valid user returns board JSON.
- [x] `PUT /api/board` updates persist and are visible on subsequent fetch.
- [x] Invalid payloads return 422 with actionable error.
- [x] Fresh environment auto-creates DB and required tables.

### Success criteria

- Backend can persist and return board state correctly for the MVP user flow. ✅

---

## Part 7 - Frontend/backend wiring ✅

### Scope

Switch frontend from local demo state to backend-powered persistent state.

### Checklist

- [x] Replace in-memory board source with API-backed data fetch.
- [x] Wire all board actions to backend mutation APIs.
- [x] Add loading/error states for network operations.
- [x] Keep interactions responsive and predictable.

### Implementation decisions

- `lib/api.ts` added with `fetchBoard` and `saveBoard` helpers; both send `x-username` header.
- `KanbanBoard` fetches board on mount via `useEffect`; shows "Loading board…" spinner.
- Every mutation (rename, add card, delete card, drag) immediately calls `PUT /api/board` optimistically.
- Save errors shown as a dismissible banner at the top of the board.
- `page.tsx` stores username in `localStorage` under `pm_session` and passes it as a prop to `KanbanBoard`.
- `LoginPage.onLogin` callback updated to pass the username string back to the parent.

### Practical tests

- [x] Board loads from backend on login.
- [x] Drag/drop + edits persist after page reload.
- [x] Container restart retains board data (via Docker volume).
- [x] Network/API errors are surfaced without breaking app state.

### Success criteria

- User experiences a persistent Kanban board with no reliance on frontend-only mock state. ✅

---

## Part 8 - Basic AI connectivity (OpenRouter) ✅

### Scope

Validate backend can call OpenRouter model successfully.

### Checklist

- [x] Add OpenRouter client configuration.
- [x] Securely read `OPENROUTER_API_KEY` from environment.
- [x] Add simple backend probe route or test harness for AI call.
- [x] Run a deterministic connectivity check prompt (`2+2`).
- [x] Add robust error handling for missing key/network/provider failures.

### Implementation decisions

- `backend/ai.py` module wraps the OpenAI-compatible OpenRouter client.
- `get_client()` raises `ValueError` on missing key; caught at the route level and returned as 500.
- `APIConnectionError` → 502; `APIStatusError` → 502; `AuthenticationError` → 500.
- `GET /api/ai/ping` sends `"What is 2+2?"` and returns `{"status": "ok", "response": "4"}`.
- `.env` key renamed to uppercase `OPENROUTER_API_KEY` to match env var convention.

### Practical tests

- [x] Valid key returns successful model response (`{"status":"ok","response":"4"}`).
- [x] Missing key fails with clear 500 error message.
- [x] Provider/network failure returns controlled 502 error response.

### Success criteria

- AI integration is proven operational and safely failure-handled. ✅

---

## Part 9 - Structured outputs with board context ✅

### Scope

Send board JSON + user query (+ history) to AI and parse structured response.

### Checklist

- [x] Define structured response schema:
  - assistant text response,
  - optional board update payload.
- [x] Build prompt contract with board JSON + conversation history.
- [x] Validate and parse model response against schema.
- [x] If board update exists, apply via backend persistence layer.
- [x] Store minimal conversation history for context continuity.
- [x] Add tests for schema-valid and schema-invalid responses.

### Implementation decisions

- Model instructed via system prompt to reply with `{"message": "...", "board_update": <BoardData>|null}`.
- `chat_with_board()` in `ai.py` builds messages array (system + history + user), calls model, parses JSON, validates board shape, returns `(text, board_update|None)`.
- `POST /api/ai/chat` route: fetches board, calls `chat_with_board`, appends to in-memory history, persists board if updated.
- History stored in `_conversation_history` dict keyed by username (in-memory; cleared on container restart — acceptable for MVP).
- Validation rejects board_update if missing `columns`/`cards` keys, preventing corrupted board writes.

### Practical tests

- [x] Non-mutating queries return assistant text only (`board_updated: false`).
- [x] Mutating queries return valid update payload and persist changes (verified via `GET /api/board`).
- [x] Invalid model output is handled gracefully (no corrupted board state).
- [x] Repeated turns include history and remain coherent.

### Success criteria

- AI can reliably return actionable structured output without breaking data integrity. ✅

---

## Part 10 - Sidebar AI chat UX ✅

### Scope

Expose full chat UI in frontend and refresh board when AI applies updates.

### Checklist

- [x] Add sidebar chat component with message list + input.
- [x] Connect chat submit to backend AI endpoint.
- [x] Render assistant responses with loading/error states.
- [x] Reflect backend-applied board changes in UI automatically.
- [x] Keep chat and board interactions usable on common viewport sizes.

### Implementation decisions

- `AiChat.tsx` component: full-height sidebar with scrolling message list, textarea input (Enter to send, Shift+Enter for newline), animated typing indicator while waiting.
- `sendChatMessage()` added to `api.ts`; calls `POST /api/ai/chat`.
- `KanbanBoard` layout changed to `flex h-screen`: board scrolls independently on the left, sidebar is fixed-width (340px) on the right.
- `refreshBoard` callback passed to `AiChat` — called when `board_updated: true`, re-fetches board from backend and updates UI without page reload.
- User messages styled with purple background; assistant messages with white bordered card.

### Practical tests

- [x] User can send chat prompt and receive response.
- [x] AI-triggered board changes appear without manual page refresh.
- [x] Chat errors are shown clearly and recover on retry.
- [x] Board remains interactive after multiple chat turns.

### Success criteria

- Sidebar AI chat is production-like for MVP and can update board state safely. ✅

---

## Cross-phase Definition of Done

Each completed phase should satisfy:

- [ ] Code implemented only for agreed scope.
- [ ] Relevant tests pass locally/in container.
- [ ] Docs updated for behavior/commands/contracts touched.
- [ ] No unresolved high-severity lint/type/test issues in changed files.
- [ ] User validates and approves before advancing to next major phase.
