"""Tools the Campus Customs agent can call to answer questions grounded in the real database."""

from pydantic_ai import ModelRetry

from db import get_product_by_id, search_catalogue
from models import InventoryLine, ProductCard, SearchResult, SizeStock, StockCheck


def product_to_card(product: dict) -> ProductCard:
    return ProductCard(
        product_id=product["product_id"],
        name=product["name"],
        garment_type=product["garment_type"],
        description=product["description"],
        price=product["price"],
        image_url=product["image_url"],
        colors=product["colors"],
        inventory=[InventoryLine(**line) for line in product["inventory"]],
        total_stock=product["total_stock"],
    )


def search_products(query: str) -> SearchResult:
    """Search the Campus Customs catalogue by ONE broad keyword (garment type, team/sport,
    color, or style -- e.g. "hoodie", "crewneck", "sailing", "navy"). This is plain keyword
    matching, not natural-language search, so short and singular queries work best; avoid
    passing a whole sentence.

    Matches against product name, garment type, description, colors, and search tags.
    Returns the best-matching products (most relevant first) plus `total_matches`, the true
    number of catalogue items that matched. If `total_matches` is greater than the number of
    products returned, results were truncated -- say so and offer to narrow the search
    (by color, team, or exact style) rather than implying the list is complete.
    """
    products, total_matches = search_catalogue(query)
    return SearchResult(products=[product_to_card(p) for p in products], total_matches=total_matches)


def get_product(product_id: str) -> ProductCard:
    """Look up one product's real description, price, and colors by its exact product_id
    (e.g. from a previous search result). This is the only source of truth for a product's
    description and price -- never state either from memory.
    """
    product = get_product_by_id(product_id)
    if product is None:
        raise ModelRetry(
            f"No product found with id '{product_id}'. Call search_products first to find "
            "the correct product_id -- don't guess one."
        )
    return product_to_card(product)


def check_stock(product_id: str, size: str | None = None) -> StockCheck:
    """Check REAL inventory for a product, optionally for one size. This is the only source
    of truth for stock -- always call this before telling a shopper something is in or out
    of stock, and never guess a quantity.

    Look at the returned fields, not just `in_stock`: if `size_offered` is False, the product
    simply isn't made in that size (say so, and suggest one from `available_sizes`). If
    `size_offered` is True but `in_stock` is False, the size exists but is currently sold out
    (say that clearly, and suggest an in-stock size from `available_sizes` if one exists).
    """
    product = get_product_by_id(product_id)
    if product is None:
        raise ModelRetry(
            f"No product found with id '{product_id}'. Call search_products first to find "
            "the correct product_id -- don't guess one."
        )

    sizes = [
        SizeStock(size=line["size"], quantity=line["quantity"], in_stock=line["quantity"] > 0)
        for line in product["inventory"]
    ]

    if size is None:
        total = product["total_stock"]
        return StockCheck(
            product_id=product_id,
            product_name=product["name"],
            checked_size=None,
            size_offered=True,
            in_stock=total > 0,
            quantity=total,
            available_sizes=sizes,
        )

    size_upper = size.upper()
    match = next((line for line in sizes if line.size.upper() == size_upper), None)
    if match is None:
        return StockCheck(
            product_id=product_id,
            product_name=product["name"],
            checked_size=size_upper,
            size_offered=False,
            in_stock=False,
            quantity=0,
            available_sizes=sizes,
        )

    return StockCheck(
        product_id=product_id,
        product_name=product["name"],
        checked_size=size_upper,
        size_offered=True,
        in_stock=match.quantity > 0,
        quantity=match.quantity,
        available_sizes=sizes,
    )


def find_similar_products(product_id: str) -> SearchResult:
    """Suggest real alternatives to a given product, ranked by garment type match and
    *overall* stock. Use this whenever you have to tell a shopper "no" -- a product is
    completely out of stock, doesn't come in the size/color they want, or their search turned
    up nothing -- so the conversation ends with a real option instead of a dead end.

    Excludes the original product itself. Ranks products of the same garment_type first, and
    items with any stock ahead of ones that are fully out of stock, so the top results are
    the most useful to offer. IMPORTANT: ranking is by each alternative's *total* stock across
    all sizes, not the specific size the shopper asked about -- if they wanted a particular
    size, call check_stock on an alternative before claiming it has that exact size in stock;
    otherwise just present the alternatives without a size-specific promise.
    """
    product = get_product_by_id(product_id)
    if product is None:
        raise ModelRetry(
            f"No product found with id '{product_id}'. Call search_products first to find "
            "the correct product_id -- don't guess one."
        )

    candidates, _ = search_catalogue(product["garment_type"], limit=30)
    candidates = [c for c in candidates if c["product_id"] != product_id]
    candidates.sort(key=lambda c: (c["garment_type"] != product["garment_type"], c["total_stock"] <= 0))
    top = candidates[:6]
    return SearchResult(products=[product_to_card(c) for c in top], total_matches=len(candidates))
