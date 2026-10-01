# Managing Codex command policy

`ponytail update-permissions` reviews and installs the invoking project's
Codex execpolicy proposal. `condense_codex_rules.sh` is the low-level compiler.

Projects propose rules in `.agents/config/codex-execpolicy.json`. Acceptance
creates two isolated durable records and projections:

- `~/.ponytail/codex-execpolicy/state.json` V3 and
  `~/.codex/rules/ponytail.rules` contain only Ponytail baseline and user-owned
  rules imported during the first accepted run.
- `~/.ponytail/codex-execpolicy/projects/<project-root-sha256>.json` V1 and the
  invoking worktree's ignored `.codex/rules/ponytail.rules` contain only that
  project's accepted proposal.

No project rule is installed in user-global policy or another project. Codex
loads the project projection through its trusted project configuration layer.

## Project policy

The V1 project file contains `safe` and `unsafe` arrays:

```json
{
  "schemaVersion": 1,
  "safe": [{
    "pattern": ["./scripts/test.sh"],
    "justification": "Run the project test entrypoint"
  }],
  "unsafe": [{
    "pattern": ["./scripts/install.sh"],
    "decision": "prompt",
    "justification": "Changes shared user state"
  }]
}
```

Every entry is an untrusted proposal. Prefer `prompt` for commands with unsafe
effects. Patterns use Codex literal prefix semantics; each token is a string or
a list of accepted alternatives, and a prefix governs every suffix.

## Review, verification, and recovery

```bash
ponytail update-permissions --dry-run
ponytail update-permissions --accept <proposal-digest>
ponytail update-permissions --check
ponytail update-permissions --restore
```

Without `--dry-run`, a changed proposal requires confirmation. A missing or
rejected confirmation leaves both global and project state unchanged. `--check`
verifies both accepted records and installed projections for the invoking
project. `--restore` reconstructs both projections from accepted state.

Existing aggregate V1 and V2 state is read without opening recorded project
paths. The next accepted update writes V3 global state with every project
source removed and creates a project state only for the invoking project;
foreign contributions are never migrated into active policy.

The tool rejects symlinked project policy, accepted-state, and generated-rule
files and installs through atomic replacement. Set
`PONYTAIL_CODEX_EXECUTABLE` to an absolute trusted Codex executable path to
validate each candidate with `codex execpolicy check` before installation.
