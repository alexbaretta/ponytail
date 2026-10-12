
# Final archive-corrected assessment: CERT-374

Source revision: d54ffb13e157049fc27191db4804a517fd34773a. Baseline: BASELINE-17. Binding: original .

Condition: Inspect a completed adopted plan from its accepted history after its status-directory move, while preserving current-input freshness enforcement for active work.

Criterion: Typed real-filesystem regression establishes complete fresh acceptance before relocation, preserves historical completion after relocation without rewriting certificate paths/digests, rejects incomplete or invalidated accepted history, and retains stale current-input results. Strict compilation, unchanged TSTS, affected integration proof and final QA pass. Historical fixture consumers do not depend on the active campaign location.

Real filesystem archive regression distinguishes accepted historical completion from active current-input freshness, rejects incomplete/invalidated history and preserves the original physical V1 contract. Frozen typed fixture consumers survive plan lifecycle relocation.

Current assessment inspects the completed executable evidence and verifies that differences from the committed execution source are confined to plan records. The bound check is this fresh inspection; original test revisions/dirty state remain in the hashed shared evidence rather than being relabeled. Actual final proof: 897 repository tests, 12 complete native Suite cases, 19 focused fixture/archive cases and one real PostgreSQL binding query passed with no failures/skips/cancellations. Existing TSTS checked 1,453 files without violations. Full raw command output, original revision, timestamps and failure-to-correction provenance are retained in [final acceptance](final-acceptance.md); this certificate hashes that completed evidence record. The full repository run used the staged final source before commit 080d86a; the native Suite ran from clean commit 080d86a. All relevant code/configuration/runtime inputs remain unchanged. Original earlier inspection text above remains historical and does not substitute for these final runs.
