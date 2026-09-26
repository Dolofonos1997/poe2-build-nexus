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
- Official GGG 0.5.5 passive tree pinned to revision `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`, now loaded by default. Canvas rendering uses GGG icon atlases, node frames, class backgrounds, positions and orbit connections. Class/ascendancy selection applies exported overrides, filters unrelated ascendancies, and enforces connected paths and configurable point budgets. Search, pan/zoom, full-tree view, dependent-branch refunds and undo are supported. Raw data and artwork cache after first successful load.
- Visual equipment slots for both weapon sets, real unique-item search with source artwork/bases/modifier ranges, item preview and slot-specific equipping. Copied in-game rare/custom items can also be imported. Catalogue generation uses supported poe.ninja item overviews; ranges are not exact character rolls and no performance totals are fabricated.
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

Advanced Temple planning now includes explicit sacrifice/assassination recipients, reversible conversion chains, Flesh Surgeon tier dependencies, medallion protection, device-use tracking, seeded exit scenarios, and starter templates. Normal upgrades cap at T3 while recorded T4 is preserved. See [mechanics and deployment details](BACKEND_SETUP.md) for the exact rules and simulation boundaries.

## Remaining roadmap / external requirements

- Provision and validate the Supabase deployment, SMTP and abuse/rate-limit controls; add account recovery and deletion UX before broad public account rollout.
- Special ascendancy allocation exceptions, weapon-set passive splits, jewel mechanics and a full character-stat/DPS engine remain outside the basic connected-path planner. Passive budgets are explicitly editable; they are not inferred from level/quest completion.
- Exact undocumented Temple RNG is not modeled; the exit simulator accepts explicit scenario loss counts and reports disconnections.
- Market snapshots now use the supported poe.ninja exchange API through an hourly GitHub Actions collector, with real league/unit/timestamps, ETags, stale labels and failure fallback. No loot probabilities or Divine/hour predictions are fabricated.
- Hosted AI code, authentication, database quotas, private advice history, token usage records, and deployment steps are ready in [BACKEND_SETUP.md](BACKEND_SETUP.md). The owner still needs to provision Supabase and set server-only model credentials before live AI calls can be verified.
- Current game-data ingestion, automatic patch updates, and a fuller content-management console.
- Native/custom pinch gestures, richer animations, optional audio, and push notifications.

The preview must not be described as the full V2 platform being finished. Release reporting should distinguish commit, successful deployment, and direct verification of the live `/v2/` page.
