#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import {cliCommandRegistryV1} from '../src/cli-help.js';

// Preserve established launch paths with compiler output from canonical TypeScript.
const root = path.resolve(__dirname, '../..');
// Historical coverage: supports REQ-TYPESCRIPT-ONLY-SOURCE
const sources: readonly string[] = [
  'tests/helpers/obligation-fixture.ts',
  'skills/plan-execution/scripts/obligation-binding-history.ts',
  'skills/plan-execution/scripts/obligation-certificate-bindings.ts',
  'skills/plan-execution/scripts/obligations.ts',
  'src/rolling-operations.ts',
  'src/rolling-cli-registry.ts',
  'src/cli-help.ts',
  'src/semantic-rebase.ts',
  'src/traceability-projection.ts',
  'skills/requirements-traceability/scripts/coverage-rules.ts',
  'skills/requirements-traceability/scripts/traceability-graph.ts',
  'skills/requirements-traceability/scripts/traceability-discovery.ts',
  'skills/requirements-traceability/scripts/traceability-project.ts',
  'skills/requirements-traceability/scripts/traceability-semantic.ts',
  'skills/requirements-traceability/scripts/traceability-v5.ts',
  'src/index-progress.ts',
  'src/project-index-search-publication.ts',
  'ponytail-mcp/index.ts',
  'ponytail-mcp/rolling.ts',
  'src/project-index-database.ts',
  'src/plan-input-queue.ts',
  'src/plan-input-command.ts',
  'src/plan-input.ts',
  'src/campaign-configuration.ts',
  'src/campaign-plan-metadata.ts',
  'src/campaign-plan-sources.ts',
  'src/campaign-scope.ts',
  'src/campaign-plan-contents.ts',
  'src/campaign-graph.ts',
  'src/campaign-report.ts',
  'src/campaign-inventory.ts',
  'src/campaign-activation.ts',
  'src/campaign-invocation.ts',
  'src/campaign-dependencies.ts',
  'skills/plan-execution/scripts/tasklet-statuses.ts',
  'skills/plan-execution/scripts/tasklet-metadata.ts',
  'skills/plan-execution/scripts/tasklet-graph.ts',
  'skills/plan-execution/scripts/ready-tasklets.ts',
  'skills/plan-execution/scripts/sprint-metadata.ts',
  'skills/plan-execution/scripts/sprint-graph.ts',
  'skills/plan-execution/scripts/ready-sprints.ts'
];
const portableLosslessJson = 'skills/plan-execution/scripts/lossless-json.js';
const argv = process.argv.slice(2);
if (!(argv.length === 0 || argv.length === 1 && argv[0] === '--check')) {
  process.stderr.write('Usage: build-runtime [--check]\n');
  process.exitCode = 2;
} else {
  const dependencyLicense = fs.readFileSync(path.join(root, 'node_modules/lossless-json/LICENSE.md'), 'utf8');
  const dependencyRuntime = fs.readFileSync(require.resolve('lossless-json'), 'utf8');
  const dependencyOutput = path.join(root, portableLosslessJson);
  const dependencyText = `// Ponytail packaging copyright (c) 2026 Alex Baretta. All rights reserved.\n// Copyright (c) 2026 Alex Baretta applies to this generated packaging header.\n// Licensed under the MIT License. See LICENSE in the project root.\n// Generated from the installed lossless-json dependency by npm run build.\n/*\n${dependencyLicense}*/\n${dependencyRuntime}`;
  if (argv.length === 0) fs.writeFileSync(dependencyOutput, dependencyText);
  else if (fs.readFileSync(dependencyOutput, 'utf8') !== dependencyText) {
    process.stderr.write(`${portableLosslessJson} differs from its installed dependency; run npm run build\n`);
    process.exitCode = 1;
  }
  const graphDependencies = [
    {output:'skills/requirements-traceability/scripts/lossless-json.js',text:dependencyText},
    {output:'skills/requirements-traceability/scripts/commonmark.js',text:
      `// Ponytail packaging copyright (c) 2026 Alex Baretta. All rights reserved.\n// Generated from the installed commonmark dependency by npm run build.\n/*\n${fs.readFileSync(path.join(root,'node_modules/commonmark/LICENSE'),'utf8')}*/\n${fs.readFileSync(path.join(path.dirname(require.resolve('commonmark')),'commonmark.min.js'),'utf8')}`},
  ];
  for (const dependency of graphDependencies) {
    const output = path.join(root,dependency.output);
    if (argv.length === 0) fs.writeFileSync(output,dependency.text);
    else if (fs.readFileSync(output,'utf8') !== dependency.text) {
      process.stderr.write(`${dependency.output} differs from its installed dependency; run npm run build\n`);
      process.exitCode = 1;
    }
  }
  const registryPath=path.join(root,'src/cli-command-registry.v1.json');
  const registryText=JSON.stringify(cliCommandRegistryV1,null,2)+'\n';
  if(argv.length===0) fs.writeFileSync(registryPath,registryText);
  else if(fs.readFileSync(registryPath,'utf8')!==registryText) {
    process.stderr.write('CLI command registry differs from its typed owner; run npm run build\n');
    process.exitCode=1;
  }
  for (const source of sources) {
    const relative = source.replace(/\.ts$/, '.js');
    const compiled = fs.readFileSync(path.join(root, 'dist', relative), 'utf8');
    const sourceText = fs.readFileSync(path.join(root, source), 'utf8');
    const sourceHeader = sourceText.split('\n').slice(0, sourceText.startsWith('#!') ? 3 : 2).join('\n');
    const portableCompiled = source.startsWith('skills/plan-execution/scripts/') || source.startsWith('skills/requirements-traceability/scripts/')
      ? compiled.replaceAll('require("lossless-json")', 'require("./lossless-json.js")').replaceAll('require("commonmark")','require("./commonmark.js")') : compiled;
    const generated = `${sourceHeader}\n// Generated from ${source} by npm run build.\n${portableCompiled.replace(/^#![^\n]*\n/, '')}`;
    const output = path.join(root, relative);
    if (argv.length === 0) fs.writeFileSync(output, generated);
    else if (fs.readFileSync(output, 'utf8') !== generated) {
      process.stderr.write(`${relative} differs from its compiled TypeScript owner; run npm run build\n`);
      process.exitCode = 1;
    }
  }
}
