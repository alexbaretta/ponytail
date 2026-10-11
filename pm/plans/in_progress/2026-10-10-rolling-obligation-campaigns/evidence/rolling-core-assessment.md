<!-- Copyright (c) 2026 Alex Baretta. All rights reserved. Licensed under the MIT License. -->

# Existing rolling component discharge assessment

Source revision 57eb538; no product edits. Began 2026-10-11T06:52:00.173Z; finalized 2026-10-11T06:52:01.119Z.

The assessor inspected canonical criteria and actual source/assertion boundaries
before executing this selection. Fourteen tests prove nineteen named conditions;
test counts do not define obligation counts. All core implementations, direct
fixtures and the setup fixture are checked TypeScript. Generated runtime check
passes; unchanged TSTS checked 882 files with no violations. Strict compilation
evidence from CERT-5 is reused on unchanged relevant source/configuration bytes.

| Obligation | Observed proof |
| --- | --- |
| OBL-22 | Explicit/project/Git target precedence, designated checkout loading and retained resolved target after defaults change. |
| OBL-23 | Campaign/project/global N/M precedence, safe positive boundaries and lossy numeric-token rejection. |
| OBL-24 | Exact project shape, literal argv (including shell-looking literals), missing publication QA and unsafe configuration locations. |
| OBL-25 | Coordinator-file digest changes on authoritative inputs, ignores worker-copy files and rejects obsolete selection identities. |
| OBL-26 | Unavailable requirement input prevents selection; a cyclic prerequisite graph rejects collection. |
| OBL-27 | Exact acceptance Step and implementation/source/test references survive reading; unknown shapes and escaping paths reject. |
| OBL-28 | Numeric deterministic selection, prerequisite blocking, path/resource conflicts and active capacity bounds produce a maximal compatible selection. |
| OBL-29 | Stopped inactive ownership remains reserved; eligible original assignment/session resumes ahead of new work, with active capacity enforced. |
| OBL-30 | Changed retained scope blocks resumption and foreign campaign path ownership constrains new selection. |
| OBL-31 | Four concurrent real PostgreSQL allocation requests yield exactly one reservation at capacity one, using number 101. |
| OBL-32 | Wrong/stale generations reject before suspension/retirement; resumption rotates generation and preserves original session. |
| OBL-33 | Persisted action is STARTED, blocks premature retirement, requires completed acknowledgment and rejects a conflicting repeated result. |
| OBL-34 | Retired assignment releases even with no ready work; repeated release rejects and its checkout is subsequently reusable. |
| OBL-35 | Changed graph identity is explicitly reconciled before allocation; stale graph allocation rejects and unblocked dependency permits resumption. |
| OBL-36 | Main checkout and created checkout resolve the same physical anchored pool; changed checkout configuration rejects and symlink ancestors resolve physically. |
| OBL-37 | Ordinary Git provisioning creates number 101 with a lease branch and executes typed project setup with the checkout path/number. Invalid lease numbers reject. |
| OBL-38 | Missing session marker ignore is repaired and checked effectively without losing the existing ignore prefix. |
| OBL-39 | Marker, dirty contents and unintegrated commit each block reuse while preserving content; integrated clean reuse succeeds. |
| OBL-40 | Identical provisioning intent returns the same checkout/result; setup failure leaves number 102 physically present and inventoried. |

The PostgreSQL Arc ran against the existing configured local PostgreSQL resource
with a dedicated project fixture and cleanup. The Git Arc created isolated
ordinary checkouts and exercised real setup and reuse. No live native worker
start or application provisioning is claimed: OBL-41 and OBL-44 onward remain
open. The canonical conditions above are component outcomes; their later
application integration and final campaign/language gates remain required.

The graph fixture clears repository certificates/checkpoints; the database
fixture additionally selects the original baseline/scope. Appending this
assessment does not change those fixture conditions or requirement identities.
Canonical histories and obligation conditions remain immutable.

Command: `node --test dist/tests/rolling-campaign.test.js dist/tests/rolling-campaign.integration.test.js dist/tests/rolling-campaign-store.integration.test.js dist/tests/rolling-worktrees.test.js dist/tests/rolling-worktrees.integration.test.js`

Exit 0; finalized pass; zero failures, cancellations and skips.

```text
✔ real PostgreSQL serializes allocation, retains suspended ownership and releases without ready work (570.896292ms)
✔ configuration boundary uses the designated Git checkout and effective defaults (131.379625ms)
✔ coordinator files alone determine graph identity, dependency changes and allocation (191.630667ms)
✔ project configuration preserves explicit targets, main-root paths and executable argv (1.314542ms)
✔ project configuration rejects ambiguous shape, invalid identity and missing publication QA (0.567334ms)
✔ capacity and publication limits reject unsafe values before JSON conversion (1.2945ms)
✔ campaign resolution uses explicit, project, then Git defaults and retains its selected target (41.19475ms)
✔ campaign resolution rejects invalid targets, missing defaults and invalid overrides (91.896375ms)
✔ execution references retain acceptance Steps and reject unknown shapes and escaping files (0.520208ms)
✔ maximal scheduling uses readiness, numeric ordering and path/resource compatibility (0.831625ms)
✔ suspended workers retain ownership and resume before new obligations without exceeding active capacity (0.246666ms)
✔ scope changes require reconciliation and foreign campaign owners still constrain shared writes (0.1535ms)
✔ ordinary Git pool setup, identical intent recovery and reuse preserve conflicting work (858.362875ms)
✔ physical pool identity follows symlink ancestors before missing directories are created (1.871458ms)
ℹ tests 14
ℹ suites 0
ℹ pass 14
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 913.722541
```
