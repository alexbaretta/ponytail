# Native worker code and semantic rebase assessment

OBL-49's native Worker submission Git Arc passed with one test, zero failures,
skips or cancellations in approximately 197 seconds. This is assessment input,
not an accepted certificate or campaign completion claim. The complete actual
output is retained in [native-worker-submission-output.txt](native-worker-submission-output.txt),
with trailing horizontal whitespace removed. The original capture is
`tmp/binding-selectors/worker-submission-exact-native.txt`.

Command: `node --test --test-name-pattern='live worker implements and
semantically rebases' dist/tests/rolling-codex.integration.js`.

The original attached native session was `01a12bbc-5dc3-7451-aea5-d96fc48c3a60`;
its responsibility turn was `01a12bbc-9708-7ec0-b846-28f3f75a07ac`. The worker
changed the actual TypeScript value and unit expectation, preserving the
integration invariant. Its original commit was
`a94852f5955ed85e5b7a5e6aaa490ac6532eeb78`. A fresh fetch obtained base
`86b56e4e73009c09e9ece771b23aa634edd2d5b7`, including the independently
published upstream file. Interactive rebase stopped at the replayed commit;
the worker inspected its patch and the new base and ran strict build plus both
focused tests before continuing. The retained semantic record identifies the
preserved behavior, upstream change and lack of required adaptation.

Final candidate `f68ec359fafd6dc9da3181e422c7622d06db8280` has the new base as
its immediate parent. Independent test assertions established a changed commit
SHA, equal pre/post-rebase patches, preservation of the upstream file, a clean
checkout and passing actual focused tests. The canonical collector observed
the original turn completed and native activity idle, parsed the worker's own
strict V1 submission and validated its exact Git candidate and actual hashes.
The database persisted REVIEW; collection after store restart replayed the same
immutable receipt. No coordinator-authored substitute submission was used.

The native session was archived before isolated fixture/database cleanup.
Native requests use App Server directly; no Ponytail plugin API is required.
QA approvals were restricted to exact fixture commands and the assigned
checkout, original thread and turn. Production approval handling was unchanged.

Strict build, focused component proof, unchanged TSTS and runtime synchronization
passed as recorded in [worker-submission-component.md](worker-submission-component.md).
Affected prior certificates still require renewal, and scope-correction baseline
reconciliation remains pending. Preserve the original condition, criterion and
history when accepting OBL-49. This Arc establishes submission into review;
adversarial acceptance, integration, publication and final campaign QA remain
separate obligations.
