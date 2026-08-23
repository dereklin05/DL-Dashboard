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
- Minus backups sync to Supabase once it is configured (see below). They remain local only until then.

## Supabase sign-in and Minus sync

1. Create a project at [Supabase](https://supabase.com/dashboard), then open its **SQL Editor** and run [`supabase/finance-schema.sql`](./supabase/finance-schema.sql).
2. In **Project Settings → API**, copy the Project URL and **publishable** key into `.env.local`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   ```

3. In **Authentication → URL Configuration**, set the Site URL to your deployed dashboard address. Add your local address, such as `http://localhost:3000`, to Redirect URLs for local use.
4. Restart the dashboard. Open `/login`, choose **Create an account**, and use your own email and a strong password. Confirm the email if Supabase asks you to.
5. Open **Finances** and import a Minus XLSX or CSV backup once. It will then appear for this signed-in account in every browser.

The publishable key is intentionally public; the SQL rules restrict every financial record to its signed-in owner. Do not add a Supabase service-role key to `.env.local`.

## Market watchlist

Run [`supabase/watchlist-schema.sql`](./supabase/watchlist-schema.sql) once in the Supabase SQL Editor to enable the editable market watchlist. The Market page lets you keep up to 100 saved symbols, choose up to 8 to show, and reorder them without editing environment variables.

## Quality checks

```bash
pnpm format
pnpm format:check
pnpm build
```
