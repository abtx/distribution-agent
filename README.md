# Distribution Agent

Distribution Agent is a local-first, human-controlled marketing workspace. It finds Reddit threads that explicitly invite product sharing, matches one or more products, drafts a combined contextual reply, and queues it for review. A connected account can publish only after the owner approves the reply and separately confirms the public action.

> [!IMPORTANT]
> Reddit Data API access requires Reddit's explicit approval. This project does not scrape Reddit or bypass platform access controls. X and Reddit publishing also require developer credentials and are subject to each platform's rules and rate limits.

## Features

- Conservative Reddit opportunity discovery with duplicate prevention.
- Multi-product matching and combined “I’m building X and Y” replies.
- Human review, editing, approve/reject, and explicit publish confirmation.
- OAuth connections for Reddit and X with server-only token storage and refresh.
- Text-post drafting, scheduling, and resilient multi-channel publishing.
- Per-channel publication receipts and cross-process locks for safe retries.
- Local video library and distribution batches for future provider integrations.
- Product CRUD, filtering, search, empty/loading/error states, and strategy documents.
- Secured discovery and scheduled-publishing cron endpoints.

It also includes a local multi-channel marketing workspace:

- Connect Reddit and X with OAuth. Access and refresh tokens stay server-side in the gitignored `.data/connections.json` file with user-only permissions.
- Draft, publish, or schedule text updates for X and Reddit, including target people, groups, and communities.
- Upload videos once and create batches for YouTube, TikTok, Instagram, X, and LinkedIn.
- Keep a reusable local video library and distribution history.
- Paste and maintain marketing strategy documents. The latest strategy is exposed at `GET /api/strategy/context` as a stable integration point for a future MCP server or AI harness.

Content plans, strategies, publication receipts, and uploaded videos are stored under the gitignored `.data/` directory. Publishing is explicit: approving an opportunity does not post it, “Publish now” requires confirmation, and scheduling requires confirmation before the background worker can publish later. Successful channel receipts are persisted immediately so retrying a partially failed batch does not duplicate an already-published post.

## Quick start

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With no external credentials, the app starts in local demo mode with seeded products and mock Reddit discovery.

Never commit `.env.local` or `.data/`. Both are ignored by Git.

## Safety model

- Discovery only retains opportunities that explicitly allow product sharing and pass conservative score thresholds.
- Approval does not publish. Every immediate external post requires a separate confirmation.
- Scheduling requires confirmation before a background worker may publish later.
- OAuth access and refresh tokens stay server-side in `.data/connections.json`, written with user-only file permissions.
- Successful channel receipts are persisted immediately, so retrying a partially failed batch skips completed channels.
- The app does not vote, send private messages, scrape web pages, or bypass platform approval.

## Supabase

1. Create a Supabase project and run the migrations in `supabase/migrations/` in filename order, then optionally run `supabase/seed.sql`.
2. Enable Email/Password authentication and create the internal user(s).
3. Set the Supabase URL, anon key, and service-role key from `.env.example`.

RLS is enabled on every application table. Authenticated users may manage products and opportunities; discovery runs are readable to authenticated users. Server jobs should use the service-role key, which must never be exposed in the browser.

The zero-credential local demo uses an in-process repository so the app and tests remain usable without cloud access. Production should configure Supabase; the schema is the durable source of truth.

## Reddit, X, and OpenAI

First request and receive Reddit Data API access under Reddit's Responsible Builder Policy. The in-app **Connections** page includes the current request link, suggested application language, required safeguards, and field-by-field setup instructions.

After approval, create a Reddit OAuth web application with this redirect URI:

`http://localhost:3000/api/connections/reddit/callback`

Set `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_REDIRECT_URI`, and a descriptive `REDDIT_USER_AGENT`. The account flow requests `identity`, `read`, and `submit`. Set `USE_MOCK_REDDIT=false` to use authenticated API search rather than seeded discovery; it requests recent weekly search results and performs no scraping.

Create an X OAuth 2.0 application with this callback URI:

`http://127.0.0.1:3000/api/connections/x/callback`

Set `X_CLIENT_ID`, `X_REDIRECT_URI`, and `X_CLIENT_SECRET` when the X app is confidential. The PKCE flow requests `tweet.read`, `tweet.write`, `users.read`, and `offline.access`.

X requires `127.0.0.1` rather than `localhost` for local callback URLs. Start the X connection from the in-app button; it switches to the matching host before setting the OAuth state cookie.

Restart the app after changing `.env.local`, open **Connections**, and authorize each account. The app never exposes provider tokens through its browser API.

Configure `OPENAI_API_KEY` to enable structured multi-product classification and combined reply generation. Without it, a deterministic classifier and combined reply generator support local use and tests.

## Daily cron

Set a strong `CRON_SECRET`. Call `GET /api/cron/discover` for discovery and `GET /api/cron/publish` for due scheduled posts with `Authorization: Bearer <CRON_SECRET>`. Both endpoints reject missing or incorrect secrets. Discovery prevents overlapping runs; publishing uses cross-process item locks and per-channel receipts.

- Vercel: configure cron jobs for `/api/cron/discover` and `/api/cron/publish`. When `CRON_SECRET` is configured, Vercel sends it as a Bearer authorization header. Use a timezone-aware external scheduler if exact Europe/London timing is required year-round.
- Railway/generic cron: schedule `curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://YOUR_HOST/api/cron/discover` at `0 8 * * *` with the scheduler timezone set to `Europe/London`.

### Run automatically on a Mac

Run `npm run scheduler:install` once. This installs two per-user macOS LaunchAgents:

- Discovery runs at 08:00 and 20:00 Europe/London time. It does not run at login, and an execution-time slot guard rejects macOS wake-up catch-up events, so missed runs are skipped.
- Scheduled publishing checks for due posts every five minutes while the Mac is running.

The web app does not need to be open. Logs are written to `.data/logs/`. For Mac-independent execution, deploy the app with durable storage and configure a hosted scheduler to call both secured cron endpoints.

## Validation

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Architecture

Reddit discovery is behind `RedditProvider`; mock and OAuth implementations are swappable. Candidates are deduplicated before bounded-concurrency classification. Each candidate failure is isolated in run metadata. Zod validates every model response, and only explicit opportunities scoring at least 65 with at least one product match of 65 are saved. The database unique constraint prevents duplicate opportunities; publication receipts and item locks prevent duplicate channel posts during retries and concurrent workers.

## Project status

The local demo, multi-product reply workflow, account-connection flows, Reddit comments, X/Reddit text publishing, cron workers, and validation suite are implemented. Live provider authorization cannot be exercised without credentials and platform approval. Video upload and batching are implemented locally; direct publishing to YouTube, TikTok, Instagram, and LinkedIn remains future integration work.

## License

[MIT](LICENSE)
