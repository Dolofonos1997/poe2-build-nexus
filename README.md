# PoE 2 Build Nexus · Atlas V2

Atlas is a React/TypeScript development preview under `v2/`. Run `npm ci` and `npm run dev`; run `npm run check` and `npx playwright test` for validation. See [ATLAS_V2.md](ATLAS_V2.md) for implemented features, Supabase setup, deployment details and remaining work.

The build retains the legacy V24.6 page at the site root and serves Atlas at `/v2/`.

## Legacy release history — V10 onward

V10 expands the V9 build hub while preserving the full Atziri Temple V8.8 planner.

## V10 additions

- Create and edit custom PoE 2 builds
- Browser-local saved build library
- Editable class, ascendancy, main skill, budget and estimated cost
- Editable equipment names, modifiers and per-item prices
- PoE-style equipment layout with hover tooltips
- Drag-and-drop equipment slot swapping
- Interactive passive-tree prototype with selectable nodes and path highlighting
- JSON build import/export and downloadable backup
- Saved custom builds integrated into build search/filtering
- Responsive editor and mobile layouts

## Preserved

- All V9 build-browser features
- Full Atziri Temple V8.8 planner and update log

Open `index.html` in a modern browser. Saved builds use browser localStorage.

## V11 Build Nexus

- Structured class/ascendancy/main-skill selectors
- Skill/support group data
- Expanded 24-node passive planner prototype
- Local calculated stats from entered item modifiers and passive selections
- Item comparison/equip prototype
- Item-base selectors in the build editor
- V10 JSON import compatibility and V11 export naming
- Existing Temple Planner preserved

Note: V11 calculations and data lists are planner prototypes, not authoritative PoE 2/PoB2 calculations. They are structured so real game data can replace them in later versions.

## V12 Build Nexus

- Sample structured PoE 2 item database and item-library picker
- Rarity-aware item cards and richer gear model
- Five-stage build progression model
- Estimated per-slot/total build-cost foundation
- Passive-tree search/shortest-path prototype
- PoB2 import staging UI and persistent source storage
- Existing V11 calculations, build editor, JSON I/O and Temple Planner preserved

V12 remains an offline prototype. Sample game data/prices are illustrative, not live economy data.

## V13 Build Nexus

- PoB2 import attempt with source preservation and local metadata extraction
- PoB2 bridge JSON export for future full round-trip support
- Deeper derived combat model (damage/crit/spirit/DPS index)
- Economy adapter layer with offline/manual price cache
- Build version snapshots for patch/progression history
- V12 item library, progression and passive tools preserved
- Full Temple Planner preserved

Important: V13 does not claim exact Path of Building 2 calculation parity. Complex PoB2 compressed payloads remain source-preserved for future parser upgrades.

## V14 Build Nexus

- Structured replaceable PoE 2 game-data layer
- Searchable item-base, skill, and modifier catalogs
- Passive planner expanded to 60 interactive nodes
- Stronger PoB2 text/base64 detection with metadata extraction and source preservation
- V13 economy, versions, derived stats and Temple Planner retained
- Offline bundled catalog is intentionally compact; it is not presented as the complete live PoE 2 database

## V15 Build Studio

- Visual skill/support gem editor
- Full-screen passive-tree mode
- Advanced item workshop with base, rarity, quality, mods and estimate preview
- Planner stat-source breakdown modal
- Backend-ready PoE 2 economy adapter configuration (no direct per-user API polling)
- V14 structured data and PoB2 import retained
- Temple Planner retained

Live economy is intentionally not called directly from the static browser build. Deploy a backend/proxy with HTTP caching/ETag support before enabling the mapped poe.ninja economy endpoints.

## V16

Connected Build Lab: deployable backend contract, cache-aware PoE 2 economy adapter, price-history model, trade-query builder, and deeper PoB2 inspector. Live prices are never fabricated; the standalone planner remains offline-compatible. See `V16_BACKEND.md`.

## V16.1 — Path of Exile 2 Druid + Upcoming Duelist

- Added Druid to class filters and build editor.
- Added official Druid ascendancies: Oracle and Shaman (PoE 2 0.4.0).
- Added Druid-ready Primal / shapeshifting / Talisman skill categories.
- Added a Druid example build card.
- Added Duelist as an Upcoming class throughout the data model/editor.
- Duelist unreleased ascendancies and skills remain explicit placeholders rather than invented game data.
- Existing Temple Planner and V16 systems are preserved.

## V17 Advanced Planner

- Passive checkpoints and weapon-set planning state
- Defense inspector and resistance audit
- Saved-build comparison
- Gear/requirements audit
- Druid Human/Primal vs Talisman/shapeshift setup model

## V19 Community Studio

- Offline-first creator profile
- Publish/update with stable build slugs
- Fork builds into My Saved Builds
- Likes and comments prototype
- Patch-aware build version/changelog history
- Community backend/API contract for real accounts and public persistence

## V19 Upgrade Intelligence

See `V19_UPGRADE_INTELLIGENCE.md` for the new upgrade assistant, weakness scanner, whole-build constraints, build value audit, trade handoff and interactive progression model.
