#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const {
  CampaignError,
  buildReport,
  humanReport,
  readCampaignReportV1,
  readManagementConfigV1,
} = require('../src/campaign-census.js');

const sourceRoot = path.join(__dirname, '..');
const campaignCli = path.join(sourceRoot, 'src', 'campaign-census.js');
const ponytailCli = path.join(sourceRoot, 'cli', 'ponytail');

function temporaryDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

function write(root, relative, text) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return file;
}

function managementConfig(root) {
  write(root, '.agents/config/project/management.json', `${JSON.stringify({
    schemaVersion: 1,
    managementRoot: 'pm',
    planRoot: 'pm/plans',
    lifecycle: {
      directories: ['open', 'in_progress', 'closed', 'deferred', 'rejected'],
      roles: {
        initial: 'open',
        activeWork: 'in_progress',
        successfulCompletion: 'closed',
        deferred: 'deferred',
        rejected: 'rejected',
      },
    },
    legacyPlanLayout: 'flat',
  }, null, 2)}\n`);
}

function sprint(root, lifecycle, planId, { closed = false, empty = false } = {}) {
  const directory = `pm/plans/${lifecycle}/${planId}/sprints`;
  const execution = empty ? null : {
    status: closed ? 'DONE' : 'PENDING',
    depends_on: [],
    tasklets_reviewed: true,
  };
  write(root, `${directory}/S01.md`, `# S01: Fixture sprint

<!-- ponytail-plan-sprint
${JSON.stringify({
    schemaVersion: 3,
    id: 'S01',
    planning: { status: empty ? 'STUB' : 'APPROVED', depends_on: [], scope_roots: ['src'] },
    execution,
  }, null, 2)}
-->

${empty ? '' : `### [${closed ? 'DONE' : ' '}] Tasklet S01-F01-T01: Validate fixture\n`}`);
  if (!empty) {
    write(root, `${directory}/S01.tasklets.json`, `${JSON.stringify({
      schemaVersion: 3,
      sprint: 'S01',
      features: {
        'S01-F01': { depends_on: [], validation_tasklet: 'S01-F01-T01' },
      },
      tasklets: {
        'S01-F01-T01': {
          depends_on: [],
          affinity: ['fixture'],
          risk: 'normal',
          feature: 'S01-F01',
          planned_paths: [],
        },
      },
    }, null, 2)}\n`);
  }
}

function plan(root, lifecycle, id, parentPlanId = null, options = {}) {
  const relative = `pm/plans/${lifecycle}/${id}/plan.md`;
  const parentLifecycle = options.parentLifecycle ?? lifecycle;
  const parentLink = parentPlanId === null ? '' : `- **Parent plan:** [${parentPlanId}](../../${parentLifecycle}/${parentPlanId}/plan.md)\n`;
  write(root, relative, `# ${id}

- **Plan ID:** \`${id}\`
- **Status:** \`${lifecycle}\`
${parentLink}
<!-- ponytail-plan-campaign
${JSON.stringify({ schemaVersion: 1, id, parent_plan_id: parentPlanId }, null, 2)}
-->

## Sprint

- [S01](sprints/S01.md)
`);
  sprint(root, lifecycle, id, options);
  return path.join(root, relative);
}

function repository() {
  const root = temporaryDirectory('ponytail-campaign');
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: root }).status, 0);
  managementConfig(root);
  return root;
}

function config(root) {
  return readManagementConfigV1(JSON.parse(fs.readFileSync(path.join(root, '.agents/config/project/management.json'), 'utf8')));
}

function commit(root) {
  assert.equal(spawnSync('git', ['add', '.'], { cwd: root }).status, 0);
  const result = spawnSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'fixture'], { cwd: root });
  assert.equal(result.status, 0, result.stderr?.toString());
}

function captureError(callback) {
  try {
    callback();
  } catch (error) {
    assert.ok(error instanceof CampaignError);
    return error;
  }
  assert.fail('expected CampaignError');
}

test('management configuration reader requires one exact safe V1 contract', () => {
  const valid = {
    schemaVersion: 1,
    managementRoot: 'pm',
    planRoot: 'pm/plans',
    lifecycle: {
      directories: ['open', 'in_progress', 'closed', 'deferred', 'rejected'],
      roles: { initial: 'open', activeWork: 'in_progress', successfulCompletion: 'closed', deferred: 'deferred', rejected: 'rejected' },
    },
    legacyPlanLayout: 'flat',
  };
  assert.deepEqual(readManagementConfigV1(valid), valid);
  assert.equal(captureError(() => readManagementConfigV1({ ...valid, extra: true })).code, 'CAMPAIGN_SCHEMA');
  assert.equal(captureError(() => readManagementConfigV1({ ...valid, planRoot: '../plans' })).code, 'CAMPAIGN_CONFIG_PATH');
  assert.equal(captureError(() => readManagementConfigV1({
    ...valid,
    lifecycle: { ...valid.lifecycle, roles: { ...valid.lifecycle.roles, rejected: 'deferred' } },
  })).code, 'CAMPAIGN_CONFIG_LIFECYCLE');
});

test('root and leaf report the same campaign while unrelated malformed plans stay out of scope', () => {
  const root = repository();
  const rootId = '2026-09-24-root';
  const childId = '2026-09-24-child';
  const rootPlan = plan(root, 'in_progress', rootId);
  const childPlan = plan(root, 'closed', childId, rootId, { closed: true, parentLifecycle: 'in_progress' });
  write(root, 'pm/plans/open/2026-09-24-unrelated/plan.md', `# unrelated

<!-- ponytail-plan-campaign
{not json}
-->
`);
  commit(root);

  const fromRoot = buildReport(root, config(root), rootPlan);
  const fromChild = buildReport(root, config(root), childPlan);
  const fromRootName = buildReport(root, config(root), rootId);
  const fromRootNameFile = buildReport(root, config(root), `${rootId}/plan.md`);
  assert.equal(fromRoot.campaign.rootPlanId, rootId);
  assert.deepEqual(fromRoot.campaign, fromChild.campaign);
  assert.deepEqual(fromRoot.campaign, fromRootName.campaign);
  assert.deepEqual(fromRoot.campaign, fromRootNameFile.campaign);
  assert.deepEqual(fromRoot.totals, fromChild.totals);
  assert.equal(fromRootName.invocation.input, rootId);
  assert.equal(fromRootNameFile.invocation.input, `${rootId}/plan.md`);
  assert.deepEqual(fromRoot.campaign.plans.map(({ id }) => id), [rootId, childId]);
  assert.deepEqual(fromRoot.totals.plansByLifecycle, { open: 0, in_progress: 1, closed: 1, deferred: 0, rejected: 0 });
  assert.equal(fromRoot.totals.plans, 2);
  assert.equal(fromRoot.totals.sprints, 2);
  assert.equal(fromRoot.totals.tasklets, 2);
  const human = humanReport(fromRoot, root);
  assert.match(human, /in_progress\t0\t1\t0\t1/);
  assert.match(human, /closed\t1\t0\t0\t1/);
  assert.match(human, /Campaign total\t1\t1\t0\t2/);
  assert.match(human, /Campaign completion: 50% by tasklet count/);
});

test('bare plan names fail explicitly when missing or ambiguous', () => {
  const missingRoot = repository();
  plan(missingRoot, 'open', '2026-09-24-existing');
  const missing = captureError(() => buildReport(missingRoot, config(missingRoot), '2026-09-24-missing'));
  assert.equal(missing.status, 2);
  assert.equal(missing.code, 'CAMPAIGN_INPUT');

  const ambiguousRoot = repository();
  const id = '2026-09-24-ambiguous-name';
  plan(ambiguousRoot, 'open', id);
  plan(ambiguousRoot, 'closed', id, null, { closed: true });
  const ambiguous = captureError(() => buildReport(ambiguousRoot, config(ambiguousRoot), id));
  assert.equal(ambiguous.status, 1);
  assert.equal(ambiguous.code, 'CAMPAIGN_INPUT_AMBIGUOUS');
});

test('selected campaign fails on missing, ambiguous, and cyclic parentage', () => {
  const missingRoot = repository();
  const missing = plan(missingRoot, 'open', '2026-09-24-missing-child', '2026-09-24-missing-parent');
  assert.equal(captureError(() => buildReport(missingRoot, config(missingRoot), missing)).code, 'CAMPAIGN_PARENT_MISSING');

  const ambiguousRoot = repository();
  plan(ambiguousRoot, 'open', '2026-09-24-parent');
  const duplicate = plan(ambiguousRoot, 'closed', '2026-09-24-parent', null, { closed: true });
  assert.ok(duplicate);
  const child = plan(ambiguousRoot, 'in_progress', '2026-09-24-ambiguous-child', '2026-09-24-parent');
  assert.equal(captureError(() => buildReport(ambiguousRoot, config(ambiguousRoot), child)).code, 'CAMPAIGN_PARENT_AMBIGUOUS');

  const cycleRoot = repository();
  const firstId = '2026-09-24-cycle-first';
  const secondId = '2026-09-24-cycle-second';
  const first = plan(cycleRoot, 'open', firstId, secondId);
  plan(cycleRoot, 'open', secondId, firstId);
  assert.equal(captureError(() => buildReport(cycleRoot, config(cycleRoot), first)).code, 'CAMPAIGN_PARENT_CYCLE');

  const duplicateRoot = repository();
  const duplicateRootId = '2026-09-24-duplicate-root';
  const duplicateRootPlan = plan(duplicateRoot, 'in_progress', duplicateRootId);
  plan(duplicateRoot, 'open', '2026-09-24-duplicate-child', duplicateRootId, { parentLifecycle: 'in_progress' });
  plan(duplicateRoot, 'closed', '2026-09-24-duplicate-child', duplicateRootId, { closed: true, parentLifecycle: 'in_progress' });
  assert.equal(captureError(() => buildReport(duplicateRoot, config(duplicateRoot), duplicateRootPlan)).code, 'CAMPAIGN_PLAN_ID_DUPLICATE');
});

test('selected and linked campaign records require managed metadata and resolving human links', () => {
  const unmarkedRoot = repository();
  const unmarked = write(unmarkedRoot, 'pm/plans/open/2026-09-24-unmarked/plan.md', '# unmarked\n');
  assert.equal(captureError(() => buildReport(unmarkedRoot, config(unmarkedRoot), unmarked)).code, 'CAMPAIGN_PLAN_BLOCK');

  const brokenLinkRoot = repository();
  const parentId = '2026-09-24-link-parent';
  plan(brokenLinkRoot, 'open', parentId);
  const child = plan(brokenLinkRoot, 'in_progress', '2026-09-24-link-child', parentId, { parentLifecycle: 'open' });
  fs.writeFileSync(child, fs.readFileSync(child, 'utf8').replace(`../../open/${parentId}/plan.md`, '../../open/missing/plan.md'));
  assert.equal(captureError(() => buildReport(brokenLinkRoot, config(brokenLinkRoot), child)).code, 'CAMPAIGN_PARENT_LINK');
});

test('census enforces closure and represents the zero-tasklet percentage exactly', () => {
  const closureRoot = repository();
  const rootId = '2026-09-24-closed-root';
  const rootPlan = plan(closureRoot, 'closed', rootId, null, { closed: true });
  plan(closureRoot, 'in_progress', '2026-09-24-open-child', rootId, { parentLifecycle: 'closed' });
  assert.equal(captureError(() => buildReport(closureRoot, config(closureRoot), rootPlan)).code, 'CAMPAIGN_ROOT_CLOSED_INCOMPLETE');

  const emptyRoot = repository();
  const emptyPlan = plan(emptyRoot, 'open', '2026-09-24-empty', null, { empty: true });
  commit(emptyRoot);
  const report = buildReport(emptyRoot, config(emptyRoot), emptyPlan);
  assert.equal(report.totals.tasklets, 0);
  assert.equal(report.totals.doneTasklets, 0);
  assert.equal(report.totals.taskletCompletionPercentage, null);
  const human = humanReport(report, emptyRoot);
  assert.match(human, /Campaign total\t0\t0\t0\t0/);
  assert.match(human, /Campaign completion: unavailable \(no tasklets\) by tasklet count/);
});

test('V1 report reader rejects unknown output fields', () => {
  const root = repository();
  const selected = plan(root, 'open', '2026-09-24-report');
  commit(root);
  const report = buildReport(root, config(root), selected);
  assert.equal(readCampaignReportV1(report), report);
  assert.equal(captureError(() => readCampaignReportV1({ ...report, extra: true })).code, 'CAMPAIGN_SCHEMA');
  assert.equal(captureError(() => readCampaignReportV1({
    ...report,
    campaign: { ...report.campaign, plans: [{ ...report.campaign.plans[0], extra: true }] },
  })).code, 'CAMPAIGN_SCHEMA');
  assert.equal(captureError(() => readCampaignReportV1({
    ...report,
    totals: { ...report.totals, tasklets: -1 },
  })).code, 'CAMPAIGN_REPORT_SCHEMA');
});

test('production module uses exact exit and stream contracts without mutation', () => {
  const root = repository();
  const selected = plan(root, 'open', '2026-09-24-streams');
  commit(root);
  const before = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).stdout;
  let result = spawnSync(process.execPath, [campaignCli, 'report', selected, '--json'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.ok(result.stdout.endsWith('\n'));
  assert.equal(result.stdout.slice(0, -1).includes('\n'), false);
  assert.equal(JSON.parse(result.stdout).campaign.rootPlanId, '2026-09-24-streams');

  result = spawnSync(process.execPath, [campaignCli, 'report', selected], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Plans: 1; Sprints: 1 \(1 incomplete\)/);
  assert.match(result.stdout, /Tasklet census\nPlan lifecycle\tDONE\tPENDING\tERROR\tTotal/);
  assert.match(result.stdout, /open\t0\t1\t0\t1/);
  assert.match(result.stdout, /Campaign total\t0\t1\t0\t1/);
  assert.match(result.stdout, /Campaign completion: 0% by tasklet count/);
  assert.match(result.stdout, /open\t2026-09-24-streams\t0\t1\t0\t1/);
  assert.match(result.stdout, /2026-09-24-streams\/S01\tAPPROVED\tPENDING\t0\t1\t0\t1/);
  assert.doesNotMatch(result.stdout, /Tasklet 2026-09-24-streams\/S01-F01-T01/);

  result = spawnSync(process.execPath, [campaignCli, 'report'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /^error CAMPAIGN_USAGE:/);
  assert.equal(spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).stdout, before);

  fs.writeFileSync(selected, fs.readFileSync(selected, 'utf8').replace('"schemaVersion": 1', '"schemaVersion": 99'));
  const invalidBefore = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).stdout;
  result = spawnSync(process.execPath, [campaignCli, 'report', selected, '--json'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /^error CAMPAIGN_PLAN_VERSION/);
  assert.equal(spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).stdout, invalidBefore);
});

test('ponytail dispatches campaign reporting through the production module', () => {
  const root = repository();
  const selected = plan(root, 'open', '2026-09-24-dispatch');
  write(root, '.agents/config/codex-execpolicy.json', '{"schemaVersion":1,"safe":[],"unsafe":[]}\n');
  write(root, '.agents/config/ponytail.json', `${JSON.stringify({
    schemaVersion: 2,
    name: path.basename(root),
    names: [],
    components: [],
    dependencies: [],
    repositoryUrls: [],
    packages: [],
    manifests: [],
    exceptions: [],
  }, null, 2)}\n`);
  commit(root);
  const home = temporaryDirectory('ponytail-campaign-home');
  write(home, '.ponytail/config.json', `${JSON.stringify({
    schemaVersion: 1,
    sourceRoot: fs.realpathSync(sourceRoot),
    projects: [{ root: fs.realpathSync(root), blessedWorktree: fs.realpathSync(root) }],
  }, null, 2)}\n`);
  const result = spawnSync(ponytailCli, ['campaign', 'validate', '2026-09-24-dispatch'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin` },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'valid: 2026-09-24-dispatch (1 plans, 1 sprints, 1 tasklets)\n');

  const nameFileResult = spawnSync(ponytailCli, ['campaign', 'validate', '2026-09-24-dispatch/plan.md'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin` },
  });
  assert.equal(nameFileResult.status, 0, nameFileResult.stderr);
  assert.equal(nameFileResult.stdout, result.stdout);

  const missing = spawnSync(ponytailCli, ['campaign', 'validate', '2026-09-24-missing'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin` },
  });
  assert.equal(missing.status, 2);
  assert.equal(missing.stdout, '');
  assert.match(missing.stderr, /^error CAMPAIGN_INPUT:/);

  let failure = spawnSync(ponytailCli, ['campaign', 'report'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin` },
  });
  assert.equal(failure.status, 2);
  assert.equal(failure.stdout, '');
  assert.match(failure.stderr, /^error CAMPAIGN_USAGE:/);

  fs.writeFileSync(selected, fs.readFileSync(selected, 'utf8').replace('"schemaVersion": 1', '"schemaVersion": 99'));
  failure = spawnSync(ponytailCli, ['campaign', 'report', selected, '--json'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin` },
  });
  assert.equal(failure.status, 1);
  assert.equal(failure.stdout, '');
  assert.match(failure.stderr, /^error CAMPAIGN_PLAN_VERSION/);
});
