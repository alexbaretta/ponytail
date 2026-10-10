#!/usr/bin/env node
/*
 * Copyright (c) 2026 Alex Baretta. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
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
    exactKeys(obligation.execution, ['sprintId', 'taskletIds', 'plannedPaths', 'operations', 'selection', 'target'], 'execution');
    requireCondition(obligation.execution.sprintId === null || typeof obligation.execution.sprintId === 'string' && /^S[0-9]+$/.test(obligation.execution.sprintId), 'invalid execution sprintId');
    uniqueStrings(obligation.execution.taskletIds, 'taskletIds');
    requireCondition(obligation.execution.taskletIds.every(id => /^S[0-9]+-F[0-9]+-T[0-9]+$/.test(id) && id.startsWith(`${obligation.execution.sprintId}-`)), 'tasklet binding requires its owning sprint');
    uniqueStrings(obligation.execution.plannedPaths, 'plannedPaths');
    obligation.execution.plannedPaths.forEach(relativePath);
    uniqueStrings(obligation.execution.operations, 'operations', true);
    uniqueStrings(obligation.execution.selection, 'execution selection');
    if (obligation.execution.target !== null) {
      exactKeys(obligation.execution.target, ['identity', 'profile'], 'execution target');
      for (const field of ['identity', 'profile']) nonemptyString(obligation.execution.target[field], `execution target ${field}`);
    }
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
    requireCondition(baseline.requirements.every(requirement => COORDINATES.every(category => baseline.inventoryIds.some(id => byId.get(id).category === category && byId.get(id).requirementIds.includes(requirement.id)))), 'each baseline requirement must be covered by inventories in every coordinate');
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
      relativePath(evidence.target.verification);
    }
  }
  predecessorId = null;
  for (const checkpoint of value.checkpoints) {
    exactKeys(checkpoint, ['id', 'predecessorId', 'baselineId', 'kind', 'selectedIds', 'registeredIds', 'certificateIds', 'invalidatedIds', 'before', 'after', 'preparation', 'reason', 'assessor'], 'checkpoint');
    requireCondition(checkpoint.predecessorId === predecessorId, 'checkpoint predecessor must preserve append-only order');
    predecessorId = checkpoint.id;
    requireCondition(baselineIds.has(checkpoint.baselineId), 'unknown checkpoint baseline');
    requireCondition(['initial', 'productive', 'neutral', 'disturbance', 'rebaseline'].includes(checkpoint.kind), 'unknown checkpoint kind');
    references(checkpoint.selectedIds, obligationIds, 'checkpoint selectedIds');
    references(checkpoint.registeredIds, obligationIds, 'checkpoint registeredIds');
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
  replayHistory(value);
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
  V1: readObligationDocumentV1,
};

// Traceability: implements REQ-OBLIGATION-FRESHNESS
function inputDigest(root, relative) {
  relativePath(relative);
  const repositoryRoot = fs.realpathSync(root);
  const inputPath = fs.realpathSync(path.join(repositoryRoot, relative));
  const resolved = path.relative(repositoryRoot, inputPath);
  requireCondition(resolved !== '' && !resolved.startsWith(`..${path.sep}`) && resolved !== '..' && !path.isAbsolute(resolved), `input escapes repository: ${relative}`);
  requireCondition(fs.statSync(inputPath).isFile(), `input must be a regular file: ${relative}`);
  return crypto.createHash('sha256').update(fs.readFileSync(inputPath)).digest('hex');
}

// Traceability: implements REQ-OBLIGATION-DISCHARGE
// Traceability: implements REQ-OBLIGATION-FRESHNESS
function certificateReasons(obligationDocument, baseline, certificate) {
  const reasons = [];
  if (!certificate.adequate) reasons.push('adequacy assessment is negative');
  if (!baseline.authority.assessors.includes(certificate.assessor) || !certificate.authority.every(reference => baseline.authority.references.includes(reference))) reasons.push('assessment lacks baseline authority');
  if (!certificate.obligationIds.every(id => baseline.obligationIds.includes(id))) reasons.push('certificate covers obligations outside baseline');
  const manifest = new Map(certificate.inputs.map(input => [input.path, input.digest]));
  const requiredPaths = [...certificate.artifacts];
  const requirementIds = new Set(obligationDocument.obligations.filter(obligation => certificate.obligationIds.includes(obligation.id)).flatMap(obligation => obligation.requirementIds));
  for (const requirement of baseline.requirements.filter(requirement => requirementIds.has(requirement.id))) {
    requiredPaths.push(requirement.path);
    if (manifest.get(requirement.path) !== requirement.digest) reasons.push(`baseline meaning not preserved: ${requirement.id}`);
  }
  if (certificate.disposition && !certificate.disposition.authority.every(reference => baseline.authority.references.includes(reference))) reasons.push('disposition lacks authority');
  const executionRequired = certificate.obligationIds.some(id => {
    const obligation = obligationDocument.obligations.find(obligation => obligation.id === id);
    return ['C1', 'C2'].includes(obligation.category) && !baseline.inventoryIds.includes(id);
  });
  if (executionRequired && certificate.evidence.length === 0) reasons.push('execution proof is missing');
  for (const evidence of certificate.evidence) {
    if (evidence.outcome !== 'pass' || evidence.skips !== 0 || evidence.failures !== 0 || evidence.finalization !== 'pass') reasons.push('execution is failed, skipped, unavailable or not finalized');
    requiredPaths.push(evidence.outputPath, evidence.target.verification);
    for (const id of certificate.obligationIds) {
      const obligation = obligationDocument.obligations.find(obligation => obligation.id === id);
      if (['C1', 'C2'].includes(obligation.category) && !baseline.inventoryIds.includes(id)) {
        const execution = obligation.execution;
        if (!execution.target || execution.target.identity !== evidence.target.identity || execution.target.profile !== evidence.target.profile || !execution.operations.includes(evidence.command) || JSON.stringify(execution.selection) !== JSON.stringify(evidence.selection) || execution.selection.length === 0) reasons.push(`wrong execution command, selection or target: ${id}`);
      }
    }
    for (const input of evidence.inputs) {
      requiredPaths.push(input.path);
      if (manifest.get(input.path) !== input.digest) reasons.push(`evidence manifest disagrees: ${input.path}`);
    }
  }
  for (const relative of requiredPaths) if (!manifest.has(relative)) reasons.push(`unassessed artifact or evidence input: ${relative}`);
  for (const id of certificate.obligationIds.filter(id => baseline.inventoryIds.includes(id))) {
    const category = obligationDocument.obligations.find(obligation => obligation.id === id).category;
    const inventoryIds = baseline.obligationIds.filter(member => obligationDocument.obligations.find(obligation => obligation.id === member).category === category && !baseline.inventoryIds.includes(member));
    if (inventoryIds.length !== certificate.inventoryIds.length || inventoryIds.some(member => !certificate.inventoryIds.includes(member))) reasons.push(`incomplete inventory assessment: ${id}`);
    if (certificate.disposition) reasons.push('inventory cannot be closed by unit disposition');
  }
  return reasons;
}

function freshCertificate(obligationDocument, baseline, certificate, root) {
  const reasons = certificateReasons(obligationDocument, baseline, certificate);
  for (const input of certificate.inputs) {
    try {
      if (inputDigest(root, input.path) !== input.digest) reasons.push(`changed input: ${input.path}`);
    } catch (error) {
      reasons.push(`unavailable input ${input.path}: ${error.message}`);
    }
  }
  return { fresh: reasons.length === 0, reasons };
}

function projectBaseline(obligationDocument, baseline, accepted, root) {
  const satisfied = new Set();
  const assessments = [];
  for (const certificate of obligationDocument.certificates.filter(certificate => accepted.has(certificate.id))) {
    const reasons = root === null ? certificateReasons(obligationDocument, baseline, certificate)
      : freshCertificate(obligationDocument, baseline, certificate, root).reasons;
    assessments.push({ id: certificate.id, valid: reasons.length === 0, reasons });
    if (reasons.length === 0) certificate.obligationIds.forEach(id => satisfied.add(id));
  }
  const obligations = obligationDocument.obligations.filter(obligation => baseline.obligationIds.includes(obligation.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const obligation of obligations) {
      if (satisfied.has(obligation.id) && obligation.dependsOn.some(id => !satisfied.has(id))) {
        satisfied.delete(obligation.id);
        changed = true;
      }
    }
  }
  const unresolved = obligations.filter(obligation => !satisfied.has(obligation.id));
  const vector = COORDINATES.map(category => unresolved.filter(obligation => obligation.category === category).length);
  const gates = unresolved.filter(obligation => obligation.category === 'gate').map(obligation => obligation.id);
  return { baselineId: baseline.id, vector, satisfiedIds: obligations.filter(obligation => satisfied.has(obligation.id)).map(obligation => obligation.id),
    unresolvedIds: unresolved.map(obligation => obligation.id), gates, assessments,
    complete: vector.every(count => count === 0) && gates.length === 0 };
}

// Traceability: implements REQ-OBLIGATION-DISCHARGE
// Traceability: implements REQ-OBLIGATION-COMPLETENESS
function projectObligations(obligationDocument, root) {
  readObligationDocumentV1(obligationDocument);
  const replay = replayHistory(obligationDocument);
  return projectBaseline(obligationDocument, replay.baseline, replay.accepted, root);
}

// Traceability: implements REQ-OBLIGATION-TRANSITIONS
function compareVectors(before, after) {
  vector(before);
  vector(after);
  for (let index = 0; index < 6; index++) {
    if (before[index] !== after[index]) return Math.sign(after[index] - before[index]);
  }
  return 0;
}

// Traceability: implements REQ-OBLIGATION-PRIORITY
function selectObligation(obligationDocument, root) {
  const projection = projectObligations(obligationDocument, root);
  const category = COORDINATES[projection.vector.findIndex(count => count > 0)];
  if (!category) return { category: null, selectedId: null, blockedIds: projection.gates, projection };
  const unresolved = obligationDocument.obligations.filter(obligation => projection.unresolvedIds.includes(obligation.id) && obligation.category === category);
  const eligible = unresolved.filter(obligation => obligation.dependsOn.every(id => projection.satisfiedIds.includes(id)));
  return { category, selectedId: eligible[0]?.id ?? null,
    blockedIds: unresolved.filter(obligation => !eligible.includes(obligation)).map(obligation => obligation.id), projection };
}

function checkpointTransition(obligationDocument, checkpoint, before, after, priorCheckpoints) {
  requireCondition(compareVectors(checkpoint.before, before) === 0 && compareVectors(checkpoint.after, after) === 0, `checkpoint vectors disagree with derived state: ${checkpoint.id}`);
  const difference = compareVectors(before, after);
  if (checkpoint.kind === 'productive') {
    requireCondition(difference < 0, 'productive checkpoint requires strict lexicographic decrease');
    const category = COORDINATES[before.findIndex(count => count > 0)];
    requireCondition(checkpoint.selectedIds.length > 0 && checkpoint.selectedIds.every(id => obligationDocument.obligations.find(obligation => obligation.id === id).category === category), 'productive selection must remain in earliest coordinate');
    requireCondition(checkpoint.preparation === null, 'productive checkpoint cannot be preparation');
  } else if (checkpoint.kind === 'neutral') {
    requireCondition(difference === 0 && checkpoint.preparation !== null && checkpoint.registeredIds.length === 0 && checkpoint.invalidatedIds.length === 0 && checkpoint.certificateIds.every(id => obligationDocument.certificates.find(certificate => certificate.id === id).obligationIds.every(member => obligationDocument.obligations.find(obligation => obligation.id === member).category === 'gate')), 'neutral checkpoint requires bounded preparation; only non-metric gates may be certified');
    const obligation = obligationDocument.obligations.find(obligation => obligation.id === checkpoint.preparation.obligationId);
    requireCondition(checkpoint.selectedIds.includes(obligation.id) && checkpoint.preparation.operations.every(operation => obligation.execution.operations.includes(operation)), 'preparation exceeds selected execution binding');
    const sinceChange = priorCheckpoints.slice(priorCheckpoints.findLastIndex(previous => previous.kind !== 'neutral') + 1);
    requireCondition(!sinceChange.some(previous => JSON.stringify(previous.preparation) === JSON.stringify(checkpoint.preparation)), 'repeated completed preparation on unchanged state');
  } else {
    requireCondition(checkpoint.preparation === null, 'only neutral checkpoints permit preparation');
    if (checkpoint.kind === 'disturbance') requireCondition(difference >= 0 && (difference > 0 || checkpoint.invalidatedIds.length > 0 || checkpoint.registeredIds.length > 0), 'disturbance must record discovery or invalidation honestly');
  }
}

function replayHistory(obligationDocument) {
  let baseline = obligationDocument.baselines[0];
  let membership = [];
  const accepted = new Set();
  const priorCheckpoints = [];
  for (const checkpoint of obligationDocument.checkpoints) {
    requireCondition(baseline.authority.assessors.includes(checkpoint.assessor) || checkpoint.kind === 'rebaseline', 'checkpoint assessor lacks authority');
    const before = priorCheckpoints.at(-1)?.after ?? projectBaseline(obligationDocument, { ...baseline, obligationIds: checkpoint.registeredIds }, accepted, null).vector;
    if (checkpoint.kind === 'initial') {
      requireCondition(priorCheckpoints.length === 0 && checkpoint.baselineId === baseline.id && checkpoint.selectedIds.length === 0 && checkpoint.certificateIds.length === 0 && checkpoint.invalidatedIds.length === 0, 'initial checkpoint must only observe first baseline');
      membership = [...checkpoint.registeredIds];
      requireCondition(membership.every(id => baseline.obligationIds.includes(id)) && baseline.inventoryIds.every(id => membership.includes(id)), 'initial observation must register complete known membership');
    } else if (checkpoint.kind === 'rebaseline') {
      const successor = obligationDocument.baselines.find(item => item.id === checkpoint.baselineId);
      requireCondition(successor.predecessorId === baseline.id && successor.authority.assessors.includes(checkpoint.assessor), 'rebaseline requires authorized immediate successor');
      baseline = successor;
      membership = [...checkpoint.registeredIds];
      requireCondition(membership.every(id => baseline.obligationIds.includes(id)) && baseline.inventoryIds.every(id => membership.includes(id)), 'rebaseline must register complete known membership');
    } else {
      requireCondition(priorCheckpoints.length > 0 && checkpoint.baselineId === baseline.id, 'ordinary checkpoint cannot change baseline');
      requireCondition(checkpoint.registeredIds.every(id => !membership.includes(id) && baseline.obligationIds.includes(id)), 'registered IDs must be new members of current baseline');
      membership.push(...checkpoint.registeredIds);
    }
    const effectiveBaseline = { ...baseline, obligationIds: membership };
    const beforeProjection = projectBaseline(obligationDocument, { ...baseline, obligationIds: membership.filter(id => !checkpoint.registeredIds.includes(id)) }, accepted, null);
    if (checkpoint.kind === 'productive' || checkpoint.kind === 'neutral') {
      const category = COORDINATES[before.findIndex(count => count > 0)];
      for (const id of checkpoint.selectedIds) {
        const obligation = obligationDocument.obligations.find(obligation => obligation.id === id);
        requireCondition(beforeProjection.unresolvedIds.includes(id) && (obligation.category === category || checkpoint.kind === 'neutral' && obligation.category === 'gate'), 'historical selection must be unresolved in earliest coordinate or a non-metric gate');
        if (checkpoint.kind === 'productive') requireCondition(obligation.dependsOn.every(dependency => beforeProjection.satisfiedIds.includes(dependency)), 'historical selection prerequisites are unresolved');
      }
    }
    for (const id of checkpoint.invalidatedIds) {
      requireCondition(accepted.has(id), 'invalidation must reference accepted certificate');
      accepted.delete(id);
    }
    for (const id of checkpoint.certificateIds) {
      requireCondition(!accepted.has(id), 'certificate must not be accepted twice');
      const certificate = obligationDocument.certificates.find(certificate => certificate.id === id);
      requireCondition(certificate.assessor === checkpoint.assessor && certificateReasons(obligationDocument, effectiveBaseline, certificate).length === 0, `certificate lacks adequate authorized assessment: ${id}`);
      requireCondition(certificate.obligationIds.every(member => checkpoint.selectedIds.includes(member)), 'certificate cannot bypass selected responsibility');
      accepted.add(id);
    }
    const after = projectBaseline(obligationDocument, effectiveBaseline, accepted, null).vector;
    checkpointTransition(obligationDocument, checkpoint, before, after, priorCheckpoints);
    priorCheckpoints.push(checkpoint);
  }
  return { baseline: { ...baseline, obligationIds: priorCheckpoints.length ? membership : baseline.obligationIds }, accepted };
}

function appendOnly(previous, candidate, label) {
  requireCondition(candidate.length >= previous.length && previous.every((item, index) => JSON.stringify(item) === JSON.stringify(candidate[index])), `${label} accepted prefix must be immutable`);
}

// Traceability: implements REQ-OBLIGATION-BASELINE
// Traceability: implements REQ-OBLIGATION-TRANSITIONS
// Traceability: implements REQ-OBLIGATION-COMPLETENESS
function acceptCheckpoint(previous, candidate, root) {
  readObligationDocumentV1(previous);
  readObligationDocumentV1(candidate);
  requireCondition(candidate.scopeId === previous.scopeId, 'scope identity is immutable');
  appendOnly(previous.obligations, candidate.obligations, 'obligations');
  appendOnly(previous.certificates, candidate.certificates, 'certificates');
  appendOnly(previous.checkpoints, candidate.checkpoints.slice(0, -1), 'checkpoints');
  requireCondition(candidate.checkpoints.length === previous.checkpoints.length + 1, 'accept exactly one checkpoint');
  const checkpoint = candidate.checkpoints.at(-1);
  requireCondition(candidate.baselines.length >= previous.baselines.length, 'baseline history must be retained');
  for (let index = 0; index < previous.baselines.length; index++) {
    const before = previous.baselines[index];
    const after = candidate.baselines[index];
    requireCondition(after !== undefined, 'baseline history must be retained');
    appendOnly(before.obligationIds, after.obligationIds, 'baseline membership');
    requireCondition(JSON.stringify({ ...before, obligationIds: [] }) === JSON.stringify({ ...after, obligationIds: [] }), 'baseline meaning and authority require a new baseline');
  }
  const before = projectObligations(previous, root);
  const acceptedBefore = previous.checkpoints.at(-1)?.after ?? before.vector;
  if (compareVectors(before.vector, acceptedBefore) !== 0) requireCondition(checkpoint.kind === 'disturbance' || checkpoint.kind === 'rebaseline', 'changed inputs require disturbance before productive work');
  if (checkpoint.kind === 'productive' || checkpoint.kind === 'neutral') {
    const category = COORDINATES[before.vector.findIndex(count => count > 0)];
    for (const id of checkpoint.selectedIds) {
      const obligation = previous.obligations.find(obligation => obligation.id === id);
      requireCondition(obligation && (obligation.category === category || checkpoint.kind === 'neutral' && obligation.category === 'gate') && before.unresolvedIds.includes(id), 'selection must resolve current earliest obligation');
      if (checkpoint.kind === 'productive') requireCondition(obligation.dependsOn.every(dependency => before.satisfiedIds.includes(dependency)), 'selected obligation prerequisites are unresolved');
    }
  }
  const replay = replayHistory(candidate);
  for (const requirement of replay.baseline.requirements) requireCondition(inputDigest(root, requirement.path) === requirement.digest, `requirement meaning changed without activated baseline: ${requirement.id}`);
  for (const id of checkpoint.certificateIds) {
    const certificate = candidate.certificates.find(certificate => certificate.id === id);
    const assessment = freshCertificate(candidate, replay.baseline, certificate, root);
    requireCondition(assessment.fresh, `cannot accept certificate ${id}: ${assessment.reasons.join('; ')}`);
  }
  const after = projectObligations(candidate, root);
  requireCondition(compareVectors(checkpoint.after, after.vector) === 0, 'checkpoint must expose all current stale evidence');
  requireCondition(candidate.baselines.at(-1).id === checkpoint.baselineId, 'unaccepted baseline cannot be published');
  requireCondition(candidate.baselines.at(-1).obligationIds.length === replay.baseline.obligationIds.length, 'unregistered obligations cannot be hidden');
  return candidate;
}

// Traceability: implements REQ-OBLIGATION-COMPATIBILITY
function main(argv) {
  const [operation, documentPath, root, ...extra] = argv;
  if (!['validate', 'status', 'select'].includes(operation) || !documentPath || !root || extra.length) {
    process.stderr.write('Usage: obligations.js <validate|status|select> <document-path> <repository-root>\n');
    return 2;
  }
  let text;
  try { text = fs.readFileSync(documentPath, 'utf8'); fs.realpathSync(root); }
  catch (error) { process.stderr.write(`${error.message}\n`); return 2; }
  try {
    const obligationDocument = parseObligationDocument(text);
    const result = operation === 'select' ? selectObligation(obligationDocument, root) : projectObligations(obligationDocument, root);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { main, acceptCheckpoint, projectObligations, compareVectors, selectObligation, inputDigest, freshCertificate, ObligationDocumentReaders, readObligationDocumentV1, parseObligationDocument };
