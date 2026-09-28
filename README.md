# Campus Customs — HW4

A Yale-branded apparel storefront (React + Vite + TypeScript frontend, FastAPI backend) with
a PydanticAI shop-assistant chatbot grounded in a real SQLite catalogue/inventory/users
database.

## Repo layout

```
hw4/
├── AI_prompts.md          # log of every vibe-coder prompt used to build this, by problem
├── requirements.txt       # backend Python dependencies
├── .env.example           # copy to .env and fill in your own key
├── frontend/              # Vite + React + TypeScript app
├── backend/
│   ├── main.py            # FastAPI app — run with: uvicorn main:app --reload --port 8000
│   ├── agent.py           # PydanticAI agent wiring (model, tools, deps, loop limits)
│   ├── models.py          # Pydantic / PydanticAI types
│   ├── tools.py           # the four tools the agent can call
│   ├── audit.py           # append-only agent-activity audit log
│   ├── db.py               # shared SQLite access
│   ├── auth.py / security.py  # accounts, sessions, password hashing
│   └── prompts/
│       └── prompt.md      # the agent's system prompt (voice + safety rules)
└── output/
    ├── harness.md          # how the whole system works: models, tools, safety, specs
    ├── design.md           # the visual design pass and why
    ├── usability.md        # the usability improvements and why
    ├── app_check.html      # screenshots proving the live app works (open directly in a browser)
    ├── app_check_images/   # screenshots linked from app_check.html
    └── audit_trail.json    # append-only log of real agent tool-call activity
```

The agent itself is exactly four files under `backend/`: `prompts/prompt.md`, `agent.py`,
`tools.py`, `models.py`. Everything else in `backend/` (`main.py`, `db.py`, `auth.py`,
`security.py`, `audit.py`) is supporting API/infrastructure code the agent runs inside.

## What's *not* in this repo

The SQLite database and product photos are a local-only data pack, excluded via
`.gitignore` (they're large binary assets, not source code). Nothing here will run until you
place that data pack yourself — see step 1 below.

## Setup

### 1. Place the local-only data pack

You should have a `data/` folder (or `data.zip`) containing `campus_customs.db` and a
`products/` folder of images. Put it at the **repo root**, so you end up with:

```
hw4/
├── data/
│   ├── campus_customs.db
│   └── products/
├── backend/
├── frontend/
└── ...
```

If you only have `data.zip`, unzip it at the repo root (`unzip data.zip`) — it already
extracts into `data/`.

### 2. Backend

```bash
cd hw4
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# then edit .env and set PORTKEY_API_KEY to your own key
# (or whatever key you use for your AI model calls)

cd backend
uvicorn main:app --reload --port 8000
```

The API is now running at `http://localhost:8000` (check `http://localhost:8000/api/health`).

### 3. Frontend

In a second terminal:

```bash
cd hw4/frontend
npm install
npm run dev
```

Vite serves the site at `http://localhost:5180` (configured in `frontend/vite.config.ts`).
Open that URL in a browser.

### 4. Try it out

- Browse products, use the filters (category / price / color) and sort on the Products page.
- Click the chat bubble in the bottom-right corner and ask something like "what hoodies do
  you have?" or "is the basic hoodie big yale in stock in a large?"
- A seed account already exists for logging in: **test@campuscustoms.yale.edu** /
  **password**. Chat history persists for logged-in shoppers across visits.

## Model / API key

The agent calls `gpt-5.6-luna` through [Portkey](https://portkey.ai)'s OpenAI-compatible
gateway. Set your own key as `PORTKEY_API_KEY` in `.env` — see `output/harness.md` for the
full model/agent configuration (loop limits, tools, safety rules, etc.).

## Further reading

- `output/harness.md` — the full system reference: every `models.py` field and why it
  exists, the four tools, the safety rules, and exact specs (loop limits, result caps, run
  commands).
- `output/design.md` / `output/usability.md` — the design and usability decisions made along
  the way, and why.
- `output/app_check.html` — open directly in a browser for screenshot-backed proof the live
  app works (chat stock/price accuracy, dynamic search results, a usability feature).
- `AI_prompts.md` — the full prompt-by-prompt build log for this project.
