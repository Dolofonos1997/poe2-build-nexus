# Build Nexus V19 — Upgrade Intelligence

V19 adds an offline-safe upgrade intelligence layer on top of V18.

## Included
- Build Weakness Scanner for planner-supported resistance, life, empty-slot and gear-mod warnings.
- Budget-aware Upgrade Assistant that ranks equipment slots and preserves selected whole-build constraints.
- Whole-Build Optimizer UI for resistance/life constraints so a DPS-only swap is not automatically treated as an upgrade.
- Trade handoff to the existing V16 trade-query builder.
- Build Value audit using prices already stored on the build, with handoff to V16 price history/economy adapters.
- Interactive progression-stage model from campaign through endgame.
- V17/V18 planner/community systems, Druid support, upcoming Duelist framework, and Temple Planner preserved.

## Accuracy boundary
V19 recommendations are heuristics over data known to Build Nexus. The standalone package does not fabricate live prices and does not label planner calculations as exact Path of Building 2 output. Live economy valuation remains behind the deployable cached backend contract.
