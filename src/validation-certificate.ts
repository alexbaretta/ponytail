// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import {parse} from 'lossless-json';

export interface ValidationCommand {
 readonly argv: readonly string[];
 readonly testIds: readonly string[];
}
export interface ValidationReview {
 readonly reviewer: string;
 readonly candidate: string;
 readonly coveredIds: readonly string[];
 readonly verdict: 'adequate' | 'inadequate';
 readonly reference: string;
}
export interface ValidationRequestV1 {
 readonly schemaVersion: 1;
 readonly campaignId: string;
 readonly candidate: string;
 readonly purpose: 'focused' | 'final';
 readonly coveredIds: readonly string[];
 readonly commands: readonly ValidationCommand[];
 readonly reviews: readonly ValidationReview[];
 readonly recordFailure: boolean;
}
export type ValidationTermination = {readonly kind:'exit';readonly code:number}
 | {readonly kind:'signal';readonly signal:string}
 | {readonly kind:'error';readonly message:string}
 | {readonly kind:'not-run'};
export interface ValidationCommandResult {
 readonly startedAt: string | null;
 readonly finishedAt: string | null;
 readonly termination: ValidationTermination;
}
export interface ValidationCertificateV1 {
 readonly schemaVersion: 1;
 readonly runId: string;
 readonly request: ValidationRequestV1;
 readonly startedAt: string;
 readonly finishedAt: string;
 readonly results: readonly ValidationCommandResult[];
 readonly outcome: 'passed' | 'failed';
}
export interface ValidationRevocationV1 {
 readonly schemaVersion: 1;
 readonly revocationId: string;
 readonly campaignId: string;
 readonly candidate: string;
 readonly revokedTag: string;
 readonly revokedObjectId: string;
 readonly reason: string;
 readonly createdAt: string;
}

function isRecord(value: unknown): value is Record<string,unknown> {
 return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function object(value: unknown, keys: readonly string[], label: string): Record<string,unknown> {
 if (!isRecord(value)
  || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value,key))) {
  throw new Error(`${label} must contain exactly: ${keys.join(', ')}`);
 }
 return value;
}
function string(value: unknown, label: string): string {
 if (typeof value !== 'string' || !value.trim() || value.includes('\0')) throw new Error(`${label} must be a nonempty string without NUL`);
 return value;
}
function array(value: unknown, label: string): readonly unknown[] {
 if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
 return value;
}
function ids(value: unknown, label: string, allowEmpty = false): readonly string[] {
 const values = array(value,label).map(item => string(item,label));
 if ((!allowEmpty && !values.length) || new Set(values).size !== values.length || values.some(id => /\s/u.test(id))) throw new Error(`${label} must contain unique non-whitespace IDs`);
 return values;
}
function commit(value: unknown): string {
 const candidate = string(value,'candidate');
 if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(candidate)) throw new Error('candidate must be a full lowercase Git commit ID');
 return candidate;
}
function timestamp(value: unknown): string {
 const time = string(value,'timestamp');
 if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(time) || !Number.isFinite(Date.parse(time)) || new Date(time).toISOString() !== time) throw new Error('timestamp must be canonical UTC ISO 8601');
 return time;
}
function version(value: unknown): void {
 if (value !== 1) throw new Error('Unsupported validation schemaVersion');
}
function readCommand(value: unknown): ValidationCommand {
 const record = object(value,['argv','testIds'],'validation command');
 const argv = array(record.argv,'argv').map(item => {
  if (typeof item !== 'string' || item.includes('\0')) throw new Error('argv entries must be strings without NUL');
  return item;
 });
 if (!argv.length || !argv[0]?.trim()) throw new Error('argv must identify an executable');
 return {argv,testIds:ids(record.testIds,'testIds',true)};
}
function readReview(value: unknown): ValidationReview {
 const record = object(value,['reviewer','candidate','coveredIds','verdict','reference'],'validation review');
 const verdict = record.verdict;
 if (verdict !== 'adequate' && verdict !== 'inadequate') throw new Error('Unknown review verdict');
 return {reviewer:string(record.reviewer,'reviewer'),candidate:commit(record.candidate),coveredIds:ids(record.coveredIds,'review coveredIds'),verdict,reference:string(record.reference,'review reference')};
}

// Traceability: implements OBL-CM-CERTIFICATES from implementation readValidationRequestV1
export function readValidationRequestV1(value: unknown): ValidationRequestV1 {
 const record = object(value,['schemaVersion','campaignId','candidate','purpose','coveredIds','commands','reviews','recordFailure'],'validation request V1');
 version(record.schemaVersion);
 const campaignId = string(record.campaignId,'campaignId');
 if (!/^[a-z0-9][a-z0-9-]*$/u.test(campaignId)) throw new Error('campaignId must use lowercase letters, digits and hyphens');
 const purpose = record.purpose;
 if (purpose !== 'focused' && purpose !== 'final') throw new Error('Unknown validation purpose');
 if (typeof record.recordFailure !== 'boolean') throw new Error('recordFailure must be boolean');
 const coveredIds = ids(record.coveredIds,'coveredIds');
 const commands = array(record.commands,'commands').map(readCommand);
 if (!commands.length) throw new Error('Validation must request at least one command');
 if (commands.some(command => command.testIds.some(id => !coveredIds.includes(id)))) throw new Error('Command testIds must belong to coveredIds');
 const candidate = commit(record.candidate);
 const reviews = array(record.reviews,'reviews').map(readReview);
 if (reviews.some(review => review.candidate !== candidate)) throw new Error('Review candidate does not match validation candidate');
 return {schemaVersion:1,campaignId,candidate,purpose,coveredIds,commands,reviews,recordFailure:record.recordFailure};
}
function readTermination(value: unknown): ValidationTermination {
 if (value === null || typeof value !== 'object' || !('kind' in value)) throw new Error('Missing command termination');
 switch (value.kind) {
  case 'exit': {
   const record = object(value,['kind','code'],'exit termination');
   if (typeof record.code !== 'number' || !Number.isSafeInteger(record.code) || record.code < 0) throw new Error('Exit code must be a nonnegative safe integer');
   return {kind:'exit',code:record.code};
  }
  case 'signal': return {kind:'signal',signal:string(object(value,['kind','signal'],'signal termination').signal,'signal')};
  case 'error': return {kind:'error',message:string(object(value,['kind','message'],'error termination').message,'error message')};
  case 'not-run': object(value,['kind'],'not-run termination');return {kind:'not-run'};
  default: throw new Error('Unknown command termination');
 }
}
function readResult(value: unknown): ValidationCommandResult {
 const record = object(value,['startedAt','finishedAt','termination'],'validation command result');
 const termination = readTermination(record.termination);
 if (termination.kind === 'not-run') {
  if (record.startedAt !== null || record.finishedAt !== null) throw new Error('Not-run command must not claim execution times');
  return {startedAt:null,finishedAt:null,termination};
 }
 const startedAt = timestamp(record.startedAt);
 const finishedAt = timestamp(record.finishedAt);
 if (finishedAt < startedAt) throw new Error('Command finished before it started');
 return {startedAt,finishedAt,termination};
}

// Traceability: implements OBL-CM-CERTIFICATES from implementation readValidationCertificateV1
export function readValidationCertificateV1(value: unknown): ValidationCertificateV1 {
 const record = object(value,['schemaVersion','runId','request','startedAt','finishedAt','results','outcome'],'validation certificate V1');
 version(record.schemaVersion);
 const runId = string(record.runId,'runId');
 if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(runId)) throw new Error('runId must be a UUID v4');
 const validationRequestV1 = readValidationRequestV1(record.request);
 const startedAt = timestamp(record.startedAt);
 const finishedAt = timestamp(record.finishedAt);
 if (finishedAt < startedAt) throw new Error('Validation finished before it started');
 const results = array(record.results,'results').map(readResult);
 if (results.length !== validationRequestV1.commands.length) throw new Error('Every requested command must have a result');
 let previousFinish = startedAt;
 for (const result of results) {
  if (result.startedAt === null || result.finishedAt === null) continue;
  if (result.startedAt < previousFinish || result.finishedAt > finishedAt) throw new Error('Command times must follow request order within validation times');
  previousFinish = result.finishedAt;
 }
 const outcome = record.outcome;
 if (outcome !== 'passed' && outcome !== 'failed') throw new Error('Unknown validation outcome');
 const passed = results.every(result => result.termination.kind === 'exit' && result.termination.code === 0);
 if ((outcome === 'passed') !== passed) throw new Error('Validation outcome contradicts observed command results');
 if (outcome === 'failed' && !validationRequestV1.recordFailure) throw new Error('Failed certificate recording was not requested');
 if (outcome === 'passed') {
  const reviewed = new Set(validationRequestV1.reviews.filter(review => review.verdict === 'adequate').flatMap(review => review.coveredIds));
  if (validationRequestV1.reviews.some(review => review.verdict !== 'adequate') || validationRequestV1.coveredIds.some(id => !reviewed.has(id))) throw new Error('Passing certificate requires adequate candidate-bound review of all covered IDs');
 }
 return {schemaVersion:1,runId,request:validationRequestV1,startedAt,finishedAt,results,outcome};
}

export function parseValidationJson(text: string): unknown {
 return parse(text,null,token => {
  if (!/^(0|[1-9][0-9]*)$/u.test(token) || !Number.isSafeInteger(Number(token))) throw new Error(`Unsupported validation number: ${token}`);
  return Number(token);
 });
}
// Traceability: implements OBL-CM-CERTIFICATES from implementation readValidationRevocationV1
export function readValidationRevocationV1(value: unknown): ValidationRevocationV1 {
 const record = object(value,['schemaVersion','revocationId','campaignId','candidate','revokedTag','revokedObjectId','reason','createdAt'],'validation revocation V1');
 version(record.schemaVersion);
 const revocationId = string(record.revocationId,'revocationId');
 if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(revocationId)) throw new Error('revocationId must be a UUID v4');
 const campaignId = string(record.campaignId,'campaignId');
 if (!/^[a-z0-9][a-z0-9-]*$/u.test(campaignId)) throw new Error('Invalid revocation campaign ID');
 const revokedTag = string(record.revokedTag,'revokedTag');
 if (!revokedTag.startsWith(`ponytail/validation/${campaignId}/`) || !/^ponytail\/validation\/[^/]+\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(revokedTag)) throw new Error('Revocation must identify a validation tag in its campaign');
 return {schemaVersion:1,revocationId,campaignId,candidate:commit(record.candidate),revokedTag,revokedObjectId:commit(record.revokedObjectId),reason:string(record.reason,'revocation reason'),createdAt:timestamp(record.createdAt)};
}
export const ValidationRequestReaders = {variants:{V1:readValidationRequestV1}};
export const ValidationCertificateReaders = {variants:{V1:readValidationCertificateV1}};
export const ValidationRevocationReaders = {variants:{V1:readValidationRevocationV1}};
