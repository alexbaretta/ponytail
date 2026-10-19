<!--
Copyright (c) 2026 Alex Baretta. All rights reserved.
Author: Alex Baretta <alex@baretta.com>.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Build-Impact Configuration

Store project build-impact configuration in `ponytail.json` at the project
root. Version 3 has this shape:

```json
{
  "version": 3,
  "buildImpact": {
    "version": 3,
    "globalInputs": [
      { "kind": "file", "path": "pnpm-lock.yaml" }
    ],
    "adapters": [
      {
        "type": "typescript",
        "targets": [
          {
            "name": "backend",
            "buildCommand": "pnpm --filter backend build",
            "tsconfig": "apps/backend/tsconfig.build.json",
            "configurationInputs": [
              "tsconfig.base.json"
            ],
            "additionalInputs": [
              { "kind": "directory", "path": "apps/backend/public" },
              { "kind": "glob", "path": "apps/backend/src/**/*.css" }
            ]
          }
        ]
      },
      {
        "type": "custom",
        "command": ["./scripts/native-build-impact"],
        "targets": [
          {
            "name": "native-addon",
            "buildCommand": "pnpm --filter native-addon build"
          }
        ]
      }
    ]
  }
}
```

Paths are project-root-relative. A `file` input matches one path. A
`directory` input matches that directory and every descendant. A Version 2
`glob` input uses Node's project-root-relative glob matching. Version 1 remains
readable but accepts only `file` and `directory` inputs.

Version 3 additionally permits an optional `traceability` array of canonical
annotation strings on each `globalInputs` or `additionalInputs` object:

```json
{
  "kind": "file",
  "path": "docs/legal/terms.md",
  "traceability": [
    "Traceability: implements OBL-LEGAL-BUILD from implementation legalTermsBuildInput"
  ]
}
```

The annotation belongs to this input declaration, not to the referenced file
or the generic build engine. It does not alter build selection. V1/V2 retain
their exact schemas and reject this field; migrate both version fields to 3
before adding it. Use `requirements-traceability` for graph discovery and
separate executable acceptance tests for behavioral proof.

`globalInputs` affect every configured target. Use them for shared lockfiles,
workspace manifests, or build definitions genuinely consumed by every target.

Each TypeScript target owns one `tsconfig`, optional configuration inputs such
as an extended base config, and optional non-TypeScript build inputs.
Query a path before deleting or renaming it. TypeScript enumerates only the
current program, so an unmatched path that is already absent is
indeterminate rather than a false no-impact result.

Each custom adapter owns one or more targets and an executable argument vector.
The dispatcher sends this request on standard input:

```json
{
  "version": 1,
  "projectRoot": "/absolute/project",
  "changedFiles": ["native/addon.cc"]
}
```

The command returns:

```json
{
  "version": 1,
  "status": "ok",
  "affectedTargets": [
    {
      "name": "native-addon",
      "changedFiles": ["native/addon.cc"]
    }
  ],
  "indeterminateTargets": [],
  "error": null
}
```

Target names must belong to that custom adapter. Use `status:
"indeterminate"` and identify affected target names under
`indeterminateTargets` when the custom command cannot determine impact.
