# Zig's Personal Assistant

A self-hosted personal knowledge base: capture notes, files, and links, search
them with hybrid keyword + semantic search, and chat with an AI assistant that
cites your own notes as sources.

## Features

- **Notes** - create/edit/delete notes with a title, content, content type
  (text, code, chat, file, link), source, and tags.
- **Hybrid search** - combines PostgreSQL full-text search with pgvector
  semantic similarity for relevant results, complete with highlighted
  snippets.
- **AI chat** - ask questions about your notes; the assistant retrieves
  relevant notes and answers with citations, with optional web search
  fallback via Tavily.
- **File storage** - drag-and-drop file uploads to Cloudflare R2, optionally
  linked to a note, with inline image/PDF previews.
- **Pluggable AI providers** - switch between Claude (chat) + Cohere
  (embeddings), OpenAI, or a fully local Ollama setup via one env var.
- **Authentication** - password-protected login screen (JWT session cookie); all API routes reject unauthenticated requests. Set `APP_PASSWORD` and `JWT_SECRET` env vars.
- **Scoped share links** - generate a unique, unguessable public link for any note. Recipients see only that note's content — no sidebar, no navigation, no access to anything else. Links can be revoked instantly.
- **Mobile-friendly UI** - a Home dashboard (quick search, recent notes, FAB
  for quick add), bottom tab navigation on handsets, pull-to-refresh,
  long-press action sheets (edit/delete/share), skeleton loaders, haptic
  feedback, and native share sheet for note links (iOS/Android).

## Tech stack

| Layer       | Technology                                              |
| ----------- | -------------------------------------------------------- |
| Frontend    | Angular 22 (standalone components, signals, Angular Material, dark theme) |
| Backend     | Node.js, Express, TypeScript                             |
| Database    | PostgreSQL + pgvector (hybrid full-text + vector search)  |
| File storage| Cloudflare R2 (S3-compatible)                            |
| AI chat     | Claude (`claude-sonnet-4-5`), OpenAI, or local Ollama     |
| AI embeddings | Cohere `embed-english-v3.0`, OpenAI `text-embedding-3-small`, or local `nomic-embed-text` |
| Hosting     | Railway (Docker images for backend + frontend)           |

## Project structure

```
.
├── backend/              # Express + TypeScript API
│   └── src/
│       ├── ai/           # AIProvider abstraction (Claude/Cohere/Ollama/OpenAI)
│       ├── db/           # Postgres pool + migrations
│       ├── routes/        # /api/notes, /api/files, /api/chat
│       └── services/      # notes, chat, R2 file storage
├── frontend/             # Angular 22 app (Material, dark theme)
│   └── src/app/
│       ├── core/          # API services + models, haptic/toast services
│       ├── layout/        # Sidebar (desktop) + bottom nav (mobile) + app shell
│       ├── shared/         # Pull-to-refresh, skeleton loaders, action sheets, etc.
│       └── features/      # home, notes, search, chat, files views
├── docker/               # Dockerfiles + nginx reverse-proxy template
├── docker-compose.yml    # Postgres (pgvector) + Ollama + backend + frontend
└── .env.example          # All environment variables, with defaults
```

## Quick start (Docker Compose)

This is the fastest way to run everything locally, including a fully local AI
stack via Ollama (no API keys required).

1. Copy the env file and adjust if needed:

   ```sh
   cp .env.example .env
   ```

   The defaults use `AI_PROVIDER=ollama`, which requires no API keys.

2. Start everything:

   ```sh
   docker compose up --build
   ```

   This starts:
   - `postgres` - Postgres 16 with the `pgvector` extension (port 5432)
   - `ollama` - local Ollama server (port 11434)
   - `backend` - Express API (port 3000), runs DB migrations on startup
   - `frontend` - Angular app served by nginx, reverse-proxies `/api/*` to the
     backend (port 4200)

3. Pull the Ollama models (one-time, after the `ollama` container is up):

   ```sh
   docker compose exec ollama ollama pull qwen3:8b
   docker compose exec ollama ollama pull nomic-embed-text
   ```

4. Open http://localhost:4200.

> If you already use Claude or OpenAI, set `AI_PROVIDER=claude` or
> `AI_PROVIDER=openai` in `.env`, fill in the matching API key(s), and you can
> remove the `ollama` service from `docker-compose.yml`.

### Switching AI providers and re-running migrations

The `notes.embedding` column's vector dimension depends on `AI_PROVIDER`
(1024 for Claude/Cohere, 1536 for OpenAI, 768 for Ollama/nomic-embed-text).
Migrations are applied automatically on backend startup and are tracked in a
`schema_migrations` table, so changing `AI_PROVIDER` **after** notes already
have embeddings will not retroactively re-embed them. For a clean switch,
either start from a fresh database or re-embed existing notes.

## Local development without Docker

You'll need Node.js 22+, a Postgres instance with `pgvector` (the
docker-compose `postgres` service works well even if you run the apps
natively), and optionally a local Ollama install.

1. **Database** - start just Postgres:

   ```sh
   docker compose up postgres
   ```

2. **Backend**:

   ```sh
   cd backend
   cp .env.example .env   # adjust DATABASE_URL, AI_PROVIDER, etc.
   npm install
   npm run dev             # tsx watch, runs migrations on startup, port 3000
   ```

3. **Frontend**:

   ```sh
   cd frontend
   npm install
   npm start               # ng serve, port 4200
   ```

   `ng serve` proxies `/api/*` to `http://localhost:3000` via
   `frontend/proxy.conf.json`. If your backend runs on a different port,
   update the `target` in that file.

## Environment variables

All variables live in `.env.example` (root) with defaults suitable for local
Docker Compose use. Each service also has its own `.env.example` for running
outside Docker.

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (must point at a database with `pgvector`) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Used by the docker-compose `postgres` service |
| `AI_PROVIDER` | `claude` \| `ollama` \| `openai` - selects chat + embedding providers |
| `ANTHROPIC_API_KEY` | Required when `AI_PROVIDER=claude` |
| `COHERE_API_KEY` | Required when `AI_PROVIDER=claude` (used for embeddings) |
| `OPENAI_API_KEY` | Required when `AI_PROVIDER=openai` |
| `OLLAMA_BASE_URL` | Ollama server URL (default `http://ollama:11434` in Docker, `http://localhost:11434` locally) |
| `OLLAMA_CHAT_MODEL` / `OLLAMA_EMBED_MODEL` | Default `qwen3:8b` / `nomic-embed-text` |
| `TAVILY_API_KEY` | [Tavily](https://tavily.com) API key for web search in chat (`search:` prefix or low-confidence fallback). Optional - without it, web search is skipped and chat falls back to notes/general knowledge |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_ENDPOINT` | Cloudflare R2 credentials for file storage |
| `RESEND_API_KEY` | [Resend](https://resend.com) API key for the "email to self" export action. Optional — leave blank to disable (endpoint returns 503) |
| `SMTP_FROM` | Sender address for email exports (e.g. `you@yourdomain.com`). Falls back to `onboarding@resend.dev` on Resend's free tier |
| `NOTIFY_EMAIL` | Default recipient for "email to self" exports |
| `APP_PASSWORD` | Login passphrase for the built-in auth gate |
| `JWT_SECRET` | Long random string used to sign session cookies — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `PORT` | Backend port (default `3000`) |
| `CORS_ORIGIN` | Allowed origin for the frontend (default `http://localhost:4200`) |

## API overview

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/notes` | List notes, optional `?tag=` and `?content_type=` filters |
| `POST` | `/api/notes` | Create a note (and embed its content) |
| `GET` | `/api/notes/search?q=` | Hybrid full-text + semantic search |
| `GET` | `/api/notes/:id` | Get a note with its attached files |
| `PUT` | `/api/notes/:id` | Update a note (re-embeds if content changes) |
| `DELETE` | `/api/notes/:id` | Delete a note |
| `GET` | `/api/files` | List uploaded files |
| `POST` | `/api/files/upload` | Upload a file to R2 (multipart, optional `note_id`) |
| `GET` | `/api/files/:id/download` | Get a presigned download URL |
| `DELETE` | `/api/files/:id` | Delete a file |
| `POST` | `/api/chat` | Send a chat message; returns a reply with cited note sources |
| `POST` | `/api/chat/generate` | Transform a chat message into a note card, workflow diagram, markdown doc, or checklist |
| `POST` | `/api/export/share` | Upload a generated export to R2 and return a 7-day shareable link |
| `POST` | `/api/export/email` | Email a generated export to `NOTIFY_EMAIL` (requires `RESEND_API_KEY`) |
| `POST` | `/api/auth/login` | Authenticate with `APP_PASSWORD`; sets a session cookie |
| `POST` | `/api/auth/logout` | Clear the session cookie |
| `GET` | `/api/auth/me` | Check if the current session is valid |
| `POST` | `/api/notes/:id/share` | Generate a public share token for a note |
| `GET` | `/api/notes/:id/shares` | List all share links for a note |
| `DELETE` | `/api/notes/:id/share/:token` | Revoke a share link |
| `GET` | `/api/share/:token` | **Public** — fetch shared note content (no auth required) |

## Deploying to Railway

1. **Create a Postgres database** with the `pgvector` extension. Railway's
   official Postgres template doesn't include `pgvector` by default - either
   use a community template that does, or deploy the
   `pgvector/pgvector:pg16` image as a Railway service with a volume.

2. **Backend service**:
   - Deploy from this repo using `docker/backend.Dockerfile` as the
     Dockerfile path, with build context set to the repo root.
   - Set environment variables: `DATABASE_URL=${{<postgres-service-name>.DATABASE_URL}}`
     (a Railway variable reference to your Postgres service - without this,
     `DATABASE_URL` is empty and the app falls back to `127.0.0.1:5432`,
     causing migrations to crash-loop with `ECONNREFUSED`), `AI_PROVIDER` and
     the matching API key(s), `R2_*` credentials, `CORS_ORIGIN` (your
     frontend's Railway URL), and `PORT` (Railway sets this automatically -
     the app reads `process.env.PORT`).
   - Migrations run automatically on startup.

3. **Frontend service**:
   - Deploy from this repo using `docker/frontend.Dockerfile`, build context
     set to the repo root.
   - Set `BACKEND_HOST` to the backend service's **internal Railway
     hostname**: `<backend-service-name>.railway.internal` (replace
     `<backend-service-name>` with whatever you named the backend service in
     your Railway project - the Dockerfile's default `BACKEND_HOST=backend`
     is only valid for docker-compose and will not resolve on Railway). Set
     `BACKEND_PORT=3000`.
   - Railway sets `PORT` automatically; the nginx template listens on
     `${PORT}`.
   - The nginx template resolves `BACKEND_HOST` at request time using the
     resolver from the container's `/etc/resolv.conf` (works automatically on
     both docker-compose and Railway), so a temporarily-unreachable backend
     returns a `502` instead of crashing the frontend container.

4. Once both services are deployed, open the frontend's public URL.

## Custom domain (Cloudflare)

These steps point a domain you manage in Cloudflare at the frontend's Railway
service, e.g. `pa.yourdomain.com` (a `pa.` subdomain keeps it consistent if
you host other small apps as `<app>.yourdomain.com`).

1. **Add the domain to Cloudflare** (if it isn't already) and switch its
   nameservers to Cloudflare's.
2. **Railway side**: open the frontend (`Personal-Assistant`) service →
   **Settings → Networking → Custom Domain** → add `pa.yourdomain.com`.
   Railway shows a CNAME target (something like
   `<random>.up.railway.app`) and will issue a TLS certificate for the domain
   automatically once DNS is verified (can take a few minutes).
3. **Cloudflare side**: in the zone's DNS settings, add a `CNAME` record:
   - Name: `pa`
   - Target: the value Railway gave you
   - Proxy status: **Proxied** (orange cloud) - required if you also want to
     use Cloudflare Access (below)
4. **TLS mode**: under SSL/TLS, set the encryption mode to **Full** or **Full
   (strict)** - Railway already terminates TLS, so "Flexible" would cause
   redirect loops.
5. **Update `CORS_ORIGIN`** on the backend (`PA-Backend`) service to
   `https://pa.yourdomain.com` so the API accepts requests from the new
   domain.

## Authentication

The app has a built-in password-protected login screen. Set two env vars on the backend:

```
APP_PASSWORD=your-passphrase
JWT_SECRET=long-random-string  # generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Opening the app without a valid session redirects to `/login`. All API routes return `401` without a valid cookie. The session lasts 7 days.

**Share links** let you share individual notes publicly without giving anyone app access. Click the share icon on any note to generate a unique `/share/:token` URL. Opening it shows only that note's content — no sidebar, no navigation. Links can be revoked at any time from the same note view.

## Local AI fallback (Ollama)

The `ollama` service in `docker-compose.yml` lets you run the entire stack
without any API keys. It uses:

- `qwen3:8b` for chat
- `nomic-embed-text` (768-dim) for embeddings

Pull both models after the container starts (see Quick Start above). The
first chat/search request after startup may be slow while the model loads
into memory.
