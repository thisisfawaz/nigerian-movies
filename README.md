# YouFlix

A catalogue of Nigerian movie channels on YouTube that visitors can discover,
browse, and watch from one movie-focused website.

## Operating modes

The app runs with **zero external keys**. It selects one of two data adapters at
runtime:

| Mode | When | Public site | Admin dashboard |
| ---- | ---- | ----------- | --------------- |
| `static` | default (no Supabase keys) | Yes, reads `data/catalogue.json` | Disabled |
| `supabase` | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` set | Yes | Enabled (writes via service role) |

AI categorization is **independently opt-in** and off by default. When disabled,
manual categorization remains fully functional.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional — the app runs without it
npm run dev
```

Open http://localhost:3000. The homepage shows the detected runtime
configuration.

## Environment variables

All optional. See `.env.example`. Summary:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — enable DB mode.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; required for admin mutations.
- `AI_ENABLED`, `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL` — AI mode.
- `NEXT_PUBLIC_SITE_URL` — canonical site URL for metadata/sitemaps.

Never expose the service-role key to the browser.

## Database (optional)

When using Supabase, apply the migration in `supabase/migrations/0001_init.sql`.
The schema implements PRD §8 with Row Level Security: the public can read only
published channels and active categories; mutations require the service role.

## AI categorization (optional)

AI is disabled by default and never required. When `AI_ENABLED=true` and a
provider key is set, the add-channel form offers a **Suggest categories** button.
Suggestions are validated against the live category taxonomy (unknown slugs are
dropped, categories cannot be created by the model) and nothing is published
without administrator approval. If AI fails or is disabled, manual
classification works exactly as before.

## Constraints

- No paid YouTube API, no YouTube scraping.
- Playback uses supported YouTube embeds only (see PRD §10).
- No audio extraction or unsupported background playback.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run typecheck` — TypeScript check
- `npm run lint` — ESLint
- `npm test` — unit tests (node:test via tsx)

## Deploying

1. Set the environment variables from `.env.example` in your host dashboard.
   At minimum set `NEXT_PUBLIC_SITE_URL`. Add Supabase keys to enable the admin
   dashboard, and AI keys only if you want AI categorization.
2. If using Supabase, run `supabase/migrations/0001_init.sql` in the SQL editor.
3. Create the first admin user in Supabase Auth (no public signup exists).
4. Build and start with `npm run build` then `npm run start`.

The app runs on any Node host. On Vercel or Netlify, connect the repository and
set the same variables. No paid YouTube API is required.

## Launch checklist

- Public catalogue, search, categories, and channel pages
- Supported YouTube embeds with fallback states
- Protected admin dashboard (requires Supabase)
- Optional AI categorization with manual fallback
- Sitemap and robots (published content only)
- Privacy and terms pages
- Admin end-to-end test against a live Supabase project (pending credentials)
- Initial real catalogue loaded
