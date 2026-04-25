import json
import os

from openai import APIConnectionError, APIStatusError, AuthenticationError, OpenAI

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
MODEL = "openai/gpt-oss-120b"

SYSTEM_PROMPT = """\
You are an AI assistant embedded in a Kanban project management app.
You have access to the user's current board and can read or update it.

The board has columns (each with an id, title, and ordered list of card IDs) \
and cards (each with an id, title, and details).

When responding, you MUST reply with a JSON object — no markdown fences, no extra text — \
using this exact schema:
{
  "message": "<your reply to the user>",
  "board_update": <full updated BoardData object, or null if no changes needed>
}

BoardData schema:
{
  "columns": [{"id": "...", "title": "...", "cardIds": ["..."]}],
  "cards": {"<id>": {"id": "...", "title": "...", "details": "..."}}
}

Rules:
- Always preserve all existing card IDs and column IDs unless explicitly asked to remove them.
- When creating new cards, generate a unique ID like "card-<random>".
- When no board change is needed, set board_update to null.
- Never invent data not in the board or requested by the user.
"""


def get_client() -> OpenAI:
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable is not set")
    return OpenAI(base_url=OPENROUTER_BASE_URL, api_key=api_key)


def chat(messages: list[dict]) -> str:
    client = get_client()
    try:
        response = client.chat.completions.create(model=MODEL, messages=messages)
        return response.choices[0].message.content or ""
    except AuthenticationError as e:
        raise ValueError(f"OpenRouter authentication failed: {e}") from e
    except APIConnectionError as e:
        raise RuntimeError(f"Could not connect to OpenRouter: {e}") from e
    except APIStatusError as e:
        raise RuntimeError(f"OpenRouter API error {e.status_code}: {e.message}") from e


def chat_with_board(
    user_message: str,
    board: dict,
    history: list[dict],
) -> tuple[str, dict | None]:
    """
    Send user message + board context + history to the model.
    Returns (assistant_message, board_update_or_None).
    Raises ValueError on config errors, RuntimeError on network/API errors,
    and ValueError on unparseable/invalid model output.
    """
    board_json = json.dumps(board, indent=2)
    system = SYSTEM_PROMPT + f"\n\nCurrent board state:\n{board_json}"

    messages = [{"role": "system", "content": system}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    raw = chat(messages)

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Model returned non-JSON response: {e}\nRaw: {raw[:500]}") from e

    if "message" not in parsed:
        raise ValueError(f"Model response missing 'message' field: {parsed}")

    assistant_text = parsed["message"]
    board_update = parsed.get("board_update")

    if board_update is not None:
        _validate_board(board_update)

    return assistant_text, board_update


def _validate_board(board: object) -> None:
    if not isinstance(board, dict):
        raise ValueError("board_update must be an object")
    if "columns" not in board or "cards" not in board:
        raise ValueError("board_update missing 'columns' or 'cards'")
    if not isinstance(board["columns"], list):
        raise ValueError("board_update.columns must be an array")
    if not isinstance(board["cards"], dict):
        raise ValueError("board_update.cards must be an object")
