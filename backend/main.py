from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_OUT = BASE_DIR / "frontend" / "out"
FALLBACK_STATIC = Path(__file__).resolve().parent / "static"

app = FastAPI(title="Project Management MVP API")


class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/api/login")
def login(body: LoginRequest) -> dict[str, str]:
    if body.username == "user" and body.password == "password":
        return {"status": "ok"}
    raise HTTPException(status_code=401, detail="Invalid credentials")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "backend"}


# Mount Next.js static assets (_next/static, images, etc.)
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
