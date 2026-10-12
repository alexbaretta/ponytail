# OBL-44 worker attachment component

Recorded 2026-10-11. BIND-38 freezes the worker provisioning scope under BASELINE-14. The original condition and full application provisioning criterion remain unchanged. This record establishes component progress, not discharge.

The TypeScript application path claims the existing START_WORKER action exactly once before provisioning a numbered project-managed checkout. A native thread is started in that checkout; its returned thread/session identity is retained in an immutable V1 creation receipt before the first initialization turn. The worker creates its ignored marker. Only completed initialization and a matching regular, ignored, untracked marker allow atomic action completion and assignment/session attachment. Unknown creation or initialization outcomes remain fenced; the controller does not retry creation automatically. Corrective recovery belongs to the still-required recovery operation.

The shared marker validator now serves both attachment and submission, preserving the submission contract. Compiler-generated runtime owners and traceability mappings are synchronized. No plugin is required by this application path.

Validation on the changed tree:

- `npm run build`: strict TypeScript compilation and runtime generation passed.
- Focused worker, submission, native protocol, worktree and store contract selections: 16 tests passed, no failures or skips. Retained output: `tmp/binding-selectors/worker-attachment-focused.txt`.
- Existing local PostgreSQL campaign-store integration selection: 4 tests passed, no failures or skips. The new Arc allocates the checkout, provisions through the native protocol fixture, rejects a duplicate creation claim and altered receipt, attaches the matching session, verifies the clean checkout, and confirms immutable replay. Retained output: `tmp/binding-selectors/worker-attachment-store.txt`.
- Configured unchanged TSTS: 990 files checked, no violations including this staged prose evidence record. Retained output: `tmp/binding-selectors/worker-attachment-tsts.txt`.
- Runtime generation check, registry, generated registry, command adapters, manifests, 8 rule copies and 7 version files passed.
- Traceability generation retains six existing unresolved coverage errors for publication and interfaces. Those requirements remain pending.

OBL-44 remains started and unresolved. The protocol fixture is component proof; it does not establish the required application provisioning Arc with an actual installed Codex worker. That native workflow is the next completion-first action. No certificate was accepted and no historical assessment was rewritten. Earlier certificates whose input closures intersect these source/binding changes require explicit renewal before fresh satisfaction can be reported.
