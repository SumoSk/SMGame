# v6.0.3 CPU work reduction

Four localized runtime replacements based on v6.0.2 (00c9022): reuse the existing motion plan when ordering vehicles; avoid empty junction bookkeeping and distant pass lookups; count incoming destination vehicles once per synchronous outing search; skip absent spatial buckets without allocating empty arrays. Traffic decisions, event budgets, simulation quantum, graphics assets and rendering quality are unchanged.

Validation completed before release: source syntax; original isolated differential checks (movement order 180 order checks / 400 movement steps, junction queues 218 checkpoints, outing planning 71 cases, spatial enumeration 4,000 cases); integrated AB/BA semantic comparisons across 300/600/1000 vehicles in sparse/dense layouts and a local historical city loaded normally, 14 matched pairs with identical state/event/traffic/trip traces. The normal loader resets transient traffic; this is not a claim that all archived vehicles remain active after loading. No private save data is included in this repository.

The user requested immediate publication and stopped further detailed checks. The complete regression runner and browser performance comparison were not rerun for this release. Timing durations were not retained before stopping, so no percentage speedup or FPS gain is claimed. The remaining frame/render bottlenecks and guaranteed 20x throughput are not resolved by this patch.

Runtime SHA-256: 40ac3938273c0ca7853c67a088af07cf8a2278111cbe598c4344dd98286eeb1c.
