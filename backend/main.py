from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.database import get_board, init_db, save_board


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_OUT = BASE_DIR / "frontend" / "out"
FALLBACK_STATIC = Path(__file__).resolve().parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Project Management MVP API", lifespan=lifespan)


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
