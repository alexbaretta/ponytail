// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const { parse } = require('lossless-json');
const { collectRollingGraph, selectRollingAssignments, resolveRollingConfiguration, readRollingResolvedConfiguration, readRollingBindingsV1 } = require('./rolling-campaign');

function requireState(condition, message) {
  if (!condition) throw new Error(`rolling campaign: ${message}`);
}

function readStateText(text) {
  return parse(text, null, token => {
    requireState(/^(0|[1-9][0-9]*)$/.test(token), 'state numbers must be unsigned integers');
    const number = Number(token);
    requireState(Number.isSafeInteger(number), 'state number exceeds safe integer range');
    return number;
  });
}

function requireKeys(value, keys) {
  requireState(value && typeof value === 'object' && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()), 'invalid stored contract fields');
  requireState(value.schemaVersion === 1, 'unsupported stored contract version');
}

// Traceability: implements REQ-ROLLING-STATE
function readRollingAssignmentScopeV1(value) {
  requireKeys(value, ['schemaVersion', 'plannedPaths', 'exclusiveResources', 'binding']);
  readRollingBindingsV1({ schemaVersion: 1, bindings: [value.binding] });
  for (const key of ['plannedPaths', 'exclusiveResources']) {
    requireState(Array.isArray(value[key]) && value[key].every(item => typeof item === 'string' && item.length > 0)
      && new Set(value[key]).size === value[key].length, `invalid stored ${key}`);
  }
  requireState(value.plannedPaths.every(item => !path.isAbsolute(item) && !item.includes('\\')
    && item.split('/').every(part => part !== '' && part !== '.' && part !== '..')), 'invalid stored planned path');
  requireState(JSON.stringify(value.exclusiveResources) === JSON.stringify(value.binding.exclusiveResources), 'stored scope and binding resources differ');
  return value;
}

// Traceability: implements REQ-ROLLING-STATE
function readRollingExecutionConfigV1(value) {
  requireKeys(value, ['schemaVersion', 'mainline', 'incrementRef', 'maxActiveWorkers', 'publicationSize']);
  const request = { mainline: value.mainline, incrementRef: value.incrementRef,
    maxActiveWorkers: value.maxActiveWorkers, publicationSize: value.publicationSize };
  readRollingResolvedConfiguration(request);
  return value;
}

const RollingAssignmentScopeReaders = { V1: readRollingAssignmentScopeV1 };
const RollingExecutionConfigReaders = { V1: readRollingExecutionConfigV1 };

function readAssignment(row) {
  const scope = readRollingAssignmentScopeV1(readStateText(row.scope_text));
  const blockers = readStateText(row.blockers_text);
  requireState(Array.isArray(blockers) && blockers.every(item => /^OBL-[1-9][0-9]*$/.test(item)), 'invalid stored blockers');
  return { id: row.assignment_id, scopeId: row.campaign_id, obligationId: row.obligation_id,
    generation: row.generation, state: row.state, sessionId: row.session_id,
    activityStopped: row.activity_stopped, retired: row.retired,
    worktreeNumber: Number(row.worktree_number), plannedPaths: scope.plannedPaths,
    exclusiveResources: scope.exclusiveResources, binding: scope.binding,
    blockers };
}

// Traceability: implements REQ-ROLLING-STATE
// Traceability: supports REQ-ROLLING-SCHEDULING
class RollingCampaignStore {
  constructor(pool, projectId) { this.pool = pool; this.projectId = projectId; }

  async transaction(campaignId, operation) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const pool = (await client.query('SELECT * FROM ponytail_index.rolling_pool_v1 WHERE project_id=$1 FOR UPDATE', [this.projectId])).rows[0];
      requireState(pool, 'project pool is not registered');
      const campaign = (await client.query('SELECT * FROM ponytail_index.rolling_campaign_v1 WHERE project_id=$1 AND campaign_id=$2 FOR UPDATE', [this.projectId, campaignId])).rows[0];
      requireState(campaign, 'campaign is not registered');
      const result = await operation(client, campaign, pool);
      await client.query('COMMIT');
      return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async registerCampaign(request) {
    const graph = collectRollingGraph(request.coordinatorRoot, request.documentPath, request.bindingsPath);
    requireState(graph.digest === request.graphDigest && graph.document.scopeId === request.id, 'stale or mismatched coordinator graph');
    const configuration = resolveRollingConfiguration(graph.projectConfiguration, request.configuration, null);
    requireState(path.isAbsolute(request.managedDirectory), 'managed directory must be absolute');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('INSERT INTO ponytail_index.rolling_pool_v1(project_id,managed_directory) VALUES($1,$2) ON CONFLICT DO NOTHING', [this.projectId, request.managedDirectory]);
      const pool = (await client.query('SELECT managed_directory FROM ponytail_index.rolling_pool_v1 WHERE project_id=$1 FOR UPDATE', [this.projectId])).rows[0];
      requireState(pool.managed_directory === request.managedDirectory, 'managed directory differs from project pool');
      await client.query('INSERT INTO ponytail_index.rolling_campaign_v1(project_id,campaign_id,coordinator_root,document_path,bindings_path,graph_digest,configuration_text) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [this.projectId, request.id, graph.coordinatorRoot, request.documentPath, request.bindingsPath, graph.digest, JSON.stringify(readRollingExecutionConfigV1({ schemaVersion: 1, ...configuration }))]);
      await client.query('COMMIT');
      return { id: request.id, graphDigest: graph.digest };
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  graph(campaign, expectedDigest) {
    const graph = collectRollingGraph(campaign.coordinator_root, campaign.document_path, campaign.bindings_path);
    requireState(graph.digest === expectedDigest && campaign.graph_digest === expectedDigest, 'stale coordinator graph');
    requireState(graph.document.scopeId === campaign.campaign_id, 'campaign scope changed');
    return graph;
  }

  async reconcileGraph(campaignId, expectedDigest, nextDigest) {
    return this.transaction(campaignId, async (client, campaign) => {
      requireState(campaign.graph_digest === expectedDigest, 'stale accepted graph');
      const graph = collectRollingGraph(campaign.coordinator_root, campaign.document_path, campaign.bindings_path);
      requireState(graph.digest === nextDigest && graph.document.scopeId === campaignId, 'stale proposed graph');
      await client.query('UPDATE ponytail_index.rolling_campaign_v1 SET graph_digest=$3 WHERE project_id=$1 AND campaign_id=$2', [this.projectId, campaignId, nextDigest]);
      return { graphDigest: nextDigest };
    });
  }

  async assignment(client, campaignId, id, generation) {
    const row = (await client.query('SELECT * FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3', [this.projectId, campaignId, id])).rows[0];
    requireState(row && row.generation === generation && row.state !== 'RELEASED', 'invalid lease generation or released assignment');
    return row;
  }

  async cancelActions(client, assignmentId) {
    await client.query("UPDATE ponytail_index.rolling_action_v1 SET state='CANCELLED' WHERE project_id=$1 AND assignment_id=$2 AND state='PENDING'", [this.projectId, assignmentId]);
    const started = (await client.query("SELECT action_id FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND assignment_id=$2 AND state='STARTED'", [this.projectId, assignmentId])).rows;
    requireState(started.length === 0, 'external action outcome must be reconciled before stopping ownership');
  }

  async suspend(campaignId, id, generation, stopped, blockers) {
    requireState(stopped === true && Array.isArray(blockers) && blockers.length > 0
      && blockers.every(item => /^OBL-[1-9][0-9]*$/.test(item)) && new Set(blockers).size === blockers.length,
    'suspension requires stopped acknowledgment and unique obligation blockers');
    return this.transaction(campaignId, async client => {
      const assignment = await this.assignment(client, campaignId, id, generation);
      requireState(assignment.session_id && !assignment.retired, 'only an attached non-retired session may become inactive');
      await this.cancelActions(client, id);
      await client.query("UPDATE ponytail_index.rolling_assignment_v1 SET state='INACTIVE',activity_stopped=true,blockers_text=$4 WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3", [this.projectId, campaignId, id, JSON.stringify(blockers)]);
      return { id, state: 'INACTIVE' };
    });
  }

  async retire(campaignId, id, generation, stopped) {
    requireState(stopped === true, 'retirement requires stopped acknowledgment');
    return this.transaction(campaignId, async client => {
      await this.assignment(client, campaignId, id, generation);
      await this.cancelActions(client, id);
      await client.query("UPDATE ponytail_index.rolling_assignment_v1 SET state='RETIRING',activity_stopped=true,retired=true WHERE project_id=$1 AND campaign_id=$2 AND assignment_id=$3", [this.projectId, campaignId, id]);
      return { id, state: 'RETIRING' };
    });
  }

  async attachSession(campaignId, id, generation, sessionId) {
    requireState(typeof sessionId === 'string' && sessionId.length > 0
      && sessionId.trim() === sessionId && !sessionId.includes('\0'), 'invalid session identity');
    return this.transaction(campaignId, async client => {
      const assignment = await this.assignment(client, campaignId, id, generation);
      requireState(assignment.state === 'RESERVED' || assignment.state === 'WORKING', 'assignment cannot attach a session');
      requireState(assignment.session_id === null || assignment.session_id === sessionId, 'resumption must retain the original session');
      const completed = (await client.query("SELECT action_id FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND assignment_id=$2 AND generation=$3 AND state='COMPLETED'", [this.projectId, id, generation])).rows;
      requireState(completed.length === 1, 'session attachment requires completed external action');
      await client.query("UPDATE ponytail_index.rolling_assignment_v1 SET session_id=$2,state='WORKING' WHERE assignment_id=$1", [id, sessionId]);
      await client.query("UPDATE ponytail_index.rolling_worktree_v1 SET state='ACTIVE' WHERE project_id=$1 AND number=$2", [this.projectId, assignment.worktree_number]);
      return { id, sessionId, state: 'WORKING' };
    });
  }

  async allocate(campaignId, expectedDigest, release = null) {
    return this.transaction(campaignId, async (client, campaign, pool) => {
      const graph = this.graph(campaign, expectedDigest);
      if (release) {
        const row = await this.assignment(client, campaignId, release.id, release.generation);
        requireState(row.state === 'RETIRING' && row.retired && row.activity_stopped, 'checkout owner must retire before release');
        await this.cancelActions(client, row.assignment_id);
        await client.query("UPDATE ponytail_index.rolling_assignment_v1 SET state='RELEASED' WHERE assignment_id=$1", [row.assignment_id]);
        await client.query("UPDATE ponytail_index.rolling_worktree_v1 SET state='AVAILABLE' WHERE project_id=$1 AND number=$2", [this.projectId, row.worktree_number]);
      }
      const assignments = (await client.query("SELECT * FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND state<>'RELEASED' ORDER BY created_at,assignment_id", [this.projectId])).rows.map(readAssignment);
      const configuration = readRollingExecutionConfigV1(readStateText(campaign.configuration_text));
      const selection = selectRollingAssignments(graph, assignments, configuration.maxActiveWorkers, expectedDigest);
      const selected = selection.selected[0];
      if (!selected) return { assignment: null, reason: selection.activeCount >= configuration.maxActiveWorkers ? 'capacity_reached' : 'no_ready_obligation', blocked: selection.blocked };
      const generation = crypto.randomUUID();
      let id = selected.assignmentId;
      let worktree;
      if (id) {
        const assignment = assignments.find(item => item.id === id);
        requireState(assignment.sessionId, 'inactive assignment has no resumable session');
        worktree = (await client.query('SELECT * FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND number=$2', [this.projectId, assignment.worktreeNumber])).rows[0];
        await client.query("UPDATE ponytail_index.rolling_assignment_v1 SET generation=$2,state='RESERVED',activity_stopped=false,blockers_text='[]' WHERE assignment_id=$1", [id, generation]);
      } else {
        worktree = (await client.query("SELECT * FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND state='AVAILABLE' ORDER BY number LIMIT 1", [this.projectId])).rows[0];
        if (!worktree) {
          const numbers = (await client.query('SELECT number FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 ORDER BY number', [this.projectId])).rows;
          let number = 101;
          for (const row of numbers) { if (Number(row.number) !== number) break; number++; }
          requireState(Number.isSafeInteger(number), 'worktree numbers exhausted');
          worktree = (await client.query("INSERT INTO ponytail_index.rolling_worktree_v1(project_id,number,root_path,state) VALUES($1,$2,$3,'PROVISIONING') RETURNING *", [this.projectId, number, path.join(pool.managed_directory, String(number))])).rows[0];
        }
        id = crypto.randomUUID();
        await client.query("INSERT INTO ponytail_index.rolling_assignment_v1(project_id,campaign_id,assignment_id,obligation_id,worktree_number,generation,state,scope_text) VALUES($1,$2,$3,$4,$5,$6,'RESERVED',$7)",
          [this.projectId, campaignId, id, selected.obligationId, worktree.number, generation,
            JSON.stringify(readRollingAssignmentScopeV1({ schemaVersion: 1, plannedPaths: selected.plannedPaths, exclusiveResources: selected.exclusiveResources, binding: selected.binding }))]);
      }
      if (worktree.state !== 'PROVISIONING') await client.query("UPDATE ponytail_index.rolling_worktree_v1 SET state='RESERVED' WHERE project_id=$1 AND number=$2", [this.projectId, worktree.number]);
      const actionId = crypto.randomUUID();
      await client.query("INSERT INTO ponytail_index.rolling_action_v1(project_id,campaign_id,action_id,assignment_id,kind,generation,state) VALUES($1,$2,$3,$4,$5,$6,'PENDING')",
        [this.projectId, campaignId, actionId, id, selected.kind === 'resume_worker' ? 'RESUME_WORKER' : 'START_WORKER', generation]);
      const row = (await client.query('SELECT * FROM ponytail_index.rolling_assignment_v1 WHERE assignment_id=$1', [id])).rows[0];
      return { assignment: readAssignment(row), worktree: { number: Number(worktree.number), rootPath: worktree.root_path }, actionId, reason: null };
    });
  }

  async status(campaignId) {
    return this.transaction(campaignId, async (client, campaign) => ({ graphDigest: campaign.graph_digest,
      assignments: (await client.query('SELECT * FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND campaign_id=$2 ORDER BY created_at,assignment_id', [this.projectId, campaignId])).rows.map(readAssignment) }));
  }

  async nextActions(campaignId) {
    const rows = (await this.pool.query("SELECT * FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND campaign_id=$2 AND state IN ('PENDING','STARTED') ORDER BY created_at,action_id", [this.projectId, campaignId])).rows;
    return rows.map(row => ({ id: row.action_id, assignmentId: row.assignment_id, kind: row.kind, generation: row.generation, state: row.state }));
  }

  async acknowledgeAction(campaignId, actionId, generation, state, resultText = null) {
    requireState(['STARTED', 'COMPLETED'].includes(state), 'invalid external action acknowledgment');
    return this.transaction(campaignId, async client => {
      const row = (await client.query('SELECT * FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND campaign_id=$2 AND action_id=$3', [this.projectId, campaignId, actionId])).rows[0];
      requireState(row && row.generation === generation, 'invalid action lease generation');
      await this.assignment(client, campaignId, row.assignment_id, generation);
      if (row.state === state) {
        requireState(row.result_text === resultText, 'acknowledgment differs from accepted result');
        return { id: actionId, state };
      }
      requireState(row.state === 'PENDING' && state === 'STARTED' || row.state === 'STARTED' && state === 'COMPLETED', 'invalid external action transition');
      requireState(state !== 'COMPLETED' || typeof resultText === 'string' && resultText.length > 0, 'completion requires external result');
      await client.query('UPDATE ponytail_index.rolling_action_v1 SET state=$2,result_text=$3 WHERE action_id=$1', [actionId, state, resultText]);
      return { id: actionId, state };
    });
  }
}

module.exports = { RollingCampaignStore, readRollingAssignmentScopeV1, readRollingExecutionConfigV1,
  RollingAssignmentScopeReaders, RollingExecutionConfigReaders };
