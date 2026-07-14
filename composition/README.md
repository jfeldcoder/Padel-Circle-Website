# Composition

A personal health-tracking PWA — nutrition (AI-parsed from natural language), training (padel + strength), and body metrics — with the aesthetic of a premium print journal. Vite + React + TypeScript + Tailwind on the front, Supabase for auth/data/photos, and a Vercel serverless function that calls the Anthropic API for food parsing.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).

2. **Run the schema.** Open the SQL editor in the Supabase dashboard, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates all tables with row-level security and the private `progress-photos` storage bucket with owner-only policies.

3. **Enable email magic links.** In Supabase → Authentication → Providers, make sure Email is enabled (magic link is the default). Add your production URL and `http://localhost:5173` to Authentication → URL Configuration → Redirect URLs.

4. **Set environment variables.** Copy `.env.example` to `.env` and fill in:

   ```
   VITE_SUPABASE_URL=       # Supabase → Settings → API → Project URL
   VITE_SUPABASE_ANON_KEY=  # Supabase → Settings → API → anon public key
   ANTHROPIC_API_KEY=       # console.anthropic.com — serverless only, no VITE_ prefix
   ```

5. **Run locally.** The AI food parser is a Vercel serverless function, so use `vercel dev` (it serves both the Vite app and `/api`):

   ```sh
   npm install
   npm run icons        # generates the PWA icons into public/
   npx vercel dev
   ```

   Plain `npm run dev` also works for everything except `/api/parse-food`.

6. **Deploy.** Import the repo in Vercel, set the **Root Directory** to `composition/`, add the three environment variables, and deploy. The `/api` directory becomes a serverless function automatically.

7. **Install on iPhone.** Open the deployed URL in Safari → Share → **Add to Home Screen**. The app runs standalone with its own icon.

## Project structure

```
api/parse-food.ts     Vercel serverless function → Anthropic API (key never ships to the client)
supabase/schema.sql   Full database schema + RLS + storage policies
src/pages/            Today · Food · Train · Body · Trends · Settings
src/components/       Sheets, calorie ring, macro bars, editors
src/lib/              Supabase client, data layer, MET calorie estimates, insights
scripts/              PWA icon generator (no image dependencies)
```

## Notes

- All app data lives in Supabase — localStorage only holds the Supabase session token.
- Dates are stored as local calendar dates (`logged_date`), so entries never jump days across timezones.
- Workout calorie estimates use `duration_hr × weight_kg × MET` (padel 6.0/7.5/9.0 by intensity, strength 5.0), based on your latest logged weight.
- To verify the Anthropic key never reaches the browser: `npm run build && grep -r "ANTHROPIC\|sk-ant" dist/` should return nothing.
