---
name: test-credentials
description: "Test credential discovery and safety"
homepage: https://github.com/alexbaretta/ponytail
license: MIT
---

<!--
Copyright (c) 2026 DietrichGebert.
Copyright (c) 2026 Alex Baretta. All rights reserved.
Licensed under the MIT License. See LICENSE in the project root.
-->

# Test Credentials

Use this skill only when the host repository declares or already uses the
project-local, ignored `test_credentials/` convention. Otherwise follow the
host repository's credential policy; do not introduce this layout merely
because this skill is installed.

When adopted, treat `test_credentials/` as the canonical source for test
credentials. Inspect it before concluding that credentials are unavailable or
substituting placeholders.

## Canonical Structure

Each leaf is a credential bundle:

```text
test_credentials/
├── project/
│   └── current-user/
│       ├── local/
│       │   ├── credentials.env
│       │   └── files/
│       └── cloud/
│           └── <project-environment>/
│               ├── credentials.env
│               └── files/
└── third-party/
    └── <provider>/
        └── <integration>/
            └── <provider-environment>/
                └── <credential-set>/
                    ├── credentials.env
                    └── files/
```

Use these exact project-user paths:

- local:
  `test_credentials/project/current-user/local/credentials.env`
- cloud:
  `test_credentials/project/current-user/cloud/`
  `<project-environment>/credentials.env`

Use this exact third-party path:

`test_credentials/third-party/<provider>/<integration>/`
`<provider-environment>/<credential-set>/credentials.env`

`project-environment` names the tested application's environment.
`provider-environment` independently names the third party's environment.
Local and cloud application environments may legitimately use the same
third-party sandbox bundle.

Use lowercase ASCII slugs with hyphens for every variable path segment. Use a
stable account, tenant, or organization name for `credential-set`.

## Discovery Workflow

1. Identify the exact project environment, provider, integration, provider
   environment, and credential set required by the test.
2. Inspect the corresponding canonical bundle before using placeholders or
   reporting missing credentials.
3. If the expected canonical bundle is absent, inspect ignored
   credential-like files at the project root and report possible legacy
   locations without printing their contents. Do not silently select or
   relocate a legacy file.
4. Inspect only filenames, permissions, file types, and variable names until
   the correct bundle is established.
5. Parse `credentials.env` as dotenv data. Never execute it with `source`,
   shell evaluation, or command substitution.
6. Resolve paths named by `credentials.env` relative to the bundle directory.
   Store PEM, JWK, certificate, and similar file-based secrets under the
   bundle's `files/` directory.
7. Inject values only at the narrow process or server-side boundary that
   needs them. Never expose provider secrets in browser-visible previews.
8. Validate credentials through the intended authentication or provider
   operation when the task authorizes that interaction.

## Selection Rules

- Select project-user credentials only by the exact local or cloud
  environment.
- Select third-party credentials only by the exact provider, integration,
  provider environment, and credential set.
- Never fall back across application environments, provider environments,
  integrations, accounts, or tenants.
- Never substitute production credentials when non-production credentials
  are missing.
- Never infer that a similarly named credential belongs to the current test.
- Treat local authentication state, CLI credential databases, browser
  profiles, generated output, temporary directories, migrations, and source
  directories as non-bundles even when their names contain `credential`.

## Security Rules

- Require the entire `test_credentials/` tree to be ignored by version
  control.
- Use mode `0700` for bundle directories and `0600` for credential files.
- Do not place a credential bundle behind a symlink unless the user
  explicitly authorizes that storage arrangement.
- Never print, log, stage, commit, or include secret values in evidence.
- Do not pass secrets in command-line arguments or persist them in tracked
  environment files.
- Do not copy credentials into scratch captures, generated fixtures,
  screenshots, or browser state.
- Report key names, locations, permissions, selection decisions, and redacted
  validation outcomes only.

## Reporting

Report these states separately:

1. expected bundle path identified;
2. bundle present or absent;
3. required keys and files present or absent;
4. permissions and ignore status valid or invalid;
5. credentials injected into the intended boundary; and
6. remote authentication or provider operation accepted or rejected.

Credential presence is not proof that the values are current, valid, or
authorized for the requested operation.
