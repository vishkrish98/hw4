"""Wiring for the Campus Customs shop chatbot: model + system prompt + tools + memory."""

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.usage import UsageLimits

from models import ChatReply, CustomerInfo, PageContext
from tools import check_stock, find_similar_products, get_product, search_products

HERE = Path(__file__).resolve().parent
load_dotenv(HERE.parent / ".env")

MODEL_NAME = "gpt-5.6-luna"

# A shop-catalogue question should never need more than a couple of tool calls (e.g. search
# then check_stock, or get_product then find_similar_products). These caps are a real safety
# limit, not a suggestion: PydanticAI raises UsageLimitExceeded and aborts the run if a
# malformed prompt, a bad interaction between tools, or an adversarial input ever pushed the
# agent into a long back-and-forth loop -- bounding cost and latency instead of hanging.
CHAT_USAGE_LIMITS = UsageLimits(request_limit=8, tool_calls_limit=6)


def _build_model() -> OpenAIChatModel:
    api_key = os.getenv("PORTKEY_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("PORTKEY_API_KEY is not set. Add it to .env at the project root.")
    provider = OpenAIProvider(base_url="https://api.portkey.ai/v1", api_key=api_key)
    return OpenAIChatModel(MODEL_NAME, provider=provider)


@dataclass
class ChatDeps:
    """Per-request context injected into the agent: who's chatting, and what they're looking at.

    This is the "clear pattern" the assignment asks for instead of stuffing customer/page
    state into the prompt text by hand -- `customer_context` below reads it via RunContext
    and turns it into instructions the model actually sees for this turn only.
    """

    customer: CustomerInfo | None = None
    page: PageContext | None = None


agent = Agent(
    _build_model(),
    output_type=ChatReply,
    deps_type=ChatDeps,
    instructions=(HERE / "prompts" / "prompt.md").read_text(),
)

agent.tool_plain(search_products)
agent.tool_plain(get_product)
agent.tool_plain(check_stock)
agent.tool_plain(find_similar_products)


@agent.instructions
def customer_context(ctx: RunContext[ChatDeps]) -> str:
    lines: list[str] = []

    customer = ctx.deps.customer
    if customer is not None:
        lines.append(
            f'This shopper is logged in as {customer.name} ({customer.email}). '
            "You may greet them by first name. Never state their email or account details "
            "back to them unprompted -- that's account info, not conversation."
        )
    else:
        lines.append("This shopper is browsing as a guest (not logged in). Don't assume a name.")

    page = ctx.deps.page
    if page is not None and page.product is not None:
        p = page.product
        lines.append(
            f"RIGHT NOW, this turn, the shopper is looking at the product page for \"{p.name}\" "
            f"(product_id: {p.product_id}, garment_type: {p.garment_type}). Description: "
            f"{p.description} Price: ${p.price:.2f}. Colors it comes in: "
            f"{', '.join(p.colors) if p.colors else 'none listed'}. Any vague reference to a "
            'product -- "this", "it", "this one", "this hoodie"/"this shirt"/"this jacket" (or '
            "any other garment word), or a question about price/color/stock with no product "
            "named at all -- means THIS product. Use this product_id directly with "
            "get_product/check_stock. Do NOT call search_products or ask the shopper which item "
            "they mean when a page-context product is given here -- that's only for when there "
            "is no current product page. This current page always takes priority over whatever "
            "came up earlier in the conversation -- including a different product you discussed "
            "before, AND including a clarifying question you yourself asked before. If you see "
            "in the conversation history that you previously asked \"which product do you mean\" "
            "and this same page context was (or wasn't) available then, ignore that old question "
            "now: you have a current product page this turn, so answer immediately from it "
            "instead of repeating or continuing that old clarification request."
        )
    elif page is not None:
        lines.append(f'They are currently on the "{page.page}" page of the site (not viewing one specific product).')

    return "\n".join(lines)
