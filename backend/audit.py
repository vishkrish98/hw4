"""Append-only audit trail of agent-loop activity: every tool call the agent makes, plus
one summary record per chat turn with why the loop stopped.

`output/audit_trail.json` is never wiped: each call reads whatever is already on disk,
appends new records, and writes the combined list back. A missing or corrupted file starts
a fresh list rather than raising, but an existing file's entries are never dropped, and
nothing here ever truncates the file at startup.
"""

import json
import time
from pathlib import Path
from typing import Any

from pydantic_ai.messages import ModelMessage, ModelRequest, ModelResponse, ToolCallPart, ToolReturnPart

BASE_DIR = Path(__file__).resolve().parent.parent
AUDIT_PATH = BASE_DIR / "output" / "audit_trail.json"

# Keep individual log fields short -- this is an audit trail for debugging/review, not a
# full transcript store (that's what the chat_messages table is for).
MAX_FIELD_CHARS = 240


def _truncate(value: Any) -> str:
    text = value if isinstance(value, str) else json.dumps(value, default=str)
    if len(text) > MAX_FIELD_CHARS:
        return text[: MAX_FIELD_CHARS - 1] + "…"
    return text


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _read_existing() -> list[dict]:
    if not AUDIT_PATH.exists():
        return []
    try:
        data = json.loads(AUDIT_PATH.read_text())
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def _append(new_entries: list[dict]) -> None:
    entries = _read_existing()
    entries.extend(new_entries)
    AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    AUDIT_PATH.write_text(json.dumps(entries, indent=2) + "\n")


def log_agent_run(
    *,
    user_id: int | None,
    message: str,
    new_messages: list[ModelMessage],
    stop_reason: str,
    reply_preview: str,
) -> None:
    """Log one completed agent turn: every tool call it made (matched call -> result by
    tool_call_id) plus a final summary record with the stop reason."""
    timestamp = _now()
    calls_by_id: dict[str, dict] = {}

    for msg in new_messages:
        if isinstance(msg, ModelResponse):
            for part in msg.parts:
                if isinstance(part, ToolCallPart):
                    calls_by_id[part.tool_call_id] = {
                        "time": timestamp,
                        "type": "tool_call",
                        "user_id": user_id,
                        "tool": part.tool_name,
                        "args": _truncate(part.args),
                        "result": None,
                    }
        elif isinstance(msg, ModelRequest):
            for part in msg.parts:
                if isinstance(part, ToolReturnPart) and part.tool_call_id in calls_by_id:
                    calls_by_id[part.tool_call_id]["result"] = _truncate(part.content)

    entries = list(calls_by_id.values())
    entries.append(
        {
            "time": timestamp,
            "type": "run_complete",
            "user_id": user_id,
            "message": _truncate(message),
            "reply_preview": _truncate(reply_preview),
            "tool_calls": len(calls_by_id),
            "stop_reason": stop_reason,
        }
    )
    _append(entries)


def log_agent_error(*, user_id: int | None, message: str, stop_reason: str, detail: str) -> None:
    """Log a turn that ended in an error/refusal before producing a normal reply (no tool
    call parts are available in this case since the model request itself failed)."""
    _append(
        [
            {
                "time": _now(),
                "type": "run_error",
                "user_id": user_id,
                "message": _truncate(message),
                "detail": _truncate(detail),
                "stop_reason": stop_reason,
            }
        ]
    )
