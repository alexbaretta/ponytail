// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test, {type TestContext} from 'node:test';
import {checkTraceabilityGraphAnnotations,type TraceabilityCodeUnit,type TraceabilityGraphAnnotationsInput} from '../src/traceability-graph.js';
import type {TstsCheckResult} from '../src/index.js';

function check(testContext: TestContext, source: string, units: readonly TraceabilityCodeUnit[], wrapperSource?: string): TstsCheckResult {
 const root = fs.mkdtempSync(path.join(os.tmpdir(),'tsts-graph-'));
 testContext.after(() => fs.rmSync(root,{recursive:true,force:true}));
 fs.writeFileSync(path.join(root,'source.ts'),source);
 if (wrapperSource !== undefined) fs.writeFileSync(path.join(root,'wrapper.ts'),wrapperSource);
 // Third-party declaration fixture; no runtime execution or adequacy is asserted by these locator tests.
 fs.writeFileSync(path.join(root,'runner.d.ts'),`declare module 'vitest' {
  interface TestOptions { timeout?: number; skip?: boolean; todo?: boolean }
  interface TestAPI {
   (name: string, body: () => void, timeout?: number): void;
   (name: string, options: TestOptions, body: () => void): void;
   each(values: number[]): TestAPI;
  }
  export const it: TestAPI;
 }`);
 fs.writeFileSync(path.join(root,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2024',strict:true,noEmit:true,skipLibCheck:true,
  types:['node'],typeRoots:[fileURLToPath(new URL('../../../node_modules/@types',import.meta.url))]},files:['source.ts','runner.d.ts']}));
 const input: TraceabilityGraphAnnotationsInput = {projectRoot:root,projectPath:'tsconfig.json',units};
 return checkTraceabilityGraphAnnotations(input);
}
function unit(kind: TraceabilityCodeUnit['kind'],line = 1,path = 'source.ts'): TraceabilityCodeUnit {
 return {id:kind === 'implementation' ? 'work' : 'TEST-WORK',kind,path,line};
}
function marker(kind: TraceabilityCodeUnit['kind']): string {
 return kind === 'implementation' ? '// Traceability: implements OBL-WORK from implementation work'
  : `// Traceability: verifies ACC-WORK from ${kind} TEST-WORK`;
}

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-SEMANTIC-IMPLEMENTATION
test('V5 implementation annotations attach to supported named declarations', testContext => {
 for (const declaration of ['export function work() {}','export class Work {}','export interface Work {}','export type Work = string;','export const work = () => {};']) {
  const result = check(testContext,`${marker('implementation')}\n${declaration}`,[unit('implementation')]);
  assert.deepEqual(result.diagnostics,[],declaration);
  assert.equal(result.checkedFileCount,1);
 }
});

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from unit-test TEST-CM-SEMANTIC-TEST-CALL
test('unit and integration annotations attach to actual test calls including import aliases', testContext => {
 const kinds: readonly TraceabilityCodeUnit['kind'][] = ['unit-test','integration-test'];
 for (const kind of kinds) {
  const result = check(testContext,`import {test as check} from 'node:test';\n${marker(kind)}\ncheck('work', () => {});`,[unit(kind,2)]);
  assert.deepEqual(result.diagnostics,[]);
 }
});

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from unit-test TEST-CM-SEMANTIC-PARAMETERIZED
test('parameterized executable tests retain their identified call', testContext => {
 const source = `import {it} from 'vitest';\n${marker('unit-test')}\nit.each([1,2])('work', () => {});`;
 assert.deepEqual(check(testContext,source,[unit('unit-test',2)]).diagnostics,[]);
});

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from unit-test TEST-CM-SEMANTIC-TIMEOUT
test('Vitest timeout overloads retain executable test attachment', testContext => {
 for (const declaration of [
  "it('work', async () => {}, 300_000);",
  "it('work', async () => {}, timeout);",
  "it('work', async () => {}, unionTimeout);",
  "it('work', {timeout:300_000}, async () => {});",
  "it.each([1,2])('work', async () => {}, 300_000);",
 ]) {
  const source = `import {it} from 'vitest';\nconst timeout: number = 300_000;\ndeclare const unionTimeout: 100 | 200;\n${marker('integration-test')}\n${declaration}`;
  assert.deepEqual(check(testContext,source,[unit('integration-test',4)]).diagnostics,[],declaration);
 }
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-SEMANTIC-MULTIPLE-OBLIGATIONS
test('several obligation links share one declaration attachment', testContext => {
 const source = `${marker('implementation')}\n// Traceability: implements OBL-OTHER from implementation work\nexport function work() {}`;
 assert.deepEqual(check(testContext,source,[unit('implementation')]).diagnostics,[]);
 const block = '/* Traceability: implements OBL-WORK from implementation work*/\nexport function work() {}';
 assert.deepEqual(check(testContext,block,[unit('implementation')]).diagnostics,[]);
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-SEMANTIC-FAKE-MARKER
test('string markers, detached comments and incorrect locator IDs do not establish attachment', testContext => {
 for (const source of [
  'const text = `\n'+marker('implementation')+'\n`;\nexport function work() {}',
  `${marker('implementation')}\nconsole.log('detached');\nexport function work() {}`,
  '// Traceability: implements OBL-WORK from implementation someoneElse\nexport function work() {}',
 ]) assert.ok(check(testContext,source,[unit('implementation',source.startsWith('const text') ? 2 : 1)]).diagnostics.length > 0);
});

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from unit-test TEST-CM-SEMANTIC-NONTEST
test('test identity cannot attach to a helper, suite, skip or todo', testContext => {
 for (const declaration of [
  'function work() {}',
  "describe('work', () => {});",
  "test.skip('work', () => {});",
  "test.todo('work');",
  "test('work', {skip:true}, () => {});",
  "test('work', {todo:true}, () => {});",
  "test({skip:true}, () => {});",
 ]) {
  const result = check(testContext,`import {test,describe} from 'node:test';\n${marker('unit-test')}\n${declaration}`,[unit('unit-test',2)]);
  assert.ok(result.diagnostics.some(diagnostic => diagnostic.message.includes('executable test call')),declaration);
 }
});

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from unit-test TEST-CM-SEMANTIC-HELPER-SHADOW
test('a local helper with a runner name is not a registered test', testContext => {
 const source = `function test(_name: string, _body: () => void) {}\n${marker('unit-test')}\ntest('work', () => {});`;
 assert.ok(check(testContext,source,[unit('unit-test',2)]).diagnostics.some(diagnostic => diagnostic.message.includes('executable test call')));
});

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from unit-test TEST-CM-SEMANTIC-SKIPPED-SUITE
test('tests inside explicitly skipped suites cannot receive attachment credit', testContext => {
 for (const suite of ["describe.skip('disabled',", "describe('disabled', {skip:true},"]) {
  const source = `import {describe,it} from 'node:test';\n${suite} () => {\n${marker('unit-test')}\nit('work', () => {});\n});`;
  assert.ok(check(testContext,source,[unit('unit-test',3)]).diagnostics.some(diagnostic => diagnostic.message.includes('executable test call')));
 }
});

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from unit-test TEST-CM-SEMANTIC-UNNAMED
test('an explicitly identified node test may use the callback-only runner overload', testContext => {
 const source = `import {test} from 'node:test';\n${marker('unit-test')}\ntest(() => {});`;
 assert.deepEqual(check(testContext,source,[unit('unit-test',2)]).diagnostics,[]);
});

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from unit-test TEST-CM-SEMANTIC-OWNED-RUNNER
test('reviewed exported custom runners opt in at their canonical declaration', testContext => {
 for (const declaration of [
  'export function it(name: string, run: () => void, timeout?: number) { vitestIt(name, run, timeout); }',
  'export const it = Object.assign((name: string, run: () => void, timeout?: number) => vitestIt(name, run, timeout), {skip: () => {}});',
 ]) {
  const wrapper = `import {it as vitestIt} from 'vitest';\n/** @traceabilityRunner */\n${declaration}`;
  const source = `import {it as run} from './wrapper.js';\n${marker('integration-test')}\nrun('work', () => {}, 300_000);`;
  assert.deepEqual(check(testContext,source,[unit('integration-test',2)],wrapper).diagnostics,[]);
 }
});

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from unit-test TEST-CM-SEMANTIC-OWNED-RUNNER-EXCLUSIONS
test('custom runner opt-in does not admit unmarked helpers, call-site tags or skipped registrations', testContext => {
 const unmarked = "export function it(name: string, run: () => void) {}";
 const cases: readonly [string,string][] = [
  [unmarked, "it('work', () => {});"],
  [unmarked, "/** @traceabilityRunner */\nit('work', () => {});"],
  ["/** @traceabilityRunner */\nexport declare function it(name: string, run: () => void): void;", "it('work', () => {});"],
  ["/** @traceabilityRunner */\nexport declare const it: (name: string, run: () => void) => void;", "it('work', () => {});"],
  ["/** @traceabilityRunner */\nexport const it = Object.assign((name: string, run: () => void) => {}, {skip: (name: string, run: () => void) => {}});", "it.skip('work', () => {});"],
 ];
 for (const [wrapper,declaration] of cases) {
  const source = `import {it} from './wrapper.js';\n${marker('integration-test')}\n${declaration}`;
  assert.ok(check(testContext,source,[unit('integration-test',2)],wrapper).diagnostics.some(diagnostic => diagnostic.message.includes('executable test call')));
 }
 const local = `/** @traceabilityRunner */\nfunction it(name: string, run: () => void) {}\n${marker('unit-test')}\nit('work', () => {});`;
 assert.ok(check(testContext,local,[unit('unit-test',3)]).diagnostics.some(diagnostic => diagnostic.message.includes('executable test call')));
});

// Traceability: verifies ACC-CM-ACCEPTANCE-COVERAGE from unit-test TEST-CM-SEMANTIC-OWNED-SUITE
test('custom suite opt-in preserves skipped enclosing suite exclusion', testContext => {
 const wrapper = `import {it as vitestIt} from 'vitest';
/** @traceabilityRunner */
export function it(name: string, run: () => void) { vitestIt(name, run); }
/** @traceabilityRunner */
export const describe = Object.assign((name: string, run: () => void) => run(), {skip: (name: string, run: () => void) => {}});`;
 for (const suite of ['describe', 'describe.skip']) {
  const source = `import {it,describe} from './wrapper.js';\n${suite}('group', () => {\n${marker('unit-test')}\nit('work', () => {});\n});`;
  const result = check(testContext,source,[unit('unit-test',3)],wrapper);
  assert.equal(result.diagnostics.length === 0,suite === 'describe');
 }
});

// Traceability: verifies ACC-CM-GRAPH from unit-test TEST-CM-SEMANTIC-MISSING-SOURCE
test('missing project sources and invalid TypeScript syntax fail', testContext => {
 assert.ok(check(testContext,`${marker('implementation')}\nexport function work() {`,[unit('implementation')]).diagnostics.length > 0);
 assert.ok(check(testContext,`${marker('implementation')}\nexport function work() {}`,[unit('implementation',1,'missing.ts')]).diagnostics.some(diagnostic => diagnostic.message.includes('not part')));
 assert.ok(check(testContext,`${marker('implementation')}\nexport function work() {}`,[unit('implementation',1,'../outside.ts')]).diagnostics.some(diagnostic => diagnostic.message.includes('inside')));
});
