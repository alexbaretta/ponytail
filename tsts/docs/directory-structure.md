<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Directory-Structure Manifest

Every Ponytail client project owns the tracked file
`.agents/config/project/directory-structure.json` and passes it to TSTS with
`--directory-structure`. The manifest is separate from the TypeScript analysis
configuration because it describes the whole Git repository.

```json
{
  "schemaVersion": 2,
  "contentKinds": {
    "source": ["src/**", "test/**"],
    "compiled": ["dist/**"],
    "environment": ["env/**", "**/*.env"],
    "temporary": ["tmp/**"]
  },
  "directories": [
    {
      "path": ".",
      "recursive": true,
      "allowedContentKinds": ["source"],
      "git": "tracked"
    },
    {
      "path": "tmp",
      "recursive": true,
      "allowedContentKinds": ["temporary"],
      "git": "ignored"
    }
  ],
  "files": [
    {
      "path": ".worktree",
      "allowedContentKinds": ["source"],
      "git": "ignored"
    }
  ],
  "opaqueDirectories": ["**/node_modules", "dist"]
}
```

Version 2 adds exact `files` rules. Version 1 remains accepted and normalizes
to Version 2 with no exact file rules. Each version accepts only its documented
keys. Unknown keys, duplicate JSON keys, duplicate directory or file owners,
missing content kinds, invalid Git policies, absolute paths, backslashes, empty
path segments, and paths containing `.` or `..` segments are errors.

`contentKinds` maps a project-defined semantic kind to one or more
repository-relative Node glob patterns. A file receives the matching kind with
the most non-pattern characters. A tie between different kinds is an
ambiguous-content error. This permits a narrow pattern such as `env/private/**`
to override a broad source pattern such as `apps/**` while making equal
precedence explicit and actionable.

`directories` assigns each directory one owner. The most deeply nested
matching rule owns a file. A recursive rule also owns descendants; a
non-recursive rule owns only direct children. `allowedContentKinds` refers to
declared kinds. An exact `files` rule overrides the containing directory rule
for only its named repository-relative file. File paths do not accept glob
syntax. `git` is `tracked`, `ignored`, or `either`; an untracked, non-ignored
file satisfies only `either`.

TSTS asks Git for tracked, untracked, and ignored paths. Every non-opaque path
must have one content kind, one directory owner, an allowed kind, and the
required Git state. It reports every violation in deterministic path order.

`opaqueDirectories` contains repository-relative directory glob patterns.
TSTS excludes their descendants from Git inventory before analysis, so it does
not inspect dependencies, credentials, developer scratch, or generated trees.
The directory location remains declared by the manifest. Git does not traverse
directory symlinks, and TSTS does not add a filesystem traversal that could
follow them.
