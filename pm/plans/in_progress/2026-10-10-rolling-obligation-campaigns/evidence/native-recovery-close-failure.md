# OBL-52 renewal: native recovery close failure

The full native suite on clean source `eb7d275` finished with 19 passes and one
failure. Reviewer replacement, exact-candidate review, code submission and the
original-worker/original-reviewer correction Arc passed. The recovery case
failed at the explicit App Server close before its final connection restart,
after its worker instruction turn completed. The close safety invariant reported
unresolved activity without actor/turn identities. A retained owned App Server
then prevented the process from emitting its final failure summary.

The owned QA process tree was inspected: runner 52572, test child 52573,
retained App Server 97098, and its code-mode host 98250. Only App Server 97098
was terminated, after fencing its exact parent and executable. Its known worker
turn had completed. Checkout/database evidence was retained. The parent then
reported the complete failure; cancellation was not presented as a pass.
The [full failed output](native-recovery-close-failure.txt) preserves that result.

The smallest recovery selection passed on the same source revision: one pass,
zero failures, skips or cancellations. Its [focused output](native-recovery-close-focused.txt)
does not convert the failed full suite into a passing gate. The underlying
intermittent activity-tracking mechanism remains unconfirmed.

BASELINE-16/CHECKPOINT-138 activates the already approved reviewer-loss prose
clarification with current requirement digests. Atomic conditions, criteria,
identities and historical prefixes remain unchanged. BIND-50/CHECKPOINT-139
authorizes bounded close diagnosis without a new delivery or repeated
invalidation; previous freshness invalidation was already recorded.

The close assertion is a hard ownership invariant: stopping the owned App Server
while activity is unresolved can abandon an actor. Its control flow remains
unchanged. The error now identifies the unresolved thread and known turn (or
null for unknown turn identity), enabling a discriminating probe. The existing
protocol test fails on the former message and passes after the diagnostic change;
all seven focused protocol tests pass. Test cleanup restores observed idle
activity even when that diagnostic assertion fails. This change does not claim
to fix the intermittent recovery failure or discharge OBL-52.
