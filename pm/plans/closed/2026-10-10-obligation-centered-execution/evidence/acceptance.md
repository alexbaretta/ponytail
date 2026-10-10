# Scoped adequacy assessment

Authority: stakeholder approval on 2026-10-10; actor `ponytail-local-approved-coordinator`.
Scope: exactly the eleven approved requirements in pm/requirements/obligation-execution.md.
No historical DONE state was converted to satisfaction. Six explicit category
inventories enumerate the following leaves. This is an attributed semantic review;
structural checks alone do not establish adequacy.

T1: each acceptance states the observable condition and the whole independently
executable CLI Arc, or the instruction-only repair policy Arc. T2: the complete
real CLI workflow includes fixture setup, Git changes, delivery, publication and
finalization; each Step asserts required outcomes and rejected writes. T3: the
following units implement or support the named observations. T4: existing tests
exercise their independent responsibilities; no duplicate assertion layer is
required. The repair starting instruction alone has the approved scoped unit
disposition because it is agent instruction, with its existing executable policy
integration remaining mandatory. Runtime controllers receive no disposition.

| Responsibility | Owned source | Requirements | Unit proof |
| --- | --- | --- | --- |
| glossary | skills/plan-execution/references/glossary.md | REQ-PONYTAIL-GLOSSARY | tests/obligation-glossary.test.js |
| readObligationDocumentV1 | skills/plan-execution/scripts/obligations.js | REQ-OBLIGATION-IDENTITY, REQ-OBLIGATION-BASELINE, REQ-OBLIGATION-COMPATIBILITY | tests/obligations.test.js |
| inputDigest | skills/plan-execution/scripts/obligations.js | REQ-OBLIGATION-FRESHNESS | tests/obligations.test.js |
| certificateReasons/freshCertificate | skills/plan-execution/scripts/obligations.js | REQ-OBLIGATION-DISCHARGE, REQ-OBLIGATION-FRESHNESS | tests/obligations.test.js |
| projectObligations | skills/plan-execution/scripts/obligations.js | REQ-OBLIGATION-DISCHARGE, REQ-OBLIGATION-COMPLETENESS | tests/obligations.test.js |
| compareVectors | skills/plan-execution/scripts/obligations.js | REQ-OBLIGATION-TRANSITIONS | tests/obligations.test.js |
| selectObligation | skills/plan-execution/scripts/obligations.js | REQ-OBLIGATION-PRIORITY | tests/obligations.test.js |
| acceptCheckpoint/replayHistory | skills/plan-execution/scripts/obligations.js | REQ-OBLIGATION-BASELINE, REQ-OBLIGATION-TRANSITIONS, REQ-OBLIGATION-COMPLETENESS | tests/obligations.test.js |
| portable main | skills/plan-execution/scripts/obligations.js | REQ-OBLIGATION-COMPATIBILITY | tests/obligations.test.js |
| selectObligationTasklets | skills/plan-execution/scripts/ready-tasklets.js | REQ-OBLIGATION-PRIORITY, REQ-OBLIGATION-ASSIGNMENT | tests/obligation-execution.test.js |
| readPlanMetadataV3 | src/campaign-census.js | REQ-OBLIGATION-COMPATIBILITY | tests/obligation-execution.test.js |
| parseCampaignJson/readLedgerV9/lease history | src/campaign-orchestration.js | REQ-OBLIGATION-ASSIGNMENT, REQ-OBLIGATION-COMPATIBILITY | tests/obligation-execution.test.js |
| createObligationAssignment/renewObligationAssignment | src/campaign-orchestration.js | REQ-OBLIGATION-ASSIGNMENT, REQ-OBLIGATION-IDENTITY | tests/obligation-execution.test.js |
| recordWorkerDelivery/readWorkerDeliveriesV2 | src/campaign-orchestration.js | REQ-OBLIGATION-ASSIGNMENT | tests/obligation-execution.test.js |
| obligationProjection/status/readiness | src/campaign-orchestration.js | REQ-OBLIGATION-PRIORITY, REQ-OBLIGATION-COMPATIBILITY | tests/obligation-execution.test.js |
| publishObligationCheckpoint/withLedgerLock | src/campaign-orchestration.js | REQ-OBLIGATION-TRANSITIONS, REQ-OBLIGATION-BASELINE, REQ-OBLIGATION-DISCHARGE | tests/obligation-execution.test.js |
| parsePlanIndexObligations/collectPlanProjection | src/project-index.js | REQ-OBLIGATION-IDENTITY, REQ-OBLIGATION-DISCHARGE, REQ-OBLIGATION-FRESHNESS | tests/obligation-execution.test.js |
| render/removeRelationshipAnnotations | scripts/build-openclaw-skills.js | REQ-PONYTAIL-GLOSSARY | tests/obligation-execution.test.js |
| repair starting instruction | skills/plan-execution/SKILL.md | REQ-REPAIR-PLAN-STARTING-GATE | Scoped instruction-only disposition; tests/plan-execution-policy.test.js integration |

The 17 controller cases cover exact physical readers, numeric precision, manifest
containment, freshness, failed/skipped/unfinalized proof, dependency ordering,
lexicographic transitions, bounded preparation, disturbances and rebaselines.
The 11 consumer cases cover actual frozen changes/delivery, serialized processes,
live owner retention, current/legacy metrics, retained lease identity and index
freshness. Existing campaign/index/generator cases retain physical compatibility.
The combined CLI Arc is additional whole-workflow proof, not credited merely
because its file is registered. C1 and C2 remain unresolved until the final full
command actually passes. There is no separate configured integration suite.

Relevant unit/integration input closure: tracked product, skill, generator, test,
package and runtime configuration files. Pure PM lifecycle records, reverse-view
locators and artifact-location-only traceability configuration changes receive
structural validation and do not change executable unit/integration semantics.
Requirement source bytes are included explicitly and remain fixed through closure.
The final command also runs the structural traceability gate; its post-move
locator reconciliation is independently checked after closure.
