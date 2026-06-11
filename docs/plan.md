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
- **Angular UI** - a responsive Material shell (sidenav + mobile toolbar) and
  five feature views: Notes List, Note Editor, Search, Chat, Files.
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
- **Current status** - live on Railway: Postgres, PA-Backend, and
  Personal-Assistant (frontend) services are all green.

## Next steps

- **Automated tests** - there are no backend unit/integration tests yet
  (notes/search/chat services, AI provider abstraction), and only the default
  Angular CLI scaffold spec on the frontend. Add coverage before making
  further changes to hybrid search or the AI provider layer.
- **CI/CD** - no `.github/workflows` yet. Add a pipeline that runs
  lint/build/tests on PRs, and consider auto-deploying to Railway on merge to
  `main`.
- **Authentication** - the API and frontend currently have no auth; anyone
  with the Railway URL can read/write notes and chat. Add at least basic auth
  or a login flow before sharing the URL beyond yourself.
- **Re-embedding workflow** - switching `AI_PROVIDER` doesn't retroactively
  re-embed existing notes (and the `embedding` column's vector dimension is
  fixed at migration time per provider). Add a script or admin endpoint to
  re-embed all notes after a provider switch.
- **Observability** - add structured logging and basic uptime/error
  monitoring for the Railway services (currently diagnosed via raw deploy
  logs).
- **Search/UX polish** - pagination and date-range filters for search and the
  notes list; inline previews for image/PDF files in the Files view.
- **Backups** - configure automated backups for the Railway Postgres volume.
