<!-- Copyright (c) 2026 Alex Baretta. All rights reserved. Licensed under the MIT License. -->

# OBL-70 and OBL-71 compiler/checker foundation assessment

Source revision 94555ac, clean checkout during execution. No source edits or
checker extensions. OBL-70 and OBL-71 are foundational program-coverage conditions;
they do not discharge migration of the existing handwritten executable owners.

OBL-70: the actual configured compiler include/exclude resolution covers all 63
canonical Ponytail TypeScript owners. Strict compilation inputs and all owned
source bytes match the accepted compiler evidence input closure in CERT-8, which
reuses the unchanged-source strict root build from the preceding migration
evidence. No compiler rebuild is needed: build-impact reports no affected or
indeterminate targets for the policy/PM inputs. The root program disables
allowJs, skipLibCheck and noCheck, and enables strict, exactOptionalPropertyTypes,
noUncheckedIndexedAccess and noEmitOnError. AST inspection finds no explicit any,
type assertions or non-null assertions; text inspection finds no TypeScript
compiler suppressions. The configuration does not evade an owned TypeScript
file. The still-unmigrated JavaScript/shell/Python/PowerShell owners remain
registered or pending completeness inventory; they are not claimed checked.

OBL-71: tsts.json explicitly selects the root and TSTS programs. Resolving both
configured programs covers all 80 owned TypeScript paths, including the existing
17-file checker source/test program. Source inspection of checkProject and
loadWorkspaceGraph confirms configured programs produce the semantic graphs
and diagnostics consumed by the CLI. Current configured execution passes using
the project-owned directory/artifact classifications. git diff --quiet against
the campaign starting revision fc8f0d43382d7e7b3d38d5881483a074d525a4ff confirms
that tsts/src and tsts/test have no changes during this campaign. The checker
was applied to Ponytail, not extended to accommodate this migration.

OBL-72 remains unresolved: runtime materialization currently owns 26 specified
adjacent runtimes; it does not establish typed ownership of all retained
established CLI, host, installer and QA entrypoints. No whole-repository runtime
or language-completion claim follows from these two foundation assessments.

Coverage command: node tmp/foundation-assessment/coverage.ts. Exit 0. It uses
the installed TypeScript configuration parser and AST parser, Git's tracked
file inventory, and canonical certificate content digests. OpenClaw resources
are generated mirrors, not additional canonical source owners. Complete
inspection code is retained below as inert evidence for reproduction.

```text
(node:59998) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///Users/alex/git/ctosclub/ponytail/tmp/foundation-assessment/coverage.ts is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to /Users/alex/git/ctosclub/ponytail/package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
tsconfig.json: 63 program root files; strict, exact optional properties, checked indexed access and noEmitOnError; allowJs/skipLibCheck/noCheck disabled
tsts/tsconfig.json: 17 program root files; strict, exact optional properties, checked indexed access and noEmitOnError; allowJs/skipLibCheck/noCheck disabled
80 owned TypeScript paths covered (63 root, 17 existing TSTS); generated OpenClaw copies excluded from canonical ownership
63 root-owned TypeScript paths inspected: zero explicit any, type assertions, non-null assertions or compiler suppressions
All compiler/checker/source/classification/configuration bytes match accepted CERT-8 inputs; strict compilation evidence is reusable
Existing handwritten JavaScript/shell/Python/PowerShell migration remains unresolved; no whole-language completion claim
```

Command: npm run check:tsts. Exit 0, zero violations.

```text

> @alexbaretta/ponytail@4.8.4 check:tsts
> node tsts/dist/src/cli.js --config tsts.json --directory-structure .agents/config/project/directory-structure.json

TSTS checked 885 files: no violations found.
```

Runtime synchronization command: node dist/scripts/build-runtime.js --check;
exit 0. The 885 reported files include artifact-classification coverage; they
are not a count of obligations or TypeScript program roots. Full campaign
traceability, remaining language migration and final acceptance remain open.

## Reproducible bounded inspection

```typescript
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { inputDigest, parseObligationDocument } from '../../skills/plan-execution/scripts/obligations.js';
const root = process.cwd();
const ledgerPath = 'pm/plans/in_progress/2026-10-10-rolling-obligation-campaigns/obligations.json';
const obligationDocumentV1 = parseObligationDocument(fs.readFileSync(ledgerPath, 'utf8'));
const obligationCertificate = obligationDocumentV1.certificates.find(item => item.id === 'CERT-8');
if (!obligationCertificate) throw new Error('missing compiler evidence inputs');
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const owned = tracked.filter(file => file.endsWith('.ts') && !file.startsWith('.openclaw/'));
const checked = new Set<string>();
const rootOwned = owned.filter(file => !file.startsWith('tsts/'));
const bypasses: string[] = [];
for (const configPath of ['tsconfig.json', 'tsts/tsconfig.json']) {
  const readConfig = ts.readConfigFile(configPath, ts.sys.readFile);
  if (readConfig.error) throw new Error(ts.flattenDiagnosticMessageText(readConfig.error.messageText, '\n'));
  const parsedCommandLine: ts.ParsedCommandLine = ts.parseJsonConfigFileContent(readConfig.config, ts.sys, path.dirname(configPath));
  if (parsedCommandLine.errors.length > 0) throw new Error('compiler configuration has diagnostics');
  const compilerOptions: ts.CompilerOptions = parsedCommandLine.options;
  if (!compilerOptions.strict || !compilerOptions.exactOptionalPropertyTypes || !compilerOptions.noUncheckedIndexedAccess || !compilerOptions.noEmitOnError || compilerOptions.allowJs || compilerOptions.skipLibCheck || compilerOptions.noCheck) throw new Error(`weakened strict coverage: ${configPath}`);
  const files = parsedCommandLine.fileNames.map(file => path.relative(root, path.resolve(file)));
  for (const file of files) checked.add(file);
  console.log(`${configPath}: ${files.length} program root files; strict, exact optional properties, checked indexed access and noEmitOnError; allowJs/skipLibCheck/noCheck disabled`);
}
const missing = owned.filter(file => !checked.has(file));
if (missing.length > 0) throw new Error(`uncovered owned TypeScript: ${missing.join(', ')}`);
for (const file of rootOwned) {
  const sourceText = fs.readFileSync(file, 'utf8');
  const sourceFile: ts.SourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  function visit(node: ts.Node): void {
    if (node.kind === ts.SyntaxKind.AnyKeyword || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node)) bypasses.push(`${file}:${ts.SyntaxKind[node.kind]}`);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  if (/@ts-(?:ignore|nocheck|expect-error)\b/u.test(sourceText)) bypasses.push(`${file}:compiler suppression`);
}
if (bypasses.length > 0) throw new Error(`owned root bypasses: ${bypasses.join(', ')}`);
const immutablePaths = [...owned, 'tsconfig.json', 'tsts/tsconfig.json', 'tsts.json', 'package.json', 'package-lock.json', '.agents/config/project/directory-structure.json', '.agents/config/project/traceability.json', 'versioned-data-contracts.json'];
for (const file of immutablePaths) {
  const input = obligationCertificate.inputs.find(item => item.path === file);
  if (!input || input.digest !== inputDigest(root, file)) throw new Error(`compiler/checker evidence input missing or changed: ${file}`);
}
console.log(`${owned.length} owned TypeScript paths covered (${rootOwned.length} root, ${owned.length - rootOwned.length} existing TSTS); generated OpenClaw copies excluded from canonical ownership`);
console.log(`${rootOwned.length} root-owned TypeScript paths inspected: zero explicit any, type assertions, non-null assertions or compiler suppressions`);
console.log('All compiler/checker/source/classification/configuration bytes match accepted CERT-8 inputs; strict compilation evidence is reusable');
console.log('Existing handwritten JavaScript/shell/Python/PowerShell migration remains unresolved; no whole-language completion claim');
```
