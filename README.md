# Krishna Cut

A focused food and weight dashboard built around Krishna’s real logging patterns: branded foods, meal grouping, protein protection, weight trend and adjustable estimates.

## Run locally

```bash
npm install
npm run dev
```

The current UI runs with realistic demo data so the product can be reviewed before connecting a database.

## Low-cost hosting plan

- **UI:** Cloudflare Pages, Vercel Hobby, or an existing GoDaddy static folder.
- **Database:** Supabase free tier (Postgres). Run `supabase/schema.sql` in the SQL editor.
- **Persistence:** connect the Supabase client in `src/lib/supabase.js`, then replace the demo entry functions with `food_entries` and `weigh_ins` inserts.

The data model already separates foods, daily entries, profile targets and weigh-ins, so the log can grow without putting everything into one fragile spreadsheet.
