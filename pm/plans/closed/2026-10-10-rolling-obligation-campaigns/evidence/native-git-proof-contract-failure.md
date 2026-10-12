# Native correction fixture contract mismatch — 2026-10-12

The complete live suite ended with 36/37 passes (11/12 native workflows).
The failed native correction workflow preserved its original worker and reviewer,
corrected the source to the required value, replayed the required two commits,
ran focused QA and collected the fresh candidate. Its reviewer rejected that
candidate solely because the test-owned requirement still demanded file hashes
for source and ignored rebase/test logs.

The original reviewer's retained final verdict said that `proof.inputs` listed
source paths without digests and excluded ignored logs. That is the expected
Git-based contract, rather than a defective candidate. The fixture's requirement
had survived the phase-2 evidence conversion unchanged. This is a harness-owned
contract defect; production submission validation should not be weakened.

Failure: `runRollingWorkerScenario`, corrected review expected `accepted`, got
`rejected`; reviewer `01a131e7-7ca2-7191-9e7f-502a55b6e7cb`, review
`169fe3de-c7fe-46eb-b746-3376a3a17221`, candidate
`c93a56065bcf6236476ad027bfeccc30ddcd7aa8`. Raw suite output:
`tmp/compliance-native-final.log`. Its original native transcript retained both
verdicts, confirming that the second rejection concerned only hashes.

Bounded repair episode for OBL-157: change the test-owned requirement to current
Git revision/path evidence and retain ignored output for inspection; print the
corrected review before asserting acceptance. Exact implementation path:
`tests/rolling-campaign-store.integration.test.ts`. Record paths are this dossier,
the current plan and its obligation/checkpoint metadata. No production changes
are required by the diagnosis. Rebuild the configured affected target, then rerun
only the native code/rebase and same-reviewer correction workflows affected by
this fixture sentence. Reuse the ten other passing native workflows while their
inputs remain unchanged. Final compliance remains open pending that proof.
