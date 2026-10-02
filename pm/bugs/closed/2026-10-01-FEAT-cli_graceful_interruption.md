# Graceful CLI interruption

- **ID:** `2026-10-01-FEAT-cli_graceful_interruption`
- **Type:** FEAT
- **Status:** closed
- **Authorization:** Explicit stakeholder implementation request, 2026-10-01.
- **Scope:** All Ponytail subcommands, including update-index and PDF rendering.
- **Report:** Ctrl-C must not print a stack trace.
- **Confirmed mechanism:** CLI Python wrapper and PDF entry point do not catch
  KeyboardInterrupt. Python subprocess interruption can abandon delegated cleanup;
  negative child signal codes are not normalized to shell cancellation status.
- **Discriminating proof:** Process-group SIGINT during wrapper Git discovery
  prints a Python subprocess/selectors traceback before any Node index command runs.
- **Requirements reconciliation:** New [CLI interruption](../../requirements/cli-interruption.md)
  and [UAT Arc](../../uat/cli-interruption.md) activated before implementation.
- **Acceptance:** Quiet status 130 for built-in, delegated Node, PDF, and real
  index interruption; await cleanup; resume durable checkpoints; ordinary errors remain visible.
- **Exclusions:** No live GWEN job interruption, retention changes, or new retry paths.
- **Resolution:** Shared delegated-command wait preserves child cleanup and
  normalizes cancellation; built-in and PDF/policy Python boundaries catch
  KeyboardInterrupt; the index reports cancellation rather than operational failure.
- **Validation:** 68 focused CLI/index tests passed. Real PostgreSQL CLI
  process-group SIGINT and SIGKILL checkpoint/resume proofs passed. Build-impact
  reports no affected or indeterminate targets. Final `npm test` passed: 515
  core tests, installer tests, 23 Pi tests, four MCP tests, 80 TSTS tests, and
  594-file TSTS structure check. Traceability checked 240 relationships without
  violations; rule-copy and version checks passed.
- **Pattern evidence:** [CLI cancellation boundary](../../debugging-pattern-observations/2026-10-01-cli_cancellation_boundary.json).

Traceability: introduces REQ-CLI-INTERRUPTION from issue 2026-10-01-FEAT-cli_graceful_interruption
Traceability: plans-implementation REQ-CLI-INTERRUPTION from issue 2026-10-01-FEAT-cli_graceful_interruption
Traceability: plans-verification REQ-CLI-INTERRUPTION from issue 2026-10-01-FEAT-cli_graceful_interruption
