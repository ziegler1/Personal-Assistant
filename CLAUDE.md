# Personal Assistant

## Memory
This project uses Memory Vault (Postgres-backed, via MCP) for persistent memory instead of native Claude Code memory files. Always use the `memory-vault` MCP tools (`remember`, `recall`) with `space: "personal-assistant"` to save and retrieve context across sessions — do not write to `.claude/projects/.../memory/*.md`.

## Architecture
- **Backend**: Express 4 + TypeScript, raw `pg` (no ORM), migrations in `backend/src/db/migrations/` (SQL files, auto-run on startup)
- **Frontend**: Angular 22 standalone components + signals, Angular Material dark theme
- **DB**: Postgres 16 + pgvector. One pool in `backend/src/db/pool.ts`. Migration runner in `backend/src/db/migrate.ts`.
- **File storage**: Cloudflare R2 via AWS SDK v3
- **AI**: Pluggable providers (Claude+Cohere / OpenAI / Ollama) selected by `AI_PROVIDER` env var

## Auth (added 2026-06-17)
- **Mechanism**: JWT stored in an `httpOnly` cookie (`pa_session`), signed with `JWT_SECRET`, 7-day expiry
- **Password**: Single `APP_PASSWORD` env var — no user table
- **Backend**: `requireAuth` middleware in `backend/src/middleware/auth.ts` applied to all `/api/*` routes except `/api/auth/*` and `/api/share/*`
- **Frontend**: `authGuard` on all routes except `/login` and `/share/:token`; `authInterceptor` adds `withCredentials: true` to all API calls and redirects to `/login` on 401
- **Login page**: `/login` — no app shell (sidebar/nav hidden)
- **Logout**: sidebar "Sign out" button → `POST /api/auth/logout` → clears cookie → `/login`

## Share Links (added 2026-06-17)
- **Table**: `share_links` (migration `009_share_links.sql`) — `token VARCHAR(128) UNIQUE`, `note_id FK→notes`, `revoked_at`
- **Public endpoint**: `GET /api/share/:token` — no auth, returns only the note's public fields (never note ID or embedding)
- **Create**: `POST /api/notes/:id/share` (authenticated) — generates a 32-byte hex token
- **Revoke**: `DELETE /api/notes/:id/share/:token` (authenticated)
- **Frontend**: Share button in note editor view → calls API → shows inline URL panel with copy/revoke. Also wired to action sheet share in notes-list and home via `shared/share-note.ts`
- **Share view**: `/share/:token` — no sidebar, no nav, renders only the note content
- **Bug fixed**: `shared/share-note.ts` was previously passing `/notes/:id` (authenticated route) to `navigator.share()` — now correctly calls the API first and passes `/share/:token`

## URL Ingestion (added 2026-06-20)
- **Endpoint**: `POST /api/notes/from-url` — validates URL, fetches page, extracts readable text via `@mozilla/readability` + `jsdom`, saves as note with `content_type='link'` and `source=<url>`
- **Frontend**: "link" icon button in Notes list header → `UrlImportDialog` component at `frontend/src/app/features/notes/url-import-dialog/`
- **Packages**: `@mozilla/readability`, `jsdom`, `@types/jsdom` added to backend dependencies
- **Failure handling**: malformed URL → 400, HTTP error → 422 with message, JS-only sites → note created with whatever static content the server returned

## Chat Tool Calling (added 2026-06-20)
- **Pattern**: Real Anthropic tool_use API — tools defined in `backend/src/ai/types.ts` (`ToolDefinition`, `ToolExecutor`), passed to `AIProvider.chat()`, Claude decides when to invoke
- **Tool loop**: `claudeProvider.ts` handles `stop_reason === 'tool_use'` in a loop — executes tool via `executor(toolName)`, feeds back `tool_result`, repeats until final text response
- **Collection tools**: `backend/src/ai/tools/collectionsTool.ts` — 4 tools: `get_books`, `get_recent_books`, `get_bourbons`, `get_top_bourbons`
  - Codex (sf-fantasy-shelf): `GET /api/internal/books` and `/books/recent` — keyed by `CODEX_API_URL` + `CODEX_INTERNAL_KEY`
  - Cheers Mate: `GET /api/internal/bourbons` and `/bourbons/top-rated` — keyed by `CHEERS_API_URL` + `CHEERS_INTERNAL_KEY`
  - `buildCollectionTools()` only registers tools whose backing env vars are set — safe to leave unconfigured
  - 5-second timeout via `AbortSignal.timeout(5000)`, always returns `[]` on failure (never throws)
- **Graceful degradation**: Ollama/OpenAI providers accept but ignore tool params — tool calling is Claude-only
- **Email**: Uses Resend API (`RESEND_API_KEY`), NOT SMTP. `emailService.ts` uses `fetch()` to `api.resend.com`. `nodemailer` removed.

## External APIs (added 2026-06-20)
- **Codex internal API**: `https://backend-production-37fc.up.railway.app/api/internal/books*` — `X-Internal-Key: $CODEX_INTERNAL_KEY`
- **Cheers Mate internal API**: `https://distinguished-youth-production.up.railway.app/api/internal/bourbons*` — routed via nginx frontend proxy → `X-Internal-Key: $CHEERS_INTERNAL_KEY`
  - Note: use the `distinguished-youth` (frontend) URL, NOT `tranquil-analysis` (backend direct) — the backend has no working public port

## Key conventions
- **No ORM** — raw SQL via `pg` pool
- **VARCHAR + CHECK** constraints, never Postgres enums for new columns
- **asyncHandler pattern** — wrap route handlers in try/catch with `next(err)`
- **`user_id DEFAULT 1`** — single-user app; no multi-user support needed
- **`@Service()`** decorator (Angular 22) — not `@Injectable({ providedIn: 'root' })`
- Types mirrored between `backend/src/types/models.ts` and `frontend/src/app/core/models/note.model.ts`

## Dev commands
```sh
# Backend (from backend/)
npm run dev        # tsx watch, port 3000, runs migrations on start
npm run build      # tsc + copy migrations to dist/
npm run migrate    # run migrations standalone

# Frontend (from frontend/)
npm start          # ng serve, port 4200, proxies /api/* to localhost:3000
ng build           # production build to dist/
```

## Required env vars
See `backend/.env.example` for the full list. Key vars:
- `APP_PASSWORD` — login passphrase
- `JWT_SECRET` — long random string for signing session cookies
- `ANTHROPIC_API_KEY` — required when `AI_PROVIDER=claude`. **Note**: SDK version must be ≥ 0.105.0 (old 0.32.x used node-fetch which fails with ERR_STREAM_PREMATURE_CLOSE on Node 22)
- `CLAUDE_CHAT_MODEL` — defaults to `claude-sonnet-4-6` (update when model is superseded)
- `RESEND_API_KEY` — for email export (`emailService.ts` uses Resend REST API, not SMTP)
- `CODEX_API_URL` / `CODEX_INTERNAL_KEY` — Codex book collection tool (optional)
- `CHEERS_API_URL` / `CHEERS_INTERNAL_KEY` — Cheers Mate bourbon tool (optional)

## Deployment (Railway)
- Backend service: `docker/backend.Dockerfile`, build context = repo root
- Frontend service: `docker/frontend.Dockerfile`, build context = repo root
- Set `BACKEND_HOST=<backend-service-name>.railway.internal` on the frontend service
- Migrations run automatically on backend startup
- See `docs/plan.md` and README for full Railway setup steps
