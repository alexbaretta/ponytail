# OBL-51 native Git permission repair

The clean native suite at revision `9fb2d90` passed 17 cases and failed one.
The original-worker correction and original-reviewer acceptance Arc passed,
including both semantic rebase stops and retention of both review decisions.
The separate code-submission Arc failed when a sandboxed `git rebase --continue`
partially updated the branch before failing to update shared repository metadata.
Its escalated retry encountered the already changed ref. The worker retained the
checkout and reported the failure; no submission or discharge was fabricated.

The retained [native output](native-git-permission-failure.txt) is evidence of a
failed suite, not a passing campaign gate. This was a sandbox execution failure;
the exact scoped escalation requests were accepted by the test harness.

Worker instructions now require requesting sandbox escalation before the first
execution of each authorized Git mutation in the linked checkout. Lease and
command restrictions remain binding. The focused instruction tests pass (5/5),
and unchanged TSTS reports no violations across 1061 files. Clean native
verification and certificate freshness renewal remain necessary before OBL-51
can be discharged.
