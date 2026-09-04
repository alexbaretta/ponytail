# Managing Codex command policy

`ponytail install-permissions` is Ponytail's Codex execpolicy installer. It
combines Ponytail's baseline, existing Codex rules imported during the first
accepted run, explicitly refreshed imports, and proposals from registered
projects. `condense_codex_rules.sh` remains the low-level compiler.

Repository configuration is never authoritative. A project proposes rules in
`.ponytail/codex-execpolicy.json`; accepted state is stored in
`~/.ponytail/codex-execpolicy/state.json`. The generated
`~/.codex/rules/ponytail.rules` file is a disposable projection.

The user-owned `~/.ponytail/config.json` contains the Ponytail source root and
the sorted unique list of registered Git roots. Register an adopting project
from any directory inside its worktree:

```bash
ponytail setup-project
```

Registration resolves only the enclosing Git root and requires that root's
project policy file. It does not scan the filesystem. Missing, moved, or
malformed registered projects make permission installation fail explicitly.

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

Every entry is a proposal, including commands stored inside the project. An
agent can change repository scripts, so their location does not make them
trusted. Prefer `prompt` for unsafe project commands. An accepted `forbidden`
rule blocks every Codex task loading the shared user policy.

Patterns use Codex literal prefix semantics. Each token is a string or a list
of accepted alternatives. A prefix governs every suffix.

## Review and acceptance

Display the complete effective diff for all registered projects:

```bash
ponytail install-permissions --dry-run
```

Without `--dry-run`, the tool displays the proposal and asks for confirmation.
For automation, accept exactly the displayed digest:

```bash
ponytail install-permissions --accept <proposal-digest>
```

A missing or rejected confirmation leaves both policy locations unchanged.
Accepted state is written before its Codex projection so an interrupted
installation remains recoverable. Use `--import-codex` when newly approved
rules outside Ponytail should replace the saved bootstrap import.

## Verification and recovery

```bash
ponytail install-permissions --check
ponytail install-permissions --restore
```

`--check` verifies registered project digests and the installed projection.
`--restore` recreates `ponytail.rules` solely from accepted state, even after
the entire `~/.codex` directory is lost.

The tool rejects symlinked project policy, accepted-state, and generated-rule
files and installs files through atomic replacement. Codex execpolicy is still
a preview interface. Set `PONYTAIL_CODEX_EXECUTABLE` to an absolute trusted
Codex executable path to validate each candidate with `codex execpolicy check`
before review or installation.
