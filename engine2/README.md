# SMCITY — Traffic Engine 2.0 (clean-room rewrite)

## Status

This folder is a **new implementation**, not a modification, copy, or patch of the
legacy traffic code. It is intentionally isolated on branch
traffic-engine-2-rewrite; **not yet connected to the live SMCITY UI**.

The full pre-rewrite repository is preserved at branch
old-version-2026-10-25 (commit f97f80f566d277b2cd93e81126d7b4378a998a8f).

## Approved product decisions

- Rebuild routing, lane movement, signals, junction coordination, trip management,
  gates and parking from new design; preserve unrelated city/lifestyle/business/UI behavior.
- Rules-based central network; each vehicle advances within the shared rules.
- Realistic queues, but correct broken deadlocks without freezing or blindly deleting cars.
- Minimize computation **without** disabling safety checks.
- Routing optimizes *expected travel time*, not distance alone.
- Target: 1,000 concurrently simulated cars.
- Old vehicle/trip save schema **need not** be supported if it blocks a sound architecture.
  Do not delete cloud save records as a side effect of the rewrite.

## Code created so far

- traffic-core.mjs: directed road network, weighted routing with turn and U-turn
  constraints, versioned/bounded route cache, quantized congestion invalidation,
  min-heap event queue, fixed-step vehicle model, queueing, simple lanes, single-junction
  entry coordination, one-approach-at-a-time signals, cancelable trips and diagnostics.
- trip-manager.mjs: schedules a citizen's one active trip at a time; handles trip
  completion, failure, cancellation and bounded historical records.
- test/: deterministic unit/regression tests, including a 1,000-car stress scenario.
- .github/workflows/traffic-engine-v2.yml: independently runs Node tests.

## Performance design

- Road graph and route caching invalidate on topology / significant cost changes.
- Trip and signal transition work is event scheduled; not recalculated every render frame.
- Vehicle movement uses a fixed simulation time step; a lane index is rebuilt once
  per step, so lane-entry checks do not scan all cars repeatedly.
- The simulation does not access DOM/renderer state. A rendering adapter will consume
  snapshots. Worker migration is optional and should be based on measured performance.
- Animation, nearby-vehicle constraints and road geometry still require periodic
  updates. "Event driven" does not mean disabling these calculations.

## Integration contract to build next

1. **Map adapter:** Convert the city's road construction/deletion events to directed
   links with valid turns, geometry and physical lane assignments. Changes must notify
   the engine; no separate hidden traffic graph.
2. **Citizen adapter:** Convert lifestyle decisions into one trip request containing
   actor, origin, destination, departure time and purpose. Keep the existing
   life-schedule generator untouched.
3. **Junction model:** Replace the provisional one-car-per-junction-per-step mutex
   with conflict-area reservations, downstream box checks, clearance/yellow periods,
   and lane-turn constraints. This has **not** been completed.
4. **Parking/gate model:** Build a new controller for slot reservations, building
   entry/exit queues and safe merge into street flow. This has **not** been completed.
5. **Vehicle geometry:** Physical lanes, turn trajectories, yielding, safe lane
   changes and stuck-vs-queued diagnosis need new implementation. Current module
   is a straight-link physics prototype, **not** feature parity.
6. **UI/render adapter:** Feed positions and traffic state to renderer3d.js without
   changing unrelated UI or economy logic.
7. **Save/version cutover:** New engine state schema, migrations where necessary,
   rollback capability, and smoke tests before replacing the public game.

## Run tests locally

    node --test engine2/test/*.test.mjs

The test pipeline is informative but **does not certify** the original city's
save/login behavior, traffic rendering, real junctions, parking or deployment.
Do not delete legacy modules or switch GitHub Pages to this branch until the
integration tests pass end-to-end.
