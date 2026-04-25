from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.database import get_board, init_db, save_board
from backend.ai import chat, chat_with_board


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_OUT = BASE_DIR / "frontend" / "out"
FALLBACK_STATIC = Path(__file__).resolve().parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Project Management MVP API", lifespan=lifespan)

# In-memory conversation history keyed by username. Each value is a list of
# {"role": "user"|"assistant", "content": "..."} dicts (excludes system message).
_conversation_history: dict[str, list[dict]] = {}


def _get_username(x_username: str | None) -> str:
    if not x_username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return x_username


class LoginRequest(BaseModel):
    username: str
    password: str


class BoardPayload(BaseModel):
    columns: list[Any]
    cards: dict[str, Any]


@app.post("/api/login")
def login(body: LoginRequest) -> dict[str, str]:
    if body.username == "user" and body.password == "password":
        return {"status": "ok"}
    raise HTTPException(status_code=401, detail="Invalid credentials")


@app.get("/api/board")
def read_board(x_username: str | None = Header(default=None)) -> dict:
    username = _get_username(x_username)
    board = get_board(username)
    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


@app.put("/api/board")
def update_board(
    body: BoardPayload,
    x_username: str | None = Header(default=None),
) -> dict[str, str]:
    username = _get_username(x_username)
    if get_board(username) is None:
        raise HTTPException(status_code=404, detail="Board not found")
    save_board(username, body.model_dump())
    return {"status": "ok"}


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "backend"}


@app.get("/api/ai/ping")
def ai_ping() -> dict[str, str]:
    try:
        answer = chat([{"role": "user", "content": "What is 2+2? Reply with just the number."}])
        return {"status": "ok", "response": answer}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    message: str
    board: dict | None  # updated board if AI mutated it, else None


@app.post("/api/ai/chat")
def ai_chat(
    body: ChatRequest,
    x_username: str | None = Header(default=None),
) -> ChatResponse:
    username = _get_username(x_username)

    board = get_board(username)
    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")

    history = _conversation_history.setdefault(username, [])

    try:
        assistant_text, board_update = chat_with_board(body.message, board, history)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    history.append({"role": "user", "content": body.message})
    history.append({"role": "assistant", "content": assistant_text})

    if board_update is not None:
        save_board(username, board_update)

    return ChatResponse(message=assistant_text, board=board_update)


# Mount Next.js static assets
if FRONTEND_OUT.exists():
    app.mount("/_next", StaticFiles(directory=FRONTEND_OUT / "_next"), name="next-assets")


@app.get("/{full_path:path}")
def serve_frontend(full_path: str) -> FileResponse:
    if FRONTEND_OUT.exists():
        candidate = FRONTEND_OUT / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_OUT / "index.html")
    return FileResponse(FALLBACK_STATIC / "index.html")
