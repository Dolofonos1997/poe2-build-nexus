# Atlas V2 development preview

This branch adds a real React 19 / TypeScript / Vite application under `v2/`. The build preserves the original V24.6 root page and puts Atlas at `/v2/`. It is an alpha, not completion of the entire platform roadmap.

## Run and verify

Node 24 is recommended.

```sh
npm ci
npm run dev
npm run check
npx playwright install chromium
npx playwright test
```

Local browser tests use installed Chrome; CI uses Playwright Chromium. Routes use a hash router so GitHub Pages deep links work. `npm run build` produces `dist/index.html` (unchanged legacy page) and `dist/v2/` (new application). CI runs unit tests, the TypeScript/build checks, and desktop/mobile browser flows before a main-branch deployment. V2 pushes and PRs produce a downloadable preview artifact without deploying production.

## Implemented

- Responsive dashboard, navigation, build library, ledger, settings and account pages.
- 9×9 Temple board with fixed E9 entrance, compatible connection rendering, loop/Architect placement constraints, lock/remove/tier controls, drag-and-drop, zoom and scroll panning.
- Six-slot editable live hand, undo/redo, session replay, named local layouts, validated JSON import/export, share-by-URL with explicit import.
- Goal-based recommendations with visible reasoning. These are deterministic heuristics, not a hosted LLM or loot-probability model.
- Local build CRUD, search/filter/favorites, equipment for both weapon sets, entered gear-cost totals, skill/support groups, notes, and JSON import/export.
- Official GGG passive-tree loader pinned to revision `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`: 5,152 positioned nodes, connections, descriptions and ascendancy nodes. The pinned dataset is cached for offline reuse after its first successful load. Custom JSON import, search, zoom, inspection and allocation recording are also supported.
- Run ledger, net and hourly profit from recorded revenue/cost/time, manual timestamped price observations.
- Complete local backup export and reviewed restore, plus cloud snapshot download/restore compatibility.
- Production offline asset cache and web app manifest. Offline mode applies to Atlas, not the legacy page or cloud actions.
- Supabase authentication, private snapshots with optimistic concurrency, public builds, forks, likes, comments, and moderator removal permissions. These require the setup below and have not been exercised against a real project yet.

## Supabase setup

1. Create a Supabase project and run `supabase/migrations/202609250001_atlas.sql` in its SQL editor. Tables have row-level security enabled before browser-role grants. Private snapshots are restricted to their authenticated owner. Admin membership has no browser write policy.
2. Enable email/password authentication and configure the site URL and allowed redirect URL to `https://dolofonos1997.github.io/poe2-build-nexus/v2/`. Configure SMTP if needed for reliable confirmation email delivery.
3. For development, put the **public** project URL and **publishable** key in `v2/.env.local` using the variable names in `.env.example`. Never put a service-role/secret key into Vite variables.
4. For Pages, set repository Actions variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, then rebuild/deploy. The client is disabled when those are absent.
5. To appoint a moderator, insert their authenticated UUID into `public.atlas_admins` from the trusted SQL editor. Do not grant browser insert/update access to that table.
6. Verify with two separate users: A cannot read/update B's private snapshot; A cannot alter B's build; signed-out users can read published builds; unpublishing removes public visibility; stale snapshot saves fail instead of overwriting newer data.

Cloud saves are explicit snapshot actions. Downloading a cloud backup does not overwrite the local workspace. Restore from Settings after reviewing the replacement notice; a pre-restore backup is downloaded first.

References: [Supabase client](https://supabase.com/docs/reference/javascript/initializing), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Data and asset provenance

`scripts/extract-legacy.mjs` extracts the original room data, example builds, and embedded icon assets from V24.6. It deliberately removes the example cards' unverified DPS/EHP/prices. Original icon source files remain bundled; background-removal derivatives are used for transparent presentation. Re-running extraction restores the original sprite CSS, so retain the reviewed transparent mapping when regenerating data.

The migrated engine implements the supported rules named above; it does **not** yet reproduce every advanced legacy feature. In particular, special sacrifice/assassination actions, conversion chains, destabilization simulation, automatic Flesh Surgeon tier mirroring, and advanced templates remain in the legacy planner. The app labels this boundary.

## Remaining roadmap / external requirements

- Provision and validate the Supabase deployment, SMTP and abuse/rate-limit controls; add account recovery and deletion UX before broad public account rollout.
- Apply class-specific tree overrides and enforce allocation/class-start/point constraints. The current official-tree view is a sourced allocation notebook, not a fully validated character tree.
- Verify the complete current Temple rule set and migrate the remaining advanced legacy mechanics with tests.
- Connect a cache-aware, licensed economy source through a backend; no live prices, Divine/hour predictions, or loot probabilities are fabricated in this release.
- Hosted AI recommendations, current game-data ingestion, automatic patch updates, and a fuller content-management console.
- Native/custom pinch gestures, richer animations, optional audio, and push notifications.

The preview must not be described as the full V2 platform being finished. Release reporting should distinguish commit, successful deployment, and direct verification of the live `/v2/` page.
