<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Ponytail glossary
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
| Worker | An executing session responsible for autonomously establishing its assigned atomic obligations within the authorized lease and submitting adequate evidence. |
| Coordinator | The authorized session owning a campaign's authoritative dependency graph, scheduling, review-attestation recording, acceptance and publication through Ponytail tooling. |
| Swarm | A user-worktree-owned set of worker sessions and managed worktrees, with zero or one coordinator; either resource set may be empty. Membership is independent of campaign identity and observed session activity. |
| User worktree | A user-owned Git checkout that owns a swarm. |
| Managed worktree | A Git checkout allocated to a swarm for worker use; it belongs to at most one swarm at a time and may be released, reassigned or deleted when unassigned. |
| Certificate | Establishes that an obligation is satisfied for identified inputs. |
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
