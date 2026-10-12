# OBL-52 reviewer recovery component proof

BIND-49 freezes the reviewer recovery scope. The original obligation condition,
discharge criterion and history remain unchanged. CHECKPOINT-137 records the
binding amendment and resulting certificate freshness disturbance; the 73
previously discharged atomic outcomes are historical deliveries pending renewal
on the amended inputs.

`requestReview` accepts an explicit coordinator loss reference identifying the
latest unreplaced request. It records the previous and replacement review/session
identities in a separate physical V1 metadata contract, while preserving the
original request and verdict. Pending replacements retain the exact generation
and candidate; a rejected review can be replaced when its corrected submission
is ready. Each replacement obtains a fresh request and requires its own decision.
There is no automatic inference of loss from a timeout.

The campaign transaction serializes replacement and retry. PostgreSQL's pending
owner index excludes replaced requests. Replaced requests cannot claim or attach
new dispatches, supply late decisions or provide a current review context.
Replacement retries must retain the recorded reviewer, loss reference and
candidate. Existing review request/outcome physical V1 contracts remain unchanged.

The project setup command successfully applied the additive metadata column and
pending indexes to the existing configured local PostgreSQL database. Strict
compilation and runtime emission pass. The final focused command
`node --test dist/tests/rolling-review.test.js dist/tests/rolling-campaign-store.integration.test.js`
passes all 16 cases with zero failures, skips or cancellations. It verifies
concurrent replacement retries, rollback of an empty loss reference, fences on
the old actor, persisted immutable history, fresh review acceptance after restart,
and loss between rejection and corrected resubmission. The latter remains a
controlled lifecycle scenario, not native code-correction proof.

Unchanged TSTS reports no violations across 1103 files. Generated traceability
is synchronized; the six existing publication/interface coverage gaps remain
open. A dedicated native reviewer-loss case is implemented but has not yet been
verified. Native evidence and certificate assessment remain pending; this
component record does not discharge OBL-52 or establish final campaign acceptance.
