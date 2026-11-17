# Parking CPU improvement — v6.0.2

v6.0.1 can spend an entire frame budget repeating unchanged parking geometry and collision forecasts. This patch reuses pure math while reading live vehicle eligibility, queue limits, bay ownership and parked membership for every admission decision.

The five edited areas are parking pose math, parking-path geometry validation, scalar physical SAT, parked-bay broad phase, and departure forecasts. Angle memoization is bounded to 2,048 entries. Other caches use weak keys and are not saved. AI priority, time quanta, frame budget, road following and lane-change rules are unchanged.

## Verification

- 13 traffic suites pass, including the 1,000-resident four-hour simulation, road rebuild, save/load, mission accounting, signals, movement and reciprocal parking swaps.
- 1,162,366 physical-overlap comparisons match the v6.0.1 oracle, including near-boundary and non-finite inputs.
- 10,000 live lot-clearance queries match the old boolean result and first blocker, with ownership, membership, path and building mutations.
- 1,248 departure-forecast result/trace comparisons and 15 pose-cache mutation cases pass.
- 134 dense parking trips all arrive with no tow, respawn, opposite-exit rescue, non-exempt overlap or invalid claim.
- Fixed-work controls use the same frozen city and complete simulation work. Vehicle decisions, events and successful trip starts match. All 1,000 due events remain accounted for.

## Measured results

The full native headless run shows 33.5–79.8% less CPU for identical work across cold/warm and steady/mixed-demand controls. A separate portable benchmark smoke run shows 45.2–57.3% less CPU in its two warm controls. Host load, JIT and garbage collection affect timings; these are workload-specific results, not player FPS promises.

Rendered browser comparison: one 12-second sample per variant and speed, visible browser, 1,000 residents, 300 real vehicles, medium graphics, 1382×1083 viewport at DPR 1.25. All four initial-state fingerprints are `29633133`.

| Requested speed | Before game-min/host-second | After | Change |
| --- | ---: | ---: | ---: |
| 1× | 0.916 | 1.097 | +19.8% |
| 20× | 1.281 | 1.716 | +34.0% |

Median RAF interval remains about 109ms in this browser environment. RAF tails and timer-delay proxies do not show a consistent improvement. Physical input latency was not measured. This patch improves computation and simulation throughput; it does not establish a general visual-smoothness fix. Dense scenes still cannot sustain the requested 20×.

## Reproduce

Run `node tests/traffic/run.cjs` for the 13 regression suites.

Run `node tests/performance/parking.cjs` for JSON evidence comparing the preserved v6.0.1 fixture source with the current runtime. It measures fixed work and host-clock-paced frames at 1×, 2×, 5× and 20×, with draw stubbed. The raw report includes source hashes, samples and acceptance checks. Optional `PERF_COMPRESS_REPORT=1` prints gzip/base64 for environments with constrained tool output.

For rendered tests open `/SMGame/perf-qa/?variant=before&run=seeded-v2-20261118` or the same URL with `variant=after`. Keep viewport and graphics equal, keep the browser visible, and verify matching fixture fingerprints. These test documents use memory-only storage, disable IndexedDB and omit account/bootstrap modules.

Tested runtime SHA-256: `64170169199bccb5caed71ad1330a49ce1afbc7b390c3d233e842f3ca5cbb35c`.
