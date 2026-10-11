# OBL-49 native code/rebase attempt

The first explicit native code/rebase Arc failed; it establishes no discharge.
The original native worker completed its instruction turn, and the collector
rejected its final response as an invalid V1 submission. The test archived the
original session before removing its isolated checkout and database rows.

Run: `node --test --test-name-pattern='live worker implements and semantically
rebases' dist/tests/rolling-codex.integration.js`. One failure, zero passes,
skips or cancellations; duration approximately 214 seconds. Local output:
`tmp/binding-selectors/worker-submission-native.txt`.

Native identity: thread `01a12b91-f219-72d0-a18b-01910f3a7519`, instruction turn
`01a12b92-1fbc-7571-aef3-793a5bce2ff3`. Observation timeouts kept waiting on
that same live turn. The terminal outcome was observed before any new test run.

The retained native transcript shows actual fixture edits, focused tests and a
commit. Ad hoc sequence-editor commands and interactive terminal input received
`rejected by user` tool responses. The worker aborted the unfinished rebase and
reported that semantic inspection had not been performed. This failed outcome
must not become passing evidence by accepting its existing commit or report.
The harness declines server approval requests; the available rejection text
does not supply a more specific policy reason.

BIND-45 adds a TypeScript QA sequence-editor fixture to the exact permitted
paths. The isolated project's Git configuration invokes that checked editor
to mark its single replayed commit for an explicit edit stop. The worker can
use ordinary interactive rebase commands without an ad hoc editor override or
terminal editor input. This changes only QA project setup, retains host
permission gates, and supplies no blanket command approval or production test
mode. The revised native Arc is a separate run and remains unproven until its
actual terminal result and semantic record are assessed.

Subsequent failures remain separate unresolved evidence. The configured-editor
run (about 111 seconds) was blocked when the ordinary rebase command with output
redirection was rejected. A QA-only handler now permits only exact reviewed
rebase command forms matching the reserved checkout, original native thread and
instruction turn; unrelated requests remain declined. Production approval
handling is unchanged.

The next run (about 72 seconds) stopped with two uncommitted fixture edits. Its
retained native response identifies a different prerequisite: the build-impact
query was indeterminate because the isolated project lacked `ponytail.json`.
The worker correctly refused to repair configuration outside its lease. The
fixture now owns a strict no-emit TypeScript target, configured build-impact
query and build command, using the existing installed dependencies through an
ignored link. Its focused QA includes that build and the two actual tests.
Final response and native identity diagnostics precede checkout assertions so
future failures retain their cause in the test output.

The build-ready fixture first failed attachment because a dependency-directory
ignore pattern did not ignore its symlink; the fixture now ignores the exact
entry `/node_modules`. Subsequent terminal attempts committed the requested
change but still failed the required fetch. The request-diagnostic run
(`worker-submission-request-native.txt`, about 84 seconds; native thread
`01a12bae-ccda-7da1-9d8f-efc696128a1b`, turn
`01a12bae-f406-7f72-aa85-104a8166fb12`) identifies the exact mismatch: App
Server supplied `/opt/homebrew/bin/bash -lc 'git fetch origin
campaign/worker-fixture > tmp/fetch.txt 2>&1'`, while the QA handler compared
the bare Git command. Checkout, thread and turn identities matched. The harness
sent `decline`; this was not a human refusal or a need for fresh authorization.

The handler now compares the exact shell-wrapped forms of the finite approved
fixture commands, while preserving checkout/thread/turn fences and one-command
approval. A focused regression passes the observed fetch request and rejects
foreign checkout/identity/turn, another approval method, malformed parameters,
a bare command and a compound fetch/reset command. Production handling remains
unchanged. `worker-submission-wrapped-native.txt` is a new native attempt; its
result must be assessed independently before claiming native acceptance.

That attempt reached a new boundary (about 248 seconds; thread
`01a12bb1-72fb-7323-abc7-2a48ea494189`, turn
`01a12bb1-af6e-7740-a176-0eec3a246f71`). The harness accepted the exact
fenced fetch, interactive rebase and continuation requests. The worker
reported the rebased candidate and passing build/tests, but its evidence used
argv arrays for `command` and objects for `finalization`. The physical reader
correctly rejected it with `command must be a nonempty string`. Native
acceptance and discharge remain unproven; partial execution cannot substitute
for a valid actual submission.

The production instructions now serialize a complete statically typed proof
outline with the frozen selection and target, showing string command and
finalization fields explicitly. A focused regression replaces its clearly
labelled placeholders and feeds the result through the canonical submission
reader. The next attempt is retained in
`tmp/binding-selectors/worker-submission-evidence-native.txt`; it uses the same
strict reader, without a permissive adapter or coordinator-authored evidence.

The complete-outline attempt reached valid evidence field types but returned
an extra top-level `stoppedAt` field (about 186 seconds; thread
`01a12bb6-f38c-7a30-8e0c-d5340c227452`, turn
`01a12bb7-23d2-7760-be03-d26292536f0d`). The exact physical reader rejected
that additional key; the result remains failed evidence. Reassessment checked
the installed native `turn/start` output-schema capability and the ownership of
the physical reader. The bounded correction states exact outline keys at every
level, keeps timestamps only in their defined evidence fields and adds the
observed extra-key case to the canonical reader's existing regression. It does
not add a second schema or strip fields from a worker's result. Successful
native acceptance is still required.

The exact-key attempt subsequently passed. See
[native-worker-submission-assessment.md](native-worker-submission-assessment.md)
and its retained complete output for the original native identity, actual edit,
fresh semantic rebase, QA and immutable REVIEW receipt. Earlier failed attempts
remain failed historical evidence; the passing Arc does not itself append a
certificate or discharge the campaign obligation.
