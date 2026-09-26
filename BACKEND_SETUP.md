# Enable hosted AI

The Temple mechanics and hourly market snapshots work on GitHub Pages now. Hosted AI needs your Supabase project and an OpenAI API account. No secret is shipped to the browser. This repository contains the complete endpoint and migrations, but no project has been provisioned or billed.

## 1. Create and link Supabase

Create a project in the Supabase dashboard. Enable email/password authentication, configure SMTP/confirmation delivery, and set the site URL to `https://dolofonos1997.github.io/poe2-build-nexus/v2/`. Add the same redirect URL.

Install/use the Supabase CLI on a trusted machine:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The CLI prompts for the database password. Both migrations are required. If you already applied the first migration manually, reconcile its migration history before running `db push`; do not re-run existing schema creation blindly.

## 2. Set server-only secrets

In Supabase **Edge Functions → Secrets**, add:

| Secret | Value |
| --- | --- |
| `OPENAI_API_KEY` | A project-scoped OpenAI API key |
| `OPENAI_MODEL` | An enabled model ID supporting Responses API structured outputs |
| `ATLAS_ORIGIN` | `https://dolofonos1997.github.io` (origin only, no path) |

Use the [OpenAI model catalog](https://developers.openai.com/api/docs/models) to choose a model available to your project. Set project spending alerts/limits appropriate for that model. The endpoint caps output at 1,800 tokens and request input at 16 KB. It enforces 10 requests per user per UTC day and 200 globally; failed provider requests still consume allowance to prevent retry abuse. Change the SQL quota deliberately if needed. Usage rows record token counts, not an invented dollar cost. Supabase injects its own URL and service-role credential; never add that credential to a `VITE_` variable.

## 3. Deploy the function

```sh
node scripts/sync-edge-engine.mjs
npx supabase functions deploy temple-advisor
```

The committed config disables the gateway's legacy JWT check because the handler independently verifies the bearer token against Supabase Auth with `getUser`. Missing/invalid sessions are denied before the model call. This also supports projects using newer signing keys. The backend and browser share a generated copy of the same Temple engine; CI checks that they remain synchronized.

## 4. Connect the Pages app

Set these **GitHub repository → Settings → Secrets and variables → Actions → Variables**:

- `VITE_SUPABASE_URL`: your public project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: your public publishable key

Run the **Deploy PoE 2 Build Nexus** workflow manually to rebuild Pages. For local development use the same public values in `v2/.env.local`. Never put `OPENAI_API_KEY` or a service-role key in GitHub public variables or client environment files.

## 5. Verify the real deployment

1. Create an account, confirm email, sign in under Account & community, then open Temple planner.
2. Fill the hand and choose **Ask AI advisor**. The server generates legal candidates itself; the model can only select one. No placement happens automatically.
3. Check the explanation, model ID, timestamp and saved advice. Reload and open it from Previous advice. A private link is readable only by its owner. Delete it and verify it disappears.
4. With a second account, attempt to query the first account's generation ID. RLS must return no row. Anonymous POST must return 401; a wrong Origin must return 403.
5. Verify quota errors return 429 and provider errors leave the board unchanged. Check Supabase function logs without logging authorization headers, API keys or user prompts.

Automated tests exercise the handler with a mocked provider, including authentication, request validation, quotas, invalid model choices and persistence. They do **not** substitute for this live-project verification. No paid model call has been made during development.

## Economy collection

GitHub Actions collects the [supported poe.ninja economy API](https://poe.ninja/docs/api) hourly at minute 17 and on builds. This is a server-side collector with a descriptive User-Agent, ETag conditional requests, sequential bounded calls, and prior snapshot retention on failures. Categories are Currency, Fragments, SoulCores and Ritual for discovered active leagues (up to eight). Values retain `core.primary`; they are never relabeled as Exalted by assumption.

`economy.json` is an actual timestamped snapshot, not example data. GitHub schedules can be delayed. The UI marks snapshots unverified for more than three hours as stale. Offline support retains the bundled snapshot and its original timestamps. Empty upstream categories show unavailable. You can run `node scripts/economy.mjs` manually and redeploy without provisioning Supabase.

## Temple rules and limits

Conversions recalculate from original cards, including Garrison → Legion and Garrison/Legion → Transcendent (Synthflesh takes precedence). Flesh Surgeon follows adjacent Synthflesh within the normal T3 ceiling; manually entered T4 remains T4. Sacrifice consumes a chosen unlocked non-boss room and raises a chosen chamber to at most T3. Assassination consumes a Spymaster and gives a different eligible Spymaster one upgrade. Used devices and accessible restricted rooms participate in the exit preview; one-use medallions are consumed when protecting a room. Editor locks do not grant in-game protection.

The legacy planner's Commander threshold and power bonus assumptions have been corrected: three qualifying barracks provide a Commander upgrade; power is a requirement for Smithy/Synthflesh/Transcendent, not an automatic tier bonus. References: [room data](https://poe2db.tw/Atziris_Temple), [destabilisation](https://poe2db.tw/us/Temple_Destabilisation).

Random exit losses are explicitly configurable scenarios, not claimed exact RNG. Boss kills can increase loss; no undocumented probability distribution or Royal Prerogative roll is fabricated. A simulation preserves disconnected surviving rooms and reports them. Templates are editable starters, not optimal farming guarantees.
