"""Shared SQLite access for the catalogue/inventory/users tables.

Used by main.py (REST endpoints), auth.py (accounts/sessions), and tools.py
(agent tool calls) so there is one place that knows the schema and the DB path.
"""

import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "campus_customs.db"
PRODUCTS_DIR = BASE_DIR / "data" / "products"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# Canonical size order. The `inventory` table has no ordering column, so SQLite was
# returning rows alphabetically (L, M, S, XL, XS, XXL) -- every size list in the app (product
# detail pills, check_stock's available_sizes, the REST API) sorts through this instead.
SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]


def _size_sort_key(size: str) -> tuple[int, str]:
    size_upper = size.upper()
    if size_upper in SIZE_ORDER:
        return (SIZE_ORDER.index(size_upper), size_upper)
    return (len(SIZE_ORDER), size_upper)


def row_to_product(conn: sqlite3.Connection, row: sqlite3.Row) -> dict:
    product = dict(row)
    product["colors"] = json.loads(product["colors"])
    product["search_tags"] = json.loads(product["search_tags"])
    product["image_url"] = f"/media/products/{Path(product['image_file_path']).name}"

    inventory_rows = conn.execute(
        "SELECT size, quantity FROM inventory WHERE product_id = ?",
        (product["product_id"],),
    ).fetchall()
    inventory = sorted((dict(r) for r in inventory_rows), key=lambda r: _size_sort_key(r["size"]))
    product["inventory"] = inventory
    product["total_stock"] = sum(r["quantity"] for r in inventory)
    return product


# In-memory cache of the catalogue+inventory join, keyed by product_id. Nothing in this app
# ever writes to `catalogue` or `inventory` at runtime (there's no admin/write endpoint), so
# it's safe to load this once per process instead of re-running 1 + N queries (the catalogue
# row, then a separate inventory query per product) on every single search/lookup. If a write
# path is ever added for products or stock, this cache must be invalidated there.
_catalogue_cache: dict[str, dict] | None = None


def _load_catalogue_cache() -> dict[str, dict]:
    global _catalogue_cache
    if _catalogue_cache is None:
        conn = get_connection()
        try:
            rows = conn.execute("SELECT * FROM catalogue ORDER BY name").fetchall()
            products = [row_to_product(conn, row) for row in rows]
        finally:
            conn.close()
        _catalogue_cache = {p["product_id"]: p for p in products}
    return _catalogue_cache


def list_all_products() -> list[dict]:
    return list(_load_catalogue_cache().values())


def get_product_by_id(product_id: str) -> dict | None:
    return _load_catalogue_cache().get(product_id)


def _singularize(word: str) -> str:
    """Very small plural stripper so "hoodies" still matches catalogue text saying "hoodie"."""
    if len(word) > 3 and word.endswith("ies"):
        return word[:-3] + "y"
    if len(word) > 3 and word.endswith("es"):
        return word[:-2]
    if len(word) > 3 and word.endswith("s") and not word.endswith("ss"):
        return word[:-1]
    return word


def search_catalogue(query: str, limit: int = 12) -> tuple[list[dict], int]:
    """Rank catalogue products by how many query words match name/type/description/colors/tags.

    Each query word is checked both as typed and singularized, so a plural like "hoodies"
    still matches catalogue text that only ever says "hoodie". Returns (top matches up to
    `limit`, total number of matches) so callers can tell when results were truncated.
    """
    raw_terms = [t for t in query.lower().split() if t]
    if not raw_terms:
        return [], 0
    terms = {t for term in raw_terms for t in (term, _singularize(term))}

    products = list_all_products()

    def score(product: dict) -> int:
        haystack = " ".join(
            [
                product["name"].lower(),
                product["garment_type"].lower(),
                product["description"].lower(),
                " ".join(c.lower() for c in product["colors"]),
                " ".join(t.lower() for t in product["search_tags"]),
            ]
        )
        return sum(1 for term in terms if term in haystack)

    scored = [(score(p), p) for p in products]
    scored = [pair for pair in scored if pair[0] > 0]
    scored.sort(key=lambda pair: pair[0], reverse=True)
    total_matches = len(scored)
    return [p for _, p in scored[:limit]], total_matches


def ensure_chat_messages_schema(conn: sqlite3.Connection) -> None:
    """The seed `chat_messages` table predates customer memory; add the column that stores
    each turn's serialized PydanticAI messages so a returning shopper's conversation can be
    replayed back into the agent, not just displayed as static text."""
    cols = {row["name"] for row in conn.execute("PRAGMA table_info(chat_messages)").fetchall()}
    if "agent_messages_json" not in cols:
        conn.execute("ALTER TABLE chat_messages ADD COLUMN agent_messages_json TEXT")
        conn.commit()


def save_chat_message(
    conn: sqlite3.Connection,
    user_id: int,
    role: str,
    content: str,
    products_json: str | None = None,
    agent_messages_json: str | None = None,
) -> None:
    conn.execute(
        """
        INSERT INTO chat_messages (user_id, role, content, products_json, agent_messages_json)
        VALUES (?, ?, ?, ?, ?)
        """,
        (user_id, role, content, products_json, agent_messages_json),
    )
    conn.commit()


def get_recent_chat_rows(user_id: int, limit: int) -> list[dict]:
    """The most recent `limit` chat_messages rows for a user, oldest first."""
    conn = get_connection()
    try:
        ensure_chat_messages_schema(conn)
        rows = conn.execute(
            """
            SELECT role, content, products_json, agent_messages_json, created_at
            FROM chat_messages
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
        return [dict(r) for r in reversed(rows)]
    finally:
        conn.close()
