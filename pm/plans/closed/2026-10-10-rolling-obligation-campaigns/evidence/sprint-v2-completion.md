# Physical V2 sprint metadata completion

OBL-84; source and tests at exact clean revision 936c40f99269367de3ac81262058b2a973f200fc. BIND-5
retains the original obligation's condition, criterion and historical reader
meaning while permitting its bounded proof completion. Standalone coordinator
authority is used; no worker session, PostgreSQL submission or adversarial
review is claimed. The trusted proof context comes from the local executed
command and frozen standalone lease, retained before certificate acceptance.

The exact typed valid V2 fixtures prove planning and reviewed execution,
null execution, physical file parsing and unchanged input objects. Explicit
unknown malformed values cover wrong physical version, extra fields, identity,
planning and execution statuses, duplicate prerequisites, malformed reviewed flags and
path-based execution fields that do not belong to V2. Rejection leaves inputs
unchanged. Existing discovery and versioned tests remain passing.

Command: node --test dist/tests/sprint-metadata.test.js

Exit 0; five passing tests; zero failures/skips/cancellations.

```text
✔ physical sprint readers preserve planning, version-specific execution and null execution (1.372042ms)
✔ physical V1 sprint metadata retains null execution and rejects malformed inputs without mutation (0.71725ms)
✔ physical V2 sprint metadata preserves reviewed and null execution without mutating valid or malformed inputs (0.286292ms)
✔ unknown sprint metadata rejects invalid reviewed flags, paths, identity and block count (0.263125ms)
✔ discovery retains numeric ordering and rejects duplicate ordinals and mixed physical versions (2.287416ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 53.430375

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 921 files: no violations found.
```

The original checkpoint preparation records inspection of this proof. The
previous committed source edit and test operations are separately authorized
and preserved by BIND-5 and its frozen lease. Strict root compilation and
unchanged TSTS cover the owner and all exact typed fixtures. Existing runtime
and generated mappings are unchanged. V1/V3 sprint versions and
discovery have their own obligations and are not discharged here.
