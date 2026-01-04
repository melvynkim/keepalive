# vercel-keepalive

A tiny Vercel Cron project that periodically:
- runs `SELECT 1` against Neon Postgres targets
- runs `PING` against Upstash Redis targets

## Files

- `vercel.json` — cron schedule (defaults to daily at 05:00 UTC)
- `api/cron.js` — the cron endpoint (secured with `CRON_SECRET`)
- `api/health.js` — quick sanity check endpoint
- `.env.example` — environment variable template

## Environment variables

### Required
- `KEEPALIVE_TARGETS` (JSON array)

### Recommended
- `CRON_SECRET` (Vercel will send it as `Authorization: Bearer <CRON_SECRET>` for cron invocations)

### Optional
- `KEEPALIVE_TIMEOUT_MS` (default `8000`)
- `KEEPALIVE_CONCURRENCY` (default `5`)

Example `KEEPALIVE_TARGETS` (single-line JSON):
```bash
KEEPALIVE_TARGETS='[
  {"name":"proj-1","neon":"postgresql://USER:PASS@HOST/DB?sslmode=require","upstash":{"url":"https://YOUR-REST-URL.upstash.io","token":"YOUR-REST-TOKEN"}},
  {"name":"proj-2","neon":"postgresql://USER:PASS@HOST/DB?sslmode=require"},
  {"name":"proj-3","upstash":{"url":"https://YOUR-REST-URL.upstash.io","token":"YOUR-REST-TOKEN"}}
]'
```

## Local test

```bash
npm i
# Use `.env` or `.env.local` for local env vars
# Then:
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron
```
