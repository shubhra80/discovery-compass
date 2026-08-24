# Discovery Compass

An AI-powered discovery interview intelligence tool for product teams. Each PM interviews customers about the feature they own — but customers naturally bring up everything else too. Discovery Compass reads every transcript, decomposes it into individual insights, tags each one to the specific feature it's about, and surfaces it on a shared dashboard the whole team can search and filter — so signal from any conversation reaches the PM who actually owns it, not just whoever conducted the interview. A semantic search layer on top lets anyone ask a plain-language question and get a grounded, cited answer pulled from across the entire interview corpus.

**Live:** [discovery-compass-live.vercel.app](https://discovery-compass-live.vercel.app)

<img src="docs/discovery-compass-screenshot.png" width="800" alt="Discovery Compass dashboard">

## The problem

Discovery interviews are a goldmine of customer signal, but in most teams that signal is siloed by whoever happened to run the interview. A PM interviewing about Feature A often hears real, useful feedback about Features B, C, and D — and that feedback typically evaporates unless they remember to manually pass it along. Across hundreds of interviews over time, that's a lot of lost signal, and tag-based browsing alone still requires knowing roughly what you're looking for.

## How it works

1. A transcript is processed by Claude, which breaks it into discrete insight snippets — individual moments where the customer raised a blocker, feature request, piece of praise, confusion, or workaround.
2. Each snippet is tagged against a shared feature taxonomy and stored alongside which PM owns that feature.
3. Every PM can browse and filter the full, shared pool of insights — not just their own interviews — with a "my features" view that surfaces what's relevant to them first.
4. A trending strip highlights the single feature gaining the most mentions and the one cooling off, comparing the last 30 days against the 30 days before, based on when each interview actually happened.
5. On top of tag-based browsing, a semantic search layer lets anyone ask a natural-language question and retrieve an answer grounded in the most relevant snippets across every interview, regardless of feature tag — see below.

## How semantic search works (RAG)

The "Ask the Corpus" tab is a retrieval-augmented generation (RAG) pipeline built on top of the existing insight snippets:

1. **Embedding** — every snippet's text is converted into a 1024-dimensional vector using Voyage AI (`voyage-3.5-lite`), capturing its meaning rather than its exact wording. This runs once as a backfill (`scripts/backfill-embeddings.js`) and again for any newly ingested snippet.
2. **Storage** — vectors are stored directly in Postgres via Supabase's `pgvector` extension, alongside the existing snippet data.
3. **Retrieval** — when a question comes in, it's embedded the same way, then compared against every stored snippet vector using cosine similarity (a Postgres function, `match_snippets`) to find the 10 most relevant snippets, regardless of which feature they're tagged to.
4. **Generation** — those 10 snippets are passed to Claude with an instruction to answer using only that context and cite which snippets support each claim, and to say so honestly if the corpus doesn't contain enough to answer.
5. **Citation** — the response includes both the generated answer and the underlying snippets, so every claim is traceable back to a real interview excerpt.

This is the one part of the app that runs live rather than pre-generated, since the whole point is answering questions nobody's asked yet — see below for how that's handled safely.

## Screens

- **Dashboard** — the main view. A trending strip, search and filter controls (by feature, by PM), and a feed of tagged insights. Clicking an insight opens a summary of the interview it came from, with a link to the full transcript.
- **Ask the Corpus** — a natural-language search box that answers questions by retrieving and citing the most relevant insights across every interview, using the RAG pipeline described above.
- **Discovery Corpus** — the searchable archive of every interview, with an AI-generated summary and the full transcript available on expand.
- **How It Works** — a guided replay of a real interview being decomposed into insights live, showing the tagging and cross-PM routing mechanic in action.

## Why most of the public site is read-only

The deployed site reads from the database for browsing, filtering, and the How It Works replay — it never writes, and outside of semantic search, it never makes a live AI call either. New interviews are ingested by running scripts locally against the database using a separate secret key that never ships to the browser. This keeps most of the site free to run at any traffic volume with no risk of a stranger triggering paid API calls or writing garbage data into a public database.

**The one exception is semantic search.** Answering an open-ended question can't be pre-generated, since there's no way to know in advance what someone will ask — so each search does make a live call to Voyage (to embed the question) and Claude (to generate the answer), through a serverless function that holds the necessary keys server-side, never exposed to the browser. Each question is short and the retrieved context is capped at 10 snippets, so the cost per search is small and predictable.

## Demo dataset

The dataset is fictional: 5 PMs, 20 features across 5 themes (Retention, Growth, Tech Debt, AI/Automation, Enterprise/Compliance), and 100 synthetic discovery interviews generated by Claude and spread across a 6-month window, with two features deliberately trending up and down to demonstrate the trending logic against real data shape.

## Tech stack

React · Vite · Tailwind CSS v4 · Supabase (Postgres + pgvector) · Claude API (Anthropic) · Voyage AI (embeddings) · Vercel

## Local development

```bash
npm install
npm run dev
```

Requires a `.env` file with:
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
Note: the semantic search feature (`/api/search`) only runs on Vercel, since it depends on a serverless function — it won't work under `npm run dev` locally.

## Data ingestion & processing scripts

Located in `/scripts`, run separately from the deployed app using a Supabase secret key (never exposed to the browser):

- `ingest.js` — process a single transcript file into tagged, stored insights
- `generate.js` — generate a full synthetic dataset of interviews for demo purposes
- `backfill-summaries.js` — generate AI summaries for interviews that don't yet have one
- `backfill-embeddings.js` — generate Voyage AI embeddings for snippets that don't yet have one, enabling semantic search