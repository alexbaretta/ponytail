# Native build evidence outside fixture lease

The traced native diagnostic suite finished 19 passes and 1 failure, with no
skips or cancellations. Recovery and original-worker correction/re-review
passed. The ordinary code submission failed at
`validateRollingWorkerSubmission`: `operation outside frozen lease`.

The worker correctly performed the configured build and supplied evidence with
operation `build`. The code fixture configures an affected TypeScript build
target, but its frozen execution operations were only `inspect`, `edit`,
`test`. The validator correctly rejected the mismatch. The correction adds
`build` to the code fixture lease; production lease validation is unchanged.

The exact failed run is retained in
[native build lease output](native-build-lease-failure.txt). This was the
diagnostic run begun before the terminal-history race correction and cannot
establish native acceptance of that correction. The corrected code fixture
requires its focused native rerun before assessment. OBL-52 remains pending.
