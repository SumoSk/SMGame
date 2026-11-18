# v6.0.5: skip hidden scene work without reducing quality

Continues v6.0.4 smooth small-fleet presentation and full car detail below 100 active plus parked cars. The game simulation remains byte-identical to v6.0.4. Resolution, model geometry, tree count, materials, shaders, effects and traffic rules are unchanged.

Opaque sea is drawn after opaque occluders so hidden water fragments can fail depth testing. Static far-tree instances are partitioned into spatial batches with full transformed geometry bounds. Nearby views can cull offscreen batches. Distant views reuse the original bulk batches and original draw-call count. Both buffer sets share geometry/material and keep masks, IDs and picking consistent; this uses additional instance-buffer memory. No trees are rebuilt when zooming between these modes.

Validation: 39,099 real-Three.js assertions verify geometry/colors/IDs/flags in both modes, every vertex inside chunk bounds, bulk fallback, shared resources, mask/restore and picking. Water material/terrain/shader prerequisites pass 156 assertions in four cities. Syntax passes. Game source is unchanged from the v6.0.4 traffic validation.

Seeded starter-city browser experiment (18 residents, Medium graphics, viewport1382x1083,DPR1.25) retained all18 full-detail visible cars and the same fixture hash28a8d13a. The initial culling experiment submitted720,819 triangles instead of1,396,185, with721 draw calls instead of622. One 8-second control had108 RAF callbacks, median63.6ms,p95125.9ms; the culling experiment had173, median46.9ms,p9562.6ms. These are environment-specific experimental callback measurements, not guaranteed player FPS. The final distant-view fallback was validated structurally; the user requested immediate publication before further browser comparisons.

Runtime game SHA-256 remains c8129d94bdbefddf871302b4d61acc7a2105eae372e16b9a8c2aba2ca60a59ea. Final renderer SHA-2566a1784995b7f7410cc25cfac1cb5e4243b91c534e6bc8d80887d94f0624eb7c6.
