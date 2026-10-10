<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Ponytail glossary

Traceability: implements REQ-PONYTAIL-GLOSSARY

This is the canonical short-definition source for Ponytail's shared vocabulary.
The owning skills define detailed contracts, authority, and execution procedures.
Generated host copies derive from this source.

| Construct | Definition |
| --- | --- |
| Requirement | Defines approved product behavior. |
| Acceptance | An atomic observable condition establishing compliance with a requirement; its UAT record includes an adequate demonstration procedure. |
| Obligation | An identifiable responsibility to establish a specified condition, derived from approved requirements or applicable Ponytail rules, and discharged by adequate evidence. |
| Plan | Organizes authorized discharge of a declared obligation scope. |
| Sprint | Groups work intended for one execution interval. |
| Feature/story | A complete piece of functionality that could be released independently. |
| Tasklet | An atomic implementation step toward discharge. |
| Worker assignment | Gives a session bounded responsibility for selected obligations. |
| Certificate | Establishes that an obligation is satisfied for identified inputs. |
| Suite | A named set of related Arcs. |
| Arc | A named ordered sequence of one or more Steps demonstrating acceptance. |
| Step | A user or system action and its expected observable result; an executable integration Step is an independently reported operation with assertions. |

Acceptance names the condition in the configured UAT root; Arc names its
ordered demonstration. They are distinct concepts, not interchangeable IDs.
Several independently complete Arcs may demonstrate one acceptance. A bare
condition, planned procedure, or incidental mention does not establish coverage.
Execution profiles do not create new Arcs. Suite/Arc/Step remains the integration
hierarchy; ordinary plan and release acceptance still names their existing gates.
