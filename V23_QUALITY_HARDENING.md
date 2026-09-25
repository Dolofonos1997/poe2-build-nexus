# Build Nexus V23 — Quality & Data Hardening

V23 intentionally focuses on reliability and completeness rather than pretending compact bundled data is authoritative live PoE 2 data.

## Added
- Complete overview inspector for bundled/current builds
- Passive-tree saved-allocation compatibility check
- Progression review timeline
- Planner snapshots for gear/tree/skills
- Deterministic client QA smoke test
- Mobile layout hardening for V23 panels
- Clear separation between bundled planner data and backend/live data

## QA boundary
The included smoke test verifies client-side DOM/data/function availability. Live economy, authentication, cloud persistence, server-side PoB2 decoding and production security require deployed backend integration tests.
