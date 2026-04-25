import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path("/app/data/pm.db")

INITIAL_BOARD = {
    "columns": [
        {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-1", "card-2"]},
        {"id": "col-discovery", "title": "Discovery", "cardIds": ["card-3"]},
        {"id": "col-progress", "title": "In Progress", "cardIds": ["card-4", "card-5"]},
        {"id": "col-review", "title": "Review", "cardIds": ["card-6"]},
        {"id": "col-done", "title": "Done", "cardIds": ["card-7", "card-8"]},
    ],
    "cards": {
        "card-1": {"id": "card-1", "title": "Align roadmap themes", "details": "Draft quarterly themes with impact statements and metrics."},
        "card-2": {"id": "card-2", "title": "Gather customer signals", "details": "Review support tags, sales notes, and churn feedback."},
        "card-3": {"id": "card-3", "title": "Prototype analytics view", "details": "Sketch initial dashboard layout and key drill-downs."},
        "card-4": {"id": "card-4", "title": "Refine status language", "details": "Standardize column labels and tone across the board."},
        "card-5": {"id": "card-5", "title": "Design card layout", "details": "Add hierarchy and spacing for scanning dense lists."},
        "card-6": {"id": "card-6", "title": "QA micro-interactions", "details": "Verify hover, focus, and loading states."},
        "card-7": {"id": "card-7", "title": "Ship marketing page", "details": "Final copy approved and asset pack delivered."},
        "card-8": {"id": "card-8", "title": "Close onboarding sprint", "details": "Document release notes and share internally."},
    },
}


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL
            );

            CREATE TABLE IF NOT EXISTS boards (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER NOT NULL REFERENCES users(id),
                board_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)

        conn.execute(
            "INSERT OR IGNORE INTO users (username) VALUES (?)", ("user",)
        )

        user_id = conn.execute(
            "SELECT id FROM users WHERE username = ?", ("user",)
        ).fetchone()["id"]

        existing = conn.execute(
            "SELECT id FROM boards WHERE user_id = ?", (user_id,)
        ).fetchone()

        if not existing:
            conn.execute(
                "INSERT INTO boards (user_id, board_json, updated_at) VALUES (?, ?, ?)",
                (user_id, json.dumps(INITIAL_BOARD), _now()),
            )


def get_board(username: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT b.board_json FROM boards b
            JOIN users u ON u.id = b.user_id
            WHERE u.username = ?
            """,
            (username,),
        ).fetchone()
    return json.loads(row["board_json"]) if row else None


def save_board(username: str, board: dict) -> None:
    with _connect() as conn:
        conn.execute(
            """
            UPDATE boards SET board_json = ?, updated_at = ?
            WHERE user_id = (SELECT id FROM users WHERE username = ?)
            """,
            (json.dumps(board), _now(), username),
        )


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
