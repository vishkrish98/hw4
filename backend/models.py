"""Pydantic / PydanticAI types shared by the agent, its tools, and the API layer."""

from pydantic import BaseModel, Field


class InventoryLine(BaseModel):
    size: str
    quantity: int


class ProductCard(BaseModel):
    """A single product surfaced to the shopper, shown as a card in the chat panel or product grid."""

    product_id: str
    name: str
    garment_type: str
    description: str
    price: float
    image_url: str
    colors: list[str]
    inventory: list[InventoryLine]
    total_stock: int


class SearchResult(BaseModel):
    """Result of a catalogue search: the (possibly truncated) product list plus the true total."""

    products: list[ProductCard]
    total_matches: int = Field(
        description="Total number of catalogue products that matched, which may be more than were returned."
    )


class SizeStock(BaseModel):
    """Real inventory for one size of one product."""

    size: str
    quantity: int
    in_stock: bool = Field(description="True if quantity > 0 for this size.")


class StockCheck(BaseModel):
    """Structured, database-grounded result of a stock lookup -- never invented.

    Distinguishes "this size isn't made for this product" (size_offered=False) from
    "this size exists but has zero units right now" (size_offered=True, in_stock=False),
    since those need different, clear phrasing to the shopper.
    """

    product_id: str
    product_name: str
    checked_size: str | None = Field(
        default=None, description="The specific size that was checked, or None if checking overall stock."
    )
    size_offered: bool = Field(
        description="Whether checked_size is actually one of the sizes this product comes in. Always True when checked_size is None."
    )
    in_stock: bool = Field(description="Whether the checked size (or the product overall, if no size given) has units available.")
    quantity: int = Field(
        description="Units available for checked_size, or the total across all sizes if checked_size is None. 0 if size_offered is False."
    )
    available_sizes: list[SizeStock] = Field(
        description="Full per-size stock breakdown for the product, so the agent can suggest an in-stock alternative size."
    )


class ChatReply(BaseModel):
    """Structured output the agent must return for every chat turn."""

    message: str = Field(description="The assistant's natural-language reply, shown in the chat panel.")
    products: list[ProductCard] = Field(
        default_factory=list,
        description="Products to surface alongside the reply, most relevant first. Empty list if none apply.",
    )


class CustomerInfo(BaseModel):
    """Who the agent is chatting with, when the shopper is logged in -- goes in agent deps, not a tool call."""

    id: int
    name: str
    email: str


class PageContext(BaseModel):
    """What the shopper is currently looking at on the site, passed in on every chat turn.

    Lets the agent resolve a bare "this"/"it" ("do you have this in pink?") to a specific
    product without the shopper having to repeat its name.
    """

    page: str = Field(description='Which page the shopper is on, e.g. "home", "products", "product", "about".')
    product: ProductCard | None = Field(
        default=None, description="Full details of the product page they're viewing, if any."
    )


class PageContextIn(BaseModel):
    """What the frontend sends describing the shopper's current page (before we look up the product)."""

    page: str
    product_id: str | None = None


class ChatRequest(BaseModel):
    """Body of POST /api/chat."""

    message: str
    page: PageContextIn | None = None


class ChatResponse(BaseModel):
    """Body returned by POST /api/chat."""

    reply: str
    products: list[ProductCard]


class ChatHistoryMessage(BaseModel):
    """One stored turn, returned by GET /api/chat/history to hydrate the panel when a shopper returns."""

    role: str
    content: str
    products: list[ProductCard] = Field(default_factory=list)
