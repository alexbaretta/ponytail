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

test('serial plan execution does not require the deprecated scheduler', () => {
  const planExecution = fs.readFileSync(path.join(__dirname, '..', 'skills', 'plan-execution', 'SKILL.md'), 'utf8');
  const scheduler = fs.readFileSync(path.join(__dirname, '..', 'skills', 'parallel-plan-scheduler', 'SKILL.md'), 'utf8');
  const generated = fs.readFileSync(path.join(__dirname, '..', '.openclaw', 'skills', 'parallel-plan-scheduler', 'SKILL.md'), 'utf8');
  assert.match(planExecution, /ordinary plan execution neither loads nor requires its dispatch protocol/);
  assert.doesNotMatch(planExecution, /campaign (?:schedule-ready|schedule-review-ready|schedule-planning-ready|advance|ready-actions|observe|action-result|deliver|attach)/);
  assert.doesNotMatch(planExecution, /CREATE_WORKER|REUSE_WORKER|REQUEST_REBASE|RECOVER_WORKTREE/);
  assert.match(scheduler, /# Parallel Plan Scheduler \(Deprecated\)/);
  assert.match(scheduler, /require\nan explicit user request to operate the legacy scheduler/);
  assert.match(scheduler, /REQ-PONYTAIL-CLI-AGENT-HARNESS/);
  assert.match(generated, /# Parallel Plan Scheduler \(Deprecated\)/);
  assert.match(generated, /campaign schedule-ready/);
});

test('deprecated scheduler preserves durable actions and worker-owned recovery', () => {
  const scheduler = fs.readFileSync(path.join(__dirname, '..', 'skills', 'parallel-plan-scheduler', 'SKILL.md'), 'utf8');
  assert.match(scheduler, /campaign\s+status \[<campaign-root>\] --json/);
  assert.match(scheduler, /campaign\s+observe <campaign-root> --snapshot <json>/);
  assert.match(scheduler, /Refresh observations after any host\n+   result and at every safe coordination boundary/);
  assert.match(scheduler, /Resolve\n+   every blocking diagnostic first/);
  assert.match(scheduler, /distinguish a worker waiting for coordinator input from one that\n+   has finished/);
  assert.match(scheduler, /campaign advance \[<campaign-root>\] --json/);
  assert.match(scheduler, /campaign ready-actions \[<campaign-root>\] --json/);
  assert.match(scheduler, /Status is a derived view: reconciling one persisted assignment can leave its\n+   returned status unchanged/);
  assert.match(scheduler, /Stop at a genuinely unchanged ledger/);
  assert.match(scheduler, /`status.pendingActions` remains the\n+   complete durable recovery inventory/);
  assert.match(scheduler, /Execute only the `actions` returned by `ready-actions`/);
  assert.match(scheduler, /expose distinct create-or-reuse\n+   actions while a historical rebase action remains outstanding/);
  assert.match(scheduler, /neither execute an action twice nor request a second rebase/);
  assert.match(scheduler, /`CREATE_WORKER`[\s\S]*campaign attach <attachToken>/);
  assert.match(scheduler, /Before campaign attachment, the worker verifies its exact assigned checkout/);
  assert.match(scheduler, /If detached, it uses the host project's canonical worktree tooling/);
  assert.match(scheduler, /adopt the checkout and establish its assignment branch at the completed\n+   bootstrap checkpoint \(initially the exact dispatch revision\)/);
  assert.match(scheduler, /Retry the same attachment token in the same session/);
  assert.match(scheduler, /historical `REQUEST_REBASE`[\s\S]*exact `ontoRevision`/);
  assert.match(scheduler, /New deliveries\n+   use worker-owned optimistic rebasing and create no `REQUEST_REBASE` action/);
  assert.match(scheduler, /worker owns the optimistic join loop after delivery/);
  assert.match(scheduler, /another worker was merged meanwhile, repeat against the new revision/);
  assert.match(scheduler, /coordinator gives this join immediate priority and runs `advance`/);
  assert.match(scheduler, /After `MERGED`, the same worker resumes its plan-owned acceptance/);
  assert.match(scheduler, /`ARCHIVE_WORKTREE`[\s\S]*retire-worktree <campaign-root> <action-id> --json/);
  assert.match(scheduler, /Do not use thread handoff for retirement/);
  assert.match(scheduler, /Codex-managed worktree is not necessarily an archive artifact/);
  assert.match(scheduler, /campaign action-result\n+   <campaign-root> <action-id> --result <json>/);
  assert.match(scheduler, /Recording one result changes only that named action/);
  assert.match(scheduler, /Mutating campaign commands in\n+a worker fail closed/);
  assert.match(scheduler, /Blocking campaign diagnostics outrank new dispatch, integration, cleanup/);
  assert.match(scheduler, /`CAMPAIGN_WORKTREE_MISSING_AFTER_DELIVERY` is an informational recovery/);
  assert.match(scheduler, /ordinary `CAMPAIGN_WORKTREE_MISSING` lacks that proof and remains blocking/);
  assert.match(scheduler, /For `RECOVER_WORKTREE`, message only the action's existing session/);
  assert.match(scheduler, /recovery does not require coordinator initiation/);
  assert.match(scheduler, /preserves the original path and acknowledges a matching/);
  assert.match(scheduler, /ponytail worktree recover\s+<attachment-token>/);
  assert.doesNotMatch(scheduler, /host may choose a new managed|surplus\s+workers are cleanup-ready/);
  assert.match(scheduler, /`CAMPAIGN_WORKTREE_RECOVERY_REQUIRED` is also nonblocking/);
  assert.match(scheduler, /worker may be `working` before its\ncheckout reappears/);
  assert.match(scheduler, /delivered worker in `REBASE_REQUIRED`[\s\S]*ordinary rebase and new authenticated delivery/);
  assert.match(scheduler, /A `REUSE_WORKER`\n+   action retains the finished session and managed worktree/);
  assert.match(scheduler, /Retain every inactive session\/worktree pair indefinitely/);
  assert.match(scheduler, /Fifteen retained worker\s+sessions, including this campaign's creation reservations/);
  assert.match(scheduler, /At `CAMPAIGN_WORKER_CAPACITY_REACHED`/);
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
