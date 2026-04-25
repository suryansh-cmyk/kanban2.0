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

## Part 1 - Planning and alignment

### Scope

Produce approved planning artifacts before implementation.

### Checklist

- [ ] Confirm this plan with the user.
- [ ] Confirm practical interpretation choices:
  - SQLite as system of record.
  - Kanban payload stored as JSON in SQLite (best fit for MVP + future multi-user).
  - Structured AI outputs for chat response + optional board mutation.
- [ ] Create `frontend/AGENTS.md` describing current frontend structure and conventions.
- [ ] Define a lightweight test strategy doc section for frontend/backend/e2e.
- [ ] Capture any non-goals explicitly (to prevent scope creep).

### Practical tests

- [ ] Plan review pass with no open blocking questions.
- [ ] `frontend/AGENTS.md` is clear enough for a new contributor to start work.

### Success criteria

- Plan is explicitly approved by the user.
- Open design questions are reduced to zero or documented as deferred decisions.

---

## Part 2 - Scaffolding (Docker + FastAPI + scripts)

### Scope

Set up baseline runtime and deployment shape for local MVP development.

### Checklist

- [ ] Create backend scaffold in `backend/` with FastAPI app entrypoint.
- [ ] Add Dockerfile to build frontend assets and run backend service.
- [ ] Add docker-compose (if needed) for local convenience.
- [ ] Add start/stop scripts for macOS/Linux/Windows under `scripts/`.
- [ ] Serve a simple static page at `/` ("hello world" validation stage).
- [ ] Add one sample API route (e.g., `/api/health`) and wire frontend fetch test.
- [ ] Add environment variable wiring (including OpenRouter key presence checks but no AI call yet).

### Practical tests

- [ ] `docker build` succeeds from clean checkout.
- [ ] `docker run` starts successfully and responds on configured port.
- [ ] Browser loads `/` static page from container.
- [ ] API health endpoint returns 200 JSON.
- [ ] Start/stop scripts run without manual edits on target OS (or documented caveats).

### Success criteria

- A new developer can clone, run one start command, and see both static page and API response.

---

## Part 3 - Frontend integration (serve existing Kanban)

### Scope

Replace hello-world page with built frontend demo served through backend.

### Checklist

- [ ] Add frontend build step to container flow.
- [ ] Configure FastAPI static serving for built frontend at `/`.
- [ ] Ensure client-side routing fallback works (if needed).
- [ ] Preserve current Kanban demo behavior.
- [ ] Add/adjust tests around static serving and app load.

### Practical tests

- [ ] Production build of frontend succeeds in container build.
- [ ] Visiting `/` loads the Kanban demo UI.
- [ ] Refreshing app routes does not 404 (if routes exist).
- [ ] Existing frontend unit tests pass (if present) plus any required updates.

### Success criteria

- The same Kanban UX works when served from the backend container, not just dev frontend mode.

---

## Part 4 - Fake sign-in flow

### Scope

Gate board access behind simple hardcoded credentials.

### Checklist

- [ ] Add login UI at app entry.
- [ ] Validate credentials against `"user" / "password"`.
- [ ] Add logged-in session handling (simple MVP approach).
- [ ] Add logout control and session clear behavior.
- [ ] Prevent direct board access without session.

### Practical tests

- [ ] Wrong credentials show clear failure message.
- [ ] Correct credentials grant board access.
- [ ] Logout returns user to login screen.
- [ ] Reload behavior is consistent with chosen session method.

### Success criteria

- Users must authenticate with MVP credentials to access board, and can reliably log out.

---

## Part 5 - Data model and persistence design

### Scope

Define and document how Kanban data is stored in SQLite with JSON board payloads.

### Checklist

- [ ] Propose schema for users and boards (1 board per user for MVP).
- [ ] Specify board JSON shape (columns/cards/order fields).
- [ ] Document migration/bootstrapping behavior.
- [ ] Document indexing and lookup strategy for user + board retrieval.
- [ ] Get explicit user sign-off on schema doc before full API implementation.

### Practical tests

- [ ] Schema can be created on empty DB without manual intervention.
- [ ] Seed/read/write roundtrip for one user board works in local script/test.
- [ ] JSON serialization/deserialization preserves ordering and IDs.

### Success criteria

- Schema and JSON contract are approved and stable enough for API implementation.

---

## Part 6 - Backend CRUD APIs

### Scope

Implement backend routes to fetch and mutate board data per user.

### Checklist

- [ ] Create board read endpoint(s).
- [ ] Create board update endpoint(s) for card/column edits and moves.
- [ ] Enforce user scoping on all board operations.
- [ ] Initialize database automatically if missing.
- [ ] Add validation and consistent error responses.
- [ ] Add backend unit/integration tests.

### Practical tests

- [ ] API returns current board for authenticated user.
- [ ] Create/edit/move operations persist and are visible on subsequent fetch.
- [ ] Invalid payloads return 4xx with actionable error message.
- [ ] Fresh environment auto-creates DB and required tables.

### Success criteria

- Backend can persist and return board state correctly for the MVP user flow.

---

## Part 7 - Frontend/backend wiring

### Scope

Switch frontend from local demo state to backend-powered persistent state.

### Checklist

- [ ] Replace in-memory board source with API-backed data fetch.
- [ ] Wire all board actions to backend mutation APIs.
- [ ] Add loading/error states for network operations.
- [ ] Keep interactions responsive and predictable.
- [ ] Add integration coverage for key user flows.

### Practical tests

- [ ] Board loads from backend on login.
- [ ] Drag/drop + edits persist after page reload.
- [ ] API/server restart retains board data.
- [ ] Network/API errors are surfaced without breaking app state.

### Success criteria

- User experiences a persistent Kanban board with no reliance on frontend-only mock state.

---

## Part 8 - Basic AI connectivity (OpenRouter)

### Scope

Validate backend can call OpenRouter model successfully.

### Checklist

- [ ] Add OpenRouter client configuration.
- [ ] Securely read `OPENROUTER_API_KEY` from environment.
- [ ] Add simple backend probe route or test harness for AI call.
- [ ] Run a deterministic connectivity check prompt (`2+2`).
- [ ] Add robust error handling for missing key/network/provider failures.

### Practical tests

- [ ] Valid key returns successful model response.
- [ ] Missing key fails with clear startup/runtime message.
- [ ] Provider/network failure returns controlled error response.

### Success criteria

- AI integration is proven operational and safely failure-handled.

---

## Part 9 - Structured outputs with board context

### Scope

Send board JSON + user query (+ history) to AI and parse structured response.

### Checklist

- [ ] Define structured response schema:
  - assistant text response,
  - optional board update payload.
- [ ] Build prompt contract with board JSON + conversation history.
- [ ] Validate and parse model response against schema.
- [ ] If board update exists, apply via backend persistence layer.
- [ ] Store minimal conversation history for context continuity.
- [ ] Add tests for schema-valid and schema-invalid responses.

### Practical tests

- [ ] Non-mutating queries return assistant text only.
- [ ] Mutating queries return valid update payload and persist changes.
- [ ] Invalid model output is handled gracefully (no corrupted board state).
- [ ] Repeated turns include history and remain coherent.

### Success criteria

- AI can reliably return actionable structured output without breaking data integrity.

---

## Part 10 - Sidebar AI chat UX

### Scope

Expose full chat UI in frontend and refresh board when AI applies updates.

### Checklist

- [ ] Add sidebar chat component with message list + input.
- [ ] Connect chat submit to backend AI endpoint.
- [ ] Render assistant responses with loading/error states.
- [ ] Reflect backend-applied board changes in UI automatically.
- [ ] Keep chat and board interactions usable on common viewport sizes.
- [ ] Add integration tests for end-to-end AI-assisted board update flow.

### Practical tests

- [ ] User can send chat prompt and receive response.
- [ ] AI-triggered board changes appear without manual page refresh.
- [ ] Chat errors are shown clearly and recover on retry.
- [ ] Board remains interactive after multiple chat turns.

### Success criteria

- Sidebar AI chat is production-like for MVP and can update board state safely.

---

## Cross-phase Definition of Done

Each completed phase should satisfy:

- [ ] Code implemented only for agreed scope.
- [ ] Relevant tests pass locally/in container.
- [ ] Docs updated for behavior/commands/contracts touched.
- [ ] No unresolved high-severity lint/type/test issues in changed files.
- [ ] User validates and approves before advancing to next major phase.
