---
title: Decisions to review
---

# Decisions to review

Running list of judgment calls made while implementing the phased enhancement
plan, flagged for review as potential next steps once all phases are done.

## Phase 4 — File Ingestion Pipeline

1. **Auto-created note `content_type`** - both PDF- and OCR-derived notes use
   `content_type: 'file'`. Could be split (e.g. distinguish PDFs vs. images)
   if that's useful for filtering/search later.
2. **Empty-content behavior differs by file type** - PDFs always create a
   linked note (even if text extraction yields nothing); images only create a
   note if OCR finds non-empty text. Easy to make consistent either way.
3. **Tesseract traineddata fetched at runtime** - `tesseract.js` downloads
   `eng.traineddata` (~4MB) from the jsdelivr CDN on first OCR call per
   container and caches it in `/app`. Adds a one-time ~1-2s delay on the first
   OCR request after each deploy/restart. Could pre-bake into the Docker image
   for fully offline/deterministic builds if that becomes a problem.

## Phase 5 — Search & Chat Enhancements

4. **Source preview is a modal, not a side panel** - reuses the existing
   `MatDialog` pattern (same as Quick Add). Could be changed to a slide-out
   side panel if that's preferred for larger notes.
5. **`chat_messages` has no retention/pruning** - the table grows indefinitely.
   Consider capping to the last N messages or auto-deleting after X days if
   storage becomes a concern.
6. **Content-type filter isn't stored in chat history** - only the resulting
   messages/sources are persisted; which filter was active for a given turn
   isn't recorded.

## Phase 6 — Web Search via Tavily

7. **`WebSearchProvider` is a separate, single-implementation abstraction** -
   unlike `AIProvider` (selected via `AI_PROVIDER` with multiple
   implementations), `getWebSearchProvider()` always returns `TavilyProvider`.
   If another web search backend is ever wanted, the interface is in place to
   add a second implementation + selector.
8. **Web search auto-triggers when the best note match's similarity < 0.5**,
   or always when the message starts with `search:`. The `0.5` threshold is a
   judgment call - tune if web search fires too often/rarely.
9. **Missing `TAVILY_API_KEY` degrades silently** - `chat()` catches the
   "not configured" error and just returns no web results, so chat keeps
   working without Tavily configured.
10. **Web results are persisted per chat turn** (new `web_results` JSONB
    column on `chat_messages`), so "Save to notes" buttons still work when
    reloading chat history, but which filter/threshold caused them to appear
    isn't recorded (same as #6 for the content-type filter).
