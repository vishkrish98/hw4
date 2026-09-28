import json

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic_ai.exceptions import ModelHTTPError, UnexpectedModelBehavior, UsageLimitExceeded
from pydantic_ai.messages import ModelMessagesTypeAdapter

import audit
from agent import CHAT_USAGE_LIMITS, ChatDeps, agent
from auth import get_user_from_token
from auth import router as auth_router
from db import (
    PRODUCTS_DIR,
    ensure_chat_messages_schema,
    get_connection,
    get_product_by_id,
    get_recent_chat_rows,
    list_all_products,
    save_chat_message,
)
from models import ChatHistoryMessage, ChatRequest, ChatResponse, CustomerInfo, PageContext
from tools import product_to_card

# How many stored turns to replay back into the agent as real conversation memory. Bounded
# so a long-time customer's history doesn't balloon token usage on every new message.
MAX_HISTORY_TURNS = 10
# How many turns to send to the frontend to hydrate the chat panel on return -- a more
# generous cap since that's just rendering text, not spending model tokens.
MAX_HISTORY_DISPLAY = 50

app = FastAPI(title="Campus Customs API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5180"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/media/products", StaticFiles(directory=PRODUCTS_DIR), name="products")
app.include_router(auth_router)


def _optional_user(authorization: str | None) -> dict | None:
    """Like auth._current_user, but returns None instead of raising -- chat is open to guests."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    return get_user_from_token(token)


@app.get("/api/products")
def list_products():
    return list_all_products()


@app.get("/api/products/{product_id}")
def get_product_route(product_id: str):
    product = get_product_by_id(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, authorization: str | None = Header(default=None)):
    user = _optional_user(authorization)

    customer = CustomerInfo(id=user["id"], name=user["name"], email=user["email"]) if user else None

    page_product = None
    if payload.page and payload.page.product_id:
        raw_product = get_product_by_id(payload.page.product_id)
        if raw_product is not None:
            page_product = product_to_card(raw_product)
    page_context = PageContext(page=payload.page.page, product=page_product) if payload.page else None

    deps = ChatDeps(customer=customer, page=page_context)

    # Replay this logged-in shopper's own stored turns back into the agent as real
    # conversation history (not just something the UI displays) -- capped at
    # MAX_HISTORY_TURNS assistant turns to bound token usage.
    message_history = []
    if user:
        rows = get_recent_chat_rows(user["id"], limit=MAX_HISTORY_TURNS * 2)
        for row in rows:
            if row["agent_messages_json"]:
                message_history.extend(ModelMessagesTypeAdapter.validate_python(json.loads(row["agent_messages_json"])))

    try:
        result = await agent.run(
            payload.message,
            deps=deps,
            message_history=message_history or None,
            usage_limits=CHAT_USAGE_LIMITS,
        )
    except (ModelHTTPError, UnexpectedModelBehavior) as exc:
        # The model/provider itself refused or errored (e.g. a content-safety filter
        # rejected the prompt) -- decline gracefully instead of surfacing a 500.
        audit.log_agent_error(
            user_id=user["id"] if user else None,
            message=payload.message,
            stop_reason="model_refused_or_errored",
            detail=str(exc),
        )
        return ChatResponse(
            reply="Sorry, I can't help with that. Is there something about our Yale gear I can help you find?",
            products=[],
        )
    except UsageLimitExceeded as exc:
        # The tool-call loop hit its safety cap (CHAT_USAGE_LIMITS) instead of running away
        # indefinitely -- log it and still answer, rather than hanging or 500ing.
        audit.log_agent_error(
            user_id=user["id"] if user else None,
            message=payload.message,
            stop_reason="loop_limit_exceeded",
            detail=str(exc),
        )
        return ChatResponse(
            reply="Sorry, that took more steps than I'm allowed -- could you ask in a simpler way?",
            products=[],
        )
    reply = result.output

    audit.log_agent_run(
        user_id=user["id"] if user else None,
        message=payload.message,
        new_messages=result.new_messages(),
        stop_reason="completed",
        reply_preview=reply.message,
    )

    if user:
        conn = get_connection()
        try:
            ensure_chat_messages_schema(conn)
            new_messages_json = json.dumps(ModelMessagesTypeAdapter.dump_python(result.new_messages(), mode="json"))
            save_chat_message(conn, user["id"], "user", payload.message)
            save_chat_message(
                conn,
                user["id"],
                "assistant",
                reply.message,
                products_json=json.dumps([p.model_dump(mode="json") for p in reply.products]),
                agent_messages_json=new_messages_json,
            )
        finally:
            conn.close()

    return ChatResponse(reply=reply.message, products=reply.products)


@app.get("/api/chat/history", response_model=list[ChatHistoryMessage])
def chat_history(authorization: str | None = Header(default=None)):
    user = _optional_user(authorization)
    if user is None:
        return []

    rows = get_recent_chat_rows(user["id"], limit=MAX_HISTORY_DISPLAY)
    history = []
    for row in rows:
        products = json.loads(row["products_json"]) if row["products_json"] else []
        history.append(ChatHistoryMessage(role=row["role"], content=row["content"], products=products))
    return history


@app.get("/api/health")
def health():
    return {"status": "ok"}
