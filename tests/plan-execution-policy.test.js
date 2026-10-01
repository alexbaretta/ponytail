#!/usr/bin/env node
// Traceability: verifies REQ-PLAN-INPUT-QUEUE
// Traceability: verifies REQ-ISSUE-REQUIREMENT-ACTIVATION
// Traceability: verifies REQ-PONYTAIL-CLI-AGENT-HARNESS

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('plan execution serializes fast input before selector-based resumption', () => {
  const policy = fs.readFileSync(path.join(__dirname, '..', 'skills', 'plan-execution', 'SKILL.md'), 'utf8');
  assert.match(policy, /Every campaign has exactly one campaign coordinator/);
  assert.match(policy, /plan-input coordinate <campaign-root>/);
  assert.match(policy, /before running a sprint or tasklet selector/);
  assert.match(policy, /Only that\ncoordinator may list, claim, complete/);
  assert.match(policy, /plan-input claim <campaign-root> --json/);
  assert.match(policy, /Do not claim or act on a newer entry while one is in progress/);
  assert.match(policy, /plan-input complete\n+   <campaign-root> <id> --record <pm-path>/);
  assert.match(policy, /rerun the canonical sprint and tasklet selectors/);
  assert.match(policy, /never resume from conversational memory/);
  assert.match(policy, /\/ponytail-enqueue <instruction>/);
  assert.match(policy, /plan-input release <campaign-root>/);
});

test('campaign policy requires repository inventory and V2 direct dependencies', () => {
  const policy = fs.readFileSync(path.join(__dirname, '..', 'skills', 'plan-execution', 'SKILL.md'), 'utf8');
  const generated = fs.readFileSync(path.join(__dirname, '..', '.openclaw', 'skills', 'plan-execution', 'SKILL.md'), 'utf8');
  assert.match(policy, /Writers emit exactly `schemaVersion`, `id`,\n`parent_plan_id`, and `depends_on`/);
  assert.match(policy, /ponytail campaign validate --all \[--json\]/);
  assert.match(policy, /no campaign block as unmanaged legacy data without inferred\nmembership regardless of its location/);
  assert.match(policy, /managed plan names an unmarked\nplan as its direct parent or dependency/);
  assert.match(policy, /P is\nstranded exactly when C lacks that reciprocal reference/);
  assert.match(policy, /multiple active campaign roots remain a\nvalid inventory/);
  assert.match(policy, /require an explicit campaign and report all\n+candidates/);
  assert.match(generated, /ponytail campaign validate --all \[--json\]/);
  assert.match(generated, /no campaign block as unmanaged legacy data without inferred\nmembership regardless of its location/);
  assert.match(generated, /P is\nstranded exactly when C lacks that reciprocal reference/);
  assert.match(generated, /multiple active campaign roots remain a\nvalid inventory/);
});

test('campaign policy delegates every worker effect to the durable action loop', () => {
  const policy = fs.readFileSync(path.join(__dirname, '..', 'skills', 'plan-execution', 'SKILL.md'), 'utf8');
  assert.match(policy, /campaign\s+status \[<campaign-root>\] --json/);
  assert.match(policy, /campaign\s+observe <campaign-root> --snapshot <json>/);
  assert.match(policy, /Refresh observations after any host\n+   result and at every safe coordination boundary/);
  assert.match(policy, /Resolve\n+   every blocking diagnostic first/);
  assert.match(policy, /distinguish a worker waiting for coordinator input from one that\n+   has finished/);
  assert.match(policy, /campaign advance \[<campaign-root>\] --json/);
  assert.match(policy, /campaign ready-actions \[<campaign-root>\] --json/);
  assert.match(policy, /`status.pendingActions` remains the\n+   complete durable recovery inventory/);
  assert.match(policy, /Execute only the `actions` returned by `ready-actions`/);
  assert.match(policy, /expose distinct create-or-reuse\n+   actions while one rebase remains outstanding/);
  assert.match(policy, /neither execute\n+   an action twice nor request a second rebase/);
  assert.match(policy, /`CREATE_WORKER`[\s\S]*campaign attach <attachToken>/);
  assert.match(policy, /Before campaign attachment, the worker verifies its exact assigned checkout/);
  assert.match(policy, /If detached, it uses the host project's canonical worktree tooling/);
  assert.match(policy, /adopt the checkout and establish its assignment branch at the exact/);
  assert.match(policy, /Retry the same attachment token in the same session/);
  assert.match(policy, /`REQUEST_REBASE`[\s\S]*exact\n+   `ontoRevision`/);
  assert.match(policy, /transition to `READY_TO_MERGE`[\s\S]*only by another advance/);
  assert.match(policy, /`ARCHIVE_WORKTREE`[\s\S]*current-host thread handoff/);
  assert.match(policy, /Codex-managed worktree is not necessarily an archive artifact/);
  assert.match(policy, /campaign action-result\n+   <campaign-root> <action-id> --result <json>/);
  assert.match(policy, /Recording one result changes only that named action/);
  assert.match(policy, /Mutating campaign commands in\n+a worker fail closed/);
  assert.match(policy, /Blocking campaign diagnostics outrank new dispatch, integration, cleanup/);
  assert.match(policy, /`CAMPAIGN_WORKTREE_MISSING_AFTER_DELIVERY` is an informational recovery/);
  assert.match(policy, /ordinary `CAMPAIGN_WORKTREE_MISSING` lacks that proof and remains blocking/);
  assert.match(policy, /For `RECOVER_WORKTREE`, message only the action's existing session/);
  assert.match(policy, /When no archive identity exists, it uses\n+   the supported host create-worktree operation in that same session/);
  assert.match(policy, /The host may choose a new managed\n+   path/);
  assert.match(policy, /Recovery replaces the stale binding path\n+   and resumes the assignment/);
  assert.match(policy, /`CAMPAIGN_WORKTREE_RECOVERY_REQUIRED` is also nonblocking/);
  assert.match(policy, /delivered worker in `REBASE_REQUIRED`[\s\S]*ordinary rebase and new authenticated delivery/);
  assert.match(policy, /A `REUSE_WORKER`\n+   action retains the finished session and managed worktree/);
});

test('planning and issue policy records prospective traceability without claiming coverage', () => {
  const readSkill = name => fs.readFileSync(
    path.join(__dirname, '..', 'skills', name, 'SKILL.md'), 'utf8',
  );
  const traceability = readSkill('requirements-traceability');
  const planExecution = readSkill('plan-execution');
  const issueTracking = readSkill('issue-tracking');
  assert.match(traceability, /plans-implementation/);
  assert.match(traceability, /plans-verification/);
  assert.match(traceability, /introduces/);
  assert.match(traceability, /never satisfy\ncompleted implementation/);
  assert.match(traceability, /from tasklet S01-F02-T03/);
  assert.match(planExecution, /canonical\nprospective annotation beside the stable plan or tasklet record/);
  assert.match(planExecution, /do not claim completed\ncoverage/);
  assert.match(issueTracking, /When implementation activates[\s\S]*canonical `introduces`/);
  assert.match(issueTracking, /never satisfy completed coverage/);
});

test('standalone and planned issue execution share the implementation activation gate', () => {
  const readSkill = name => fs.readFileSync(
    path.join(__dirname, '..', 'skills', name, 'SKILL.md'), 'utf8',
  );
  const planExecution = readSkill('plan-execution');
  const issueTracking = readSkill('issue-tracking');
  const requirements = readSkill('requirements');
  const userAcceptanceTesting = readSkill('user-acceptance-testing');
  const requirementsTraceability = readSkill('requirements-traceability');

  assert.match(planExecution, /Direct authorization to implement the standalone issue activates\n+the requirements gate/);
  assert.match(planExecution, /Merely associating the issue with a\nfuture plan does not create requirements or UAT/);
  assert.match(issueTracking, /stakeholder\n+   authorizes the issue as a standalone development task/);
  assert.match(requirements, /Both conditions in the second gate are required/);
  assert.match(userAcceptanceTesting, /merely planning an issue does not\n+incorporate a requirement and must not create UAT coverage/);
  assert.match(requirementsTraceability, /Issue intake alone never creates a requirement ID or an `introduces`\n+relationship/);
});
