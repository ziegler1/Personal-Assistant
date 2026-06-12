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

## Phase 7 — Generate & Export from Chat

11. **New `AIProvider.generate(prompt)` method** for raw single-turn
    completions (no RAG system prompt), separate from `chat()`. `CohereProvider`
    (embeddings-only) throws on `generate()`, matching its existing `chat()`
    stub - fine since `AI_PROVIDER=claude` always pairs Cohere with
    `ClaudeProvider` for chat/generation.
12. **Provider-agnostic structured output via a `TITLE: <title>\n---\n<content>`
    text convention**, parsed with regex in `generateService.ts`, instead of
    relying on JSON mode (support varies across Claude/OpenAI/Ollama). For
    `workflow-diagram`, a wrapping ```` ```mermaid ``` ```` code fence is
    stripped defensively if the model ignores the "no fences" instruction.
13. **PDF/PNG export is entirely client-side** via `pdfmake` (PDF) + `mermaid`
    (diagram SVG) + Canvas 2D (`note-card` PNG and SVG→PNG conversion) in
    `frontend/src/app/shared/export-utils.ts`. Keeps the backend simple but
    means export quality/fonts are whatever pdfmake's bundled Roboto provides.
14. **Non-diagram formats render as raw `<pre>` text** in
    `GeneratedOutputDialog` (no markdown→HTML rendering in the UI) - PDF export
    still does basic markdown→pdfmake structure via `parseMarkdown()`
    (headings/lists/checklists). Could add a rendered markdown preview later if
    raw text feels unpolished.
15. **PNG export is scoped to `workflow-diagram` and `note-card` formats only**
    (per the original spec) - `markdown-doc` and `checklist` only offer
    PDF/share/email/save-as-note.
16. **"Save as note" content-type mapping**: `note-card`, `markdown-doc`, and
    `checklist` save as `content_type: 'text'`; `workflow-diagram` saves as
    `content_type: 'code'` (its content is a Mermaid diagram definition).
17. **Shareable links and "email to self" both export the generated output as
    a PDF** (via `pdf.getBase64()`), regardless of format - for
    `workflow-diagram`, the rendered diagram is embedded as a PNG inside the
    PDF. This gives one consistent shareable artifact per generation rather
    than format-specific share types.
18. **R2 share links use a 7-day presigned URL** (`r2Service.getDownloadUrl(key, 604800)`,
    the S3/R2 maximum) and insert a `files` row with `note_id = NULL` so
    exported artifacts are listed/trackable like uploaded files but aren't
    attached to any note.
19. **SMTP is optional and fails gracefully** - `emailService.sendExportEmail()`
    throws a 503 if `SMTP_HOST` or `NOTIFY_EMAIL` is unset, so "Email to self"
    simply shows an error status in the dialog rather than breaking the rest
    of the app when SMTP isn't configured (e.g. in local dev).
20. **pdfmake/mermaid CJS↔ESM interop wasn't verified in a live browser** -
    `ng build --configuration production` type-checks and bundles cleanly, and
    static analysis of `pdfmake`'s bundled output confirms `createPdf` /
    `addVirtualFileSystem` resolve correctly under esbuild's `__toESM` (via
    prototype-chain inheritance + a shared module-level virtual filesystem
    singleton), but the actual PDF/PNG download + mermaid render flow should be
    smoke-tested in `ng serve` before relying on it.
