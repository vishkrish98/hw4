# Design Pass — Campus Customs

Concrete list of what changed and why each change should keep a shopper on the site longer
and more likely to buy. Modeled directly on apple.com and allbirds.com: white space, one
bold sans typeface, huge product photography, and almost no decorative color.

## Typography

- **One typeface, used hard**: Inter, weights 400-900, replacing the system-font fallback.
  Headings are 800-weight with tight (-0.03em) letter-spacing at large sizes — the exact
  "oversized bold sans headline" treatment both reference sites use. (An earlier pass tried a
  serif display font for a boutique/editorial feel; scrapped it after actually studying the
  two reference sites, since neither uses a serif anywhere.)
- **Why:** one confident typeface at dramatic size reads as "considered brand" in a way a
  system-font mix never does, and it's the single most repeated visual cue across both
  reference sites.

## Layout: full-bleed over boxed cards

- **Home page hero** is now a full-bleed, edge-to-edge product photo with a frosted white
  card floating on top holding the headline/CTA — not a two-column layout with a small
  rotated product thumbnail in a rounded box.
- **Category tiles**: three large, edge-to-edge photo tiles (Hoodies / Crewnecks / T-Shirts)
  directly below the hero, each linking straight into a pre-filtered Products page
  (`/products?filter=hoodie`, etc.) — the exact "shop by category" band Allbirds opens with.
- **Why:** full-bleed photography makes the products themselves the visual content instead of
  competing with borders, shadows, and rounded boxes — the products sell the site instead of
  the UI chrome doing the talking.

## Product cards: borderless, minimal

- Removed the border/shadow/rounded-card treatment on every product grid; images now sit
  directly on white with the name (underlines on hover) and price below, no visible card at
  all — the Allbirds product-grid pattern.
- **Why:** with no card chrome, the products visually run together into one clean grid,
  which reads as more items/more selection at a glance and puts all visual weight on the
  photography, not on decorative boxes.

## Product detail page

- Color swatches (real dots, not colored borders) and a clickable size-pill selector replace
  the old plain-text color list and stock table; clicking a size shows exact live stock
  ("8 in stock in size L") pulled from the same data the chatbot uses.
- **Fixed a real bug**: sizes were rendering in whatever order SQLite happened to return them
  (alphabetically: L, M, S, XL, XS, XXL), not size order. Fixed centrally in the backend
  (`db.py`) so every size list in the app — the product page, the chatbot's stock answers, the
  raw API — now always reads XS → S → M → L → XL → XXL.
- **Why:** a size selector shoppers already know how to use (from literally every real
  shopping site) converts faster than a data table, and a scrambled size order is the kind of
  small broken-feeling detail that makes a storefront feel unfinished — hard to notice
  individually, easy to feel as "something's off here" collectively.

## Navigation

- Flattened from a blurred/translucent bar to a simple, slim, solid-color bar with smaller,
  lighter-weight nav text — closer to Apple's minimal top nav than a decorative glassy one.
- **Why:** a nav bar's job is to get out of the way; the previous version drew more attention
  to itself than the products it sits above.

## What stayed intentionally

- Yale blue and gold remain the only brand colors, used sparingly (nav, primary buttons, the
  Create Account CTA) — restraint was the point of studying Apple/Allbirds, not replacing the
  Yale identity with theirs.
- The chat widget's support-widget identity (avatar, status line, animated typing dots) was
  kept as-is from the prior pass; it already matched the same "considered product" bar the
  rest of the redesign is aiming for.

## Round 2: making it ours, and making it seamless

Apple/Allbirds set the visual bar, but a reskin alone doesn't make the site *ours* or make
shopping *faster*. This pass added a real brand identity and several interactions aimed
squarely at reducing clicks and friction, not just polishing pixels.

- **A real mark, not a wordmark**: a custom bulldog-in-a-shield SVG (`BrandMark.tsx`), used in
  the nav, the chat header avatar, and the chat toggle button. Nothing about it is a stock
  icon or a generic chat-bubble glyph — it's unmistakably Campus Customs wherever it shows up.
  **Why:** a wordmark alone is what every template site has; an owned mark is what makes a
  brand recognizable at a glance, including in the corner of a browser tab full of other
  tabs.
- **Quick View**: hovering (or, on touch devices, just looking at) a product card reveals a
  "Quick view" button that opens the product's image, price, description, and a live
  size/stock selector in a modal — no page navigation at all. **Why:** the single biggest
  source of friction in browsing a grid of 100+ items is that checking one item's size and
  stock used to cost a full page load and a "back" click just to glance at the next one. Now
  a shopper can check five products' stock in the time it used to take to check one.
- **"Pick up where you left off"**: every product page view is remembered (`localStorage`,
  `RecentlyViewedContext`), and a "Recently viewed" strip surfaces those items on the product
  page itself and on the homepage. **Why:** real shoppers browse in bursts across multiple
  visits or tabs; forcing them to re-search for something they already looked at is a solved
  problem on every major retail site, and it wasn't solved here before.
- **A real filter sidebar** on the Products page (`ProductFilters.tsx`) replacing the single
  category-chip row: multi-select category checkboxes (Hoodies / Crewnecks / T-Shirts & Tees /
  Jackets & Fleece / Quarter-Zips, derived from the real `garment_type` data), a two-handle
  price range slider bounded to the catalogue's actual $32–$98 span, and multi-select color
  chips built from the 22 distinct colors that actually appear in the data. All three combine
  with each other and with the free-text search (AND logic), have a "Clear all (N)" reset, and
  collapse into a "Filters" button + accordion on mobile. The homepage category tiles now deep
  link into this (`/products?category=Hoodies`) instead of a plain text search.
  **Why:** category chips could only pick one thing at a time and had no idea about price or
  color at all — a shopper who wants "a navy hoodie under $70" had no way to ask for that
  without opening the chatbot. Faceted filters like this are the default expectation on any
  real shopping site (Amazon, Allbirds, Nike); not having them made browsing feel like an
  incomplete catalogue rather than a store.
- **Personalized homepage** for logged-in shoppers ("Welcome back, Test" instead of the
  generic tagline). **Why:** we already know who's logged in (Problem 8's customer memory) —
  not using that on the very first thing a returning shopper sees was leaving an easy win on
  the table.
- **Skeleton loading states** replace plain "Loading..." text on the Products grid and the
  product detail page. **Why:** a shimmering placeholder that matches the real layout reads as
  "this is about to appear" — a blank page with a word on it reads as "did this break?"

