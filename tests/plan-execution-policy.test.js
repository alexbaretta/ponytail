#!/usr/bin/env node
// Traceability: verifies REQ-PLAN-INPUT-QUEUE
// Traceability: verifies REQ-ISSUE-REQUIREMENT-ACTIVATION
// Traceability: verifies REQ-PONYTAIL-CLI-AGENT-HARNESS
// Traceability: verifies REQ-WORKER-WORKTREE-RETENTION

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

test('campaign coordinator uses durable actions while worker recovery remains worker-owned', () => {
  const policy = fs.readFileSync(path.join(__dirname, '..', 'skills', 'plan-execution', 'SKILL.md'), 'utf8');
  assert.match(policy, /campaign\s+status \[<campaign-root>\] --json/);
  assert.match(policy, /campaign\s+observe <campaign-root> --snapshot <json>/);
  assert.match(policy, /Refresh observations after any host\n+   result and at every safe coordination boundary/);
  assert.match(policy, /Resolve\n+   every blocking diagnostic first/);
  assert.match(policy, /distinguish a worker waiting for coordinator input from one that\n+   has finished/);
  assert.match(policy, /campaign advance \[<campaign-root>\] --json/);
  assert.match(policy, /campaign ready-actions \[<campaign-root>\] --json/);
  assert.match(policy, /Status is a derived view: reconciling one persisted assignment can leave its\n+   returned status unchanged/);
  assert.match(policy, /Stop at a genuinely unchanged ledger/);
  assert.match(policy, /`status.pendingActions` remains the\n+   complete durable recovery inventory/);
  assert.match(policy, /Execute only the `actions` returned by `ready-actions`/);
  assert.match(policy, /expose distinct create-or-reuse\n+   actions while a historical rebase action remains outstanding/);
  assert.match(policy, /neither execute an action twice nor request a second rebase/);
  assert.match(policy, /`CREATE_WORKER`[\s\S]*campaign attach <attachToken>/);
  assert.match(policy, /Before campaign attachment, the worker verifies its exact assigned checkout/);
  assert.match(policy, /If detached, it uses the host project's canonical worktree tooling/);
  assert.match(policy, /adopt the checkout and establish its assignment branch at the completed\n+   bootstrap checkpoint \(initially the exact dispatch revision\)/);
  assert.match(policy, /Retry the same attachment token in the same session/);
  assert.match(policy, /historical `REQUEST_REBASE`[\s\S]*exact `ontoRevision`/);
  assert.match(policy, /New deliveries\n+   use worker-owned optimistic rebasing and create no `REQUEST_REBASE` action/);
  assert.match(policy, /worker owns the optimistic join loop after delivery/);
  assert.match(policy, /another worker was merged meanwhile, repeat against the new revision/);
  assert.match(policy, /coordinator gives this join immediate priority and runs `advance`/);
  assert.match(policy, /After `MERGED`, the same worker resumes its plan-owned acceptance/);
  assert.match(policy, /`ARCHIVE_WORKTREE`[\s\S]*retire-worktree <campaign-root> <action-id> --json/);
  assert.match(policy, /Do not use thread handoff for retirement/);
  assert.match(policy, /Codex-managed worktree is not necessarily an archive artifact/);
  assert.match(policy, /campaign action-result\n+   <campaign-root> <action-id> --result <json>/);
  assert.match(policy, /Recording one result changes only that named action/);
  assert.match(policy, /Mutating campaign commands in\n+a worker fail closed/);
  assert.match(policy, /Blocking campaign diagnostics outrank new dispatch, integration, cleanup/);
  assert.match(policy, /`CAMPAIGN_WORKTREE_MISSING_AFTER_DELIVERY` is an informational recovery/);
  assert.match(policy, /ordinary `CAMPAIGN_WORKTREE_MISSING` lacks that proof and remains blocking/);
  assert.match(policy, /For `RECOVER_WORKTREE`, message only the action's existing session/);
  assert.match(policy, /recovery does not require coordinator initiation/);
  assert.match(policy, /preserves the original path and acknowledges a matching/);
  assert.match(policy, /ponytail worktree recover\s+<attachment-token>/);
  assert.doesNotMatch(policy, /host may choose a new managed|surplus\s+workers are cleanup-ready/);
  assert.match(policy, /`CAMPAIGN_WORKTREE_RECOVERY_REQUIRED` is also nonblocking/);
  assert.match(policy, /worker may be `working` before its\ncheckout reappears/);
  assert.match(policy, /delivered worker in `REBASE_REQUIRED`[\s\S]*ordinary rebase and new authenticated delivery/);
  assert.match(policy, /A `REUSE_WORKER`\n+   action retains the finished session and managed worktree/);
  assert.match(policy, /Retain every inactive session\/worktree pair indefinitely/);
  assert.match(policy, /Fifteen retained worker slots, including creation/);
  assert.match(policy, /At `CAMPAIGN_WORKER_CAPACITY_REACHED`/);
  const lifecycle = fs.readFileSync(path.join(__dirname, '..', 'skills', 'worktree-lifecycle', 'SKILL.md'), 'utf8');
  assert.match(lifecycle, /retain the session\/worktree pair indefinitely/);
  assert.match(lifecycle, /No coordinator-initiated\nrecovery action is required/);
  assert.match(lifecycle, /Historical scheduler cleanup actions are not retirement authority/);
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
  assert.match(planExecution, /This checkpoint proves existing behavior and plan structure, not completion/);
  assert.match(planExecution, /approved new behavior exists is a final gate, not an applicable starting/);
  assert.match(planExecution, /Run configured structural traceability once; record exact forward gaps/);
  assert.match(planExecution, /owning tasklets without claiming it passed/);
  assert.match(planExecution, /Those gaps remain required\s+final-acceptance work/);
  assert.match(planExecution, /resolve new, unplanned failures before starting/);
  assert.match(planExecution, /Never describe\s+the whole repository as green while that check is red/);
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
