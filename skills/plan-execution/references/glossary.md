<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Ponytail glossary

Traceability: implements REQ-PONYTAIL-GLOSSARY

This is the canonical definition and atomicity contract for Ponytail's shared
vocabulary. The owning skills define authority and detailed execution procedures.
Generated host copies derive from this source.

| Construct | Definition |
| --- | --- |
| Requirement | Defines approved product behavior through an identified set of atomic obligations. |
| Acceptance | An atomic observable condition demonstrating specified atomic obligations; its UAT record includes an adequate demonstration procedure. |
| Obligation | An identifiable responsibility to establish the smallest independently verifiable functional condition that can be integrated as a coherent change, discharged by adequate evidence. |
| Plan | Organizes authorized discharge of a declared obligation scope. |
| Sprint | Groups work intended for one execution interval. |
| Feature/story | Groups atomic obligations into a complete piece of functionality that could be released independently. |
| Tasklet | An atomic implementation step toward discharge. |
| Worker assignment | Gives a session bounded responsibility for selected obligations. |
| Continuation blocker | A newly exposed causal defect reached by rerunning the original required reproduction or acceptance after an in-scope repair, where that defect prevents the same approved outcome. It extends execution only forward along that demonstrated path, not laterally into adjacent or speculative work. |
| Worker | An executing session responsible for autonomously completing its assigned canonical scope through implementation, QA, local adversarial review and Git delivery. |
| Coordinator | The authorized session maintaining native worker capacity, resolving blockers, serially accepting reviewed Git deliveries, reporting completeness and independently running final QA. |
| Swarm | A campaign coordinator and its native worker sessions pursuing compatible assignments. Native host state identifies sessions and activity; no separate membership registry is required. |
| User worktree | A user-owned Git checkout; it does not imply ownership of another session or authorize deleting its work. |
| Managed worktree | An agent worktree whose lifecycle belongs to its native host or configured project owner; unfinished work must be preserved. |
| Evidence | Observations produced by validation, including command selection, process outcomes and test results; observations alone do not certify adequacy. |
| Certificate | A commit-bound attestation of validation scope, commands and results. The adopted workflow records commands and observed results in an immutable annotated Git tag; no mandatory payload schema is required. Historical certificate formats keep their original meaning. |
| Review attestation | An independent review verdict identifying the reviewer, exact candidate and assessed IDs; it assesses semantic adequacy, not command execution. |
| Campaign completeness vector | The lexicographically ordered unresolved-work vector `(R,A,T,I)` for an identified campaign scope and integrated revision. |
| Suite | A named set of related Arcs. |
| Arc | A named ordered sequence of one or more Steps demonstrating acceptance. |
| Step | A user or system action and its expected observable result; an executable integration Step is an independently reported operation with assertions. |

## Atomicity and expression

Obligations are the normative atoms of requirements, acceptance, planning,
assignment and delivery. Each obligation has one meaningful outcome, an
independent verdict after its declared prerequisites, and a coherent integration
boundary: it can land without an unfinished sibling making the repository
invalid. Split it if a smaller part can be verified and integrated while the
remainder stays outstanding and still yields a meaningful result. Stop splitting
when the parts would be implementation fragments rather than independently
verifiable functionality. Required implementation, tests, configuration and
traceability for the same outcome belong together. A required engineering
property is also a functional condition. File, declaration, test and elapsed-time
counts do not define atomicity; integration need not be a separate publication.

Requirements state or reference their atomic obligation IDs and canonical
conditions. Acceptances reference the obligation IDs they demonstrate and state
the expected observations. An acceptance may demonstrate several obligations;
several acceptances may jointly demonstrate one obligation. Assess each
obligation's complete discharge criterion; a partial observation is not discharge.
A requirement is satisfied only when all its applicable obligations and required
acceptance conditions are established. Requirements retain approval/provenance;
obligations do not create scope or authorize implementation by themselves.

Plans and features organize obligation IDs and prerequisites. Assignments bind
them to responsibility boundaries. Tasklets describe implementation steps for
those obligations. Implementation and test artifacts identify the conditions
they establish, and certificates assess named obligations on identified inputs.
An Arc or Step identifies which obligation conditions its observations prove;
tests may demonstrate several conditions without duplicating assertions.

Keep one canonical owner for each obligation's identity, condition and discharge
criterion. Other records reference that owner rather than copying definitions.
Use stable document anchors where configured machine-readable operations are
not adopted; do not invent unavailable tooling. Historical records retain their
identities and physical meanings. Decompose active adopted scope through explicit
successor baselines, preserving the full approved responsibility and history.
Broad final gates remain acceptance rollups, not atomic delivery units.
Reconcile existing active scope to this contract before its next assignment or
acceptance. Compatibility with legacy physical readers does not waive atomicity.

Work completion is discharged atomic delivery obligations divided by all atomic
delivery obligations in the current approved baseline. Report final acceptance
gates and inventory checks separately. Discovered scope and invalidated proof
change the count honestly; decomposition alone is not completed work.

Acceptance names the condition in the configured UAT root; Arc names its
ordered demonstration. They are distinct concepts, not interchangeable IDs.
Several independently complete Arcs may demonstrate one acceptance. A bare
condition, planned procedure, or incidental mention does not establish coverage.
Execution profiles do not create new Arcs. Suite/Arc/Step remains the integration
hierarchy; ordinary plan and release acceptance still names their existing gates.

## Adopted campaign completeness

R counts requirements whose atomic decomposition is missing, incomplete or
unreviewed. A counts obligations without adequate acceptance coverage. T counts
acceptances without adequate executable test coverage. I counts obligations
without adequate implementation. Unknown adequacy remains unresolved. A valid
annotation alone cannot decrease T or I: the linked tests and implementation
must exist, the implementation must pass those tests, and adversarial review
must establish that they actually demonstrate the obligation. Unit or integration
proof can suffice; no mandatory per-layer quota is implied.

Productive integrated steps generally decrease `(R,A,T,I)` lexicographically:
an earlier-coordinate decrease may expose later-coordinate work. Discoveries,
invalidated proof and authorized scope additions may increase the vector; record
them honestly. This vector replaces the historical six-coordinate progress
vector for adopted campaigns. Existing certificate categories are historical
interpretations, not new coordinates or additional bookkeeping requirements.

A worker-reported zero is provisional. A campaign is DONE only when all its
workers are DONE and the coordinator independently verifies every configured
full automated QA command on the final integrated candidate. Final QA failure
reopens repair work; after repair, the coordinator repeats full QA. Certificates
are metadata attached to commits, never tracked passing output or an expanding
source ledger. A certificate establishes only its actual validated scope and
revision, not arbitrary future candidates or full product adequacy.
