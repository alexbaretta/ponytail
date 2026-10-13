// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import path from 'node:path';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {parse} from 'lossless-json';
import {isRollingArgv,readRollingResolvedConfiguration,type RollingArgv} from './rolling-campaign.js';
import {git,gitResult,publishRollingIncrement,readRollingIncrementPublicationResult,type RollingIncrementPublicationResult,type RollingIncrementTarget} from './rolling-integration.js';
import {relativePath} from '../skills/plan-execution/scripts/obligations.js';

export interface RollingAcceptedIncrement {
 readonly id:string;
 readonly revision:string;
}
export type RollingPublicationTrigger = 'threshold' | 'explicit_flush' | 'completion' | 'quiescence';
export interface RollingPublicationWaiting {
 readonly state:'WAITING';
 readonly reason:'empty' | 'below_threshold';
 readonly count:number;
}
export interface RollingPublicationFrozen {
 readonly state:'FROZEN';
 readonly trigger:RollingPublicationTrigger;
 readonly increments:readonly RollingAcceptedIncrement[];
 readonly campaignRevision:string;
}
// Discriminator: state
export type RollingPublicationSelection = RollingPublicationWaiting | RollingPublicationFrozen;

export interface RollingPublicationBatchClaimV1 {
 readonly schemaVersion:1;
 readonly id:string;
 readonly campaignId:string;
 readonly rootPath:string;
 readonly incrementRef:string;
 readonly target:RollingIncrementTarget;
 readonly graphDigest:string;
 readonly configurationDigest:string;
 readonly publicationSize:number;
 readonly trigger:RollingPublicationTrigger;
 readonly increments:readonly RollingAcceptedIncrement[];
 readonly campaignRevision:string;
}

function isRecord(value:unknown):value is Record<string,unknown> {
 return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function record(value:unknown,keys:readonly string[]):Record<string,unknown> {
 requirePublication(isRecord(value),'publication contract must be a record');
 requirePublication(Object.keys(value).sort().join(',') === [...keys].sort().join(','),'unknown or missing publication fields');
 return value;
}

// Traceability: implements REQ-ROLLING-PUBLICATION
export function readRollingPublicationBatchClaimV1(value:unknown):RollingPublicationBatchClaimV1 {
 const batch = record(value,['schemaVersion','id','campaignId','rootPath','incrementRef','target','graphDigest','configurationDigest',
  'publicationSize','trigger','increments','campaignRevision']);
 requirePublication(batch.schemaVersion === 1,'unsupported publication claim version');
 requirePublication(typeof batch.id === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(batch.id),'invalid publication batch ID');
 requirePublication(typeof batch.campaignId === 'string' && batch.campaignId.trim() === batch.campaignId && batch.campaignId.length > 0
  && !/[\0\r\n]/u.test(batch.campaignId),'invalid publication campaign ID');
 requirePublication(typeof batch.rootPath === 'string' && path.isAbsolute(batch.rootPath) && path.normalize(batch.rootPath) === batch.rootPath,'invalid publication checkout');
 const rollingResolvedConfiguration = readRollingResolvedConfiguration({mainline:batch.target,incrementRef:batch.incrementRef,
  maxActiveWorkers:1,publicationSize:batch.publicationSize});
 requirePublication(typeof batch.graphDigest === 'string' && /^[a-f0-9]{64}$/u.test(batch.graphDigest)
  && typeof batch.configurationDigest === 'string' && /^[a-f0-9]{64}$/u.test(batch.configurationDigest),'invalid publication input digest');
 requirePublication(batch.trigger === 'threshold' || batch.trigger === 'explicit_flush' || batch.trigger === 'completion' || batch.trigger === 'quiescence','invalid publication trigger');
 requirePublication(Array.isArray(batch.increments) && batch.increments.length > 0,'publication claim has no accepted increments');
 const rollingAcceptedIncrements = batch.increments.map((value:unknown):RollingAcceptedIncrement=> {
  const increment = record(value,['id','revision']);
  requirePublication(typeof increment.id === 'string' && typeof increment.revision === 'string','invalid publication increment');
  return {id:increment.id,revision:increment.revision};
 });
 requirePublication(new Set(rollingAcceptedIncrements.map(item=>item.id)).size === rollingAcceptedIncrements.length,'publication claim repeats an increment');
 const rollingPublicationSelection = selectRollingPublicationBatch(rollingAcceptedIncrements,rollingResolvedConfiguration.publicationSize,
  batch.trigger === 'threshold' ? null : batch.trigger);
 requirePublication(rollingPublicationSelection.state === 'FROZEN' && rollingPublicationSelection.increments.length === rollingAcceptedIncrements.length
  && rollingPublicationSelection.trigger === batch.trigger && rollingPublicationSelection.campaignRevision === batch.campaignRevision,'claim differs from its frozen publication selection');
 return {schemaVersion:1,id:batch.id,campaignId:batch.campaignId,rootPath:batch.rootPath,incrementRef:rollingResolvedConfiguration.incrementRef,
  target:rollingResolvedConfiguration.mainline,graphDigest:batch.graphDigest,configurationDigest:batch.configurationDigest,
  publicationSize:rollingResolvedConfiguration.publicationSize,trigger:batch.trigger,increments:rollingPublicationSelection.increments,
  campaignRevision:rollingPublicationSelection.campaignRevision};
}
export const RollingPublicationBatchClaimReaders = {V1:readRollingPublicationBatchClaimV1};

function requirePublication(condition:unknown,message:string):asserts condition {
 if (!condition) throw new Error(`rolling publication: ${message}`);
}

// Traceability: implements REQ-ROLLING-PUBLICATION
// The store supplies only accepted, unpublished delivery receipts in campaign
// ancestry order. Repeated receipt acknowledgements cannot increase the count.
export function selectRollingPublicationBatch(orderedRollingAcceptedIncrements:readonly RollingAcceptedIncrement[],
 publicationSize:number,flush:Exclude<RollingPublicationTrigger,'threshold'> | null = null):RollingPublicationSelection {
 requirePublication(Number.isSafeInteger(publicationSize) && publicationSize > 0,'publication size must be a positive safe integer');
 requirePublication(flush === null || flush === 'explicit_flush' || flush === 'completion' || flush === 'quiescence','unsupported publication trigger');
 const map = new Map<string,RollingAcceptedIncrement>();
 for (const rollingAcceptedIncrement of orderedRollingAcceptedIncrements) {
  requirePublication(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(rollingAcceptedIncrement.id)
   && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(rollingAcceptedIncrement.revision),'invalid accepted increment identity');
  const previousRollingAcceptedIncrement = map.get(rollingAcceptedIncrement.id);
  requirePublication(!previousRollingAcceptedIncrement || previousRollingAcceptedIncrement.revision === rollingAcceptedIncrement.revision,
   'accepted increment revision is immutable');
  if (!previousRollingAcceptedIncrement) map.set(rollingAcceptedIncrement.id,{id:rollingAcceptedIncrement.id,revision:rollingAcceptedIncrement.revision});
 }
 const uniqueRollingAcceptedIncrements = [...map.values()];
 if (uniqueRollingAcceptedIncrements.length === 0) return {state:'WAITING',reason:'empty',count:0};
 const trigger = uniqueRollingAcceptedIncrements.length >= publicationSize ? 'threshold' : flush;
 if (trigger === null)
  return {state:'WAITING',reason:'below_threshold',count:uniqueRollingAcceptedIncrements.length};
 const selectedRollingAcceptedIncrements = uniqueRollingAcceptedIncrements.slice(0,publicationSize);
 const finalRollingAcceptedIncrement = selectedRollingAcceptedIncrements.at(-1);
 requirePublication(finalRollingAcceptedIncrement,'publication cannot freeze an empty batch');
 return {state:'FROZEN',trigger,
  increments:selectedRollingAcceptedIncrements,campaignRevision:finalRollingAcceptedIncrement.revision};
}

export interface RollingMainlinePreparationV1 {
 readonly schemaVersion:1;
 readonly batchId:string;
 readonly rootPath:string;
 readonly sourceRevision:string;
 readonly mainlineRevision:string;
}
export interface RollingMainlineCandidateV1 extends RollingMainlinePreparationV1 {
 readonly revision:string;
}
export interface RollingPublicationCommandResult {
 readonly argv:RollingArgv;
 readonly status:number | null;
 readonly output:string;
}
export interface RollingPublicationQaV1 {
 readonly schemaVersion:1;
 readonly id:string;
 readonly batchId:string;
 readonly revision:string;
 readonly configurationDigest:string;
 readonly outcome:'PASS' | 'FAIL';
 readonly commands:readonly RollingPublicationCommandResult[];
}
function commit(value:unknown):string {
 requirePublication(typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value),'invalid publication commit');
 return value;
}
function batchId(value:unknown):string {
 requirePublication(typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(value),'invalid publication batch ID');
 return value;
}
function physicalRoot(value:unknown):string {
 requirePublication(typeof value === 'string' && path.isAbsolute(value) && path.normalize(value) === value,'invalid publication root');
 return value;
}
// Traceability: implements REQ-ROLLING-PUBLICATION
export function readRollingMainlinePreparationV1(value:unknown):RollingMainlinePreparationV1 {
 const preparation = record(value,['schemaVersion','batchId','rootPath','sourceRevision','mainlineRevision']);
 requirePublication(preparation.schemaVersion === 1,'unsupported mainline preparation version');
 return {schemaVersion:1,batchId:batchId(preparation.batchId),rootPath:physicalRoot(preparation.rootPath),
  sourceRevision:commit(preparation.sourceRevision),mainlineRevision:commit(preparation.mainlineRevision)};
}
export const RollingMainlinePreparationReaders = {V1:readRollingMainlinePreparationV1};
// Traceability: implements REQ-ROLLING-PUBLICATION
export function readRollingMainlineCandidateV1(value:unknown):RollingMainlineCandidateV1 {
 const candidate = record(value,['schemaVersion','batchId','rootPath','sourceRevision','mainlineRevision','revision']);
 const rollingMainlinePreparationV1 = readRollingMainlinePreparationV1({schemaVersion:candidate.schemaVersion,batchId:candidate.batchId,
  rootPath:candidate.rootPath,sourceRevision:candidate.sourceRevision,mainlineRevision:candidate.mainlineRevision});
 return {...rollingMainlinePreparationV1,revision:commit(candidate.revision)};
}
export const RollingMainlineCandidateReaders = {V1:readRollingMainlineCandidateV1};

export interface RollingPublicationRepairReviewV1 {
 readonly schemaVersion:1;
 readonly batchId:string;
 readonly previousRevision:string;
 readonly revision:string;
 readonly reviewerId:string;
 readonly reference:string;
 readonly paths:readonly string[];
 readonly decision:'accepted';
}
export interface RollingPublicationRepairV1 {
 readonly schemaVersion:1;
 readonly id:string;
 readonly batchId:string;
 readonly review:RollingPublicationRepairReviewV1;
 readonly previousCandidate:RollingMainlineCandidateV1;
 readonly candidate:RollingMainlineCandidateV1;
}
// Traceability: implements REQ-ROLLING-PUBLICATION-REPAIR
export function readRollingPublicationRepairReviewV1(value:unknown):RollingPublicationRepairReviewV1 {
 const input=record(value,['schemaVersion','batchId','previousRevision','revision','reviewerId','reference','paths','decision']);
 requirePublication(input.schemaVersion===1 && input.decision==='accepted','repair requires an accepted V1 review');
 requirePublication(typeof input.reviewerId==='string'&&input.reviewerId.trim()===input.reviewerId&&input.reviewerId.length>0&&!/[\0\r\n]/u.test(input.reviewerId),'invalid repair reviewer');
 requirePublication(typeof input.reference==='string'&&Array.isArray(input.paths)&&input.paths.length>0,'repair review lacks reference or paths');
 relativePath(input.reference);
 const paths:readonly string[]=input.paths.map((value:unknown)=>{requirePublication(typeof value==='string','invalid repair path');relativePath(value);return value;});
 requirePublication(new Set(paths).size===paths.length,'duplicate reviewed repair paths');
 return {schemaVersion:1,batchId:batchId(input.batchId),previousRevision:commit(input.previousRevision),revision:commit(input.revision),reviewerId:input.reviewerId,reference:input.reference,paths,decision:'accepted'};
}
export const RollingPublicationRepairReviewReaders={V1:readRollingPublicationRepairReviewV1};
// Traceability: implements REQ-ROLLING-PUBLICATION-REPAIR
export function readRollingPublicationRepairV1(value:unknown):RollingPublicationRepairV1 {
 const input=record(value,['schemaVersion','id','batchId','review','previousCandidate','candidate']);
 requirePublication(input.schemaVersion===1,'unsupported publication repair version');
 const checkedRollingPublicationRepairReviewV1=readRollingPublicationRepairReviewV1(input.review);
 const previousRollingMainlineCandidateV1=readRollingMainlineCandidateV1(input.previousCandidate),repairedRollingMainlineCandidateV1=readRollingMainlineCandidateV1(input.candidate);
 const id=batchId(input.id),publicationBatchId=batchId(input.batchId);
 requirePublication(checkedRollingPublicationRepairReviewV1.batchId===publicationBatchId&&previousRollingMainlineCandidateV1.batchId===publicationBatchId&&repairedRollingMainlineCandidateV1.batchId===publicationBatchId
  &&checkedRollingPublicationRepairReviewV1.previousRevision===previousRollingMainlineCandidateV1.revision&&checkedRollingPublicationRepairReviewV1.revision===repairedRollingMainlineCandidateV1.revision
  &&previousRollingMainlineCandidateV1.rootPath===repairedRollingMainlineCandidateV1.rootPath&&previousRollingMainlineCandidateV1.sourceRevision===repairedRollingMainlineCandidateV1.sourceRevision
  &&previousRollingMainlineCandidateV1.mainlineRevision===repairedRollingMainlineCandidateV1.mainlineRevision,'repair differs from original candidate history');
 return {schemaVersion:1,id,batchId:publicationBatchId,review:checkedRollingPublicationRepairReviewV1,previousCandidate:previousRollingMainlineCandidateV1,candidate:repairedRollingMainlineCandidateV1};
}
export const RollingPublicationRepairReaders={V1:readRollingPublicationRepairV1};
// Traceability: implements REQ-ROLLING-PUBLICATION-REPAIR
export function validateRollingPublicationRepair(rollingPublicationBatchClaimV1:RollingPublicationBatchClaimV1,
 rollingMainlineCandidateV1:RollingMainlineCandidateV1,rollingPublicationRepairReviewV1:RollingPublicationRepairReviewV1):RollingMainlineCandidateV1 {
 const checkedRollingPublicationRepairReviewV1=readRollingPublicationRepairReviewV1(rollingPublicationRepairReviewV1);
 requirePublication(checkedRollingPublicationRepairReviewV1.batchId===rollingPublicationBatchClaimV1.id&&checkedRollingPublicationRepairReviewV1.previousRevision===rollingMainlineCandidateV1.revision
  &&checkedRollingPublicationRepairReviewV1.revision!==checkedRollingPublicationRepairReviewV1.previousRevision,'repair review differs from the retained failed candidate');
 const repairedRollingMainlineCandidateV1:RollingMainlineCandidateV1={...rollingMainlineCandidateV1,revision:checkedRollingPublicationRepairReviewV1.revision};
 verifyRollingMainlineCandidate(rollingPublicationBatchClaimV1,repairedRollingMainlineCandidateV1);
 git(repairedRollingMainlineCandidateV1.rootPath,['merge-base','--is-ancestor',checkedRollingPublicationRepairReviewV1.previousRevision,checkedRollingPublicationRepairReviewV1.revision]);
 const changedPaths=git(repairedRollingMainlineCandidateV1.rootPath,['diff','--name-only','-z',checkedRollingPublicationRepairReviewV1.previousRevision,checkedRollingPublicationRepairReviewV1.revision]).split('\0').filter(Boolean).sort();
 requirePublication(JSON.stringify(changedPaths)===JSON.stringify([...checkedRollingPublicationRepairReviewV1.paths].sort()),'repair diff differs from reviewed paths');
 const referencePath=path.join(repairedRollingMainlineCandidateV1.rootPath,checkedRollingPublicationRepairReviewV1.reference);
 requirePublication(fs.existsSync(referencePath)&&fs.lstatSync(referencePath).isFile()&&!fs.lstatSync(referencePath).isSymbolicLink(),'repair review reference is unavailable');
 return repairedRollingMainlineCandidateV1;
}
// Traceability: implements REQ-ROLLING-PUBLICATION
export function readRollingPublicationQaV1(value:unknown):RollingPublicationQaV1 {
 const qa = record(value,['schemaVersion','id','batchId','revision','configurationDigest','outcome','commands']);
 requirePublication(qa.schemaVersion === 1 && (qa.outcome === 'PASS' || qa.outcome === 'FAIL'),'unsupported publication QA outcome');
 requirePublication(typeof qa.configurationDigest === 'string' && /^[a-f0-9]{64}$/u.test(qa.configurationDigest),'invalid publication QA configuration digest');
 requirePublication(Array.isArray(qa.commands) && qa.commands.length > 0,'publication QA requires recorded commands');
 const commands = qa.commands.map((value:unknown):RollingPublicationCommandResult=> {
  const command = record(value,['argv','status','output']);
  requirePublication(isRollingArgv(command.argv) && (command.status === null || typeof command.status === 'number'
   && Number.isSafeInteger(command.status)) && typeof command.output === 'string','invalid publication QA command result');
  return {argv:command.argv,status:command.status,output:command.output};
 });
 requirePublication(qa.outcome !== 'PASS' || commands.every(command=>command.status === 0),'publication QA cannot pass a failed command');
 return {schemaVersion:1,id:batchId(qa.id),batchId:batchId(qa.batchId),revision:commit(qa.revision),configurationDigest:qa.configurationDigest,outcome:qa.outcome,commands};
}
export const RollingPublicationQaReaders = {V1:readRollingPublicationQaV1};
export function parseRollingPublicationQa(text:string):RollingPublicationQaV1 {
 return readRollingPublicationQaV1(parse(text,null,token=> {
  requirePublication(/^-?(0|[1-9][0-9]*)$/u.test(token),'publication QA numbers must be integer tokens');
  const number = Number(token);
  requirePublication(Number.isSafeInteger(number),'publication QA number exceeds the safe integer range');
  return number;
 }));
}
function publicationBranch(id:string):string {return `refs/heads/ponytail/publication/${batchId(id)}`;}
function cleanPublicationCheckout(rootPath:string):void {
 requirePublication(fs.realpathSync(rootPath) === rootPath && git(rootPath,['rev-parse','--show-toplevel']).trim() === rootPath,'publication checkout physical identity changed');
 requirePublication(git(rootPath,['status','--porcelain=v1','--untracked-files=all']).length === 0,'publication checkout has work to preserve');
}
// Traceability: implements REQ-ROLLING-PUBLICATION
// Caller journals PREPARING before fetch, then this immutable preparation before
// creating or merging the publication branch. Published campaign refs stay put.
export function prepareRollingMainline(rollingPublicationBatchClaimV1:RollingPublicationBatchClaimV1):RollingMainlinePreparationV1 {
 const checkedRollingPublicationBatchClaimV1 = readRollingPublicationBatchClaimV1(rollingPublicationBatchClaimV1);
 const rootPath = checkedRollingPublicationBatchClaimV1.rootPath;
 cleanPublicationCheckout(rootPath);
 requirePublication(git(rootPath,['symbolic-ref','HEAD']).trim() === `refs/heads/${checkedRollingPublicationBatchClaimV1.incrementRef}`,'publication must begin on its configured campaign branch');
 requirePublication(gitResult(rootPath,['show-ref','--verify','--quiet',publicationBranch(checkedRollingPublicationBatchClaimV1.id)]).status === 1,
  'publication branch already exists; reconcile its retained intent instead of replacing it');
 const sourceRevision = commit(git(rootPath,['rev-parse','HEAD']).trim());
 git(rootPath,['merge-base','--is-ancestor',checkedRollingPublicationBatchClaimV1.campaignRevision,sourceRevision]);
 const remoteRef = `refs/remotes/${checkedRollingPublicationBatchClaimV1.target.remote}/${checkedRollingPublicationBatchClaimV1.target.branch}`;
 git(rootPath,['fetch','--no-tags','--',checkedRollingPublicationBatchClaimV1.target.remote,`refs/heads/${checkedRollingPublicationBatchClaimV1.target.branch}:${remoteRef}`]);
 return readRollingMainlinePreparationV1({schemaVersion:1,batchId:checkedRollingPublicationBatchClaimV1.id,rootPath,sourceRevision,
  mainlineRevision:commit(git(rootPath,['rev-parse',`${remoteRef}^{commit}`]).trim())});
}
// Traceability: implements REQ-ROLLING-PUBLICATION
export function mergeRollingMainline(rollingPublicationBatchClaimV1:RollingPublicationBatchClaimV1,
 rollingMainlinePreparationV1:RollingMainlinePreparationV1):RollingMainlineCandidateV1 {
 const checkedRollingPublicationBatchClaimV1 = readRollingPublicationBatchClaimV1(rollingPublicationBatchClaimV1);
 const checkedRollingMainlinePreparationV1 = readRollingMainlinePreparationV1(rollingMainlinePreparationV1);
 requirePublication(checkedRollingMainlinePreparationV1.batchId === checkedRollingPublicationBatchClaimV1.id
  && checkedRollingMainlinePreparationV1.rootPath === checkedRollingPublicationBatchClaimV1.rootPath,'mainline preparation differs from its frozen batch');
 const rootPath = checkedRollingMainlinePreparationV1.rootPath;
 cleanPublicationCheckout(rootPath);
 requirePublication(git(rootPath,['symbolic-ref','HEAD']).trim() === `refs/heads/${checkedRollingPublicationBatchClaimV1.incrementRef}`
  && git(rootPath,['rev-parse','HEAD']).trim() === checkedRollingMainlinePreparationV1.sourceRevision,'campaign checkout changed after publication preparation');
 git(rootPath,['checkout','-b',publicationBranch(checkedRollingPublicationBatchClaimV1.id).slice('refs/heads/'.length),checkedRollingPublicationBatchClaimV1.campaignRevision]);
 // A merge preserves every already published campaign commit; never replay or
 // rewrite the campaign branch. Textual conflicts remain in this owned branch.
 git(rootPath,['merge','--no-edit','--no-ff',checkedRollingMainlinePreparationV1.mainlineRevision]);
 return observeRollingMainlineCandidate(checkedRollingPublicationBatchClaimV1,checkedRollingMainlinePreparationV1);
}
// Traceability: implements REQ-ROLLING-PUBLICATION
// Observe the original journaled merge after a lost acknowledgement. Do not
// recreate its branch or repeat a merge whose outcome has not been reconciled.
export function observeRollingMainlineCandidate(rollingPublicationBatchClaimV1:RollingPublicationBatchClaimV1,
 rollingMainlinePreparationV1:RollingMainlinePreparationV1):RollingMainlineCandidateV1 {
 const checkedRollingMainlinePreparationV1 = readRollingMainlinePreparationV1(rollingMainlinePreparationV1);
 const rollingMainlineCandidateV1 = readRollingMainlineCandidateV1({...checkedRollingMainlinePreparationV1,
  revision:git(checkedRollingMainlinePreparationV1.rootPath,['rev-parse','HEAD']).trim()});
 verifyRollingMainlineCandidate(rollingPublicationBatchClaimV1,rollingMainlineCandidateV1);
 return rollingMainlineCandidateV1;
}
// Traceability: implements REQ-ROLLING-PUBLICATION
export function verifyRollingMainlineCandidate(rollingPublicationBatchClaimV1:RollingPublicationBatchClaimV1,
 rollingMainlineCandidateV1:RollingMainlineCandidateV1):void {
 const checkedRollingPublicationBatchClaimV1 = readRollingPublicationBatchClaimV1(rollingPublicationBatchClaimV1);
 const checkedRollingMainlineCandidateV1 = readRollingMainlineCandidateV1(rollingMainlineCandidateV1);
 requirePublication(checkedRollingMainlineCandidateV1.batchId === checkedRollingPublicationBatchClaimV1.id
  && checkedRollingMainlineCandidateV1.rootPath === checkedRollingPublicationBatchClaimV1.rootPath,'candidate differs from its publication batch');
 const rootPath = checkedRollingMainlineCandidateV1.rootPath;
 cleanPublicationCheckout(rootPath);
 requirePublication(git(rootPath,['symbolic-ref','HEAD']).trim() === publicationBranch(checkedRollingPublicationBatchClaimV1.id)
  && git(rootPath,['rev-parse','HEAD']).trim() === checkedRollingMainlineCandidateV1.revision,'publication candidate checkout changed');
 requirePublication(git(rootPath,['rev-parse',`refs/heads/${checkedRollingPublicationBatchClaimV1.incrementRef}`]).trim() === checkedRollingMainlineCandidateV1.sourceRevision,
  'publication altered or lost its retained campaign history');
 for (const revision of [checkedRollingPublicationBatchClaimV1.campaignRevision,checkedRollingMainlineCandidateV1.mainlineRevision,
  ...checkedRollingPublicationBatchClaimV1.increments.map(item=>item.revision)]) git(rootPath,['merge-base','--is-ancestor',revision,checkedRollingMainlineCandidateV1.revision]);
}
// Traceability: implements REQ-ROLLING-PUBLICATION
export function runRollingPublicationQa(rollingPublicationBatchClaimV1:RollingPublicationBatchClaimV1,
 rollingMainlineCandidateV1:RollingMainlineCandidateV1,id:string,configurationDigest:string,requiredCommands:readonly RollingArgv[]):RollingPublicationQaV1 {
 verifyRollingMainlineCandidate(rollingPublicationBatchClaimV1,rollingMainlineCandidateV1);
 const rollingPublicationQaJobV1 = readRollingPublicationQaJobV1({schemaVersion:1,id,batchId:rollingPublicationBatchClaimV1.id,
  revision:rollingMainlineCandidateV1.revision,configurationDigest,commands:requiredCommands});
 const commands:RollingPublicationCommandResult[] = [];
 for (const argv of rollingPublicationQaJobV1.commands) {
  const spawnSyncReturns = spawnSync(argv[0],argv.slice(1),{cwd:rollingMainlineCandidateV1.rootPath,encoding:'utf8'});
  commands.push({argv,status:spawnSyncReturns.status,output:(spawnSyncReturns.stdout ?? '')+(spawnSyncReturns.stderr ?? '')+(spawnSyncReturns.error?.message ?? '')});
  // An error, signal, failed test or changed input never becomes passing proof.
  if (spawnSyncReturns.error || spawnSyncReturns.status !== 0) return readRollingPublicationQaV1({schemaVersion:1,id,
   batchId:rollingPublicationBatchClaimV1.id,revision:rollingMainlineCandidateV1.revision,configurationDigest,outcome:'FAIL',commands});
  verifyRollingMainlineCandidate(rollingPublicationBatchClaimV1,rollingMainlineCandidateV1);
 }
 return readRollingPublicationQaV1({schemaVersion:1,id,batchId:rollingPublicationBatchClaimV1.id,revision:rollingMainlineCandidateV1.revision,
  configurationDigest,outcome:'PASS',commands});
}
// Traceability: implements REQ-ROLLING-PUBLICATION
export function verifyRollingPublicationQa(rollingPublicationBatchClaimV1:RollingPublicationBatchClaimV1,
 rollingMainlineCandidateV1:RollingMainlineCandidateV1,rollingPublicationQaV1:RollingPublicationQaV1,
 configurationDigest:string,requiredCommands:readonly RollingArgv[]):void {
 const checkedRollingPublicationQaV1 = readRollingPublicationQaV1(rollingPublicationQaV1);
 verifyRollingMainlineCandidate(rollingPublicationBatchClaimV1,rollingMainlineCandidateV1);
 requirePublication(checkedRollingPublicationQaV1.batchId === rollingPublicationBatchClaimV1.id
  && checkedRollingPublicationQaV1.revision === rollingMainlineCandidateV1.revision && checkedRollingPublicationQaV1.configurationDigest === configurationDigest,
  'publication QA belongs to stale or different candidate inputs');
 requirePublication(checkedRollingPublicationQaV1.outcome === 'PASS' && requiredCommands.length > 0
  && JSON.stringify(checkedRollingPublicationQaV1.commands.map(command=>command.argv)) === JSON.stringify(requiredCommands),
  'all required full publication QA must pass on the exact candidate');
}

export interface RollingPublicationQaJobV1 {
 readonly schemaVersion:1;
 readonly id:string;
 readonly batchId:string;
 readonly revision:string;
 readonly configurationDigest:string;
 readonly commands:readonly RollingArgv[];
}
// Traceability: implements REQ-ROLLING-PUBLICATION
export function readRollingPublicationQaJobV1(value:unknown):RollingPublicationQaJobV1 {
 const job = record(value,['schemaVersion','id','batchId','revision','configurationDigest','commands']);
 requirePublication(job.schemaVersion === 1,'unsupported publication QA job version');
 requirePublication(typeof job.configurationDigest === 'string' && /^[a-f0-9]{64}$/u.test(job.configurationDigest),'invalid QA job input digest');
 requirePublication(Array.isArray(job.commands) && job.commands.length > 0 && job.commands.every(isRollingArgv),'QA job requires its complete configured command profile');
 return {schemaVersion:1,id:batchId(job.id),batchId:batchId(job.batchId),revision:commit(job.revision),configurationDigest:job.configurationDigest,commands:job.commands};
}
export const RollingPublicationQaJobReaders = {V1:readRollingPublicationQaJobV1};

export interface RollingMainlinePublicationV1 {
 readonly schemaVersion:1;
 readonly id:string;
 readonly batchId:string;
 readonly result:RollingIncrementPublicationResult;
}
// Traceability: implements REQ-ROLLING-PUBLICATION
export function readRollingMainlinePublicationV1(value:unknown):RollingMainlinePublicationV1 {
 const publication = record(value,['schemaVersion','id','batchId','result']);
 requirePublication(publication.schemaVersion === 1,'unsupported mainline publication version');
 return {schemaVersion:1,id:batchId(publication.id),batchId:batchId(publication.batchId),result:readRollingIncrementPublicationResult(publication.result)};
}
export const RollingMainlinePublicationReaders = {V1:readRollingMainlinePublicationV1};

// Traceability: implements REQ-ROLLING-PUBLICATION
export function synchronizeRollingCampaign(rollingPublicationBatchClaimV1:RollingPublicationBatchClaimV1,
 rollingMainlineCandidateV1:RollingMainlineCandidateV1,rollingMainlinePublicationV1:RollingMainlinePublicationV1):RollingIncrementPublicationResult {
 const checkedRollingPublicationBatchClaimV1 = readRollingPublicationBatchClaimV1(rollingPublicationBatchClaimV1);
 const checkedRollingMainlineCandidateV1 = readRollingMainlineCandidateV1(rollingMainlineCandidateV1);
 const checkedRollingMainlinePublicationV1 = readRollingMainlinePublicationV1(rollingMainlinePublicationV1);
 requirePublication(checkedRollingMainlinePublicationV1.batchId === checkedRollingPublicationBatchClaimV1.id
  && checkedRollingMainlinePublicationV1.result.state === 'PUBLISHED'
  && checkedRollingMainlinePublicationV1.result.revision === checkedRollingMainlineCandidateV1.revision,'campaign synchronization requires observed mainline publication');
 const rootPath = checkedRollingPublicationBatchClaimV1.rootPath;
 cleanPublicationCheckout(rootPath);
 const campaignRef = `refs/heads/${checkedRollingPublicationBatchClaimV1.incrementRef}`;
 const currentRef = git(rootPath,['symbolic-ref','HEAD']).trim();
 if (currentRef === publicationBranch(checkedRollingPublicationBatchClaimV1.id)) {
  verifyRollingMainlineCandidate(checkedRollingPublicationBatchClaimV1,checkedRollingMainlineCandidateV1);
  git(rootPath,['switch',checkedRollingPublicationBatchClaimV1.incrementRef]);
 } else requirePublication(currentRef === campaignRef,'synchronization checkout is neither its retained candidate nor campaign');
 const revision = commit(git(rootPath,['rev-parse','HEAD']).trim());
 git(rootPath,['merge-base','--is-ancestor',checkedRollingMainlineCandidateV1.sourceRevision,revision]);
 const containment = gitResult(rootPath,['merge-base','--is-ancestor',checkedRollingMainlinePublicationV1.result.remoteRevision,revision]);
 if (containment.status !== 0) {
  requirePublication(containment.status === 1 && revision === checkedRollingMainlineCandidateV1.sourceRevision,
   'campaign synchronization contains unexpected work; preserve it for reconciliation');
  git(rootPath,['merge','--no-edit','--no-ff',checkedRollingMainlinePublicationV1.result.remoteRevision]);
 }
 const synchronizedRevision = commit(git(rootPath,['rev-parse','HEAD']).trim());
 cleanPublicationCheckout(rootPath);
 return publishRollingIncrement({rootPath,target:{remote:checkedRollingPublicationBatchClaimV1.target.remote,
  branch:checkedRollingPublicationBatchClaimV1.incrementRef},revision:synchronizedRevision});
}

export interface RollingMainlineRefreshIntentV1 {
 readonly schemaVersion:1;
 readonly id:string;
 readonly batchId:string;
 readonly previousCandidate:RollingMainlineCandidateV1;
}
export interface RollingMainlineRefreshPreparationV1 extends RollingMainlineRefreshIntentV1 {
 readonly mainlineRevision:string;
}
export interface RollingMainlineRefreshResultV1 {
 readonly schemaVersion:1;
 readonly id:string;
 readonly batchId:string;
 readonly candidate:RollingMainlineCandidateV1;
}
// Traceability: implements REQ-ROLLING-PUBLICATION
export function readRollingMainlineRefreshIntentV1(value:unknown):RollingMainlineRefreshIntentV1 {
 const refresh = record(value,['schemaVersion','id','batchId','previousCandidate']);
 requirePublication(refresh.schemaVersion === 1,'unsupported mainline refresh intent version');
 const previousRollingMainlineCandidateV1 = readRollingMainlineCandidateV1(refresh.previousCandidate);
 requirePublication(previousRollingMainlineCandidateV1.batchId === refresh.batchId,'refresh candidate belongs to a different batch');
 return {schemaVersion:1,id:batchId(refresh.id),batchId:batchId(refresh.batchId),previousCandidate:previousRollingMainlineCandidateV1};
}
export const RollingMainlineRefreshIntentReaders = {V1:readRollingMainlineRefreshIntentV1};
// Traceability: implements REQ-ROLLING-PUBLICATION
export function readRollingMainlineRefreshPreparationV1(value:unknown):RollingMainlineRefreshPreparationV1 {
 const preparation = record(value,['schemaVersion','id','batchId','previousCandidate','mainlineRevision']);
 const rollingMainlineRefreshIntentV1 = readRollingMainlineRefreshIntentV1({schemaVersion:preparation.schemaVersion,id:preparation.id,
  batchId:preparation.batchId,previousCandidate:preparation.previousCandidate});
 return {...rollingMainlineRefreshIntentV1,mainlineRevision:commit(preparation.mainlineRevision)};
}
export const RollingMainlineRefreshPreparationReaders = {V1:readRollingMainlineRefreshPreparationV1};
// Traceability: implements REQ-ROLLING-PUBLICATION
export function readRollingMainlineRefreshResultV1(value:unknown):RollingMainlineRefreshResultV1 {
 const result = record(value,['schemaVersion','id','batchId','candidate']);
 requirePublication(result.schemaVersion === 1,'unsupported mainline refresh result version');
 const rollingMainlineCandidateV1 = readRollingMainlineCandidateV1(result.candidate);
 requirePublication(rollingMainlineCandidateV1.batchId === result.batchId,'refresh result belongs to a different batch');
 return {schemaVersion:1,id:batchId(result.id),batchId:batchId(result.batchId),candidate:rollingMainlineCandidateV1};
}
export const RollingMainlineRefreshResultReaders = {V1:readRollingMainlineRefreshResultV1};
// Traceability: implements REQ-ROLLING-PUBLICATION
export function prepareRollingMainlineRefresh(rollingPublicationBatchClaimV1:RollingPublicationBatchClaimV1,
 rollingMainlineRefreshIntentV1:RollingMainlineRefreshIntentV1):RollingMainlineRefreshPreparationV1 {
 const checkedRollingMainlineRefreshIntentV1 = readRollingMainlineRefreshIntentV1(rollingMainlineRefreshIntentV1);
 verifyRollingMainlineCandidate(rollingPublicationBatchClaimV1,checkedRollingMainlineRefreshIntentV1.previousCandidate);
 const rootPath = rollingPublicationBatchClaimV1.rootPath;
 const remoteRef = `refs/remotes/${rollingPublicationBatchClaimV1.target.remote}/${rollingPublicationBatchClaimV1.target.branch}`;
 git(rootPath,['fetch','--no-tags','--',rollingPublicationBatchClaimV1.target.remote,`refs/heads/${rollingPublicationBatchClaimV1.target.branch}:${remoteRef}`]);
 const mainlineRevision = commit(git(rootPath,['rev-parse',`${remoteRef}^{commit}`]).trim());
 git(rootPath,['merge-base','--is-ancestor',checkedRollingMainlineRefreshIntentV1.previousCandidate.mainlineRevision,mainlineRevision]);
 return readRollingMainlineRefreshPreparationV1({...checkedRollingMainlineRefreshIntentV1,mainlineRevision});
}
// Traceability: implements REQ-ROLLING-PUBLICATION
export function mergeRollingMainlineRefresh(rollingPublicationBatchClaimV1:RollingPublicationBatchClaimV1,
 rollingMainlineRefreshPreparationV1:RollingMainlineRefreshPreparationV1):RollingMainlineRefreshResultV1 {
 const checkedRollingMainlineRefreshPreparationV1 = readRollingMainlineRefreshPreparationV1(rollingMainlineRefreshPreparationV1);
 verifyRollingMainlineCandidate(rollingPublicationBatchClaimV1,checkedRollingMainlineRefreshPreparationV1.previousCandidate);
 git(rollingPublicationBatchClaimV1.rootPath,['merge','--no-edit','--no-ff',checkedRollingMainlineRefreshPreparationV1.mainlineRevision]);
 return observeRollingMainlineRefresh(rollingPublicationBatchClaimV1,checkedRollingMainlineRefreshPreparationV1);
}
// Traceability: implements REQ-ROLLING-PUBLICATION
export function observeRollingMainlineRefresh(rollingPublicationBatchClaimV1:RollingPublicationBatchClaimV1,
 rollingMainlineRefreshPreparationV1:RollingMainlineRefreshPreparationV1):RollingMainlineRefreshResultV1 {
 const checkedRollingMainlineRefreshPreparationV1 = readRollingMainlineRefreshPreparationV1(rollingMainlineRefreshPreparationV1);
 const rollingMainlineCandidateV1 = readRollingMainlineCandidateV1({schemaVersion:1,batchId:checkedRollingMainlineRefreshPreparationV1.batchId,
  rootPath:checkedRollingMainlineRefreshPreparationV1.previousCandidate.rootPath,
  sourceRevision:checkedRollingMainlineRefreshPreparationV1.previousCandidate.sourceRevision,
  mainlineRevision:checkedRollingMainlineRefreshPreparationV1.mainlineRevision,
  revision:git(rollingPublicationBatchClaimV1.rootPath,['rev-parse','HEAD']).trim()});
 verifyRollingMainlineCandidate(rollingPublicationBatchClaimV1,rollingMainlineCandidateV1);
 git(rollingPublicationBatchClaimV1.rootPath,['merge-base','--is-ancestor',checkedRollingMainlineRefreshPreparationV1.previousCandidate.revision,rollingMainlineCandidateV1.revision]);
 return readRollingMainlineRefreshResultV1({schemaVersion:1,id:checkedRollingMainlineRefreshPreparationV1.id,batchId:checkedRollingMainlineRefreshPreparationV1.batchId,candidate:rollingMainlineCandidateV1});
}
