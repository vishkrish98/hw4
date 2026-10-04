# Usability Improvements — Campus Customs

Two front-end and two agent/backend improvements. For each: what was added, and why it
helps the shopper or the business.

## Front-end improvements

### 1. Instant filter bar on the Products page

**What was added:** a text input next to the "Products" heading (`frontend/src/pages/Products.tsx`,
`.products-filter`) that filters whichever product list is currently showing — the full
102-item catalogue, or the results the chat assistant just surfaced (Problem 7) — by name,
garment type, description text, or color, entirely client-side and with no network request.
Typing "swim" instantly narrows 102 products down to the one Yale Swimming hoodie; clearing
the box restores the full list. If nothing matches, the page says so instead of showing a
blank grid.

**Why it helps:** before this, the only way to narrow down 102 products was to scroll through
all of them or go ask the chatbot. A lot of shoppers want a quick, familiar "type to filter"
control instead of a conversation — this gives them one, with zero latency since it's just
filtering data already in memory. For the business, that's a shopper who finds what they
want faster and doesn't bounce off a wall of products.

**Update (post-Problem 9):** this text box was later expanded into a full faceted filter
sidebar — category checkboxes, a real price range slider, and color chips, plus a "Sort by"
dropdown — in response to a follow-up request for standard e-commerce filters. The text box
above is still there and still works the same way; see `output/design.md`'s "Round 3:
Standard Filters" section for the fuller, current picture of the Products page.

### 2. Mobile-friendly navigation (hamburger menu) + a mobile heading fix

**What was added:** the nav bar (`frontend/src/components/NavBar.tsx` / `NavBar.css`) now
collapses to a hamburger icon below 680px width, expanding into a stacked, tappable menu
instead of the five nav items wrapping and overlapping the way they did before. The menu
closes automatically after any link is clicked (or after logging out), so it never lingers
open across a navigation. While testing this at phone width, the Home page's hero heading
was also found visually overlapping itself (its `line-height` was undefined and its
`font-size` didn't shrink for narrow screens) — fixed in the same pass with an explicit
`line-height` and a smaller mobile font size, since it's the same "actually usable on a
phone" goal.

**Why it helps:** Campus Customs shoppers browsing from a phone (very plausible for
Yale students and parents) previously hit a nav bar that visually broke and a homepage
headline that overlapped itself — a bad first impression that costs the business visits and
trust before a shopper even reaches a product. A working mobile nav and a legible homepage
are baseline expectations for any e-commerce site today.

## Agent / backend improvements

### 1. New tool: `find_similar_products` — never leave a shopper with just "no"

**What was added:** a fourth agent tool (`backend/tools.py::find_similar_products`,
registered in `backend/agent.py`) that, given a product_id, finds other real catalogue items
of the same garment type, excludes the original product, and ranks items with any stock
ahead of fully sold-out ones. `prompts/prompt.md` now instructs the agent to call it whenever
it has to tell a shopper "no" — a product is completely out of stock, doesn't come in the
size/color they wanted, or a search came up empty — and offer 1-3 real alternatives in the
same reply, rather than ending the conversation on a dead end. (The tool's docstring and the
prompt both flag that its ranking is by *overall* stock, not the specific size the shopper
asked about, so the agent verifies an exact size with `check_stock` before promising it —
this was tightened after testing showed the model could otherwise make an unverified
size-specific claim that happened to be right by luck rather than by checking.)

**Why it helps:** verified live — asking about a sold-out size ("is the Champion Reverse
Weave Crewneck in stock in a small?") now gets a reply that says it's sold out in S *and*
lists three real crewnecks that do have S in stock (verified against the exact per-size
quantities in the database). Asking for something the store doesn't carry at all ("do you
sell Yale swim goggles?") gets an honest "no" plus a relevant real alternative (a Yale
Swimming hoodie) instead of just a dead end. For the shopper, that's the difference between
leaving the site and finding something else they're happy with. For the business, every "no"
that turns into a "here's something else you might like" is a sale that didn't just walk away.

### 2. In-memory catalogue cache — removes a real N+1 query pattern

**What was added:** `backend/db.py` now loads the full catalogue+inventory join once per
server process and serves `list_all_products()` / `get_product_by_id()` from that in-memory
cache instead of re-querying SQLite every time. This was a genuine, measurable problem: every
single call to `list_all_products()` (which every `search_products` call makes) was running
1 query for the catalogue plus 1 more *inventory* query per product — 103 SQL round trips for
one search, every time, even for the exact same search repeated seconds later. There is no
endpoint that writes to `catalogue` or `inventory` at runtime, so caching this is safe (the
code comments flag that assumption explicitly, so if a write path is ever added, the cache
must be invalidated there).

**Why it helps:** measured directly with Python's `time.perf_counter()` before and after:
`search_catalogue("hoodie")` dropped from **~2.45 ms/call to ~0.25 ms/call** (about 10x), and
`get_product_by_id()` dropped from a real SQLite round trip to an in-memory dict lookup
(~0.0001 ms). On this small local SQLite file the absolute savings are modest, but the
*structural* win — 103 queries collapsed to 0 after the first request — matters a lot more
once this moves to a networked database or a busier catalogue, and it means every tool call
the agent makes (search, stock check, similar-products) responds faster, which shows up
directly as a snappier chat experience for the shopper.

## Two more improvements made in a later usability pass

### 3. Sorting

**What was added:** a "Sort by" dropdown on the Products page (Recommended / Price: Low to
High / Price: High to Low / Name: A–Z / Name: Z–A) plus a live product count, composing with
the filters above and with chat-driven search results.

**Why it helps:** the natural companion to filtering — a shopper who's narrowed down to
"hoodies under $70" usually wants to sort what's left by price next, not re-scan the grid
by eye.

### 4. Accessibility: a real bug, not a polish item

**What was added:** every product card had been a plain `<div onClick>` with no way to reach
it by keyboard and nothing for a screen reader to announce — meaning keyboard and
screen-reader users could not shop the product grid **at all**, only mouse users could.
Rebuilt `ProductGrid` so the image and title are each a real `<Link>` (reachable with Tab,
activatable with Enter), with the "Quick view" button as a sibling rather than invalidly
nested inside a link. Also added: proper dialog semantics and focus management to the Quick
View modal (focus moves to the close button on open, Tab is trapped inside it, and focus
returns to the exact button that opened it when it closes — verified directly via
`document.activeElement`, not assumed), labels on the previously-unlabeled price-slider
handles, `aria-pressed` on the size-pill/color-chip toggle buttons, and a live region on the
chat transcript so new messages are announced to screen readers.

**Why it helps:** this isn't a nice-to-have — it's the difference between a shopper using
assistive technology being able to buy something on this site at all versus not. It's also
the kind of defect that's invisible if you only ever test with a mouse, which is exactly how
it was found: by deliberately testing with a keyboard instead of assuming the existing UI
was fine.
