# City-outing admission regression test

Run from the repository root with Node.js (standard library only):

```
node tests/traffic/test-city-outing.cjs
```

The default target is this repository's `dist/game.js`. To test another
integrated build, set `SMCITY_SOURCE` to its `game.js` before running. Optional
`OUTING_REPORT` writes the complete case report to the named JSON file.

The test is self-contained within the repository. It needs only
`test-city-outing.cjs`, the adjacent `audit-harness.cjs`, and the target game
source. It does not read a baseline checkout, private archive, save file,
network resource, or any file outside the repository by default.

The test embeds only the exact old `chooseCityOuting` function as a source
string. Its free names resolve in an independent copy of the target game's
lexical scope. Thus the comparison uses the same integrated routing, parking,
catalogue and other dependencies, replacing only the optimized chooser on
the oracle side. The embedded function's SHA-256 assertion protects this
oracle from an unnoticed edit. The function originated in the v6.0.3 base
game source with SHA-256
`64170169199bccb5caed71ad1330a49ce1afbc7b390c3d233e842f3ca5cbb35c`;
that source file is not needed to run the test.

The 71 checks compare exact choices or rejection reasons, duration and end
time, route/planner call order, final source state, and existing routine/cache
side effects. Fixtures use game APIs to build roads, buildings, parking and
citizens. Coverage includes live reservations, parking membership, incoming
vehicle retargets and same-size changes; zero/null/false/truthy citizen IDs;
strict destination-ID equality; coercion and non-finite capacities; open and
closed service windows; upcoming work; every permitted service kind; tied
destination ordering; and missing outward or home routes. A clearly labeled
RAM-only hook confirms that parked counts remain live between candidates.

The 100-citizen no-route case verifies that all 100 original candidates are
still checked and produce the same state/report. Its deterministic operation
counts expect 400 old vehicle enumerations versus 100 optimized enumerations
(400,000 versus 100,000 vehicle visits for 1,000 vehicles). These counts do
not measure runtime, frame rate or planner timing. The suite has no
wall-clock benchmark, deployment or runtime-source mutation.

This portable copy has been prepared without executing it against the
integration build while the separate performance measurement is running.
