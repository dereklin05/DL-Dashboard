# DL-Dashboard

Personal dashboard built with Next.js.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Live data setup

This MVP runs entirely in the Next.js app. Copy `.env.example` to `.env.local`, then add your Google OAuth refresh tokens and Twelve Data API key. Next.js route handlers keep these values server-side; never use `NEXT_PUBLIC_` names for secrets.

- Google Calendar and Google Health load through `/api/dashboard`.
- Weather loads from Open-Meteo.
- Market quotes load from Twelve Data for the comma-separated `MARKET_SYMBOLS` watchlist.
- Minus CSV imports are stored only in this browser's local storage. Clearing browser site data removes them.

## Quality checks

```bash
pnpm format
pnpm format:check
pnpm build
```
