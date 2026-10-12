# ponytail-mcp

An MCP server that serves Ponytail's lazy-senior-dev instructions. It exposes
the same ruleset the Claude hooks and Pi extension use, so every host emits
identical rules.

It is not a replacement for the always-on adapters. Ponytail normally lives in
the system context every turn. MCP prompts are user-invoked, and there is no
portable MCP primitive for "inject this into every turn" across hosts. So this
server is the clean option for MCP hosts whose only injection point is the
prompt menu, or that pull context through tools. See issue #70.

## What it exposes

- Prompt `ponytail`, returns the ruleset as a user message. Optional `mode`
  argument: `off`, `lite`, `full`, or `ultra`. Omit it to use the configured default.
- Tool `ponytail_instructions`, same text, plus `structuredContent`
  (`{ mode, instructions }`), for hosts that pull context via tools or code
  execution. Read-only.

Mode resolution reuses `hooks/ponytail-config.js`, so `PONYTAIL_DEFAULT_MODE`
and `~/.config/ponytail/config.json` work the same as everywhere else.

Campaign tools are named `ponytail_campaign_<command>`, with hyphens replaced
by underscores. They use the same command registry and typed operations as
`ponytail campaign`. Every call supplies an absolute `root` identifying the
registered invoking project, plus the fields documented by
`ponytail campaign <command> --help`. Results use `{command, result}`.

For example, `ponytail_campaign_status` takes `{root, campaign}`. The
`ponytail_campaign_reconcile` mutation takes the same fields. Worker operations
retain their assignment/action IDs and generation fences. Historical campaign
inspection is explicit through `ponytail_campaign_legacy`; legacy dispatch is
refused. Native worker execution uses Codex App Server directly and does not
require a Ponytail plugin. MCP is an optional adapter; the CLI is sufficient.

## Run it

```bash
cd ponytail-mcp
npm install
node index.js        # speaks MCP over stdio
```

Point an MCP host at that command. Example client entry:

```json
{ "mcpServers": { "ponytail": { "command": "node", "args": ["ponytail-mcp/index.js"] } } }
```

## Test

```bash
npm test
```

The package tests cover mode resolution and instruction text. From the
repository root, `npm run build` compiles the TypeScript adapters and generates
the shipped entrypoints. The PostgreSQL scenario
`node --test dist/tests/rolling-operations.integration.test.js` also starts the
real stdio MCP server, checks tool discovery, and compares status and
reconciliation with the canonical operations. It uses disposable project
fixtures in the configured local database.
