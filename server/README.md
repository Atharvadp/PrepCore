# PrepCore API

The PrepCore frontend uses this Node.js/Express API for authentication and application data. The API uses Mongoose to persist data in MongoDB and makes server-side Groq requests for AI features.

## Setup

1. Copy `.env.example` to `.env`, set the MongoDB URI, and generate a random `AUTH_TOKEN_SECRET` of at least 32 bytes. Keep `.env` private.
2. From the project root, install the root frontend dependencies and the dependencies declared by `server/package.json` when authorized to do so.
3. Start the API with `npm run server:dev`, or build and start it with `npm run server:build` and `npm run server:start`.
4. The health endpoint is `GET /api/health`. It returns HTTP 200 only while Mongoose reports an active database connection.

`MONGODB_URI` and `AUTH_TOKEN_SECRET` are read only by the server. Outside production, the API permits the local Vite development origins on ports 5173 and 4173. In production, set `CORS_ORIGINS` to a comma-separated list of exact frontend origins; the default production allowlist is empty. Credentialed CORS is enabled for cookie-based authentication.

`GROQ_API_KEY` is an optional server-only setting used by the AI endpoint. Configure it in the server environment (for local development, `server/.env`); never use a `VITE_`-prefixed variable. The backend can start without it, but AI requests return a service-unavailable response until it is configured.

## Authentication API

- `POST /api/auth/signup` accepts `{ "email", "password", "username?" }`, creates an account, and returns a safe user object with an HTTP-only auth cookie.
- `POST /api/auth/login` accepts `{ "email", "password" }` and sets the same cookie on successful authentication.
- `POST /api/auth/logout` requires a valid auth cookie and clears it.
- `GET /api/auth/me` requires a valid auth cookie and returns the safe public user object.

Passwords are hashed with bcrypt; password hashes are excluded from normal User queries and never returned. Emails are trimmed, lowercased, and uniquely indexed. Tokens are signed with HS256, expire after seven days, and are stored in an HTTP-only, SameSite=Lax cookie. The cookie is Secure in production and is scoped to `/api`.

Authentication does not currently implement email verification, password reset, authentication-specific rate limiting, or CSRF-token protection. The AI endpoint has its own per-user rate limit, described below. Review these limitations before production deployment.

## Task API

All task endpoints require the authenticated HTTP-only cookie. Ownership is derived from the verified token; request ownership fields never affect task ownership.

- `POST /api/tasks` accepts `title`, `subject`, and optional `description`; the server generates the task ID, owner, creation time, and incomplete status. Returns `{ "task": ... }` with `201`.
- `GET /api/tasks` returns `{ "tasks": [...] }`, newest first. Optional `is_completed=true|false` filters the list.
- `GET /api/tasks/:id` returns `{ "task": ... }` only for a task owned by the authenticated user.
- `PATCH /api/tasks/:id` accepts only `{ "is_completed": boolean }` and returns `{ "task": ... }`.
- `DELETE /api/tasks/:id` deletes an owned task and returns `{ "message": "Task deleted" }`.

Task IDs are UUID strings. Missing and non-owned task IDs share the same not-found response.

## Profile API

- `GET /api/profile` requires authentication and returns `{ "profile": { "id", "username", "current_streak", "longest_streak", "last_study_date", "created_at" } }`.
- The profile is resolved only from the verified authenticated user ID. If no profile exists, the endpoint initializes one with zero current/longest streaks and a `null` last-study date. The user ID is the profile `_id`, so concurrent initialization cannot create multiple profiles for that user.
- The User document is the canonical source for `username`. The legacy Profile `username` field is populated only when a profile is first created; profile reads return the User username and never use the legacy field as an independent update path.

## AI API

- `POST /api/ai/ask` requires authentication and accepts `{ "question": string }`. Questions must contain 1–2000 non-whitespace characters; unsupported request fields are rejected.
- The server forwards the question to Groq using the `openai/gpt-oss-20b` model, the existing study-assistant prompt, and existing generation settings. The response is `{ "answer": string }`; provider keys, error bodies, and internal details are never returned.
- Each authenticated user may submit up to 10 valid questions per minute per server process. Excess requests return `429` with `Retry-After`. This in-memory limit does not coordinate across multiple backend instances; use a shared rate-limit store if deploying multiple instances.
- Provider requests time out after 15 seconds. Provider failures or malformed responses return safe `502`/`504` messages.

## Study Session API

All study-session endpoints require authentication. Session ownership is derived from the verified token, never from request data.

- `POST /api/study-sessions` accepts `{ "duration_minutes": number, "task_id"?: string | null, "timezone"?: string }`. Duration must be an integer from 1 through 1440. A provided task must belong to the authenticated user. A supplied timezone must be a valid IANA timezone. The timezone is optional for compatibility; if omitted, the API explicitly stores `UTC`. The server generates the UUID and start time, and initializes `ended_at` to `null` and `completed` to `false`. Returns `{ "session": ... }` with `201`.
- `GET /api/study-sessions` returns `{ "sessions": [...] }` for only the authenticated user's completed sessions, newest first. Session IDs are serialized as `id`, and timestamps as ISO strings.
- `PATCH /api/study-sessions/:id/complete` completes an owned session and updates the authenticated user's streak. Repeated completion returns the same completed session with `200`; missing and non-owned sessions return the same `404`.
- `DELETE /api/study-sessions/:id` cancels and deletes an active owned session. Missing, non-owned, or already-ended sessions return the same `404`.

The study-session list supports the existing analytics fields (`duration_minutes`, `started_at`, and `completed`). Task references are validated against the current user's tasks when a session is created. Streak dates use the timezone stored on that session, preserving the browser-local calendar date when the caller supplies its IANA timezone. Sessions without a timezone (including older records) use the explicit `UTC` fallback, never the server's implicit local timezone. The frontend should send its resolved local timezone for sessions to preserve its prior behavior.

Streak rules match the existing frontend behavior: first study date starts at 1; another completed session on the same local calendar date does not increment; the next calendar date increments; a larger date gap resets current streak to 1; and longest streak is the maximum of its previous value and the new current streak. Calendar-day differences are computed from date components, not elapsed local-time hours.

Completion and its profile streak update run in one MongoDB transaction. The completion record's `streak_applied` marker and the profile update commit or abort together, so repeated or concurrent completion requests cannot count the same session twice. The MongoDB deployment must be a replica set or sharded cluster that supports transactions; standalone deployments will fail completion rather than silently fall back to a partially consistent update. Profile initialization may occur before the transaction and is independently safe/idempotent. Runtime connectivity and transaction support must be verified against the deployment.

## Current model fields

- **User:** identity (`_id`, corresponding to the existing `id`), `email`, optional `username`.
- **Profile:** `_id` references the corresponding User; legacy `username`, `current_streak`, `longest_streak`, nullable `last_study_date`, and `created_at`.
- **Task:** `_id`, `user_id` referencing User, `title`, `description`, `subject`, `is_completed`, and `created_at`.
- **StudySession:** `_id`, `user_id` referencing User, nullable `task_id` referencing Task, `duration_minutes`, `started_at`, nullable `ended_at`, and `completed`.

The User, Profile, Task, and StudySession models support the API behavior described above. This repository does not record the migration or reconciliation status of historical production data. Before decommissioning any former data service, independently verify that records which must be retained are present in MongoDB or have been exported.
