---
title: Plan
---

# Plan

## What we've built

- **Full-stack scaffold** - Angular 22 frontend (Material dark theme),
  Node/Express/TypeScript backend, Postgres + pgvector, Cloudflare R2 file
  storage, pluggable AI providers (Claude+Cohere / OpenAI / Ollama).
- **Database schema & migrations** - `notes` (with hybrid search columns) and
  `files` tables, auto-applied on backend startup and tracked in
  `schema_migrations`.
- **AI provider abstraction** - a single `AIProvider` interface with
  `ClaudeProvider`, `CohereProvider`, `OpenAIProvider`, and `OllamaProvider`
  implementations, selected via `AI_PROVIDER`.
- **Backend REST API** - notes CRUD, hybrid full-text + semantic search with
  highlighted snippets, file upload/download via R2, and RAG chat with cited
  sources.
- **Angular UI** - a responsive Material shell with a Home dashboard plus five
  feature views (Notes List, Note Editor, Search, Chat, Files): side nav on
  desktop, bottom tab nav on mobile.
- **Mobile UI revamp** - an 8-phase pass over the whole frontend: shared
  `--app-*` design tokens (`frontend/src/styles.scss`), a bottom nav +
  slide transition shell for handsets, a new Home dashboard (quick search,
  recent notes, file/chat counts, expandable FAB for quick add), and
  mobile-polish utilities shared across views - `HapticService`,
  `ToastService`, `PullToRefresh`, `SkeletonList`, `LongPressDirective`,
  `NoteActionSheet` (bottom sheet for edit/delete/share), `shareNote()`
  (Web Share API with clipboard fallback), and a `FilePreviewDialog` for
  inline image/PDF/note previews in the Files view.
- **Dockerized deployment** - multi-stage Dockerfiles for backend and
  frontend, a `docker-compose.yml` for local dev (Postgres + Ollama + backend
  + frontend), deployed to Railway for production.
- **Resolved Railway deployment issues**:
  1. Railpack auto-detect builder was used instead of the Dockerfile - fixed
     by setting Builder = Dockerfile (with the correct Dockerfile path) on
     each service.
  2. nginx crash-loop (`host not found in upstream "backend"`) - fixed by
     switching to a variable-based `proxy_pass` with request-time DNS
     resolution (see [docker/nginx.conf.template](../docker/nginx.conf.template)).
  3. Backend `ECONNREFUSED 127.0.0.1:5432` on startup - fixed by setting
     `DATABASE_URL=${{Postgres.DATABASE_URL}}` on the backend service.
- **Authentication + share links** (2026-06-17) - built-in password-protected
  login screen (JWT cookie, `APP_PASSWORD` / `JWT_SECRET` env vars). All API
  routes now reject unauthenticated requests. Scoped public share links: any
  note can generate a `/share/:token` URL that shows only that note's content
  with no app chrome — tokens stored in `share_links` table, revocable on
  demand. Fixed iOS native share sheet bug where `/notes/:id` (authenticated
  route) was being passed to `navigator.share()` instead of the public
  `/share/:token` URL.
- **Current status** - live on Railway: Postgres, PA-Backend, and
  Personal-Assistant (frontend) services are all green.
- **URL Ingestion** (2026-06-20) - `POST /api/notes/from-url` fetches any URL,
  extracts readable text via `@mozilla/readability` + `jsdom`, saves as a
  `content_type='link'` note with full RAG indexing. Frontend: link icon button
  in Notes list header opens `UrlImportDialog`.
- **Phase 3: Internal APIs** (2026-06-20) - Added `GET /api/internal/books*`
  to Codex (sf-fantasy-shelf) and `GET /api/internal/bourbons*` to Cheers Mate,
  each protected by `X-Internal-Key` header with separate env var secrets.
  Tested in production.
- **Phase 4: Chat Tool Calling** (2026-06-20) - Real Anthropic tool_use API
  wired into PA chat. `claudeProvider.ts` handles full tool loop
  (tool_use → execute → tool_result → final response). Four tools:
  `get_books`, `get_recent_books`, `get_bourbons`, `get_top_bourbons`.
  Model decides when to call tools based on conversation context.
- **Anthropic SDK upgrade** (2026-06-20) - `@anthropic-ai/sdk` 0.32.1 → 0.105.0
  to fix `ERR_STREAM_PREMATURE_CLOSE` on Node 22 (old SDK used node-fetch@2
  which is incompatible with Node 22 stream handling).

## Next steps

- **Automated tests** - there are no backend unit/integration tests yet
  (notes/search/chat services, AI provider abstraction), and only the default
  Angular CLI scaffold spec on the frontend. Add coverage before making
  further changes to hybrid search or the AI provider layer.
- **CI/CD** - no `.github/workflows` yet. Add a pipeline that runs
  lint/build/tests on PRs, and consider auto-deploying to Railway on merge to
  `main`.
- ~~**Authentication**~~ ✅ Done 2026-06-17 — password login + JWT sessions + scoped share links.
- **Re-embedding workflow** - switching `AI_PROVIDER` doesn't retroactively
  re-embed existing notes (and the `embedding` column's vector dimension is
  fixed at migration time per provider). Add a script or admin endpoint to
  re-embed all notes after a provider switch.
- **Observability** - add structured logging and basic uptime/error
  monitoring for the Railway services (currently diagnosed via raw deploy
  logs).
- **Search/UX polish** - pagination and date-range filters for search and the
  notes list (inline image/PDF previews in the Files view shipped in the
  mobile UI revamp's Phase 7).
- **Backups** - configure automated backups for the Railway Postgres volume.
- **PWA polish** - the mobile UI revamp added app-like touches (haptics,
  pull-to-refresh, bottom nav) but no web app manifest or service worker yet;
  consider making the app installable/offline-capable.
- **Smoke-test client-side export** - the Phase 7 generate/export flow
  (pdfmake + mermaid PNG/PDF, share, email) type-checks and bundles but hasn't
  been exercised end-to-end in a live browser (see
  [decisions.md](decisions.md) #20).
