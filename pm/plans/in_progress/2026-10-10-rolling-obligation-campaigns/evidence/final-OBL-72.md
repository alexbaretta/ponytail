# Final delivery assessment: OBL-72

Source revision: 0df95beab8c9946f0211108c5dc035b36e45a0c4. Baseline: BASELINE-16. Binding: BIND-196.

Condition: Established runtime entrypoints are reproducibly materialized from their checked canonical TypeScript owners.

Criterion: The configured root build and runtime materialization check pass; exact generated/source mappings and focused emitted-runtime proofs preserve established launch behavior, without handwritten runtime duplicates.

The runtime generator compares established shipped entrypoints with output from their checked canonical TypeScript owners. The fresh --check invocation passes, and registry tests verify canonical generated data and host consumers. Existing tracked generated JavaScript remains reproducible output, with no new handwritten JavaScript implementation.

Twenty-three focused typed CLI and runtime-registry tests passed on this exact clean source revision. Unchanged TSTS checked 1,335 files with zero violations, and fresh runtime generation --check passed. The retained strict build and full 896-test acceptance results have unchanged relevant source bytes; their original provenance is preserved. The unchanged runtime and 855-relationship traceability evidence remain valid; no source or annotation changed since those checks. The preceding full core run passed all 896 tests and exited 0 on the same relevant input bytes before the bookkeeping commit; its original provenance is retained in final-acceptance.md, rather than relabeled as a new invocation. This assessment establishes only this atomic delivery condition; the remaining delivery obligations and whole-campaign rollups remain unresolved.

## node --test dist/tests/campaign-inventory.test.js dist/tests/campaign-activation.test.js dist/tests/campaign-invocation.test.js dist/tests/campaign-configuration.test.js dist/tests/campaign-scope.test.js dist/tests/campaign-plan-sources.test.js tests/runtime-registry.test.js

2026-10-12T09:00:11.951722+00:00 – 2026-10-12T09:00:12.193285+00:00

~~~text
✔ typed activation preserves moved links, suffixes, exclusions and active idempotence (77.278042ms)
✔ activation write failure restores the directory and every original Markdown byte (40.0655ms)
✔ activation destination and status guards reject before changing source bytes (37.230167ms)
✔ management configuration reader requires one exact safe V1 contract (1.209083ms)
✔ project-local management files preserve configuration, unsafe-file and data-error distinctions (2.799333ms)
✔ physical inventory readers retain identity, malformed diagnostic IDs and their distinct command sets (0.863167ms)
✔ inventory readers check nested primitives, ID lists, repository values and diagnostics (0.206708ms)
✔ typed inventory construction retains invalid metadata identity and unrelated unmanaged plans (89.570458ms)
✔ typed inventory presentation preserves complete V2/V3 diagnostic output and inputs (0.214916ms)
✔ empty valid inventory presentation retains its summary and final newline (0.085833ms)
✔ typed list and activation invocations retain status flags, required selection and inputs (0.907542ms)
✔ typed validation selection retains all/json ordering and plan selection (0.116208ms)
✔ typed report parsing retains last table flag, optional input and ordinary property names (0.125833ms)
✔ invalid invocation vectors preserve exact usage errors and JSON/table conflict (0.359916ms)
✔ source listing is lexical while parsed candidates follow configured lifecycle order (14.832042ms)
✔ candidate discovery rejects absent, symlinked and physically escaping roots and unsafe lifecycle directories (2.597ms)
✔ linked plans resolve existing directories, file fragments and physical paths while omitting missing links (3.332875ms)
✔ active selection and explicit child selection resolve the same complete campaign scope (8.56825ms)
✔ selection preserves missing and ambiguous active campaign and plan-name diagnostics (13.055167ms)
✔ ancestry enforces parent existence, links, cycles and shared obligation scope (4.012042ms)
✔ generated runtime registry matches its canonical source (2.214708ms)
✔ Hermes registers skills from generated registry data (0.224125ms)
✔ Pi registers auxiliary commands from generated registry data (0.170666ms)
ℹ tests 23
ℹ suites 0
ℹ pass 23
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 211.077917

~~~

## npm run check:tsts

2026-10-12T09:00:12.628399+00:00 – 2026-10-12T09:00:15.008236+00:00

~~~text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 1335 files: no violations found.

~~~

## node dist/scripts/build-runtime.js --check

2026-10-12T09:00:13.907330+00:00 – 2026-10-12T09:00:13.907330+00:00

~~~text

~~~
