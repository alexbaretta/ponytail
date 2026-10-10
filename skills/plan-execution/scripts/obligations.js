#!/usr/bin/env node
/*
 * Copyright (c) 2026 Alex Baretta. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root.
 */
const { parse } = require('lossless-json');

const COORDINATES = ['T1', 'T2', 'T3', 'T4', 'C1', 'C2'];

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function exactKeys(value, keys, label) {
  requireCondition(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  requireCondition(Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), `${label} must contain exactly ${keys.join(', ')}`);
}

function nonemptyString(value, label) {
  requireCondition(typeof value === 'string' && value.trim().length > 0, `${label} must be a nonempty string`);
}

function uniqueStrings(value, label, nonempty = false) {
  requireCondition(Array.isArray(value), `${label} must be an array`);
  value.forEach(item => nonemptyString(item, label));
  requireCondition(new Set(value).size === value.length && (!nonempty || value.length > 0), `${label} must contain unique${nonempty ? ', nonempty' : ''} values`);
}

function relativePath(value) {
  nonemptyString(value, 'path');
  requireCondition(!value.includes('\\') && !value.split('/').some(segment => !segment || segment === '.' || segment === '..') && !/[:*?{}]/.test(value), `invalid repository-relative path: ${value}`);
}

function inputs(value, label) {
  requireCondition(Array.isArray(value) && value.length > 0, `${label} requires a nonempty input manifest`);
  for (const input of value) {
    exactKeys(input, ['path', 'digest'], label);
    relativePath(input.path);
    requireCondition(typeof input.digest === 'string' && /^[a-f0-9]{64}$/.test(input.digest), `${label} requires SHA-256 digests`);
  }
  uniqueStrings(value.map(input => input.path), label);
}

function vector(value) {
  requireCondition(Array.isArray(value) && value.length === 6 && value.every(number => Number.isSafeInteger(number) && number >= 0), 'vector must contain six safe nonnegative integers');
}

function namedRecords(value, label) {
  requireCondition(Array.isArray(value), `${label} must be an array`);
  uniqueStrings(value.map(record => record?.id), `${label} IDs`);
}

function references(value, ids, label) {
  uniqueStrings(value, label);
  requireCondition(value.every(id => ids.has(id)), `${label} contains an unknown reference`);
}

// Traceability: implements REQ-OBLIGATION-IDENTITY
// Traceability: implements REQ-OBLIGATION-BASELINE
// Traceability: implements REQ-OBLIGATION-COMPATIBILITY
function readObligationDocumentV1(value) {
  exactKeys(value, ['schemaVersion', 'scopeId', 'baselines', 'obligations', 'certificates', 'checkpoints'], 'obligation document V1');
  requireCondition(value.schemaVersion === 1, 'unsupported obligation document schemaVersion');
  nonemptyString(value.scopeId, 'scopeId');
  for (const field of ['baselines', 'obligations', 'certificates', 'checkpoints']) namedRecords(value[field], field);
  requireCondition(value.baselines.length > 0, 'a baseline is required');
  const obligationIds = new Set(value.obligations.map(obligation => obligation.id));
  const certificateIds = new Set(value.certificates.map(certificate => certificate.id));
  const baselineIds = new Set(value.baselines.map(baseline => baseline.id));
  let previousNumber = 0;
  for (const obligation of value.obligations) {
    exactKeys(obligation, ['id', 'category', 'requirementIds', 'responsibilityId', 'condition', 'criterion', 'dependsOn', 'acceptanceGroups', 'supersedes', 'execution'], 'obligation');
    requireCondition(/^OBL-[1-9][0-9]*$/.test(obligation.id), 'invalid obligation ID');
    const number = Number(obligation.id.slice(4));
    requireCondition(Number.isSafeInteger(number) && number > previousNumber, 'obligation IDs must be monotonically allocated safe integers');
    previousNumber = number;
    requireCondition([...COORDINATES, 'gate'].includes(obligation.category), 'unknown obligation category');
    uniqueStrings(obligation.requirementIds, 'requirementIds');
    uniqueStrings(obligation.acceptanceGroups, 'acceptanceGroups', true);
    for (const field of ['responsibilityId', 'condition', 'criterion']) nonemptyString(obligation[field], field);
    references(obligation.dependsOn, obligationIds, 'dependsOn');
    requireCondition(obligation.supersedes === null || (obligationIds.has(obligation.supersedes) && Number(obligation.supersedes.slice(4)) < number), 'supersedes must reference an earlier obligation');
    exactKeys(obligation.execution, ['sprintId', 'taskletIds', 'plannedPaths', 'operations'], 'execution');
    requireCondition(obligation.execution.sprintId === null || typeof obligation.execution.sprintId === 'string' && /^S[0-9]+$/.test(obligation.execution.sprintId), 'invalid execution sprintId');
    uniqueStrings(obligation.execution.taskletIds, 'taskletIds');
    requireCondition(obligation.execution.taskletIds.every(id => /^S[0-9]+-F[0-9]+-T[0-9]+$/.test(id) && id.startsWith(`${obligation.execution.sprintId}-`)), 'tasklet binding requires its owning sprint');
    uniqueStrings(obligation.execution.plannedPaths, 'plannedPaths');
    obligation.execution.plannedPaths.forEach(relativePath);
    uniqueStrings(obligation.execution.operations, 'operations', true);
  }
  const visiting = new Set();
  const visited = new Set();
  const byId = new Map(value.obligations.map(obligation => [obligation.id, obligation]));
  function visit(id) {
    requireCondition(!visiting.has(id), `cyclic obligation dependency: ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    byId.get(id).dependsOn.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  value.obligations.forEach(obligation => visit(obligation.id));
  let predecessorId = null;
  for (const baseline of value.baselines) {
    exactKeys(baseline, ['id', 'predecessorId', 'authority', 'requirements', 'obligationIds', 'inventoryIds'], 'baseline');
    requireCondition(baseline.predecessorId === predecessorId, 'baseline predecessor must preserve append-only order');
    predecessorId = baseline.id;
    exactKeys(baseline.authority, ['references', 'assessors'], 'baseline authority');
    uniqueStrings(baseline.authority.references, 'authority references', true);
    uniqueStrings(baseline.authority.assessors, 'authorized assessors', true);
    requireCondition(Array.isArray(baseline.requirements), 'requirements must be an array');
    for (const requirement of baseline.requirements) {
      exactKeys(requirement, ['id', 'path', 'digest'], 'requirement');
      inputs([{ path: requirement.path, digest: requirement.digest }], 'requirement');
    }
    uniqueStrings(baseline.requirements.map(requirement => requirement.id), 'baseline requirement IDs');
    references(baseline.obligationIds, obligationIds, 'baseline obligationIds');
    references(baseline.inventoryIds, new Set(baseline.obligationIds), 'baseline inventoryIds');
    requireCondition(COORDINATES.every(category => baseline.inventoryIds.some(id => byId.get(id).category === category)), 'each coordinate requires a declared inventory obligation');
    for (const id of baseline.obligationIds) {
      references(byId.get(id).requirementIds, new Set(baseline.requirements.map(requirement => requirement.id)), `${id} requirementIds`);
      references(byId.get(id).dependsOn, new Set(baseline.obligationIds), `${id} baseline dependencies`);
    }
  }
  for (const certificate of value.certificates) {
    exactKeys(certificate, ['id', 'obligationIds', 'inputs', 'artifacts', 'assessor', 'authority', 'adequate', 'reason', 'disposition', 'evidence', 'inventoryIds'], 'certificate');
    references(certificate.obligationIds, obligationIds, 'certificate obligationIds');
    requireCondition(certificate.obligationIds.length > 0, 'certificate must cover obligations');
    inputs(certificate.inputs, 'certificate inputs');
    uniqueStrings(certificate.artifacts, 'certificate artifacts', true);
    certificate.artifacts.forEach(relativePath);
    nonemptyString(certificate.assessor, 'certificate assessor');
    uniqueStrings(certificate.authority, 'certificate authority', true);
    requireCondition(typeof certificate.adequate === 'boolean', 'adequate must be boolean');
    nonemptyString(certificate.reason, 'certificate rationale');
    references(certificate.inventoryIds, obligationIds, 'certificate inventoryIds');
    requireCondition(certificate.disposition === null || typeof certificate.disposition === 'object', 'invalid disposition');
    if (certificate.disposition !== null) {
      exactKeys(certificate.disposition, ['responsibilityId', 'reason', 'authority'], 'disposition');
      nonemptyString(certificate.disposition.responsibilityId, 'disposition responsibilityId');
      nonemptyString(certificate.disposition.reason, 'disposition reason');
      uniqueStrings(certificate.disposition.authority, 'disposition authority', true);
      requireCondition(certificate.obligationIds.every(id => byId.get(id).category === 'T4' && byId.get(id).responsibilityId === certificate.disposition.responsibilityId), 'disposition must cover only its exact T4 responsibility');
    }
    requireCondition(Array.isArray(certificate.evidence), 'evidence must be an array');
    for (const evidence of certificate.evidence) {
      exactKeys(evidence, ['command', 'selection', 'target', 'revision', 'dirty', 'startedAt', 'completedAt', 'outcome', 'skips', 'failures', 'inputs', 'outputPath', 'finalization'], 'execution evidence');
      for (const field of ['command', 'revision']) nonemptyString(evidence[field], field);
      uniqueStrings(evidence.selection, 'exact selection', true);
      exactKeys(evidence.target, ['identity', 'profile', 'verification'], 'evidence target');
      for (const field of ['identity', 'profile', 'verification']) nonemptyString(evidence.target[field], `target ${field}`);
      requireCondition(typeof evidence.dirty === 'boolean', 'dirty must be boolean');
      requireCondition(['pass', 'fail', 'unavailable'].includes(evidence.outcome), 'invalid evidence outcome');
      requireCondition(['pass', 'fail', 'unavailable'].includes(evidence.finalization), 'invalid finalization outcome');
      for (const field of ['skips', 'failures']) requireCondition(Number.isSafeInteger(evidence[field]) && evidence[field] >= 0, `${field} must be a safe nonnegative integer`);
      for (const field of ['startedAt', 'completedAt']) requireCondition(typeof evidence[field] === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(evidence[field]) && Number.isFinite(Date.parse(evidence[field])), `${field} must be an ISO timestamp with offset`);
      requireCondition(Date.parse(evidence.startedAt) <= Date.parse(evidence.completedAt), 'evidence completion precedes start');
      inputs(evidence.inputs, 'evidence inputs');
      relativePath(evidence.outputPath);
    }
  }
  predecessorId = null;
  for (const checkpoint of value.checkpoints) {
    exactKeys(checkpoint, ['id', 'predecessorId', 'baselineId', 'kind', 'selectedIds', 'certificateIds', 'invalidatedIds', 'before', 'after', 'preparation', 'reason', 'assessor'], 'checkpoint');
    requireCondition(checkpoint.predecessorId === predecessorId, 'checkpoint predecessor must preserve append-only order');
    predecessorId = checkpoint.id;
    requireCondition(baselineIds.has(checkpoint.baselineId), 'unknown checkpoint baseline');
    requireCondition(['initial', 'productive', 'neutral', 'disturbance', 'rebaseline'].includes(checkpoint.kind), 'unknown checkpoint kind');
    references(checkpoint.selectedIds, obligationIds, 'checkpoint selectedIds');
    references(checkpoint.certificateIds, certificateIds, 'checkpoint certificateIds');
    references(checkpoint.invalidatedIds, certificateIds, 'checkpoint invalidatedIds');
    vector(checkpoint.before);
    vector(checkpoint.after);
    for (const field of ['reason', 'assessor']) nonemptyString(checkpoint[field], field);
    if (checkpoint.preparation !== null) {
      exactKeys(checkpoint.preparation, ['obligationId', 'operations', 'deliverable'], 'preparation');
      requireCondition(obligationIds.has(checkpoint.preparation.obligationId), 'unknown preparation obligation');
      uniqueStrings(checkpoint.preparation.operations, 'bounded preparation operations', true);
      nonemptyString(checkpoint.preparation.deliverable, 'preparation deliverable');
    }
  }
  return value;
}

function parseObligationDocument(text) {
  return readObligationDocumentV1(parse(text, null, token => {
    const number = Number(token);
    requireCondition(/^(0|[1-9][0-9]*)$/.test(token) && Number.isSafeInteger(number), `unsupported JSON number token: ${token}`);
    return number;
  }));
}

const ObligationDocumentReaders = {
  variants: { V1: readObligationDocumentV1 },
  writerVariant: 'V1',
};

module.exports = { ObligationDocumentReaders, readObligationDocumentV1, parseObligationDocument };
