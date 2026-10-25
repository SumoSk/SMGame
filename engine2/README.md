# SMCITY Traffic Engine 2.0 — Clean rewrite workstream

This folder contains a new traffic implementation and adapters; it does not reuse
or modify the original traffic algorithms. Production SMCITY has not yet
been switched to this engine. Tests passing is not game-level completion.

## Recovery and source-control safety

- Original live-code backup: branch old-version-2026-10-25, commit
  f97f80f566d277b2cd93e81126d7b4378a998a8f
- Work branch: traffic-engine-2-rewrite
- Production main stays unchanged until browser integration tests pass.
- Cloud saves are not deleted; new vehicle/trip schemas may be incompatible.

## Product brief

- Retain citizen lifestyle generation, economy, buildings and UI while
  replacing routing, trip and traffic algorithms from scratch.
- Central road, lane, signal, junction and gate rules; vehicles follow them.
- Optimize expected travel time, not physical distance alone.
- Minimize redundant work with scheduled events, bounded caches,
  indexed local vehicles, batched cost snapshots and fixed-step motion.
- Aim for 1,000 concurrent vehicles and distinguish true deadlocks from queues.

## Implemented standalone components

| Module | Responsibility |
|---|---|
| traffic-core.mjs | Directed graph, spatial A*, legal turning constraints, weighted time, route cache, event queue, fixed-step motion, lazy rerouting and gate recovery |
| lane-controller.mjs | Neighbour clearance and lane reduction/changes |
| junction-controller.mjs | Directional signals, yellow/clearance and conservative node reservations |
| traffic-estimator.mjs | Occupancy-based travel-time cost updates on demand |
| parking-controller.mjs | Parking reservations and event-woken waiting queues |
| trip-manager.mjs | Citizen trip lifecycle with destination reservation |
| deadlock-monitor.mjs | Threshold-based wait-for cycle detection |
| city-road-adapter.mjs | Convert existing city road records on road edits |
| citizen-trip-adapter.mjs | Translate trip intentions and legal building entrances/exits |
| pose-adapter.mjs | Renderer-independent lane poses and corner transition blending |
| test/*.test.mjs | Deterministic and multi-car regression tests |
| benchmark.mjs | 1,000-car synthetic CPU/memory diagnostic |

## Last measured results (2026-10-25)

- GitHub Actions: 42/42 Node.js tests passing in run 40201681745.
- Synthetic 1,000 vehicles across 20 independent 4-lane links; 750 measured
  fixed steps, 20 route searches and 980 route-cache hits.
- GitHub-hosted Node runner: mean 0.178 ms per step, p95 0.292 ms,
  p99 0.847 ms; heap observed about 20.7 MiB.
- NOT real-game FPS, Safari, Edge, 3D renderer cost or a performance guarantee.

## Still missing before a safe production replacement

1. Main game cutover: production still runs original traffic/trip/tick code.
2. Continuous geometric trajectories and safe swept-turn movements at 3D intersections.
3. Automatic lane intentions before turns, taper geometry, bidirectional
   lane-change conflict arbitration and road-speed-specific behaviour.
4. Complete lane-specific intersection conflict matrices and throughput modelling.
5. Animated physical parking, entry/exit queues and safe road merging.
6. Business lifecycle callbacks to citizen happiness, work, tourism, economy,
   analytics, incident UI, save/load and existing menus.
7. Realistic busy-city browser tests with Edge and Safari, FPS/CPU/GPU/memory
   measurement and long-duration save-load regression.
8. More deadlock resolution cases. The current model only auto-recovers proven
   wait cycles when a viable city gate is configured.

## Commands

Unit/integration tests:

    node --test engine2/test/*.test.mjs

Standalone benchmark:

    node engine2/benchmark.mjs

## Release acceptance

Do not delete legacy modules or switch GitHub Pages until all dependent city
features use the new engine without parallel duplicate control loops, complete
browser regression passes, a recoverable save transition is documented, and
the old-version backup has been exercised as a rollback option.
