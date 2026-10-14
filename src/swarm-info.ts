// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import {Pool} from 'pg';
import {databaseOptions} from './project-index-database.js';
import {git} from './rolling-integration.js';
import {resolveSwarmOwner,type SwarmOwnershipInventory} from './swarm-owner.js';
import {renderCliHelp} from './cli-help.js';
import type {RollingStoredWorktree} from './rolling-campaign-store.js';
import {SwarmStore,type SwarmWorktreeMembership,type SwarmWorktreeDeletionResult,readWorker,swarmWorkerName,type SwarmWorkerAssignment,type SwarmWorkerBinding} from './swarm-store.js';
import {RollingCodex} from './rolling-codex.js';
import type {SwarmUserWorktree} from './swarm-owner.js';

export interface SwarmWorktreeInfoV1 {
 readonly number:number;
 readonly rootPath:string;
 readonly present:boolean;
 readonly state:RollingStoredWorktree['state'];
 readonly assignmentId:string;
 readonly campaignId:string;
 readonly obligationId:string;
 readonly sessionId:string|null;
}
export interface SwarmInfoV1 {
 readonly schemaVersion:1;
 readonly ownerRoot:string;
 readonly ownershipSource:'campaign-leases';
 readonly coordinator:{readonly kind:'unrecorded'};
 readonly nativeActivity:'unobserved';
 readonly worktrees:readonly SwarmWorktreeInfoV1[];
}
export type SwarmCoordinator = {readonly kind:'unrecorded'}|{readonly kind:'unbound'}|{readonly kind:'bound';readonly sessionId:string;readonly threadId:string|null};
export interface SwarmInfoV2 {
 readonly schemaVersion:2;
 readonly ownerRoot:string;
 readonly ownershipSource:'campaign-leases'|'swarm-owners-and-campaign-leases';
 readonly coordinator:SwarmCoordinator;
 readonly nativeActivity:'unobserved';
 readonly worktrees:readonly SwarmWorktreeInfoV1[];
}
export interface SwarmWorktreeInfoV3 {
 readonly number:number;
 readonly rootPath:string;
 readonly present:boolean;
 readonly state:RollingStoredWorktree['state'];
 readonly membership:{readonly kind:'campaign-lease'}|{readonly kind:'swarm';readonly generation:string};
 readonly assignment:{readonly assignmentId:string;readonly campaignId:string;readonly obligationId:string;readonly sessionId:string|null}|null;
}
export interface SwarmInfoV3 {
 readonly schemaVersion:3;
 readonly ownerRoot:string;
 readonly ownershipSource:'campaign-leases'|'swarm-owners-and-campaign-leases';
 readonly coordinator:SwarmCoordinator;
 readonly nativeActivity:'unobserved';
 readonly worktrees:readonly SwarmWorktreeInfoV3[];
}
export type SwarmNativeObservation={readonly kind:'unobserved'}|{readonly kind:'unavailable';readonly reason:string}
 |{readonly kind:'observed';readonly name:string|null;readonly status:'idle'|'active'|'notLoaded'|'systemError'};
export interface SwarmWorkerInfoV1 {
 readonly binding:SwarmWorkerBinding;
 readonly desiredName:string;
 readonly nativeObservation:SwarmNativeObservation;
}
export interface SwarmInfoV4 {
 readonly schemaVersion:4;
 readonly ownerRoot:string;
 readonly ownershipSource:'campaign-leases'|'swarm-owners-and-campaign-leases';
 readonly coordinator:SwarmCoordinator;
 readonly nativeActivity:'unobserved'|'worker-observations';
 readonly worktrees:readonly SwarmWorktreeInfoV3[];
 readonly workers:readonly SwarmWorkerInfoV1[];
}
export interface SwarmWorktreeDeletionReportV1 {
 readonly schemaVersion:1;
 readonly ownerRoot:string;
 readonly results:readonly SwarmWorktreeDeletionResult[];
}
export function readSwarmWorktreeDeletionReportV1(value:unknown):SwarmWorktreeDeletionReportV1 {
 const input=record(value);keys(input,['schemaVersion','ownerRoot','results']);
 if(input.schemaVersion!==1||!Array.isArray(input.results)) throw new Error('swarm: unsupported deletion report');
 return {schemaVersion:1,ownerRoot:absoluteRoot(input.ownerRoot),results:input.results.map((value:unknown)=>{
  const input=record(value);
  const number=integer(input.number),rootPath=absoluteRoot(input.rootPath);
  switch(input.outcome) {
   case 'deleted':keys(input,['number','rootPath','outcome']);return {number,rootPath,outcome:'deleted'};
   case 'retained':case 'protected':keys(input,['number','rootPath','outcome','reason']);return {number,rootPath,outcome:input.outcome,reason:text(input.reason)};
   default:throw new Error('swarm: unsupported deletion outcome');
  }
 })};
}
export const SwarmWorktreeDeletionReportReaders={V1:readSwarmWorktreeDeletionReportV1};
function isRecord(value:unknown):value is Record<string,unknown> {return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function record(value:unknown):Record<string,unknown> {
 if(!isRecord(value)) throw new Error('swarm: expected a record');
 return value;
}
function text(value:unknown):string {
 if(typeof value!=='string'||value.length===0) throw new Error('swarm: expected a nonempty string');
 return value;
}
function nullableText(value:unknown):string|null {return value===null?null:text(value);}
function absoluteRoot(value:unknown):string {
 const rootPath=text(value);
 if(!path.isAbsolute(rootPath)||path.normalize(rootPath)!==rootPath) throw new Error('swarm: expected a canonical absolute root');
 return rootPath;
}
function worktreeState(value:unknown):RollingStoredWorktree['state'] {
 switch(value) {
  case 'AVAILABLE':case 'PROVISIONING':case 'RESERVED':case 'ACTIVE':case 'QUARANTINED':return value;
  default:throw new Error('swarm: invalid managed checkout state');
 }
}
function integer(value:unknown):number {
 const number=typeof value==='string'&&/^[1-9][0-9]*$/u.test(value)?Number(value):value;
 if(typeof number!=='number'||!Number.isSafeInteger(number)||number<101) throw new Error('swarm: invalid managed worktree number');
 return number;
}
function keys(value:Record<string,unknown>,expected:readonly string[]):void {
 if(JSON.stringify(Object.keys(value).sort())!==JSON.stringify([...expected].sort())) throw new Error('swarm: unexpected record fields');
}
export function readSwarmInfoV1(value:unknown):SwarmInfoV1 {
 const input=record(value);
 keys(input,['schemaVersion','ownerRoot','ownershipSource','coordinator','nativeActivity','worktrees']);
 if(input.schemaVersion!==1||input.ownershipSource!=='campaign-leases'||input.nativeActivity!=='unobserved') throw new Error('swarm: unsupported inventory version/source');
 const coordinator=record(input.coordinator);keys(coordinator,['kind']);
 if(coordinator.kind!=='unrecorded'||!Array.isArray(input.worktrees)) throw new Error('swarm: invalid coordinator or worktree inventory');
 return {schemaVersion:1,ownerRoot:absoluteRoot(input.ownerRoot),ownershipSource:'campaign-leases',coordinator:{kind:'unrecorded'},nativeActivity:'unobserved',
  worktrees:input.worktrees.map((value:unknown)=>{
   const input=record(value);keys(input,['number','rootPath','present','state','assignmentId','campaignId','obligationId','sessionId']);
   if(typeof input.present!=='boolean') throw new Error('swarm: invalid physical-presence observation');
   return {number:integer(input.number),rootPath:absoluteRoot(input.rootPath),present:input.present,state:worktreeState(input.state),
    assignmentId:text(input.assignmentId),campaignId:text(input.campaignId),obligationId:text(input.obligationId),sessionId:nullableText(input.sessionId)};
  })};
}
export function readSwarmInfoV2(value:unknown):SwarmInfoV2 {
 const input=record(value);
 keys(input,['schemaVersion','ownerRoot','ownershipSource','coordinator','nativeActivity','worktrees']);
 if(input.schemaVersion!==2||(input.ownershipSource!=='campaign-leases'&&input.ownershipSource!=='swarm-owners-and-campaign-leases')) throw new Error('swarm: unsupported inventory version/source');
 const coordinator=record(input.coordinator);
 let swarmCoordinator:SwarmCoordinator;
 switch(coordinator.kind) {
  case 'unrecorded':case 'unbound':keys(coordinator,['kind']);swarmCoordinator={kind:coordinator.kind};break;
  case 'bound':keys(coordinator,['kind','sessionId','threadId']);swarmCoordinator={kind:'bound',sessionId:text(coordinator.sessionId),threadId:nullableText(coordinator.threadId)};break;
  default:throw new Error('swarm: unsupported coordinator binding');
 }
 const swarmInfoV1=readSwarmInfoV1({...input,schemaVersion:1,ownershipSource:'campaign-leases',coordinator:{kind:'unrecorded'}});
 return {...swarmInfoV1,schemaVersion:2,ownershipSource:input.ownershipSource,coordinator:swarmCoordinator};
}
function normalizeSwarmInfoV2(swarmInfoV2:SwarmInfoV2):SwarmInfoV3 {
 return {...swarmInfoV2,schemaVersion:3,worktrees:swarmInfoV2.worktrees.map(worktree=>({number:worktree.number,rootPath:worktree.rootPath,
  present:worktree.present,state:worktree.state,membership:{kind:'campaign-lease'},assignment:{assignmentId:worktree.assignmentId,
   campaignId:worktree.campaignId,obligationId:worktree.obligationId,sessionId:worktree.sessionId}}))};
}
export function readSwarmInfoV3(value:unknown):SwarmInfoV3 {
 const input=record(value);keys(input,['schemaVersion','ownerRoot','ownershipSource','coordinator','nativeActivity','worktrees']);
 if(input.schemaVersion!==3||!Array.isArray(input.worktrees)) throw new Error('swarm: unsupported inventory version');
 const swarmInfoV2=readSwarmInfoV2({...input,schemaVersion:2,worktrees:[]});
 return {...swarmInfoV2,schemaVersion:3,worktrees:input.worktrees.map((value:unknown)=>{
  const input=record(value);keys(input,['number','rootPath','present','state','membership','assignment']);
  if(typeof input.present!=='boolean') throw new Error('swarm: invalid physical-presence observation');
  const membership=record(input.membership);
  let swarmWorktreeMembership:SwarmWorktreeInfoV3['membership'];
  switch(membership.kind) {
   case 'campaign-lease':keys(membership,['kind']);swarmWorktreeMembership={kind:'campaign-lease'};break;
   case 'swarm':keys(membership,['kind','generation']);swarmWorktreeMembership={kind:'swarm',generation:text(membership.generation)};break;
   default:throw new Error('swarm: invalid worktree membership');
  }
  let assignment:SwarmWorktreeInfoV3['assignment']=null;
  if(input.assignment!==null) {
   const value=record(input.assignment);keys(value,['assignmentId','campaignId','obligationId','sessionId']);
   assignment={assignmentId:text(value.assignmentId),campaignId:text(value.campaignId),obligationId:text(value.obligationId),sessionId:nullableText(value.sessionId)};
  }
  if(swarmWorktreeMembership.kind==='campaign-lease'&&assignment===null) throw new Error('swarm: campaign membership requires an assignment');
  return {number:integer(input.number),rootPath:absoluteRoot(input.rootPath),present:input.present,state:worktreeState(input.state),membership:swarmWorktreeMembership,assignment};
 })};
}
function workerBinding(value:unknown):SwarmWorkerBinding {
 const input=record(value);keys(input,['sessionId','threadId','ownerRoot','rootPath','worktreeNumber','worktreeGeneration','generation','workerNumber','shortAssignmentNumber','assignment','state','completed']);
 const assignment=record(input.assignment);keys(assignment,['kind','id','summary']);
 return readWorker({session_id:text(input.sessionId),thread_id:text(input.threadId),owner_root:absoluteRoot(input.ownerRoot),root_path:absoluteRoot(input.rootPath),
  worktree_number:integer(input.worktreeNumber),worktree_generation:text(input.worktreeGeneration),generation:text(input.generation),worker_number:input.workerNumber,
  short_assignment_number:input.shortAssignmentNumber,assignment_kind:assignment.kind,assignment_id:text(assignment.id),summary:text(assignment.summary),state:input.state,completed:input.completed});
}
function nativeObservation(value:unknown):SwarmNativeObservation {
 const input=record(value);
 switch(input.kind) {
  case 'unobserved':keys(input,['kind']);return {kind:'unobserved'};
  case 'unavailable':keys(input,['kind','reason']);return {kind:'unavailable',reason:text(input.reason)};
  case 'observed':{
   keys(input,['kind','name','status']);
   const status=input.status;
   if(status!=='idle'&&status!=='active'&&status!=='notLoaded'&&status!=='systemError') throw new Error('swarm: unsupported native observation');
   return {kind:'observed',name:input.name===null?null:typeof input.name==='string'?input.name:text(input.name),status};
  }
  default:throw new Error('swarm: unsupported native observation');
 }
}
export function readSwarmInfoV4(value:unknown):SwarmInfoV4 {
 const input=record(value);keys(input,['schemaVersion','ownerRoot','ownershipSource','coordinator','nativeActivity','worktrees','workers']);
 if(input.schemaVersion!==4||!Array.isArray(input.workers)||input.nativeActivity!=='unobserved'&&input.nativeActivity!=='worker-observations') throw new Error('swarm: unsupported inventory version');
 const {workers,...base}=input;
 const swarmInfoV3=readSwarmInfoV3({...base,schemaVersion:3,nativeActivity:'unobserved'});
 return {...swarmInfoV3,schemaVersion:4,nativeActivity:input.nativeActivity,workers:workers.map((value:unknown)=>{
  const input=record(value);keys(input,['binding','desiredName','nativeObservation']);
  const swarmWorkerBinding=workerBinding(input.binding);
  if(swarmWorkerBinding.ownerRoot!==swarmInfoV3.ownerRoot||swarmWorkerBinding.state==='REMOVED'||input.desiredName!==swarmWorkerName(swarmWorkerBinding)) throw new Error('swarm: inconsistent current worker inventory');
  return {binding:swarmWorkerBinding,desiredName:text(input.desiredName),nativeObservation:nativeObservation(input.nativeObservation)};
 })};
}
export const SwarmInfoReaders={V1:readSwarmInfoV1,V2:readSwarmInfoV2,V3:readSwarmInfoV3,V4:readSwarmInfoV4};
export function readSwarmInfo(value:unknown):SwarmInfoV4 {
 const input=record(value);
 switch(input.schemaVersion) {
  case 1:return {...normalizeSwarmInfoV2({...readSwarmInfoV1(input),schemaVersion:2}),schemaVersion:4,workers:[]};
  case 2:return {...normalizeSwarmInfoV2(readSwarmInfoV2(input)),schemaVersion:4,workers:[]};
  case 3:return {...readSwarmInfoV3(input),schemaVersion:4,workers:[]};
  case 4:return readSwarmInfoV4(input);
  default:throw new Error('swarm: unsupported inventory version');
 }
}
// Traceability: implements REQ-SWARM-SESSIONS
export async function bindSwarmWorker(swarmStore:SwarmStore,swarmWorktreeMembership:SwarmWorktreeMembership,threadId:string,sessionId:string,swarmWorkerAssignment:SwarmWorkerAssignment,rollingCodex:Pick<RollingCodex,'readThreadIdentity'|'setThreadName'|'readThreadState'>):Promise<SwarmWorkerBinding> {
 const rollingNativeThreadIdentity=await rollingCodex.readThreadIdentity(threadId,swarmWorktreeMembership.rootPath);
 if(rollingNativeThreadIdentity.sessionId!==sessionId) throw new Error('swarm: observed native worker differs from requested session');
 const swarmWorkerBinding=await swarmStore.bindWorker(swarmWorktreeMembership,rollingNativeThreadIdentity,swarmWorkerAssignment);
 await rollingCodex.setThreadName(threadId,swarmWorkerName(swarmWorkerBinding));
 const rollingNativeThreadState=await rollingCodex.readThreadState(threadId,swarmWorktreeMembership.rootPath);
 if(rollingNativeThreadState.sessionId!==sessionId||rollingNativeThreadState.name!==swarmWorkerName(swarmWorkerBinding)) throw new Error('swarm: native worker name is not confirmed; retain binding for retry');
 return swarmWorkerBinding;
}
// Traceability: implements REQ-SWARM-INFO
export async function observeSwarmWorkers(swarmInfoV4:SwarmInfoV4,rollingCodex:Pick<RollingCodex,'readThreadState'>):Promise<SwarmInfoV4> {
 const workers=await Promise.all(swarmInfoV4.workers.map(async worker=>{
  let nativeObservation:SwarmNativeObservation;
  try {
   const rollingNativeThreadState=await rollingCodex.readThreadState(worker.binding.threadId,worker.binding.rootPath);
   if(rollingNativeThreadState.sessionId!==worker.binding.sessionId) throw new Error('swarm: native observation has a different original session');
   nativeObservation={kind:'observed',name:rollingNativeThreadState.name,status:rollingNativeThreadState.status};
  } catch(cause) {nativeObservation={kind:'unavailable',reason:cause instanceof Error?cause.message:String(cause)};}
  return {...worker,nativeObservation};
 }));
 return {...swarmInfoV4,nativeActivity:workers.length?'worker-observations':'unobserved',workers};
}
// Traceability: implements REQ-SWARM-OWNERSHIP
export async function bindSwarmCoordinator(swarmStore:SwarmStore,swarmUserWorktree:SwarmUserWorktree,threadId:string,sessionId:string,rollingCodex:Pick<RollingCodex,'readThreadIdentity'>):Promise<void> {
 const rollingNativeThreadIdentity=await rollingCodex.readThreadIdentity(threadId,swarmUserWorktree.rootPath);
 if(rollingNativeThreadIdentity.sessionId!==sessionId||rollingNativeThreadIdentity.threadId!==threadId||rollingNativeThreadIdentity.rootPath!==swarmUserWorktree.rootPath)
  throw new Error('swarm: observed native session identity differs from requested coordinator');
 await swarmStore.enrollOwner(swarmUserWorktree);
 await swarmStore.bindCoordinator(swarmUserWorktree.rootPath,rollingNativeThreadIdentity);
}

// Traceability: implements REQ-SWARM-OWNERSHIP
// Traceability: implements REQ-SWARM-INFO
export async function inspectSwarmInfo(invokingPath:string,pool:Pool,projectId:string):Promise<SwarmInfoV4> {
 const invokingRoot=fs.realpathSync(git(invokingPath,['rev-parse','--show-toplevel']).trim());
 const gitCommonDirectory=fs.realpathSync(git(invokingRoot,['rev-parse','--path-format=absolute','--git-common-dir']).trim());
 const physicalRoots=git(invokingRoot,['worktree','list','--porcelain','-z']).split('\0')
  .filter(field=>field.startsWith('worktree ')).map(field=>field.slice(9));
 const mainRoot=physicalRoots[0];
 if(mainRoot===undefined) throw new Error('swarm: repository has no main checkout');
 const poolClient=await pool.connect();
 try {
  await poolClient.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const users=(await poolClient.query<Record<string,unknown>>('SELECT DISTINCT coordinator_root FROM ponytail_index.rolling_campaign_v1 WHERE project_id=$1 ORDER BY coordinator_root',[projectId])).rows;
  const owners=(await poolClient.query<Record<string,unknown>>(`SELECT o.owner_root,o.git_common_directory,o.coordinator_session_id,n.thread_id
   FROM ponytail_index.swarm_owner_v1 o LEFT JOIN ponytail_index.swarm_native_session_v1 n ON n.session_id=o.coordinator_session_id AND n.project_id=o.project_id AND n.root_path=o.owner_root
   WHERE o.project_id=$1`,[projectId])).rows;
  const managed=(await poolClient.query<Record<string,unknown>>(`SELECT w.number,w.root_path,w.state,a.assignment_id,a.campaign_id,a.obligation_id,a.session_id,c.coordinator_root,s.owner_root,s.generation
   FROM ponytail_index.rolling_worktree_v1 w
   LEFT JOIN ponytail_index.rolling_assignment_v1 a ON a.project_id=w.project_id AND a.worktree_number=w.number AND a.state<>'RELEASED'
   LEFT JOIN ponytail_index.rolling_campaign_v1 c ON c.project_id=a.project_id AND c.campaign_id=a.campaign_id
   LEFT JOIN ponytail_index.swarm_worktree_v1 s ON s.project_id=w.project_id AND s.number=w.number
   WHERE w.project_id=$1 ORDER BY w.number`,[projectId])).rows;
  for(const row of managed) if(row.owner_root!==null&&row.coordinator_root!==null&&row.owner_root!==row.coordinator_root) throw new Error('swarm: checkout has conflicting swarm and campaign owners');
  const userRoots=[...new Set([mainRoot,...users.map(row=>text(row.coordinator_root)),...owners.map(row=>text(row.owner_root))])].filter(root=>physicalRoots.includes(root));
  const swarmOwnershipInventory:SwarmOwnershipInventory={userWorktrees:userRoots.map(rootPath=>({rootPath,gitCommonDirectory})),
   managedWorktrees:managed.filter(row=>physicalRoots.includes(text(row.root_path))).map(row=>({rootPath:text(row.root_path),ownerRoot:nullableText(row.owner_root??row.coordinator_root),gitCommonDirectory}))};
  const swarmUserWorktree=resolveSwarmOwner(invokingRoot,swarmOwnershipInventory);
  const owner=owners.find(row=>row.owner_root===swarmUserWorktree.rootPath);
  if(owner!==undefined&&owner.git_common_directory!==gitCommonDirectory) throw new Error('swarm: enrolled owner repository identity changed');
  const swarmCoordinator:SwarmCoordinator=owner===undefined?{kind:'unrecorded'}:owner.coordinator_session_id===null?{kind:'unbound'}:{kind:'bound',sessionId:text(owner.coordinator_session_id),threadId:nullableText(owner.thread_id)};
  const worktrees:SwarmWorktreeInfoV3[]=managed.filter(row=>(row.owner_root??row.coordinator_root)===swarmUserWorktree.rootPath).map(row=>{
   const rootPath=text(row.root_path);
   if(fs.existsSync(rootPath)&&fs.realpathSync(rootPath)!==rootPath) throw new Error('swarm: registered managed checkout is not a canonical physical path');
   if(fs.existsSync(rootPath)&&fs.realpathSync(git(rootPath,['rev-parse','--path-format=absolute','--git-common-dir']).trim())!==gitCommonDirectory) throw new Error('swarm: owned managed checkout belongs to another repository');
   return {number:integer(row.number),rootPath,present:fs.existsSync(rootPath),state:worktreeState(row.state),
    membership:row.owner_root===null?{kind:'campaign-lease'}:{kind:'swarm',generation:text(row.generation)},
    assignment:row.assignment_id===null?null:{assignmentId:text(row.assignment_id),campaignId:text(row.campaign_id),obligationId:text(row.obligation_id),sessionId:nullableText(row.session_id)}};
  });
  const workers=(await poolClient.query<Record<string,unknown>>(`SELECT k.*,n.thread_id,n.root_path FROM ponytail_index.swarm_worker_v1 k
   LEFT JOIN ponytail_index.swarm_native_session_v1 n ON n.session_id=k.session_id AND n.project_id=k.project_id
   WHERE k.project_id=$1 AND k.owner_root=$2 AND k.state<>'REMOVED' ORDER BY k.worker_number`,[projectId,swarmUserWorktree.rootPath])).rows.map(row=>{
    if(row.thread_id===null||row.root_path===null) throw new Error('swarm: worker native identity is missing or foreign; preserve its binding');
    const swarmWorkerBinding=readWorker(row);
    return {binding:swarmWorkerBinding,desiredName:swarmWorkerName(swarmWorkerBinding),nativeObservation:{kind:'unobserved'}} satisfies SwarmWorkerInfoV1;
   });
  await poolClient.query('COMMIT');
  return {schemaVersion:4,ownerRoot:swarmUserWorktree.rootPath,ownershipSource:owner===undefined?'campaign-leases':'swarm-owners-and-campaign-leases',coordinator:swarmCoordinator,nativeActivity:'unobserved',worktrees,workers};
 } catch(cause) {await poolClient.query('ROLLBACK');throw cause;}
 finally {poolClient.release();}
}

export function renderSwarmInfo(swarmInfoV4:SwarmInfoV4):string {
 const coordinator=swarmInfoV4.coordinator.kind==='bound'?`${swarmInfoV4.coordinator.sessionId} | thread: ${swarmInfoV4.coordinator.threadId??'(not recorded)'}`:swarmInfoV4.coordinator.kind==='unbound'?'not bound':'not recorded';
 return `Swarm owner: ${swarmInfoV4.ownerRoot}\nOwnership source: ${swarmInfoV4.ownershipSource}\nCoordinator session: ${coordinator}\nNative activity: ${swarmInfoV4.nativeActivity==='unobserved'?'not observed':'see worker observations'}\n\nManaged worktrees (${swarmInfoV4.worktrees.length}):\n`
  +swarmInfoV4.worktrees.map(worktree=>`  ${worktree.number} ${worktree.state}${worktree.present?'':' (missing)'} ${worktree.rootPath}\n    session: ${worktree.assignment?.sessionId??'(not attached)'} | assignment: ${worktree.assignment?.assignmentId??'(none)'} | obligation: ${worktree.assignment?.obligationId??'(none)'} | campaign: ${worktree.assignment?.campaignId??'(none)'}\n    membership: ${worktree.membership.kind}${worktree.membership.kind==='swarm'?` | generation: ${worktree.membership.generation}`:''}\n`).join('')+`\nRecorded worker bindings (${swarmInfoV4.workers.length}):\n`+swarmInfoV4.workers.map(worker=>
   `  desired name: ${worker.desiredName} | session: ${worker.binding.sessionId} | thread: ${worker.binding.threadId} | ${worker.binding.state}\n`
   +`    assignment: ${worker.binding.assignment.kind} ${worker.binding.assignment.id} | checkout: ${worker.binding.rootPath} | generation: ${worker.binding.generation}\n`
   +`    native: ${worker.nativeObservation.kind==='observed'?`${worker.nativeObservation.status} | name: ${worker.nativeObservation.name??'(unnamed)'}`:worker.nativeObservation.kind==='unavailable'?`unavailable | ${worker.nativeObservation.reason}`:'not observed'}\n`).join('');
}

// Traceability: implements REQ-SWARM-CLI
export async function runSwarmCli(argv:readonly string[]):Promise<void> {
 if(argv.length===0||argv.includes('--help')||argv.includes('-h')) {process.stdout.write(renderCliHelp(['swarm',...argv])+'\n');return;}
 const fields=new Map<string,string>();let json=false,valid=true;
 for(let i=1;i<argv.length;i++) {
  const flag=argv[i];
  if(flag==='--json'&&!json) {json=true;continue;}
  if(flag==='--all'&&!fields.has(flag)) {fields.set(flag,'true');continue;}
  const value=argv[i+1];
  if((flag==='--session'||flag==='--thread'||flag==='--base'||flag==='--number'||flag==='--generation'||flag==='--kind'||flag==='--assignment'||flag==='--summary')&&!fields.has(flag)&&typeof value==='string'&&value.length>0&&!value.startsWith('--')) {fields.set(flag,value);i++;continue;}
  valid=false;break;
 }
 const info=argv[0]==='info'&&fields.size===0;
 const enrollment=argv[0]==='owner-enroll'&&fields.size===0;
 const bind=argv[0]==='coordinator-bind'&&fields.size===2&&fields.has('--session')&&fields.has('--thread');
 const unbind=argv[0]==='coordinator-unbind'&&fields.size===1&&fields.has('--session');
 const assign=argv[0]==='worktree-assign'&&fields.size===1&&fields.has('--base');
 const setup=argv[0]==='worktree-setup'&&fields.size===2&&fields.has('--number')&&fields.has('--generation');
 const release=argv[0]==='worktree-release'&&fields.size===2&&fields.has('--number')&&fields.has('--generation');
 const deletion=argv[0]==='worktree-delete'&&fields.size===1&&(fields.has('--number')||fields.has('--all'));
 const workerBind=argv[0]==='worker-bind'&&fields.size===7&&['--thread','--session','--number','--generation','--kind','--assignment','--summary'].every(flag=>fields.has(flag));
 if(!valid||!info&&!enrollment&&!bind&&!unbind&&!assign&&!setup&&!release&&!deletion&&!workerBind) {
  process.stderr.write(renderCliHelp(['swarm',argv[0]??''])+'\n');process.exitCode=2;return;
 }
 const root=fs.realpathSync(git(process.cwd(),['rev-parse','--show-toplevel']).trim());
 const journal=record(JSON.parse(fs.readFileSync(path.join(root,'ponytail-journal.json'),'utf8')));
 if(journal.schemaVersion!==1) throw new Error('swarm: invoking project requires a V1 journal');
 const projectId=text(journal.projectId);
 if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(projectId)) throw new Error('swarm: invalid invoking project identity');
 const pool=new Pool(databaseOptions(root));
 let outputRoot=root;
 try {
  if(enrollment||bind||unbind||assign||setup||release||deletion||workerBind) {
   const swarmStore=new SwarmStore(pool,projectId);
   const ownerRoot=enrollment?root:(await inspectSwarmInfo(root,pool,projectId)).ownerRoot;
   const swarmUserWorktree:SwarmUserWorktree={rootPath:ownerRoot,gitCommonDirectory:fs.realpathSync(git(ownerRoot,['rev-parse','--path-format=absolute','--git-common-dir']).trim())};
   outputRoot=ownerRoot;
   if(workerBind) {
    const number=integer(fields.get('--number'));
    const worktree=(await inspectSwarmInfo(ownerRoot,pool,projectId)).worktrees.find(worktree=>worktree.number===number);
    if(worktree===undefined||worktree.membership.kind!=='swarm'||worktree.membership.generation!==fields.get('--generation')) throw new Error('swarm: checkout membership changed or is absent');
    const kind=fields.get('--kind');
    if(kind!=='plan'&&kind!=='sprint') throw new Error('swarm: worker assignment kind must be plan or sprint');
    const rollingCodex=await RollingCodex.connect({cwd:ownerRoot});
    try {await bindSwarmWorker(swarmStore,{number,rootPath:worktree.rootPath,ownerRoot,generation:worktree.membership.generation},text(fields.get('--thread')),text(fields.get('--session')),
     {kind,id:text(fields.get('--assignment')),summary:text(fields.get('--summary'))},rollingCodex);}
    finally {await rollingCodex.close();}
   } else if(deletion) {
    await swarmStore.enrollOwner(swarmUserWorktree);
    const results=await swarmStore.deleteWorktrees(ownerRoot,fields.has('--all')?null:integer(fields.get('--number')));
    const swarmWorktreeDeletionReportV1:SwarmWorktreeDeletionReportV1={schemaVersion:1,ownerRoot,results};
    process.stdout.write(json?JSON.stringify(swarmWorktreeDeletionReportV1)+'\n':`Swarm owner: ${ownerRoot}\n`+results.map(result=>`  ${result.number} ${result.outcome} ${result.rootPath}${result.outcome==='deleted'?'':` | ${result.reason}`}\n`).join(''));
    if(results.some(result=>result.outcome==='retained'||result.outcome==='protected'&&!fields.has('--all'))) process.exitCode=1;
    return;
   } else if(assign) {
    await swarmStore.enrollOwner(swarmUserWorktree);
    const baseCommit=git(ownerRoot,['rev-parse','--verify','--end-of-options',`${text(fields.get('--base'))}^{commit}`]).trim();
    const swarmWorktreeMembership=await swarmStore.reserveWorktree(ownerRoot,{kind:'provision',baseCommit});
    if(swarmWorktreeMembership===null) throw new Error('swarm: allocation did not reserve a checkout');
    try {await swarmStore.provisionWorktree(swarmWorktreeMembership);}
    catch(cause) {throw new Error(`swarm: setup failed for worktree ${swarmWorktreeMembership.number}, generation ${swarmWorktreeMembership.generation}; use worktree-setup to retry: ${cause instanceof Error?cause.message:String(cause)}`);}
   } else if(setup||release) {
    const number=integer(fields.get('--number'));
    const worktree=(await inspectSwarmInfo(ownerRoot,pool,projectId)).worktrees.find(worktree=>worktree.number===number);
    if(worktree===undefined||worktree.membership.kind!=='swarm'||worktree.membership.generation!==fields.get('--generation')) throw new Error('swarm: checkout membership changed or is absent');
    const swarmWorktreeMembership:SwarmWorktreeMembership={number,rootPath:worktree.rootPath,ownerRoot,generation:worktree.membership.generation};
    if(setup) await swarmStore.provisionWorktree(swarmWorktreeMembership);
    else await swarmStore.releaseWorktree(swarmWorktreeMembership);
   } else if(enrollment) await swarmStore.enrollOwner(swarmUserWorktree);
   else if(bind) {
    const rollingCodex=await RollingCodex.connect({cwd:ownerRoot});
    try {await bindSwarmCoordinator(swarmStore,swarmUserWorktree,text(fields.get('--thread')),text(fields.get('--session')),rollingCodex);}
    finally {await rollingCodex.close();}
   } else await swarmStore.unbindCoordinator(ownerRoot,text(fields.get('--session')));
  }
  let swarmInfoV4=await inspectSwarmInfo(outputRoot,pool,projectId);
  if(swarmInfoV4.workers.length) {
   let rollingCodex:RollingCodex|null=null;
   try {rollingCodex=await RollingCodex.connect({cwd:swarmInfoV4.ownerRoot});swarmInfoV4=await observeSwarmWorkers(swarmInfoV4,rollingCodex);}
   catch(cause) {const reason=cause instanceof Error?cause.message:String(cause);swarmInfoV4={...swarmInfoV4,nativeActivity:'worker-observations',workers:swarmInfoV4.workers.map(worker=>({...worker,nativeObservation:{kind:'unavailable',reason}}))};}
   finally {if(rollingCodex) await rollingCodex.close();}
  }
  process.stdout.write(json?JSON.stringify(swarmInfoV4)+'\n':renderSwarmInfo(swarmInfoV4));
 } finally {await pool.end();}
}
if(require.main===module) runSwarmCli(process.argv.slice(2)).catch((cause:unknown)=>{
 process.stderr.write((cause instanceof Error?cause.message:String(cause))+'\n');process.exitCode=1;
});
