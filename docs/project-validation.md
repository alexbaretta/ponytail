# Local project validation and QA

`ponytail register` replaces `ponytail setup`. Run it once inside a project's
Git worktree. It initializes `.agents/config/ponytail.json` in the invoking
worktree together with its Codex policy proposal. The
global `~/.ponytail/config.json` records the repository's main root and blesses
the invoking worktree whenever the repository has no current blessing,
including when it was already registered. It contains no project identity data.
Commit local configuration. Linked worktrees inherit repository registration
through Git but retain the configuration from their checked-out revision.
Component registration and detection may populate newly initialized
configuration before its first commit. Validation and QA require the finished
configuration to be tracked.

Run `ponytail unregister <repository-root>` to remove an exact registration,
including one whose repository has been deleted or moved. When QA encounters
such a missing project, its error prints the corresponding command.

`ponytail bless` and `ponytail bless-worktree` select the invoking worktree as
the configuration other projects read. The configuration must be tracked,
committed, valid, and belong to the registered repository. `ponytail blessed`
and `ponytail blessed-worktree` print only its absolute root. Blessing stores
the path, not a Git object ID; subsequent committed configuration changes in
that worktree therefore become visible without reblessing.

Every `ponytail` invocation, including help, requires a non-bare Git worktree.
All commands except `register` and `unregister` first require repository
registration; blessing commands perform their own configuration checks.
`ponytail validate` checks registration and local configuration; it does not
scan project contents, load other projects, run package managers, or run tests.
`ponytail qa [references]` separately scans for forbidden references. It does
not run integrations or arbitrary project commands. Future moderately
expensive checks belong in this dispatcher, with explicit selectors.

Exit codes: 0 success; 1 configuration/tool/usage error; 2 no Git worktree;
3 repository not registered; 4 reference QA findings. Child update commands
preserve their own failure status.

`ponytail pre-commit` optionally installs `ponytail qa` at Git's configured
pre-commit hook path. When a shell hook already exists, Ponytail inserts a
marked block after its shebang and preserves the existing hook body. Ponytail
runs first; a QA finding stops the commit, while successful QA continues into
the client project's hooks. Repeating the command updates only Ponytail's
marked block. Hooks using another interpreter are left unchanged.

## Project configuration

`.agents/config/ponytail.json` is tracked in Git and may differ between
worktrees. V2 is the current writer format; V1 remains readable and normalizes
to an empty explicit-project dependency list. All physical-version fields are
required. Names and components are literal, case-insensitive identifiers
matched with Unicode letter/number/underscore boundaries. Canonical names must
be unique across registered projects. Put synonymous project names in `names`;
put component and subsystem names in `components`. Skills read both collections
as descriptive data.

```json
{
  "schemaVersion": 2,
  "name": "Example Service",
  "names": ["ExampleService", "EXS"],
  "components": ["@example/api", "example-worker"],
  "dependencies": [],
  "repositoryUrls": ["https://example.test/team/service.git"],
  "packages": [{"manager": "npm", "name": "@example/service"}],
  "manifests": [{"manager": "npm", "path": "package.json"}],
  "exceptions": []
}
```

Manage component names from any registered checkout:

```sh
ponytail register-component example-worker
ponytail unregister-component example-worker
ponytail list-components
ponytail detect-components --language auto
ponytail register-dependency "Example Platform"
ponytail unregister-dependency "Example Platform"
ponytail list-dependencies
```

Registration is idempotent. Unregistration fails when the exact component is
or dependency is absent. Dependency commands accept the exact canonical name
of another registered project and resolve it from that project's blessed
worktree. Listing commands print the current worktree's configured values, one
per line. Component and dependency mutations use a repository-specific lock and
atomic file replacement. Project synonyms remain explicit metadata because
package manifests do not identify them reliably.

The `typescript`, `javascript`, and `auto` detection modes currently share one
JavaScript-package detector. It reads every tracked regular `package.json` in
the working tree, including monorepo packages, and registers each valid `name`.
The project configuration also records the final path segment of a scoped package as
its shorthand: `@example/service` records both `@example/service` and
`service`. Full names and shorthands are deduplicated exactly.
Unnamed manifests are ignored. Untracked manifests, submodule contents, and
dependency directories absent from Git are outside the scan. Every candidate
is parsed before metadata changes, so one malformed or unsafe manifest fails
the complete operation. Detection adds to the existing component list and
never removes entries. It prints the complete detected set, one bare component
name per line in sorted order, so unwanted results can be passed directly to
`ponytail unregister-component`.

The invoking worktree's configuration supplies its dependencies and exceptions.
For every other registered repository except the configured Ponytail source,
QA reads names and components only from its blessed worktree. Ponytail and its
components are always permitted because they provide the QA tooling itself. A
missing, dirty, invalid, removed, or unrelated blessed worktree is a
configuration error rather than an incomplete successful scan.

Package coordinates identify what another project's canonical package manager
must declare to depend on this project. npm and pnpm share npm coordinates;
Python package names use normalized punctuation and case. Repository URLs
identify actual submodule dependencies. Configure every relevant workspace
manifest explicitly; missing, untracked, symlinked, or malformed declarations
fail QA. Glob patterns and paths outside the repository are rejected.

Supported declarations:

| Manager | Manifest | Direct dependency sources |
| --- | --- | --- |
| npm / pnpm | package.json | dependencies, devDependencies, optionalDependencies, peerDependencies; npm aliases resolve to their actual package |
| cargo | Cargo.toml | dependencies, dev-dependencies, build-dependencies, target declarations, workspace dependencies; select the workspace manifest for inherited declarations |
| pip | pyproject.toml | PEP 621 dependencies and optional-dependencies |
| pip | requirements file | Named PEP 508 requirements; includes, editable installs, options, hashes, and unnamed URLs require an explicitly supported declaration instead |
| brew | Brewfile | Literal brew and cask declarations; Ruby execution is not supported |
| conda | environment YAML | Named dependencies and pip subsections |

Unsupported declaration syntax fails explicitly. No network, installation,
package-manager execution, lockfile traversal, or global environment lookup
occurs. A registered project is permitted when its canonical name is listed in
the invoking project's explicit `dependencies`, it has at least one matching
direct package coordinate, or its repository URL identifies an actual indexed
Git submodule. Permissions are directional. An explicit project dependency
permits references to that project's canonical name, synonyms, components,
package names, repository URLs, and registered path. A .gitmodules entry alone
grants nothing. Relative submodule URLs resolve against the superproject origin.

## Search and exceptions

Search covers working-tree text of tracked files using `git grep`, including
unstaged edits. It excludes untracked files, binary content, Git history, and
submodule contents. It searches file contents, not filenames. All tracked
prose, tests, and generated text participate. A newly added file participates
after `git add`. Foreign canonical names, synonyms, component names, package
names, repository URLs, and registered paths are searched, except identities
registered as components of the invoking project. Component ownership matches
case-insensitively, like the reference scan. No recursion into dependency
checkouts occurs. A missing registered checkout or its metadata is a
configuration error, not a successful incomplete scan.

The exact `<!-- ponytail-plan-sprint` opening line in Markdown is recognized
as required sprint protocol metadata. The metadata body and all other lines
remain scanned; this does not exempt ordinary Ponytail references.

QA also recognizes enabled Ponytail skill names from its bundled registry when
their `SKILL.md` is installed in the client's `.agents/skills/<name>/` or
`CODEX_HOME/skills/<name>/` (`~/.codex/skills/<name>/` by default) and declares
the matching frontmatter name. Those skill names are valid references throughout
the client project. Longer identifiers and other references on the same line
remain scanned. An empty directory or a mismatched skill declaration grants
no permission.

An exact-file exception requires all four fields below:

```json
{"project":"Example Service","name":"EXS","path":"docs/example.md","reason":"This abbreviation denotes an unrelated standard here"}
```

Exceptions grant only the named identifier in the exact file for that foreign
project. Their own `project` and `name` declaration values are automatically
recognized as exception metadata; reasons and other metadata remain scanned.
Unused exceptions emit warnings. Prefer synthetic test identities over
exceptions naming real downstream projects.

QA reports file, line, project, matched name, and registered-project coverage.
It can detect only the identities in the local registry; it cannot prove that
unregistered projects do not exist or recognize unnamed copied business logic.
Ponytail neither provisions nor mandates CI/CD behavior.
