# Cross-plan tasklet prerequisite omitted from campaign readiness

- ID: `2026-10-02-BUG-cross_plan_tasklet_prerequisite_omitted`
- Type: `BUG`
- Status: `closed`
- Reported: 2026-10-02 during GWEN campaign execution.
- Requirement: [campaign orchestration](../../requirements/campaign-orchestration.md).
- UAT: [cross-plan tasklet prerequisites](../../uat/campaign-orchestration.md#arc-block-a-sprint-until-an-external-tasklet-is-integrated).
- Traceability: introduces REQ-CAMPAIGN-ORCHESTRATION from issue 2026-10-02-BUG-cross_plan_tasklet_prerequisite_omitted

## Confirmed mechanism

GWEN's payment-provider S06 prose forbids tasklet review and execution until
cloud-governance `S05-F01-T02` is complete and integrated. Its V3 tasklet
graph records only local tasklet edges, and its V1 plan campaign metadata
records no plan dependencies. Ponytail's campaign graph therefore treats S06
as review-ready even while that external tasklet is unchecked on the
coordinator's integrated tree. Topological sorting of the authored graph
cannot find an edge that was never represented in machine-readable metadata.

## Resolution and acceptance

Add a versioned tasklet metadata representation with explicit cross-plan
tasklet edges. Validate the referenced campaign plan and tasklet, reject
cycles and a completed tasklet whose prerequisite is unfinished, and withhold
review and implementation dispatch for the affected sprint until the target
tasklet is DONE on the coordinator's integrated tree. Preserve V1–V3 reads
and independent sprint/plan work. An uncommitted DONE marker does not satisfy
the prerequisite. The affected GWEN S06 metadata must be
upgraded in its owning project; Ponytail must not infer the edge from prose
or modify that checkout from this repository task.

## Follow-up regression: frozen target omitted from validation

The first live GWEN S06 V4 delivery was rejected with
`CAMPAIGN_TASKLET_DEPENDENCY` even though cloud-governance `S05-F01-T02`
exists in its authored graph. The target sprint has `execution: null`, and
Ponytail excluded all its tasklets from both the execution census and the
dependency-target index. Keep the former exclusion, but include a validated
frozen graph in the latter. Its tasklets remain `PENDING` until an execution
lease exists, including when a DONE marker appears without that lease.

## Resolution evidence

Ponytail commits `3b5599d` and `598b3c7` implement and verify the explicit
cross-plan edge, including frozen target resolution. The focused campaign
census regression and full core suite passed. GWEN's integrated S06 V4
metadata now declares the cloud-governance `S05-F01-T02` edge. A live
`campaignGraph` query at integrated revision `dd391048576a5ecd511afd74def7d2722d01587d`
reports the prerequisite `PENDING` and the provider plan's runnable and
reviewable scopes both `null`; `runnable-plans` excludes the plan.
