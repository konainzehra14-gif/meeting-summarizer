# Meeting Summarizer — backend

A small Express API that powers the four Meeting Summarizer outputs. Each
endpoint takes raw meeting notes and returns one piece: minutes, decisions,
action items, or a follow-up email.

## Setup

```bash
npm install
cp .env.example .env
# then edit .env and add your Anthropic API key
npm start
```

Server runs on `http://localhost:3000` by default.

## Endpoints

All endpoints are `POST` and expect JSON body:

```json
{ "notes": "raw meeting notes text here" }
```

| Endpoint          | Returns                                                            |
|-------------------|---------------------------------------------------------------------|
| `/minutes`        | `{ "minutes": "..." }`                                              |
| `/decisions`      | `{ "decisions": ["...", "..."] }`                                   |
| `/action-items`   | `{ "items": [{ "task": "...", "owner": "...", "due": "..." }] }`    |
| `/email`          | `{ "subject": "...", "body": "..." }`                               |
| `/health`         | `{ "ok": true }` (for uptime checks)                                |

## Example

```bash
curl -X POST http://localhost:3000/minutes \
  -H "Content-Type: application/json" \
  -d '{"notes": "Sarah raised concern about Q3 timeline. Team agreed to push launch to Oct 15. Mike to update roadmap doc by Friday."}'
```

## Getting a free Gemini API key (no credit card)

1. Go to https://aistudio.google.com
2. Sign in with any Google account
3. Click "Get API key" → "Create API key"
4. Copy it into `.env` as `GEMINI_API_KEY`

The free tier is rate-limited (a handful of requests per minute) but needs
no billing setup at all.

## Notes

- Uses the `gemini-2.5-flash` model — change `MODEL` in `server.js` if you
  want a different one.
- CORS is open (`cors()` with no options) so any frontend can call it during
  development. Lock this down (`cors({ origin: 'https://yourdomain.com' })`)
  before deploying publicly.
- No auth is included — add an API key or session check on these routes
  before exposing them beyond local use.
