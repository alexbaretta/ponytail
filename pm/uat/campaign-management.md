<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Campaign management acceptance

[Back to UAT index](index.md) · [Requirements](../requirements/campaign-management.md)

These acceptances are activated with the redesign. Executable test IDs and
implementation links are pending; these procedures do not claim passing proof.
Run automated fixtures through the owning project commands; real session
continuity additionally requires the authorized Gwen pilot.

## ACC-CM-GRAPH

Obligation: [OBL-CM-GRAPH](../requirements/campaign-management.md#obl-cm-graph).

**Actor:** developer or campaign coordinator.

**Procedure and expected observations:** Declare a requirement with two obligations, corresponding acceptances, identified tests and code blocks. Generate and query reverse links. Verify all four edges resolve to the declared units; corrupt each identity or attachment in turn and verify a precise diagnostic.

A test-classified TypeScript file containing an identified QA assertion function
and a real test registration discovers both units without overlapping scopes or
file extraction. Repeat for unit and integration scopes. TSTS validates both
attachments and still rejects an ordinary helper labeled as an executable test;
implementation-classified files still cannot claim test coverage.

## ACC-CM-ACCEPTANCE-COVERAGE

Obligation: [OBL-CM-ACCEPTANCE-COVERAGE](../requirements/campaign-management.md#obl-cm-acceptance-coverage).

**Actor:** developer or campaign coordinator.

**Procedure and expected observations:** Give one requirement two acceptances and a test for only one. The checker reports the uncovered acceptance. Add its adequate test and verify structural coverage. Repeat using only unit tests and only integration tests; neither requires an unnecessary second layer.

## ACC-CM-DESCENT

Obligation: [OBL-CM-DESCENT](../requirements/campaign-management.md#obl-cm-descent).

**Actor:** developer or campaign coordinator.

**Procedure and expected observations:** Compare integrated candidates before and after a repair. Missing, failing or semantically inadequate proof cannot reduce T/I. A valid repair reduces the first changed coordinate while later coordinates may increase. A newly discovered gap raises the affected coordinate without being mislabeled progress.

Run `ponytail traceability completeness` with explicit initial requirement IDs,
then a reviewed assessment tag at HEAD. Verify F equals the annotation finding count, precedes O/A/T/I, and is nonzero even when all coverage coordinates are zero. Verify exact unresolved IDs and vector,
including missing structure despite claimed completion. Reject lightweight, ambiguous or malformed assessment tags,
missing validation tags, invalid IDs and invalid committed source. The command works without a database; zero remains provisional.

Assessment of the same annotated-tag target returns the same vector with dirty,
staged, deleted, ignored or index-hidden local files, preserving those files and
the index. Explicit historical tags assess their own committed configuration and
sources; automatic selection must not silently select a historical assessment.
Committed uncovered acceptances and invalid source types remain detectable even
when local changes conceal them. Revise the same commit's assessment in place:
the no-argument command reads the revised judgment, the assessment tag count
stays one and its target stays unchanged. Validation tags remain unchanged.
A missing assessment and duplicate assessments produce distinct diagnostics;
duplicates list their names for reconciliation.

## ACC-CM-CERTIFICATES

Obligation: [OBL-CM-CERTIFICATES](../requirements/campaign-management.md#obl-cm-certificates).

**Actor:** developer or campaign coordinator.

**Procedure and expected observations:** Run focused validation on a clean candidate; inspect the annotated tag target, commands and actual results. Confirm the tracked tree is unchanged. A failed command produces no passing certificate. Reject a candidate changed during validation and a mismatched tag target.

## ACC-CM-CAPACITY

Obligation: [OBL-CM-CAPACITY](../requirements/campaign-management.md#obl-cm-capacity).

**Actor:** developer or campaign coordinator.

**Procedure and expected observations:** Start the configured number of compatible assignments. Block one worker, retain it and start a replacement on other work. Unblock the original and permit excess capacity. Complete workers; replenish only below target and when authorized compatible work exists.

## ACC-CM-WORKER-DELIVERY

Obligation: [OBL-CM-WORKER-DELIVERY](../requirements/campaign-management.md#obl-cm-worker-delivery).

**Actor:** developer or campaign coordinator.

**Procedure and expected observations:** Submit a reviewed tagged branch based on the integrated head and accept it mechanically. Advance the head before another submission and verify the stale worker performs reconciliation and refreshed proof; the coordinator does not implement repairs or perform the adversarial review.

## ACC-CM-MONITORING

Obligation: [OBL-CM-MONITORING](../requirements/campaign-management.md#obl-cm-monitoring).

**Actor:** developer or campaign coordinator.

**Procedure and expected observations:** Supply timestamped observations spanning 30 active minutes with net lexicographic regression or no new minimum. Verify a diagnostic alert. Repeat with acknowledged waits and changed scope; these are reported distinctly without manufacturing progress or cancelling the campaign.

## ACC-CM-HOST-OWNERSHIP

Obligation: [OBL-CM-HOST-OWNERSHIP](../requirements/campaign-management.md#obl-cm-host-ownership).

**Actor:** developer or campaign coordinator.

**Procedure and expected observations:** Inspect installed CLI/MCP help and exports: no swarm chapter or obsolete dispatch command remains. Resume a campaign from native session inventory without duplicate assignments. Verify historical records remain inspectable and no unrelated project is mutated by adoption.

## ACC-CM-REPORTING

Obligation: [OBL-CM-REPORTING](../requirements/campaign-management.md#obl-cm-reporting).

**Actor:** developer or campaign coordinator.

**Procedure and expected observations:** Create workers and verify unique campaign sequence names with a three-word assignment summary. Compare peer summaries: specific domains, components or outcomes distinguish their assignments, rather than repeating generic phrases such as `Complete … coverage`. Blocking and readiness do not add DONE. Accept a delivery, verify the integrated vector is displayed, then verify final worker completion adds DONE exactly once.

## ACC-CM-FINAL-QA

Obligation: [OBL-CM-FINAL-QA](../requirements/campaign-management.md#obl-cm-final-qa).

**Actor:** developer or campaign coordinator.

**Procedure and expected observations:** Reach reported zero with one unfinished worker: closure is refused. Complete all workers and make full coordinator QA fail: closure is refused and repairs reopen. Integrate reviewed repairs, reach zero and all workers DONE, then independently rerun all configured QA. Only an entirely passing run on that integrated candidate permits DONE and a final certificate.

