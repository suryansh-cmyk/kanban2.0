Backend scope for current phase:

- FastAPI app entrypoint in `backend/main.py`
- Static hello-world validation page in `backend/static/index.html`
- API health endpoint at `/api/health`
- Python dependency management via `uv` using `backend/pyproject.toml`

Next phases will extend this backend with auth, persistence, and AI routes.
This file should be updated with a description of the Backend

## AI Model

- OpenRouter is used for all AI calls (OPENROUTER_API_KEY in project root .env)
- Model: `openai/gpt-oss-120b`