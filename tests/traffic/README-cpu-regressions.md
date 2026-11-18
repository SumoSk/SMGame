# CPU regression checks

These tests use only Node.js built-ins and local test files. Node.js 22 is the
validated version. They do not load a private baseline checkout or files from
another workspace. The minimal original v6.0.3 queue functions and spatial
enumeration block are frozen in `oracles/`, with their source baseline SHA-256.

Place these files under `<repository>/tests/traffic/`, preserving `oracles/`.
Keep the repository's existing `audit-harness.cjs`; a matching copy is supplied
with the portable package for repositories that do not already have it. The
default runtime is `<repository>/dist/game.js`, resolved relative to the test
files, so the commands also work from another current working directory.

From the repository root:

```sh
node tests/traffic/test-cpu-junction-queue.cjs
node tests/traffic/test-cpu-spatial-enumeration.cjs
```

To check another runtime, set `SMCITY_SOURCE` to its absolute file path before
running either command. PowerShell example:

```powershell
$env:SMCITY_SOURCE = 'C:\path\to\repository\dist\game.js'
node tests/traffic/test-cpu-junction-queue.cjs
node tests/traffic/test-cpu-spatial-enumeration.cjs
Remove-Item Env:SMCITY_SOURCE
```

The queue check boots independent VM instances using the existing traffic
harness. It injects only the exact old queue functions into the reference VM's
lexical scope, then compares requests, queue order, indexes, memberships,
waiting ages and live admission decisions. It covers red/green signals,
air/ground queues, ownership, path/version/identity changes, exact registration
and entry boundaries, an unsorted/mutated plan, a 92-junction route, and a small
deterministic mutation replay. It reports 218 differential checkpoints plus
an ownership-work-count comparison. Its instrumentation stays inside the test
VMs and never writes to the runtime file.

The spatial check extracts only the candidate-enumeration block from the
runtime. It compares exact candidate IDs, first-blocker iteration order, and
memo payloads to the frozen old block across 4,000 deterministic cases,
including empty/missing buckets, air/ground prefixes, duplicates, self
exclusion and cell mutations. It allows unrelated changes elsewhere in the
integrated runtime. It checks enumeration equivalence; it does not replace
the full traffic integration tests for collision and movement behavior.

Both checks exit nonzero on a mismatch and print a JSON report on success.
Neither runs a wall-clock benchmark or a full-city simulation.
