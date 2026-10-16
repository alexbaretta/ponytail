// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {isDeepStrictEqual} from 'node:util';
import {parse} from 'lossless-json';
import type {Pool,PoolClient} from 'pg';
import {git,gitResult} from './rolling-integration.js';
import {requireRollingGitOperationAbsent,validateRollingSessionMarker} from './rolling-worktrees.js';
import {parseObligationDocument,projectObligationScope,acceptCheckpoint,readObligationEvidence,isObligationGitInputs,gitInputReasons,inputDigest,type ObligationDocumentV1,type ObligationScopeProjection} from '../skills/plan-execution/scripts/obligations.js';
import {hasSwarmNativeOwner} from './swarm-owner.js';
import {SwarmQueuePayloads,readSwarmQueueBlobV1,parseSwarmQueueInteger,type SwarmQueueBlobV1,type SwarmQueueArtifactV2} from './swarm-queue-payloads.js';
import {parseObligationBindingHistory,readObligationLeaseV1,freezeObligationLease,type ObligationLeaseV1,type ObligationBindingHistoryV1} from '../skills/plan-execution/scripts/obligation-binding-history.js';

export type SwarmQueueActorV1={readonly kind:'coordinator';readonly sessionId:string}|{readonly kind:'worker';readonly sessionId:string;readonly generation:string};
export interface SwarmQueueTaskInputV1 {
 readonly id:string;readonly title:string;readonly obligationIds:readonly string[];readonly preferredWorker:string|null;readonly context:readonly string[];
}
export interface SwarmQueueDocumentUpdateV1 {readonly path:string;readonly beforeContent:string|null;readonly content:string;}
export interface SwarmQueueVerdictV1 {readonly schemaVersion:1;readonly reviewer:string;readonly base:string;readonly revision:string;readonly accepted:true;}
export interface SwarmQueueCandidateV1 {readonly base:string;readonly revision:string;readonly reviewer:string;readonly verdictPath:string;readonly proofPaths:readonly string[];}
export interface SwarmQueueReviewV1 {readonly reviewer:string;readonly base:string;readonly revision:string;readonly hostEvidencePath:string;readonly contentBase64:string;}
export interface SwarmQueueArtifactV1 {readonly path:string;readonly contentBase64:string;}
export interface SwarmQueueCheckpointV1 {readonly revision:string;readonly ref:string;readonly indexPatchBase64:string;readonly worktreePatchBase64:string;readonly untracked:readonly SwarmQueueArtifactV1[];}
export interface SwarmQueueClaimV1 {readonly generation:string;readonly sessionId:string;readonly workerGeneration:string;readonly rootPath:string;readonly base:string;readonly leases:readonly ObligationLeaseV1[];}
export interface SwarmQueueTaskV1 extends SwarmQueueTaskInputV1 {
 readonly sequence:number;readonly claimSequence:number|null;readonly state:'ready'|'working'|'help'|'integration'|'done';readonly claim:SwarmQueueClaimV1|null;readonly claimHistory:readonly SwarmQueueClaimV1[];readonly candidate:SwarmQueueCandidateV1|null;readonly checkpoint:SwarmQueueCheckpointV1|null;readonly review:SwarmQueueReviewV1|null;
}
export interface SwarmQueueRequestV1 {
 readonly id:string;readonly sequence:number;readonly taskId:string;readonly claimGeneration:string;readonly kind:'help'|'integration';readonly detail:string;
 readonly evidencePaths:readonly string[];readonly artifacts:readonly SwarmQueueArtifactV1[];readonly outcome:'retry'|'accepted'|'answered'|null;readonly state:'open'|'processing'|'resolved';readonly response:string|null;
}
export interface SwarmQueueDiscoveryV1 {readonly id:string;readonly kind:'bug'|'work';readonly actor:SwarmQueueActorV1;readonly updates:readonly SwarmQueueDocumentUpdateV1[];readonly tasks:readonly SwarmQueueTaskInputV1[];}
export interface SwarmQueueRecordRootsV1 {readonly requirements:string;readonly uat:string;readonly issues:string;readonly plans:string;}
export interface SwarmQueueStateV1 {
 readonly schemaVersion:1;readonly campaignId:string;readonly ownerRoot:string;readonly documentPath:string;readonly bindingsPath:string|null;readonly authority:readonly string[];readonly assessor:string;readonly recordRoots:SwarmQueueRecordRootsV1;
 readonly state:'open'|'complete';readonly sequence:number;readonly tasks:readonly SwarmQueueTaskV1[];readonly requests:readonly SwarmQueueRequestV1[];
 readonly pending:SwarmQueueDiscoveryV1|null;readonly discoveries:readonly SwarmQueueDiscoveryV1[];
}
export interface SwarmQueueRequestV2 extends Omit<SwarmQueueRequestV1,'artifacts'> {readonly artifacts:readonly SwarmQueueArtifactV2[];}
export interface SwarmQueueCheckpointV2 {readonly revision:string;readonly ref:string;readonly indexPatch:SwarmQueueBlobV1;readonly worktreePatch:SwarmQueueBlobV1;readonly untracked:readonly SwarmQueueArtifactV2[];}
export interface SwarmQueueReviewV2 extends Omit<SwarmQueueReviewV1,'contentBase64'> {readonly blob:SwarmQueueBlobV1;}
export interface SwarmQueueTaskV2 extends Omit<SwarmQueueTaskV1,'checkpoint'|'review'> {readonly checkpoint:SwarmQueueCheckpointV2|null;readonly review:SwarmQueueReviewV2|null;}
export interface SwarmQueueStateV2 extends Omit<SwarmQueueStateV1,'schemaVersion'|'requests'|'tasks'> {readonly schemaVersion:2;readonly requests:readonly SwarmQueueRequestV2[];readonly tasks:readonly SwarmQueueTaskV2[];}
export interface SwarmQueueSuspensionV1 {readonly reason:string;readonly coordinatorSessionId:string;readonly hostEvidence:SwarmQueueArtifactV2;readonly workers:readonly {readonly sessionId:string;readonly generation:string;readonly rootPath:string}[];}
export interface SwarmQueueStateV3 extends Omit<SwarmQueueStateV2,'schemaVersion'|'state'> {readonly schemaVersion:3;readonly state:'open'|'complete'|'suspended';readonly suspension:SwarmQueueSuspensionV1|null;}
export interface SwarmQueueOperation {readonly queue:SwarmQueueStateV3;readonly task:SwarmQueueTaskV2|null;readonly request:SwarmQueueRequestV2|null;readonly page:SwarmQueuePageV2|null;readonly artifact:SwarmQueueArtifactReadV2|null;}
interface SwarmQueueCommandFields {readonly schemaVersion:1;readonly campaignId:string;readonly actor:SwarmQueueActorV1;}
// Discriminator: command
export type SwarmQueueCommandV1=SwarmQueueCommandFields & (
 {readonly command:'init';readonly documentPath:string;readonly bindingsPath:string|null;readonly authority:readonly string[];readonly assessor:string;readonly recordRoots:SwarmQueueRecordRootsV1}
 |{readonly command:'add';readonly tasks:readonly SwarmQueueTaskInputV1[]}
 |{readonly command:'claim'}
 |{readonly command:'refresh-base';readonly taskId:string;readonly generation:string;readonly base:string}
 |{readonly command:'handoff';readonly taskId:string;readonly generation:string;readonly requestId:string;readonly kind:'help'|'integration';readonly detail:string;readonly evidencePaths:readonly string[];readonly candidate:SwarmQueueCandidateV1|null}
 |{readonly command:'record-review';readonly taskId:string;readonly generation:string;readonly reviewer:string;readonly hostEvidencePath:string}
 |{readonly command:'requests'}|{readonly command:'take'}
 |{readonly command:'resolve';readonly requestId:string;readonly response:string;readonly outcome:'retry'|'accepted'|'answered'}
 |{readonly command:'discover';readonly discovery:SwarmQueueDiscoveryV1}
 |{readonly command:'recover';readonly discoveryId:string}|{readonly command:'abort-discovery';readonly discoveryId:string}
 |{readonly command:'status'}|{readonly command:'complete'});
interface SwarmQueueCommandFieldsV2 {readonly schemaVersion:2;readonly campaignId:string;readonly actor:SwarmQueueActorV1;}
// Discriminator: command
export type SwarmQueueCommandV2=SwarmQueueCommandFieldsV2 & (
 {readonly command:'init';readonly documentPath:string;readonly bindingsPath:string|null;readonly authority:readonly string[];readonly assessor:string;readonly recordRoots:SwarmQueueRecordRootsV1}
 |{readonly command:'add';readonly tasks:readonly SwarmQueueTaskInputV1[]}
 |{readonly command:'claim'}
 |{readonly command:'refresh-base';readonly taskId:string;readonly generation:string;readonly base:string}
 |{readonly command:'handoff';readonly taskId:string;readonly generation:string;readonly requestId:string;readonly kind:'help'|'integration';readonly detail:string;readonly evidencePaths:readonly string[];readonly candidate:SwarmQueueCandidateV1|null}
 |{readonly command:'record-review';readonly taskId:string;readonly generation:string;readonly reviewer:string;readonly hostEvidencePath:string}
 |{readonly command:'requests'}|{readonly command:'take'}
 |{readonly command:'resolve';readonly requestId:string;readonly response:string;readonly outcome:'retry'|'accepted'|'answered'}
 |{readonly command:'discover';readonly discovery:SwarmQueueDiscoveryV1}
 |{readonly command:'recover';readonly discoveryId:string}|{readonly command:'abort-discovery';readonly discoveryId:string}
 |{readonly command:'status'}|{readonly command:'complete'}
 |{readonly command:'page';readonly collection:'tasks'|'requests';readonly offset:number;readonly limit:number;readonly unresolvedOnly:boolean}
 |{readonly command:'artifact-read';readonly id:string;readonly offset:number;readonly length:number});
interface SwarmQueueCommandFieldsV3 {readonly schemaVersion:3;readonly campaignId:string;readonly actor:SwarmQueueActorV1;}
// Discriminator: command
export type SwarmQueueCommandV3=SwarmQueueCommandFieldsV3 & (
 {readonly command:'init';readonly documentPath:string;readonly bindingsPath:string|null;readonly authority:readonly string[];readonly assessor:string;readonly recordRoots:SwarmQueueRecordRootsV1}
 |{readonly command:'add';readonly tasks:readonly SwarmQueueTaskInputV1[]}
 |{readonly command:'claim'}
 |{readonly command:'refresh-base';readonly taskId:string;readonly generation:string;readonly base:string}
 |{readonly command:'handoff';readonly taskId:string;readonly generation:string;readonly requestId:string;readonly kind:'help'|'integration';readonly detail:string;readonly evidencePaths:readonly string[];readonly candidate:SwarmQueueCandidateV1|null}
 |{readonly command:'record-review';readonly taskId:string;readonly generation:string;readonly reviewer:string;readonly hostEvidencePath:string}
 |{readonly command:'requests'}|{readonly command:'take'}
 |{readonly command:'resolve';readonly requestId:string;readonly response:string;readonly outcome:'retry'|'accepted'|'answered'}
 |{readonly command:'discover';readonly discovery:SwarmQueueDiscoveryV1}
 |{readonly command:'recover';readonly discoveryId:string}|{readonly command:'abort-discovery';readonly discoveryId:string}
 |{readonly command:'status'}|{readonly command:'complete'}
 |{readonly command:'page';readonly collection:'tasks'|'requests';readonly offset:number;readonly limit:number;readonly unresolvedOnly:boolean}
 |{readonly command:'suspend';readonly reason:string;readonly hostEvidencePath:string}
 |{readonly command:'artifact-read';readonly id:string;readonly offset:number;readonly length:number});
export interface SwarmQueueResultV1 {readonly schemaVersion:1;readonly queue:SwarmQueueStateV1;readonly task:SwarmQueueTaskV1|null;readonly request:SwarmQueueRequestV1|null;}
export type SwarmQueueTaskReceiptV2=Omit<SwarmQueueTaskV2,'claimHistory'>;
export type SwarmQueuePageV2=({readonly collection:'tasks';readonly items:readonly SwarmQueueTaskReceiptV2[]}|{readonly collection:'requests';readonly items:readonly SwarmQueueRequestV2[]})&{readonly offset:number;readonly nextOffset:number|null;readonly unresolvedOnly:boolean};
export interface SwarmQueueArtifactReadV2 {readonly blob:SwarmQueueBlobV1;readonly offset:number;readonly contentBase64:string;readonly nextOffset:number|null;}
export interface SwarmQueueResultV2 {readonly schemaVersion:2;readonly queue:{readonly campaignId:string;readonly ownerRoot:string;readonly state:'open'|'complete';readonly sequence:number;readonly pendingDiscoveryId:string|null;readonly taskCount:number;readonly requestCount:number};readonly task:SwarmQueueTaskReceiptV2|null;readonly request:SwarmQueueRequestV2|null;readonly page:SwarmQueuePageV2|null;readonly artifact:SwarmQueueArtifactReadV2|null;}
export interface SwarmQueueResultV3 extends Omit<SwarmQueueResultV2,'schemaVersion'|'queue'> {readonly schemaVersion:3;readonly queue:Omit<SwarmQueueResultV2['queue'],'state'>&{readonly state:SwarmQueueStateV3['state'];readonly suspension:SwarmQueueSuspensionV1|null};}
export interface SwarmRetirementSelectorV1 {readonly number:number;readonly generation:string;}
export interface SwarmRetirementAuthorizationCommandV1 {readonly schemaVersion:1;readonly campaignId:string;readonly actor:SwarmQueueActorV1;readonly id:string;readonly reason:string;readonly hostEvidencePath:string;readonly worktrees:readonly SwarmRetirementSelectorV1[];}
export interface SwarmRetirementAuthorizationV1 {readonly schemaVersion:1;readonly campaignId:string;readonly ownerRoot:string;readonly coordinatorSessionId:string;readonly id:string;readonly reason:string;readonly hostEvidence:SwarmQueueArtifactV2;readonly worktrees:readonly {readonly number:number;readonly generation:string;readonly sessionId:string;readonly workerGeneration:string;readonly rootPath:string}[];}
export function readSwarmRetirementAuthorizationCommandV1(value:unknown):SwarmRetirementAuthorizationCommandV1 {const input=record(value,['schemaVersion','campaignId','actor','id','reason','hostEvidencePath','worktrees']);requireQueue(input.schemaVersion===1&&Array.isArray(input.worktrees)&&input.worktrees.length>0&&input.worktrees.length<=32,'invalid retirement selector list');const worktrees=input.worktrees.map(value=>{const selector=record(value,['number','generation']);return {number:integer(selector.number),generation:text(selector.generation)};});requireQueue(new Set(worktrees.map(value=>value.number)).size===worktrees.length,'duplicate retirement membership');return {schemaVersion:1,campaignId:text(input.campaignId),actor:actor(input.actor),id:text(input.id),reason:text(input.reason),hostEvidencePath:relative(input.hostEvidencePath),worktrees};}
export function readSwarmRetirementAuthorizationV1(value:unknown):SwarmRetirementAuthorizationV1 {const input=record(value,['schemaVersion','campaignId','ownerRoot','coordinatorSessionId','id','reason','hostEvidence','worktrees']);requireQueue(input.schemaVersion===1&&Array.isArray(input.worktrees)&&input.worktrees.length>0&&input.worktrees.length<=32,'invalid retirement authority');const artifact=record(input.hostEvidence,['path','blob']);return {schemaVersion:1,campaignId:text(input.campaignId),ownerRoot:text(input.ownerRoot),coordinatorSessionId:text(input.coordinatorSessionId),id:text(input.id),reason:text(input.reason),hostEvidence:{path:relative(artifact.path),blob:readSwarmQueueBlobV1(artifact.blob)},worktrees:input.worktrees.map(value=>{const worker=record(value,['number','generation','sessionId','workerGeneration','rootPath']);return {number:integer(worker.number),generation:text(worker.generation),sessionId:text(worker.sessionId),workerGeneration:text(worker.workerGeneration),rootPath:text(worker.rootPath)};})};}
export const SwarmRetirementAuthorizationCommandReaders={V1:readSwarmRetirementAuthorizationCommandV1};
export const SwarmRetirementAuthorizationReaders={V1:readSwarmRetirementAuthorizationV1};
function requireQueue(condition:unknown,message:string):asserts condition {if(!condition)throw new Error(`swarm queue: ${message}`);}
function isRecord(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function record(value:unknown,keys:readonly string[]):Record<string,unknown> {
 requireQueue(isRecord(value),'expected record');
 requireQueue(Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key)),'unexpected record fields');return value;
}
function text(value:unknown):string {requireQueue(typeof value==='string'&&value.length>0&&value.trim()===value&&!/[\0\r\n]/u.test(value),'expected exact nonempty text');return value;}
function strings(value:unknown):readonly string[] {requireQueue(Array.isArray(value),'expected string array');const values=value.map(text);requireQueue(new Set(values).size===values.length,'duplicate strings');return values;}
function nullableText(value:unknown):string|null{return value===null?null:text(value);}
function integer(value:unknown):number {requireQueue(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0,'invalid sequence');return value;}
function relative(value:unknown):string {const result=text(value);requireQueue(!path.isAbsolute(result)&&path.posix.normalize(result)===result&&!result.split('/').some(part=>part==='..'||part==='.'||part==='.git')&&!result.includes('\\'),'expected safe repository-relative path');return result;}
function actor(value:unknown):SwarmQueueActorV1 {
 requireQueue(value!==null&&typeof value==='object'&&'kind' in value,'invalid actor');
 switch(value.kind){case 'coordinator':{const input=record(value,['kind','sessionId']);return {kind:'coordinator',sessionId:text(input.sessionId)};}
 case 'worker':{const input=record(value,['kind','sessionId','generation']);return {kind:'worker',sessionId:text(input.sessionId),generation:text(input.generation)};}
 default:throw new Error('swarm queue: invalid actor kind');}
}
function taskInput(value:unknown):SwarmQueueTaskInputV1 {
 const input=record(value,['id','title','obligationIds','preferredWorker','context']);const obligationIds=strings(input.obligationIds);
 requireQueue(obligationIds.length>0&&obligationIds.every(id=>/^OBL-[1-9][0-9]*$/u.test(id)),'task requires obligation IDs');
 return {id:text(input.id),title:text(input.title),obligationIds,preferredWorker:nullableText(input.preferredWorker),context:strings(input.context)};
}
function tasks(value:unknown):readonly SwarmQueueTaskInputV1[]{requireQueue(Array.isArray(value),'expected tasks');return value.map(taskInput);}
function candidate(value:unknown):SwarmQueueCandidateV1|null {
 if(value===null)return null;const input=record(value,['base','revision','reviewer','verdictPath','proofPaths']);
 return {base:text(input.base),revision:text(input.revision),reviewer:text(input.reviewer),verdictPath:relative(input.verdictPath),proofPaths:strings(input.proofPaths).map(relative)};
}
function recordRoots(value:unknown):SwarmQueueRecordRootsV1{const input=record(value,['requirements','uat','issues','plans']);return {requirements:relative(input.requirements),uat:relative(input.uat),issues:relative(input.issues),plans:relative(input.plans)};}
function discovery(value:unknown):SwarmQueueDiscoveryV1 {
 const input=record(value,['id','kind','actor','updates','tasks']);requireQueue(Array.isArray(input.updates),'expected document updates');
 requireQueue(input.kind==='bug'||input.kind==='work','invalid discovery kind');
 return {id:text(input.id),kind:input.kind,actor:actor(input.actor),tasks:tasks(input.tasks),updates:input.updates.map((value:unknown)=>{
  const input=record(value,['path','beforeContent','content']);requireQueue(typeof input.content==='string','expected document content');
  requireQueue(input.beforeContent===null||typeof input.beforeContent==='string','invalid prior document content');
  return {path:relative(input.path),beforeContent:input.beforeContent,content:input.content};
 })};
}
export function readSwarmQueueCommandV1(value:unknown):SwarmQueueCommandV1 {
 requireQueue(value!==null&&typeof value==='object'&&'command' in value,'expected queue command');
 const common=['schemaVersion','campaignId','actor'];
 function fields(keys:readonly string[]):Record<string,unknown>{return record(value,[...common,'command',...keys]);}
 let input:Record<string,unknown>;
 requireQueue('schemaVersion' in value&&value.schemaVersion===1&&'campaignId' in value&&'actor' in value,'unsupported command version');
 const baseSwarmQueueCommandFields:SwarmQueueCommandFields={schemaVersion:1,campaignId:text(value.campaignId),actor:actor(value.actor)};
 switch(value.command){
 case 'init':input=fields(['documentPath','bindingsPath','authority','assessor','recordRoots']);return {...baseSwarmQueueCommandFields,command:'init',documentPath:relative(input.documentPath),bindingsPath:input.bindingsPath===null?null:relative(input.bindingsPath),authority:strings(input.authority),assessor:text(input.assessor),recordRoots:recordRoots(input.recordRoots)};
 case 'refresh-base':input=fields(['taskId','generation','base']);return {...baseSwarmQueueCommandFields,command:'refresh-base',taskId:text(input.taskId),generation:text(input.generation),base:text(input.base)};
 case 'record-review':input=fields(['taskId','generation','reviewer','hostEvidencePath']);return {...baseSwarmQueueCommandFields,command:'record-review',taskId:text(input.taskId),generation:text(input.generation),reviewer:text(input.reviewer),hostEvidencePath:relative(input.hostEvidencePath)};
 case 'add':input=fields(['tasks']);return {...baseSwarmQueueCommandFields,command:'add',tasks:tasks(input.tasks)};
 case 'claim':case 'requests':case 'take':case 'status':case 'complete':fields([]);return {...baseSwarmQueueCommandFields,command:value.command};
 case 'handoff':input=fields(['taskId','generation','requestId','kind','detail','evidencePaths','candidate']);requireQueue(input.kind==='help'||input.kind==='integration','invalid handoff kind');
  return {...baseSwarmQueueCommandFields,command:'handoff',taskId:text(input.taskId),generation:text(input.generation),requestId:text(input.requestId),kind:input.kind,detail:text(input.detail),evidencePaths:strings(input.evidencePaths).map(relative),candidate:candidate(input.candidate)};
 case 'resolve':input=fields(['requestId','response','outcome']);requireQueue(input.outcome==='retry'||input.outcome==='accepted'||input.outcome==='answered','invalid resolution outcome');return {...baseSwarmQueueCommandFields,command:'resolve',requestId:text(input.requestId),response:text(input.response),outcome:input.outcome};
 case 'discover':input=fields(['discovery']);return {...baseSwarmQueueCommandFields,command:'discover',discovery:discovery(input.discovery)};
 case 'recover':case 'abort-discovery':input=fields(['discoveryId']);return {...baseSwarmQueueCommandFields,command:value.command,discoveryId:text(input.discoveryId)};
 default:throw new Error('swarm queue: unsupported command');
 }
}
export function readSwarmQueueCommandV2(value:unknown):SwarmQueueCommandV2 {
 requireQueue(isRecord(value)&&value.schemaVersion===2,'unsupported command version');
 if(value.command==='page'){const input=record(value,['schemaVersion','campaignId','actor','command','collection','offset','limit','unresolvedOnly']);requireQueue((input.collection==='tasks'||input.collection==='requests')&&typeof input.unresolvedOnly==='boolean','invalid page selection');const limit=integer(input.limit);requireQueue(limit>0&&limit<=32,'page limit must be 1..32');return {schemaVersion:2,campaignId:text(input.campaignId),actor:actor(input.actor),command:'page',collection:input.collection,offset:integer(input.offset),limit,unresolvedOnly:input.unresolvedOnly};}
 if(value.command==='artifact-read'){const input=record(value,['schemaVersion','campaignId','actor','command','id','offset','length']);const length=integer(input.length);requireQueue(length>0&&length<=65536,'artifact read length must be 1..65536');return {schemaVersion:2,campaignId:text(input.campaignId),actor:actor(input.actor),command:'artifact-read',id:text(input.id),offset:integer(input.offset),length};}
 return {...readSwarmQueueCommandV1({...value,schemaVersion:1}),schemaVersion:2};
}
export function readSwarmQueueCommandV3(value:unknown):SwarmQueueCommandV3 {requireQueue(isRecord(value)&&value.schemaVersion===3,'unsupported command version');if(value.command==='suspend'){const input=record(value,['schemaVersion','campaignId','actor','command','reason','hostEvidencePath']);return {schemaVersion:3,campaignId:text(input.campaignId),actor:actor(input.actor),command:'suspend',reason:text(input.reason),hostEvidencePath:relative(input.hostEvidencePath)};}return {...readSwarmQueueCommandV2({...value,schemaVersion:2}),schemaVersion:3};}
export function readSwarmQueueCommand(value:unknown):SwarmQueueCommandV3 {requireQueue(isRecord(value),'invalid command');switch(value.schemaVersion){case 1:return {...readSwarmQueueCommandV1(value),schemaVersion:3};case 2:return {...readSwarmQueueCommandV2(value),schemaVersion:3};case 3:return readSwarmQueueCommandV3(value);default:throw new Error('swarm queue: unsupported command version');}}
export function parseSwarmQueueJson(source:string):unknown {return parse(source,null,parseSwarmQueueInteger);}
function claim(value:unknown):SwarmQueueClaimV1|null {
 if(value===null)return null;const input=record(value,['generation','sessionId','workerGeneration','rootPath','base','leases']);requireQueue(Array.isArray(input.leases),'expected frozen leases');
 return {generation:text(input.generation),sessionId:text(input.sessionId),workerGeneration:text(input.workerGeneration),rootPath:text(input.rootPath),base:text(input.base),leases:input.leases.map(readObligationLeaseV1)};
}
function artifacts(value:unknown):readonly SwarmQueueArtifactV1[]{requireQueue(Array.isArray(value),'expected artifacts');return value.map((value:unknown)=>{const input=record(value,['path','contentBase64']);return {path:relative(input.path),contentBase64:typeof input.contentBase64==='string'?input.contentBase64:text(input.contentBase64)};});}
function review(value:unknown):SwarmQueueReviewV1|null{if(value===null)return null;const input=record(value,['reviewer','base','revision','hostEvidencePath','contentBase64']);return {reviewer:text(input.reviewer),base:text(input.base),revision:text(input.revision),hostEvidencePath:relative(input.hostEvidencePath),contentBase64:text(input.contentBase64)};}
function checkpoint(value:unknown):SwarmQueueCheckpointV1|null{if(value===null)return null;const input=record(value,['revision','ref','indexPatchBase64','worktreePatchBase64','untracked']);requireQueue(typeof input.indexPatchBase64==='string'&&typeof input.worktreePatchBase64==='string','invalid checkpoint patches');return {revision:text(input.revision),ref:text(input.ref),indexPatchBase64:input.indexPatchBase64,worktreePatchBase64:input.worktreePatchBase64,untracked:artifacts(input.untracked)};}
function taskFields(input:Record<string,unknown>):Omit<SwarmQueueTaskV1,'claimHistory'|'checkpoint'|'review'> {
 requireQueue(input.state==='ready'||input.state==='working'||input.state==='help'||input.state==='integration'||input.state==='done','invalid task state');
 return {...taskInput({id:input.id,title:input.title,obligationIds:input.obligationIds,preferredWorker:input.preferredWorker,context:input.context}),sequence:integer(input.sequence),claimSequence:input.claimSequence===null?null:integer(input.claimSequence),state:input.state,claim:claim(input.claim),candidate:candidate(input.candidate)};
}
function readTaskV1(value:unknown):SwarmQueueTaskV1 {const input=record(value,['id','title','obligationIds','preferredWorker','context','sequence','claimSequence','state','claim','claimHistory','candidate','checkpoint','review']);requireQueue(Array.isArray(input.claimHistory),'invalid claim history');const claimHistory=input.claimHistory.map(claim);requireQueue(claimHistory.every(valueSwarmQueueClaimV1=>valueSwarmQueueClaimV1!==null),'invalid historical claim');return {...taskFields(input),claimHistory:claimHistory.filter((valueSwarmQueueClaimV1):valueSwarmQueueClaimV1 is SwarmQueueClaimV1=>valueSwarmQueueClaimV1!==null),checkpoint:checkpoint(input.checkpoint),review:review(input.review)};}
function taskReceipt(swarmQueueTaskV2:SwarmQueueTaskV2):SwarmQueueTaskReceiptV2 {const {claimHistory,...swarmQueueTaskReceiptV2}=swarmQueueTaskV2;return swarmQueueTaskReceiptV2;}
function readTaskReceipt(value:unknown):SwarmQueueTaskReceiptV2 {requireQueue(isRecord(value)&&!Object.hasOwn(value,'claimHistory'),'invalid task receipt');return taskReceipt(readTaskV2({...value,claimHistory:[]}));}
function readRequestV1(value:unknown):SwarmQueueRequestV1 {const input=record(value,['id','sequence','taskId','claimGeneration','kind','detail','evidencePaths','artifacts','outcome','state','response']);
  requireQueue((input.kind==='help'||input.kind==='integration')&&(input.state==='open'||input.state==='processing'||input.state==='resolved'),'invalid request state');
  requireQueue(input.outcome===null||input.outcome==='retry'||input.outcome==='accepted'||input.outcome==='answered','invalid request outcome');
  return {id:text(input.id),sequence:integer(input.sequence),taskId:text(input.taskId),claimGeneration:text(input.claimGeneration),kind:input.kind,detail:text(input.detail),evidencePaths:strings(input.evidencePaths).map(relative),artifacts:artifacts(input.artifacts),outcome:input.outcome,state:input.state,response:nullableText(input.response)};}
function readTaskV2(value:unknown):SwarmQueueTaskV2 {
 requireQueue(isRecord(value),'invalid V2 task');const swarmQueueTaskV1=readTaskV1({...value,checkpoint:null,review:null});
 let checkpoint:SwarmQueueCheckpointV2|null=null;if(value.checkpoint!==null){const input=record(value.checkpoint,['revision','ref','indexPatch','worktreePatch','untracked']);requireQueue(Array.isArray(input.untracked),'invalid checkpoint artifacts');checkpoint={revision:text(input.revision),ref:text(input.ref),indexPatch:readSwarmQueueBlobV1(input.indexPatch),worktreePatch:readSwarmQueueBlobV1(input.worktreePatch),untracked:input.untracked.map(value=>{const artifact=record(value,['path','blob']);return {path:relative(artifact.path),blob:readSwarmQueueBlobV1(artifact.blob)};})};}
 let review:SwarmQueueReviewV2|null=null;if(value.review!==null){const input=record(value.review,['reviewer','base','revision','hostEvidencePath','blob']);review={reviewer:text(input.reviewer),base:text(input.base),revision:text(input.revision),hostEvidencePath:relative(input.hostEvidencePath),blob:readSwarmQueueBlobV1(input.blob)};}
 return {...swarmQueueTaskV1,checkpoint,review};
}
function readRequestV2(value:unknown):SwarmQueueRequestV2 {requireQueue(isRecord(value)&&Array.isArray(value.artifacts),'invalid V2 request');const artifacts=value.artifacts.map((value:unknown)=>{const input=record(value,['path','blob']);return {path:relative(input.path),blob:readSwarmQueueBlobV1(input.blob)};});return {...readRequestV1({...value,artifacts:[]}),artifacts};}
export function readSwarmQueueStateV1(value:unknown):SwarmQueueStateV1 {
 const input=record(value,['schemaVersion','campaignId','ownerRoot','documentPath','bindingsPath','authority','assessor','recordRoots','state','sequence','tasks','requests','pending','discoveries']);
 requireQueue(input.schemaVersion===1&&(input.state==='open'||input.state==='complete')&&Array.isArray(input.tasks)&&Array.isArray(input.requests)&&Array.isArray(input.discoveries),'invalid state version/collections');
 return {schemaVersion:1,campaignId:text(input.campaignId),ownerRoot:text(input.ownerRoot),documentPath:relative(input.documentPath),bindingsPath:input.bindingsPath===null?null:relative(input.bindingsPath),authority:strings(input.authority),assessor:text(input.assessor),recordRoots:recordRoots(input.recordRoots),state:input.state,sequence:integer(input.sequence),
 tasks:input.tasks.map(readTaskV1),
 requests:input.requests.map(readRequestV1),
 pending:input.pending===null?null:discovery(input.pending),discoveries:input.discoveries.map(discovery)};
}
export function readSwarmQueueStateV2(value:unknown):SwarmQueueStateV2 {
 requireQueue(isRecord(value)&&value.schemaVersion===2&&Array.isArray(value.requests)&&Array.isArray(value.tasks),'invalid queue state V2');const requests=value.requests.map(readRequestV2);const tasks=value.tasks.map(readTaskV2);
 const swarmQueueStateV1=readSwarmQueueStateV1({...value,schemaVersion:1,tasks:[],requests:requests.map(request=>({...request,artifacts:[]}))});
 return {...swarmQueueStateV1,schemaVersion:2,requests,tasks};
}
function suspension(value:unknown):SwarmQueueSuspensionV1|null {if(value===null)return null;const input=record(value,['reason','coordinatorSessionId','hostEvidence','workers']);const artifact=record(input.hostEvidence,['path','blob']);requireQueue(Array.isArray(input.workers),'invalid suspension workers');const workers=input.workers.map(value=>{const worker=record(value,['sessionId','generation','rootPath']);return {sessionId:text(worker.sessionId),generation:text(worker.generation),rootPath:text(worker.rootPath)};});return {workers,reason:text(input.reason),coordinatorSessionId:text(input.coordinatorSessionId),hostEvidence:{path:relative(artifact.path),blob:readSwarmQueueBlobV1(artifact.blob)}};}
export function readSwarmQueueStateV3(value:unknown):SwarmQueueStateV3 {requireQueue(isRecord(value)&&value.schemaVersion===3,'invalid queue state V3');const {suspension:inputSuspension,...rest}=value;const parsedSuspension=suspension(inputSuspension);requireQueue(value.state==='suspended'?parsedSuspension!==null:parsedSuspension===null,'suspension/state mismatch');const state=readSwarmQueueStateV2({...rest,schemaVersion:2,state:value.state==='suspended'?'open':value.state});return {...state,schemaVersion:3,state:value.state==='suspended'?'suspended':state.state,suspension:parsedSuspension};}
export function readSwarmQueueState(value:unknown):SwarmQueueStateV1|SwarmQueueStateV2|SwarmQueueStateV3 {requireQueue(isRecord(value),'invalid queue state');switch(value.schemaVersion){case 1:return readSwarmQueueStateV1(value);case 2:return readSwarmQueueStateV2(value);case 3:return readSwarmQueueStateV3(value);default:throw new Error('swarm queue: unsupported state version');}}
export function readSwarmQueueVerdictV1(value:unknown):SwarmQueueVerdictV1 {
 const input=record(value,['schemaVersion','reviewer','base','revision','accepted']);requireQueue(input.schemaVersion===1&&input.accepted===true,'review is not an accepted V1 verdict');
 return {schemaVersion:1,reviewer:text(input.reviewer),base:text(input.base),revision:text(input.revision),accepted:true};
}
export function readSwarmQueueResultV1(value:unknown):SwarmQueueResultV1 {
 const input=record(value,['schemaVersion','queue','task','request']);requireQueue(input.schemaVersion===1,'invalid queue result version');const swarmQueueStateV1=readSwarmQueueStateV1(input.queue);
 let swarmQueueTaskV1:SwarmQueueTaskV1|null=null;let swarmQueueRequestV1:SwarmQueueRequestV1|null=null;
 if(input.task!==null){requireQueue(isRecord(input.task),'invalid selected task');const id=text(input.task.id);const selected=swarmQueueStateV1.tasks.find(task=>task.id===id);requireQueue(selected!==undefined&&isDeepStrictEqual(selected,input.task),'selected task differs from state');swarmQueueTaskV1=selected;}
 if(input.request!==null){requireQueue(isRecord(input.request),'invalid selected request');const id=text(input.request.id);const selected=swarmQueueStateV1.requests.find(request=>request.id===id);requireQueue(selected!==undefined&&isDeepStrictEqual(selected,input.request),'selected request differs from state');swarmQueueRequestV1=selected;}
 return {schemaVersion:1,queue:swarmQueueStateV1,task:swarmQueueTaskV1,request:swarmQueueRequestV1};
}
export const SwarmQueueVerdictReaders={V1:readSwarmQueueVerdictV1};
export const SwarmQueueResultReaders={V1:readSwarmQueueResultV1,V2:readSwarmQueueResultV2,V3:readSwarmQueueResultV3};
export const SwarmQueueCommandReaders={V1:readSwarmQueueCommandV1,V2:readSwarmQueueCommandV2,V3:readSwarmQueueCommandV3};
export const SwarmQueueStateReaders={V1:readSwarmQueueStateV1,V2:readSwarmQueueStateV2,V3:readSwarmQueueStateV3};
function digest(content:string):string{return crypto.createHash('sha256').update(content).digest('hex');}
function safeFile(root:string,relativePath:string):string {
 const target=path.join(root,relative(relativePath));let current=root;
 for(const part of relativePath.split('/')){current=path.join(current,part);const stat=fs.lstatSync(current,{throwIfNoEntry:false});requireQueue(stat===undefined||!stat.isSymbolicLink(),'symlink in document/evidence path');if(current!==target)requireQueue(stat===undefined||stat.isDirectory(),'document parent must be a directory');}
 requireQueue(!fs.existsSync(target)||fs.statSync(target).isFile(),'expected regular document/evidence file');return target;
}
async function fileDigest(file:string):Promise<string>{const hash=crypto.createHash('sha256');for await(const bytes of fs.createReadStream(file))hash.update(bytes);return hash.digest('hex');}
function readFile(root:string,relativePath:string):string {const file=safeFile(root,relativePath);requireQueue(fs.statSync(file).size<=8*1024*1024,'JSON/document metadata exceeds 8 MiB; use artifact streaming');return fs.readFileSync(file,'utf8');}
export function createSwarmQueueResultV2(swarmQueueOperation:Omit<SwarmQueueOperation,'queue'>&{readonly queue:SwarmQueueStateV2}):SwarmQueueResultV2 {
 const swarmQueueStateV2=swarmQueueOperation.queue;return {schemaVersion:2,queue:{campaignId:swarmQueueStateV2.campaignId,ownerRoot:swarmQueueStateV2.ownerRoot,state:swarmQueueStateV2.state,sequence:swarmQueueStateV2.sequence,pendingDiscoveryId:swarmQueueStateV2.pending?.id??null,taskCount:swarmQueueStateV2.tasks.length,requestCount:swarmQueueStateV2.requests.length},task:swarmQueueOperation.task===null?null:taskReceipt(swarmQueueOperation.task),request:swarmQueueOperation.request,page:swarmQueueOperation.page,artifact:swarmQueueOperation.artifact};
}
export function readSwarmQueueResultV2(value:unknown):SwarmQueueResultV2 {
 const input=record(value,['schemaVersion','queue','task','request','page','artifact']);requireQueue(input.schemaVersion===2,'invalid queue result version');const queue=record(input.queue,['campaignId','ownerRoot','state','sequence','pendingDiscoveryId','taskCount','requestCount']);requireQueue(queue.state==='open'||queue.state==='complete','invalid queue state');
 let page:SwarmQueuePageV2|null=null;if(input.page!==null){const inputPage=record(input.page,['collection','items','offset','nextOffset','unresolvedOnly']);requireQueue(Array.isArray(inputPage.items)&&inputPage.items.length<=32&&typeof inputPage.unresolvedOnly==='boolean','invalid page');const common={offset:integer(inputPage.offset),nextOffset:inputPage.nextOffset===null?null:integer(inputPage.nextOffset),unresolvedOnly:inputPage.unresolvedOnly};switch(inputPage.collection){case 'tasks':page={...common,collection:'tasks',items:inputPage.items.map(readTaskReceipt)};break;case 'requests':page={...common,collection:'requests',items:inputPage.items.map(readRequestV2)};break;default:throw new Error('swarm queue: invalid page collection');}}
 let artifact:SwarmQueueArtifactReadV2|null=null;if(input.artifact!==null){const inputArtifact=record(input.artifact,['blob','offset','contentBase64','nextOffset']);requireQueue(typeof inputArtifact.contentBase64==='string'&&Buffer.byteLength(inputArtifact.contentBase64)<=87384,'invalid artifact chunk');artifact={blob:readSwarmQueueBlobV1(inputArtifact.blob),offset:integer(inputArtifact.offset),contentBase64:inputArtifact.contentBase64,nextOffset:inputArtifact.nextOffset===null?null:integer(inputArtifact.nextOffset)};}
 return {schemaVersion:2,queue:{campaignId:text(queue.campaignId),ownerRoot:text(queue.ownerRoot),state:queue.state,sequence:integer(queue.sequence),pendingDiscoveryId:nullableText(queue.pendingDiscoveryId),taskCount:integer(queue.taskCount),requestCount:integer(queue.requestCount)},task:input.task===null?null:readTaskReceipt(input.task),request:input.request===null?null:readRequestV2(input.request),page,artifact};
}
export function createSwarmQueueResultV3(swarmQueueOperation:SwarmQueueOperation):SwarmQueueResultV3 {const state=swarmQueueOperation.queue;const result=createSwarmQueueResultV2({...swarmQueueOperation,queue:{...state,schemaVersion:2,state:state.state==='suspended'?'open':state.state}});return {...result,schemaVersion:3,queue:{...result.queue,state:state.state,suspension:state.suspension}};}
export function readSwarmQueueResultV3(value:unknown):SwarmQueueResultV3 {requireQueue(isRecord(value)&&value.schemaVersion===3&&isRecord(value.queue),'invalid result V3');const {suspension:inputSuspension,...queue}=value.queue;const parsedSuspension=suspension(inputSuspension);requireQueue(queue.state==='suspended'?parsedSuspension!==null:parsedSuspension===null,'suspension/state mismatch');const result=readSwarmQueueResultV2({...value,schemaVersion:2,queue:{...queue,state:queue.state==='suspended'?'open':queue.state}});return {...result,schemaVersion:3,queue:{...result.queue,state:queue.state==='suspended'?'suspended':result.queue.state,suspension:parsedSuspension}};}
export interface SwarmQueueCanonical {readonly document:ObligationDocumentV1;readonly history:ObligationBindingHistoryV1;readonly scope:ObligationScopeProjection;readonly digest:string;}
function canonical(swarmQueueStateV3:SwarmQueueStateV3):SwarmQueueCanonical {
 const source=readFile(swarmQueueStateV3.ownerRoot,swarmQueueStateV3.documentPath);const obligationDocumentV1=parseObligationDocument(source);
 requireQueue(obligationDocumentV1.scopeId===swarmQueueStateV3.campaignId,'canonical obligation scope differs');
 const obligationBindingHistoryV1:ObligationBindingHistoryV1=swarmQueueStateV3.bindingsPath===null?{schemaVersion:1,scopeId:obligationDocumentV1.scopeId,revisions:[]}:parseObligationBindingHistory(readFile(swarmQueueStateV3.ownerRoot,swarmQueueStateV3.bindingsPath));
 return {document: obligationDocumentV1,history: obligationBindingHistoryV1,scope:projectObligationScope(obligationDocumentV1,swarmQueueStateV3.ownerRoot,obligationBindingHistoryV1),digest:digest(source+JSON.stringify(obligationBindingHistoryV1))};
}
function inspectionTask(swarmQueueTaskV1:Pick<SwarmQueueTaskV1,'claim'>):boolean {
 return swarmQueueTaskV1.claim!==null&&swarmQueueTaskV1.claim.leases.length>0&&swarmQueueTaskV1.claim.leases.every(obligationLeaseV1=>obligationLeaseV1.binding.execution.operations.length===1&&obligationLeaseV1.binding.execution.operations[0]==='inspect'&&obligationLeaseV1.binding.execution.selection.length===0&&obligationLeaseV1.binding.execution.target===null);
}
function reconcileUnclaimed(swarmQueueStateV3:SwarmQueueStateV3,currentSwarmQueueCanonical:SwarmQueueCanonical):SwarmQueueStateV3 {
 return {...swarmQueueStateV3,tasks:swarmQueueStateV3.tasks.map(swarmQueueTaskV1=>swarmQueueTaskV1.state==='ready'&&swarmQueueTaskV1.claim===null&&swarmQueueTaskV1.obligationIds.every(id=>currentSwarmQueueCanonical.scope.projection.satisfiedIds.includes(id))?{...swarmQueueTaskV1,state:'done'}:swarmQueueTaskV1)};
}
function overlaps(left:string,right:string):boolean{return left===right||left.startsWith(right+'/')||right.startsWith(left+'/');}
function taskPaths(swarmQueueTaskV1:Pick<SwarmQueueTaskV1,'claim'|'claimHistory'|'obligationIds'>,swarmQueueCanonical:SwarmQueueCanonical,frozen=true):readonly string[] {
 return !frozen||swarmQueueTaskV1.claim===null?swarmQueueTaskV1.obligationIds.flatMap(id=>swarmQueueCanonical.scope.bindings.get(id)?.execution.plannedPaths??[]):[swarmQueueTaskV1.claim,...swarmQueueTaskV1.claimHistory].flatMap(swarmQueueClaimV1=>swarmQueueClaimV1.leases.flatMap(leaseObligationLeaseV1=>leaseObligationLeaseV1.binding.execution.plannedPaths));
}
// Traceability: implements REQ-SWARM-QUEUES
export function selectSwarmQueueTask<Task extends SwarmQueueTaskV1|SwarmQueueTaskV2>(swarmQueueStateV3:{readonly tasks:readonly Task[]},sessionId:string,swarmQueueCanonical:SwarmQueueCanonical):Task|null {
 const satisfied=new Set(swarmQueueCanonical.scope.projection.satisfiedIds);
 const reserved=swarmQueueStateV3.tasks.filter(swarmQueueTaskV1=>swarmQueueTaskV1.state!=='done'&&swarmQueueTaskV1.claim!==null);
 const previousSwarmQueueTaskV2=swarmQueueStateV3.tasks.filter(swarmQueueTaskV1=>swarmQueueTaskV1.claim?.sessionId===sessionId).sort((leftSwarmQueueTaskV2,rightSwarmQueueTaskV2)=>(rightSwarmQueueTaskV2.claimSequence??-1)-(leftSwarmQueueTaskV2.claimSequence??-1))[0];
 function affinity(swarmQueueTaskV1:Task):number{return previousSwarmQueueTaskV2===undefined?0:swarmQueueTaskV1.context.filter(value=>previousSwarmQueueTaskV2.context.includes(value)).length;}
 const eligible=swarmQueueStateV3.tasks.filter(swarmQueueTaskV1=>swarmQueueTaskV1.state==='ready'&&(swarmQueueTaskV1.claim===null||swarmQueueTaskV1.claim.sessionId===sessionId)&&swarmQueueTaskV1.obligationIds.some(id=>!satisfied.has(id))
  &&swarmQueueTaskV1.obligationIds.every(id=>{const bindingObligationEffectiveBinding=swarmQueueCanonical.scope.bindings.get(id);return bindingObligationEffectiveBinding!==undefined&&bindingObligationEffectiveBinding.dependsOn.every(dependency=>satisfied.has(dependency)||swarmQueueTaskV1.obligationIds.includes(dependency));})
  &&reserved.every(ownerSwarmQueueTaskV2=>ownerSwarmQueueTaskV2.id===swarmQueueTaskV1.id||!ownerSwarmQueueTaskV2.obligationIds.some(id=>swarmQueueTaskV1.obligationIds.includes(id))&&!taskPaths(ownerSwarmQueueTaskV2,swarmQueueCanonical).some(left=>taskPaths(swarmQueueTaskV1,swarmQueueCanonical,false).some(right=>overlaps(left,right)))));
 const preferred=eligible.filter(swarmQueueTaskV1=>swarmQueueTaskV1.preferredWorker===sessionId).sort((leftSwarmQueueTaskV2,rightSwarmQueueTaskV2)=>leftSwarmQueueTaskV2.sequence-rightSwarmQueueTaskV2.sequence);
 return preferred[0]??eligible.sort((leftSwarmQueueTaskV2,rightSwarmQueueTaskV2)=>affinity(rightSwarmQueueTaskV2)-affinity(leftSwarmQueueTaskV2)||leftSwarmQueueTaskV2.sequence-rightSwarmQueueTaskV2.sequence)[0]??null;
}
interface SwarmQueueActorContext {readonly rootPath:string;readonly workerGeneration:string|null;}
export class SwarmQueueStore {
 constructor(private readonly pool:Pool,private readonly projectId:string,private readonly ownerRoot:string){}
 private async validateActor(poolClient:PoolClient,swarmQueueActorV1:SwarmQueueActorV1,invokingRoot:string,campaignId:string):Promise<SwarmQueueActorContext> {
  const owner=(await poolClient.query<Record<string,unknown>>('SELECT * FROM ponytail_index.swarm_owner_v1 WHERE project_id=$1 AND owner_root=$2',[this.projectId,this.ownerRoot])).rows[0];
  requireQueue(owner!==undefined,'swarm owner is absent');
  requireQueue(fs.realpathSync(this.ownerRoot)===this.ownerRoot&&git(this.ownerRoot,['rev-parse','--show-toplevel']).trim()===this.ownerRoot
   &&fs.realpathSync(git(this.ownerRoot,['rev-parse','--path-format=absolute','--git-common-dir']).trim())===owner.git_common_directory,'owner checkout identity changed');
  switch(swarmQueueActorV1.kind){
   case 'coordinator':requireQueue(owner.coordinator_session_id===swarmQueueActorV1.sessionId&&invokingRoot===this.ownerRoot,'coordinator identity/cwd differs');return {rootPath:this.ownerRoot,workerGeneration:null};
   case 'worker':{
    const row=(await poolClient.query<Record<string,unknown>>(`SELECT k.*,n.root_path,m.generation AS membership_generation,w.root_path AS checkout_root FROM ponytail_index.swarm_worker_v1 k
      JOIN ponytail_index.swarm_native_session_v1 n USING(session_id)
      JOIN ponytail_index.swarm_worktree_v1 m ON m.project_id=k.project_id AND m.number=k.worktree_number
      JOIN ponytail_index.rolling_worktree_v1 w ON w.project_id=k.project_id AND w.number=k.worktree_number
      WHERE k.project_id=$1 AND k.owner_root=$2 AND k.session_id=$3`,[this.projectId,this.ownerRoot,swarmQueueActorV1.sessionId])).rows[0];
    requireQueue(row!==undefined&&row.state==='BOUND'&&row.completed===false&&row.generation===swarmQueueActorV1.generation&&row.membership_generation===row.worktree_generation
      &&row.assignment_kind==='plan'&&row.assignment_id===campaignId&&row.root_path===invokingRoot&&row.checkout_root===invokingRoot,'worker identity/generation/cwd differs');
    requireQueue(fs.realpathSync(invokingRoot)===invokingRoot&&fs.realpathSync(git(invokingRoot,['rev-parse','--path-format=absolute','--git-common-dir']).trim())===owner.git_common_directory,'worker repository changed');
    validateRollingSessionMarker(invokingRoot,swarmQueueActorV1.sessionId);return {rootPath:invokingRoot,workerGeneration:swarmQueueActorV1.generation};
   }
  }
 }
 private async save(poolClient:PoolClient,swarmQueueStateV3:SwarmQueueStateV3):Promise<void>{readSwarmQueueStateV3(swarmQueueStateV3);await poolClient.query('UPDATE ponytail_index.swarm_queue_v1 SET state_text=$4,closed=$5,storage_version=3 WHERE project_id=$1 AND owner_root=$2 AND campaign_id=$3',[this.projectId,this.ownerRoot,swarmQueueStateV3.campaignId,JSON.stringify(swarmQueueStateV3),swarmQueueStateV3.state==='complete']);}
 async inspect(campaignId:string):Promise<SwarmQueueStateV3>{const row=(await this.pool.query<Record<string,unknown>>('SELECT CASE WHEN storage_version=3 THEN state_text ELSE NULL END AS state_text FROM ponytail_index.swarm_queue_v1 WHERE project_id=$1 AND owner_root=$2 AND campaign_id=$3',[this.projectId,this.ownerRoot,campaignId])).rows[0];requireQueue(row!==undefined&&typeof row.state_text==='string','queue absent or legacy storage requires authorized queue status migration');return readSwarmQueueStateV3(parseSwarmQueueJson(row.state_text));}
 private coordinator(swarmQueueCommandV3:SwarmQueueCommandV3):void{requireQueue(swarmQueueCommandV3.actor.kind==='coordinator','operation requires the bound coordinator');}
 private async noLegacyAssignments(poolClient:PoolClient):Promise<void>{
  const row=(await poolClient.query<Record<string,unknown>>(`SELECT a.assignment_id FROM ponytail_index.rolling_assignment_v1 a JOIN ponytail_index.rolling_campaign_v1 c USING(project_id,campaign_id)
   WHERE a.project_id=$1 AND c.coordinator_root=$2 AND a.state<>'RELEASED' LIMIT 1`,[this.projectId,this.ownerRoot])).rows[0];
  requireQueue(row===undefined,'quiesce/preserve and release legacy assignments before queue activation');
 }
 private add(swarmQueueStateV3:SwarmQueueStateV3,inputs:readonly SwarmQueueTaskInputV1[],swarmQueueCanonical:SwarmQueueCanonical=canonical(swarmQueueStateV3)):SwarmQueueStateV3 {const next=[...swarmQueueStateV3.tasks];let sequence=swarmQueueStateV3.sequence;
  for(const swarmQueueTaskInputV1 of inputs){
   const existingSwarmQueueTaskV2=next.find(swarmQueueTaskV1=>swarmQueueTaskV1.id===swarmQueueTaskInputV1.id);if(existingSwarmQueueTaskV2!==undefined){requireQueue(isDeepStrictEqual(taskInput({id:existingSwarmQueueTaskV2.id,title:existingSwarmQueueTaskV2.title,obligationIds:existingSwarmQueueTaskV2.obligationIds,preferredWorker:existingSwarmQueueTaskV2.preferredWorker,context:existingSwarmQueueTaskV2.context}),swarmQueueTaskInputV1),'task ID already has different contents');continue;}
   requireQueue(swarmQueueTaskInputV1.obligationIds.every(id=>swarmQueueCanonical.scope.bindings.has(id)),'unknown or unaccepted canonical obligation');
   requireQueue(swarmQueueTaskInputV1.obligationIds.some(id=>!swarmQueueCanonical.scope.projection.satisfiedIds.includes(id)),'obligations already satisfied; do not queue discharged work');
   requireQueue(!next.some(swarmQueueTaskV1=>swarmQueueTaskV1.state!=='done'&&swarmQueueTaskV1.obligationIds.some(id=>swarmQueueTaskInputV1.obligationIds.includes(id))),'obligation already has queued work; use its existing task');
   next.push({...swarmQueueTaskInputV1,sequence:++sequence,claimSequence:null,state:'ready',claim:null,claimHistory:[],candidate:null,checkpoint:null,review:null});
  }
  return {...swarmQueueStateV3,tasks:next,sequence};
 }
 private validateDiscovery(swarmQueueStateV3:SwarmQueueStateV3,swarmQueueDiscoveryV1:SwarmQueueDiscoveryV1):void {
  requireQueue(swarmQueueDiscoveryV1.updates.length>0&&new Set(swarmQueueDiscoveryV1.updates.map(updateSwarmQueueDocumentUpdateV1=>updateSwarmQueueDocumentUpdateV1.path)).size===swarmQueueDiscoveryV1.updates.length,'discovery requires unique document updates');
  requireQueue(swarmQueueDiscoveryV1.updates.every((updateSwarmQueueDocumentUpdateV1,index)=>swarmQueueDiscoveryV1.updates.every((otherSwarmQueueDocumentUpdateV1,otherIndex)=>index===otherIndex||!overlaps(updateSwarmQueueDocumentUpdateV1.path,otherSwarmQueueDocumentUpdateV1.path))),'document updates cannot contain ancestor/descendant file conflicts');
  const rootsSwarmQueueRecordRootsV1=swarmQueueStateV3.recordRoots;
  if(swarmQueueDiscoveryV1.kind==='bug')requireQueue(swarmQueueDiscoveryV1.updates.some(updateSwarmQueueDocumentUpdateV1=>updateSwarmQueueDocumentUpdateV1.path.startsWith(rootsSwarmQueueRecordRootsV1.issues+'/')),'bug discovery requires an issue record');
  requireQueue(swarmQueueDiscoveryV1.updates.every(updateSwarmQueueDocumentUpdateV1=>Object.values(rootsSwarmQueueRecordRootsV1).some(root=>updateSwarmQueueDocumentUpdateV1.path.startsWith(root+'/'))||updateSwarmQueueDocumentUpdateV1.path==='.agents/config/project/traceability.json'||updateSwarmQueueDocumentUpdateV1.path===swarmQueueStateV3.bindingsPath),'discovery update outside canonical PM/configuration scope');
  for(const updateSwarmQueueDocumentUpdateV1 of swarmQueueDiscoveryV1.updates){const target=safeFile(swarmQueueStateV3.ownerRoot,updateSwarmQueueDocumentUpdateV1.path);requireQueue((fs.existsSync(target)?fs.readFileSync(target,'utf8'):null)===updateSwarmQueueDocumentUpdateV1.beforeContent,`stale document: ${updateSwarmQueueDocumentUpdateV1.path}`);}
  const beforeSwarmQueueCanonical=canonical(swarmQueueStateV3);const documentUpdateSwarmQueueDocumentUpdateV1=swarmQueueDiscoveryV1.updates.find(updateSwarmQueueDocumentUpdateV1=>updateSwarmQueueDocumentUpdateV1.path===swarmQueueStateV3.documentPath);
  const proposed=new Map(swarmQueueDiscoveryV1.updates.map(updateSwarmQueueDocumentUpdateV1=>[updateSwarmQueueDocumentUpdateV1.path,updateSwarmQueueDocumentUpdateV1.content]));
  const afterObligationDocumentV1=documentUpdateSwarmQueueDocumentUpdateV1===undefined?beforeSwarmQueueCanonical.document:acceptCheckpoint(beforeSwarmQueueCanonical.document,parseObligationDocument(documentUpdateSwarmQueueDocumentUpdateV1.content),swarmQueueStateV3.ownerRoot,proposed);
  requireQueue(afterObligationDocumentV1.certificates.length===beforeSwarmQueueCanonical.document.certificates.length&&afterObligationDocumentV1.checkpoints.slice(beforeSwarmQueueCanonical.document.checkpoints.length).every(obligationCheckpoint=>obligationCheckpoint.certificateIds.length===0)||swarmQueueDiscoveryV1.actor.kind==='coordinator','canonical assessment requires coordinator');
  const historyUpdateSwarmQueueDocumentUpdateV1=swarmQueueDiscoveryV1.updates.find(updateSwarmQueueDocumentUpdateV1=>updateSwarmQueueDocumentUpdateV1.path===swarmQueueStateV3.bindingsPath);
  const obligationBindingHistoryV1=historyUpdateSwarmQueueDocumentUpdateV1===undefined?beforeSwarmQueueCanonical.history:parseObligationBindingHistory(historyUpdateSwarmQueueDocumentUpdateV1.content);
  requireQueue(obligationBindingHistoryV1.scopeId===beforeSwarmQueueCanonical.history.scopeId&&obligationBindingHistoryV1.revisions.length>=beforeSwarmQueueCanonical.history.revisions.length&&beforeSwarmQueueCanonical.history.revisions.every((revisionObligationBindingRevisionV1,index)=>isDeepStrictEqual(revisionObligationBindingRevisionV1,obligationBindingHistoryV1.revisions[index])),'accepted binding history prefix is immutable');
  const projectionObligationScopeProjection=projectObligationScope(afterObligationDocumentV1,swarmQueueStateV3.ownerRoot,obligationBindingHistoryV1,undefined,proposed);
  requireQueue(swarmQueueStateV3.tasks.filter(swarmQueueTaskV1=>swarmQueueTaskV1.state==='working').every(swarmQueueTaskV1=>swarmQueueTaskV1.claim?.leases.every(leaseObligationLeaseV1=>isDeepStrictEqual(leaseObligationLeaseV1.binding,projectionObligationScopeProjection.bindings.get(leaseObligationLeaseV1.binding.obligationId)))),'discovery cannot alter an actively executing frozen binding');
  requireQueue(swarmQueueDiscoveryV1.tasks.every(swarmQueueTaskInputV1=>swarmQueueTaskInputV1.obligationIds.every(id=>projectionObligationScopeProjection.bindings.has(id))),'discovered obligations missing from accepted baseline');
  requireQueue(swarmQueueDiscoveryV1.tasks.every(swarmQueueTaskInputV1=>!swarmQueueStateV3.tasks.some(existingSwarmQueueTaskV2=>existingSwarmQueueTaskV2.state!=='done'&&existingSwarmQueueTaskV2.id!==swarmQueueTaskInputV1.id&&existingSwarmQueueTaskV2.obligationIds.some(id=>swarmQueueTaskInputV1.obligationIds.includes(id)))),'discovered work duplicates an existing obligation');
  this.add(swarmQueueStateV3,swarmQueueDiscoveryV1.tasks,{document:afterObligationDocumentV1,history: obligationBindingHistoryV1,scope:projectionObligationScopeProjection,digest:digest(JSON.stringify(afterObligationDocumentV1)+JSON.stringify(obligationBindingHistoryV1))});
  if(swarmQueueDiscoveryV1.tasks.length===0){
   requireQueue(swarmQueueDiscoveryV1.actor.kind==='coordinator'&&swarmQueueDiscoveryV1.kind==='work'&&documentUpdateSwarmQueueDocumentUpdateV1!==undefined,'existing-obligation assessment requires coordinator and canonical checkpoint');
   requireQueue(isDeepStrictEqual(afterObligationDocumentV1.baselines,beforeSwarmQueueCanonical.document.baselines)&&isDeepStrictEqual(afterObligationDocumentV1.obligations,beforeSwarmQueueCanonical.document.obligations)&&historyUpdateSwarmQueueDocumentUpdateV1===undefined,'assessment cannot change scope or bindings; register discovered work with tasks');
   const assessedObligationCertificates=afterObligationDocumentV1.certificates.filter(obligationCertificate=>afterObligationDocumentV1.checkpoints.at(-1)?.certificateIds.includes(obligationCertificate.id));
   requireQueue(assessedObligationCertificates.length>0,'assessment requires accepted canonical certificates');
   requireQueue(swarmQueueDiscoveryV1.updates.every(updateSwarmQueueDocumentUpdateV1=>updateSwarmQueueDocumentUpdateV1.path===swarmQueueStateV3.documentPath||updateSwarmQueueDocumentUpdateV1.path.startsWith(rootsSwarmQueueRecordRootsV1.plans+'/')&&assessedObligationCertificates.some(obligationCertificate=>obligationCertificate.artifacts.includes(updateSwarmQueueDocumentUpdateV1.path))),'assessment updates must be canonical checkpoint or its plan evidence');
  }else{
  requireQueue(swarmQueueDiscoveryV1.updates.some(updateSwarmQueueDocumentUpdateV1=>updateSwarmQueueDocumentUpdateV1.path.startsWith(rootsSwarmQueueRecordRootsV1.requirements+'/'))&&swarmQueueDiscoveryV1.updates.some(updateSwarmQueueDocumentUpdateV1=>updateSwarmQueueDocumentUpdateV1.path.startsWith(rootsSwarmQueueRecordRootsV1.uat+'/'))&&swarmQueueDiscoveryV1.updates.some(updateSwarmQueueDocumentUpdateV1=>updateSwarmQueueDocumentUpdateV1.path.startsWith(rootsSwarmQueueRecordRootsV1.plans+'/')),'discovery must reconcile configured requirements, UAT and plan records');
  }
  // Requirements and UAT must be named by the canonical obligation; no fabricated completion is inferred.
  for(const swarmQueueTaskInputV1 of swarmQueueDiscoveryV1.tasks)for(const id of swarmQueueTaskInputV1.obligationIds){const obligation=afterObligationDocumentV1.obligations.find(obligation=>obligation.id===id);requireQueue(obligation!==undefined,'missing discovered obligation');
   requireQueue(obligation.requirementIds.length>0&&obligation.acceptanceGroups.length>0,'discovered work requires requirements and acceptance references');
   for(const requirementId of obligation.requirementIds){const requirementObligationRequirement=afterObligationDocumentV1.baselines.find(valueObligationBaseline=>valueObligationBaseline.id===projectionObligationScopeProjection.projection.baselineId)?.requirements.find(valueObligationRequirement=>valueObligationRequirement.id===requirementId);requireQueue(requirementObligationRequirement!==undefined,'requirement is absent from canonical baseline');
    const content=proposed.get(requirementObligationRequirement.path)??readFile(swarmQueueStateV3.ownerRoot,requirementObligationRequirement.path);requireQueue(swarmQueueDiscoveryV1.updates.some(updateSwarmQueueDocumentUpdateV1=>updateSwarmQueueDocumentUpdateV1.path===requirementObligationRequirement.path),'discovery must reconcile the actual canonical requirement source');
    requireQueue(digest(content)===requirementObligationRequirement.digest,'requirement digest differs from proposed canonical source');
    requireQueue(swarmQueueDiscoveryV1.updates.some(updateSwarmQueueDocumentUpdateV1=>updateSwarmQueueDocumentUpdateV1.path.startsWith(rootsSwarmQueueRecordRootsV1.uat+'/')&&updateSwarmQueueDocumentUpdateV1.content.includes(requirementId)),'discovery UAT must reference every affected requirement');
   }
  }
  const traceabilityPath='.agents/config/project/traceability.json';if(fs.existsSync(path.join(swarmQueueStateV3.ownerRoot,traceabilityPath))||proposed.has(traceabilityPath)){const traceability=parseSwarmQueueJson(proposed.get(traceabilityPath)??readFile(swarmQueueStateV3.ownerRoot,traceabilityPath));requireQueue(isRecord(traceability)&&Array.isArray(traceability.requirements)&&Array.isArray(traceability.artifacts),'invalid configured traceability inventory');
   for(const swarmQueueTaskInputV1 of swarmQueueDiscoveryV1.tasks)for(const id of swarmQueueTaskInputV1.obligationIds){const obligation=afterObligationDocumentV1.obligations.find(value=>value.id===id);requireQueue(obligation?.requirementIds.every(requirementId=>Array.isArray(traceability.requirements)&&traceability.requirements.some((value:unknown)=>isRecord(value)&&value.id===requirementId)),'affected requirement missing from traceability configuration');}
  }
 }
 private publishDiscovery(swarmQueueStateV3:SwarmQueueStateV3,swarmQueueDiscoveryV1:SwarmQueueDiscoveryV1):void {
  for(const updateSwarmQueueDocumentUpdateV1 of swarmQueueDiscoveryV1.updates){const target=safeFile(swarmQueueStateV3.ownerRoot,updateSwarmQueueDocumentUpdateV1.path);const current=fs.existsSync(target)?fs.readFileSync(target,'utf8'):null;
   requireQueue(current===updateSwarmQueueDocumentUpdateV1.beforeContent||current===updateSwarmQueueDocumentUpdateV1.content,`discovery recovery conflict: ${updateSwarmQueueDocumentUpdateV1.path}; preserve external changes`);
  }
  for(const updateSwarmQueueDocumentUpdateV1 of swarmQueueDiscoveryV1.updates){const target=safeFile(swarmQueueStateV3.ownerRoot,updateSwarmQueueDocumentUpdateV1.path);if(fs.existsSync(target)&&digest(fs.readFileSync(target,'utf8'))===digest(updateSwarmQueueDocumentUpdateV1.content))continue;
   fs.mkdirSync(path.dirname(target),{recursive:true});const temporary=path.join(path.dirname(target),`.ponytail-${crypto.randomUUID()}`);
   try{const fd=fs.openSync(temporary,'wx',fs.existsSync(target)?fs.statSync(target).mode&0o777:0o644);try{fs.writeFileSync(fd,updateSwarmQueueDocumentUpdateV1.content,'utf8');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
    fs.renameSync(temporary,target);const directory=fs.openSync(path.dirname(target),'r');try{fs.fsyncSync(directory);}finally{fs.closeSync(directory);}
   }finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
  }
 }
 // Traceability: implements REQ-SWARM-QUEUES
 async authorizeRetirement(input:SwarmRetirementAuthorizationCommandV1,invokingRoot:string):Promise<SwarmRetirementAuthorizationV1>{
  const command=readSwarmRetirementAuthorizationCommandV1(input);const poolClient=await this.pool.connect();
  try{await poolClient.query('BEGIN');await poolClient.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[this.projectId]);await this.validateActor(poolClient,command.actor,invokingRoot,command.campaignId);requireQueue(command.actor.kind==='coordinator','retirement authorization requires coordinator');
   const row=(await poolClient.query<Record<string,unknown>>('SELECT state_text FROM ponytail_index.swarm_queue_v1 WHERE project_id=$1 AND owner_root=$2 AND campaign_id=$3 AND storage_version=3 AND NOT closed FOR UPDATE',[this.projectId,this.ownerRoot,command.campaignId])).rows[0];requireQueue(row!==undefined&&typeof row.state_text==='string'&&readSwarmQueueStateV3(parseSwarmQueueJson(row.state_text)).state==='suspended','retirement authorization requires this suspended campaign');
   const existing=(await poolClient.query<Record<string,unknown>>('SELECT authority_text FROM ponytail_index.swarm_queue_retirement_authority_v1 WHERE project_id=$1 AND owner_root=$2 AND campaign_id=$3 AND authorization_id=$4',[this.projectId,this.ownerRoot,command.campaignId,command.id])).rows[0];
   if(existing!==undefined){requireQueue(typeof existing.authority_text==='string','invalid retained authority');const authority=readSwarmRetirementAuthorizationV1(parseSwarmQueueJson(existing.authority_text));requireQueue(authority.reason===command.reason&&authority.coordinatorSessionId===command.actor.sessionId&&authority.hostEvidence.path===command.hostEvidencePath&&authority.hostEvidence.blob.sha256===await fileDigest(safeFile(this.ownerRoot,command.hostEvidencePath))&&isDeepStrictEqual(authority.worktrees.map(worker=>({number:worker.number,generation:worker.generation})),command.worktrees),'retirement authorization ID already differs');await poolClient.query('COMMIT');return authority;}
   const worktrees:SwarmRetirementAuthorizationV1['worktrees'][number][]=[];
   for(const selector of command.worktrees){const rows=(await poolClient.query<Record<string,unknown>>("SELECT k.session_id,k.generation AS worker_generation,n.root_path FROM ponytail_index.swarm_worktree_v1 s JOIN ponytail_index.rolling_worktree_v1 w USING(project_id,number) JOIN ponytail_index.swarm_worker_v1 k ON k.project_id=s.project_id AND k.owner_root=s.owner_root AND k.worktree_number=s.number AND k.worktree_generation=s.generation JOIN ponytail_index.swarm_native_session_v1 n ON n.session_id=k.session_id AND n.project_id=k.project_id AND n.root_path=w.root_path WHERE s.project_id=$1 AND s.owner_root=$2 AND s.number=$3 AND s.generation=$4 AND k.state='REMOVED' ORDER BY k.worker_number DESC LIMIT 1",[this.projectId,this.ownerRoot,selector.number,selector.generation])).rows;const worker=rows[0];requireQueue(worker!==undefined,'selector lacks an exact removed original worker/membership');const rootPath=text(worker.root_path);requireQueue(!fs.existsSync(rootPath)||fs.lstatSync(rootPath).isDirectory()&&!fs.existsSync(path.join(rootPath,'.git')),'authorization is only for already missing native checkouts');requireQueue(!await hasSwarmNativeOwner(poolClient,this.projectId,rootPath)&&!(await poolClient.query("SELECT 1 FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND worktree_number=$2 AND state<>'RELEASED'",[this.projectId,selector.number])).rowCount,'checkout still has an active actor or assignment');worktrees.push({...selector,sessionId:text(worker.session_id),workerGeneration:text(worker.worker_generation),rootPath});}
   const blob=await new SwarmQueuePayloads(poolClient,this.projectId,this.ownerRoot,command.campaignId).file(safeFile(this.ownerRoot,command.hostEvidencePath));requireQueue(blob.byteLength>0,'preservation evidence is empty');const authority:SwarmRetirementAuthorizationV1={schemaVersion:1,campaignId:command.campaignId,ownerRoot:this.ownerRoot,coordinatorSessionId:command.actor.sessionId,id:command.id,reason:command.reason,hostEvidence:{path:command.hostEvidencePath,blob},worktrees};readSwarmRetirementAuthorizationV1(authority);await poolClient.query('INSERT INTO ponytail_index.swarm_queue_retirement_authority_v1(project_id,owner_root,campaign_id,authorization_id,authority_text) VALUES($1,$2,$3,$4,$5)',[this.projectId,this.ownerRoot,command.campaignId,command.id,JSON.stringify(authority)]);await poolClient.query('COMMIT');return authority;
  }catch(cause){await poolClient.query('ROLLBACK');throw cause;}finally{poolClient.release();}
 }
 // Traceability: implements REQ-SWARM-QUEUES
 async execute(inputSwarmQueueCommandV1:SwarmQueueCommandV1|SwarmQueueCommandV2|SwarmQueueCommandV3,invokingRoot:string):Promise<SwarmQueueOperation>{
  const swarmQueueCommandV3=readSwarmQueueCommand(inputSwarmQueueCommandV1);const poolClient=await this.pool.connect();let transaction=false;
  try{
   await poolClient.query('SELECT pg_advisory_lock(hashtextextended($1,0))',[this.projectId]);
   await poolClient.query('BEGIN');transaction=true;
   const swarmQueueActorContext=await this.validateActor(poolClient,swarmQueueCommandV3.actor,invokingRoot,swarmQueueCommandV3.campaignId);
   let swarmQueueStateV3:SwarmQueueStateV3;
   const storage=(await poolClient.query<Record<string,unknown>>('SELECT storage_version FROM ponytail_index.swarm_queue_v1 WHERE project_id=$1 AND owner_root=$2 AND campaign_id=$3 FOR UPDATE',[this.projectId,this.ownerRoot,swarmQueueCommandV3.campaignId])).rows[0];
   if(storage?.storage_version===1){const swarmQueuePayloads=new SwarmQueuePayloads(poolClient,this.projectId,this.ownerRoot,swarmQueueCommandV3.campaignId);const migratedSwarmQueueStateV2=readSwarmQueueStateV2(await swarmQueuePayloads.migrate());await poolClient.query('UPDATE ponytail_index.swarm_queue_v1 SET legacy_state_text=state_text,state_text=$4,storage_version=2 WHERE project_id=$1 AND owner_root=$2 AND campaign_id=$3',[this.projectId,this.ownerRoot,swarmQueueCommandV3.campaignId,JSON.stringify(migratedSwarmQueueStateV2)]);}
   if(storage!==undefined){const row=(await poolClient.query<Record<string,unknown>>('SELECT state_text,storage_version FROM ponytail_index.swarm_queue_v1 WHERE project_id=$1 AND owner_root=$2 AND campaign_id=$3',[this.projectId,this.ownerRoot,swarmQueueCommandV3.campaignId])).rows[0];if(row?.storage_version===2){requireQueue(typeof row.state_text==='string','invalid V2 state');const previous=readSwarmQueueStateV2(parseSwarmQueueJson(row.state_text));await poolClient.query('UPDATE ponytail_index.swarm_queue_v1 SET state_text=$4,storage_version=3 WHERE project_id=$1 AND owner_root=$2 AND campaign_id=$3',[this.projectId,this.ownerRoot,swarmQueueCommandV3.campaignId,JSON.stringify({...previous,schemaVersion:3,suspension:null})]);}}
   const row=(await poolClient.query<Record<string,unknown>>('SELECT state_text FROM ponytail_index.swarm_queue_v1 WHERE project_id=$1 AND owner_root=$2 AND campaign_id=$3 FOR UPDATE',[this.projectId,this.ownerRoot,swarmQueueCommandV3.campaignId])).rows[0];
   if(row===undefined){requireQueue(swarmQueueCommandV3.command==='init','queue campaign is absent');this.coordinator(swarmQueueCommandV3);await this.noLegacyAssignments(poolClient);
    requireQueue(swarmQueueCommandV3.authority.length>0,'explicit campaign authority references required');
    swarmQueueStateV3={schemaVersion:3,suspension:null,campaignId:swarmQueueCommandV3.campaignId,ownerRoot:this.ownerRoot,documentPath:swarmQueueCommandV3.documentPath,bindingsPath:swarmQueueCommandV3.bindingsPath,authority:swarmQueueCommandV3.authority,assessor:swarmQueueCommandV3.assessor,recordRoots:swarmQueueCommandV3.recordRoots,state:'open',sequence:0,tasks:[],requests:[],pending:null,discoveries:[]};const currentSwarmQueueCanonical=canonical(swarmQueueStateV3);const first=currentSwarmQueueCanonical.scope.bindings.keys().next().value;if(first!==undefined)freezeObligationLease(currentSwarmQueueCanonical.document,currentSwarmQueueCanonical.history,{obligationId:first,generation:crypto.randomUUID(),graphDigest:currentSwarmQueueCanonical.digest,assessor:swarmQueueStateV3.assessor,authority:swarmQueueStateV3.authority});
    await poolClient.query('INSERT INTO ponytail_index.swarm_queue_v1(project_id,owner_root,campaign_id,state_text,closed,storage_version) VALUES($1,$2,$3,$4,false,3)',[this.projectId,this.ownerRoot,swarmQueueStateV3.campaignId,JSON.stringify(swarmQueueStateV3)]);
   }else {requireQueue(typeof row.state_text==='string','invalid stored state');swarmQueueStateV3=readSwarmQueueStateV3(parseSwarmQueueJson(row.state_text));}
   requireQueue(swarmQueueStateV3.ownerRoot===this.ownerRoot&&swarmQueueStateV3.campaignId===swarmQueueCommandV3.campaignId,'stored owner/campaign differs');
   const readOnly=['status','requests','page','artifact-read'].includes(swarmQueueCommandV3.command);
   requireQueue(swarmQueueStateV3.pending===null||readOnly||swarmQueueCommandV3.command==='recover'||swarmQueueCommandV3.command==='abort-discovery'||swarmQueueCommandV3.command==='discover'||swarmQueueCommandV3.command==='status','finish pending discovery through recover before mutating queue');
   let resultTaskSwarmQueueTaskV2:SwarmQueueTaskV2|null=null;let resultRequestSwarmQueueRequestV2:SwarmQueueRequestV2|null=null;let page:SwarmQueuePageV2|null=null;let artifact:SwarmQueueArtifactReadV2|null=null;
   if(!readOnly)requireQueue(swarmQueueStateV3.state==='open'||swarmQueueCommandV3.command==='complete'&&swarmQueueStateV3.state==='complete'||swarmQueueCommandV3.command==='suspend'&&swarmQueueStateV3.state==='suspended','campaign execution is complete or suspended');
   switch(swarmQueueCommandV3.command){
   case 'init':this.coordinator(swarmQueueCommandV3);requireQueue(swarmQueueStateV3.documentPath===swarmQueueCommandV3.documentPath&&swarmQueueStateV3.bindingsPath===swarmQueueCommandV3.bindingsPath&&isDeepStrictEqual(swarmQueueStateV3.authority,swarmQueueCommandV3.authority)&&swarmQueueStateV3.assessor===swarmQueueCommandV3.assessor&&isDeepStrictEqual(swarmQueueStateV3.recordRoots,swarmQueueCommandV3.recordRoots),'campaign already initialized differently');break;
   case 'suspend':{this.coordinator(swarmQueueCommandV3);requireQueue(swarmQueueStateV3.pending===null,'settle pending discovery before suspension');if(swarmQueueStateV3.suspension!==null){requireQueue(swarmQueueStateV3.suspension.reason===swarmQueueCommandV3.reason&&swarmQueueStateV3.suspension.hostEvidence.path===swarmQueueCommandV3.hostEvidencePath&&swarmQueueStateV3.suspension.hostEvidence.blob.sha256===await fileDigest(safeFile(this.ownerRoot,swarmQueueCommandV3.hostEvidencePath)),'suspension already differs');break;}const blob=await new SwarmQueuePayloads(poolClient,this.projectId,this.ownerRoot,swarmQueueStateV3.campaignId).file(safeFile(this.ownerRoot,swarmQueueCommandV3.hostEvidencePath));requireQueue(blob.byteLength>0,'host quiescence/preservation evidence is empty');const workers=(await poolClient.query<Record<string,unknown>>("SELECT k.session_id,k.generation,n.root_path FROM ponytail_index.swarm_worker_v1 k JOIN ponytail_index.swarm_native_session_v1 n ON n.session_id=k.session_id AND n.project_id=k.project_id WHERE k.project_id=$1 AND k.owner_root=$2 AND k.state<>'REMOVED' ORDER BY k.worker_number",[this.projectId,this.ownerRoot])).rows.map(row=>({sessionId:text(row.session_id),generation:text(row.generation),rootPath:text(row.root_path)}));swarmQueueStateV3={...swarmQueueStateV3,state:'suspended',suspension:{workers,reason:swarmQueueCommandV3.reason,coordinatorSessionId:swarmQueueCommandV3.actor.sessionId,hostEvidence:{path:swarmQueueCommandV3.hostEvidencePath,blob}}};break;}
   case 'status':break;
   case 'requests':{const requests=swarmQueueStateV3.requests.filter(request=>request.state!=='resolved');page={collection:'requests',items:requests.slice(0,32),offset:0,nextOffset:requests.length>32?32:null,unresolvedOnly:true};break;}
   case 'page':{const offset=swarmQueueCommandV3.offset,limit=swarmQueueCommandV3.limit,unresolvedOnly=swarmQueueCommandV3.unresolvedOnly;if(swarmQueueCommandV3.collection==='tasks'){const tasks=swarmQueueStateV3.tasks.filter(task=>!unresolvedOnly||task.state!=='done');page={collection:'tasks',items:tasks.slice(offset,offset+limit).map(taskReceipt),offset,nextOffset:offset+limit<tasks.length?offset+limit:null,unresolvedOnly};}else{const requests=swarmQueueStateV3.requests.filter(request=>!unresolvedOnly||request.state!=='resolved');page={collection:'requests',items:requests.slice(offset,offset+limit),offset,nextOffset:offset+limit<requests.length?offset+limit:null,unresolvedOnly};}break;}
   case 'artifact-read':{const swarmQueuePayloads=new SwarmQueuePayloads(poolClient,this.projectId,this.ownerRoot,swarmQueueStateV3.campaignId);artifact={...await swarmQueuePayloads.read(swarmQueueCommandV3.id,swarmQueueCommandV3.offset,swarmQueueCommandV3.length),offset:swarmQueueCommandV3.offset};break;}

   case 'add':swarmQueueStateV3=this.add(swarmQueueStateV3,swarmQueueCommandV3.tasks);break;
   case 'claim':{
    requireQueue(swarmQueueCommandV3.actor.kind==='worker'&&swarmQueueActorContext.workerGeneration!==null,'claim requires original bound worker');requireRollingGitOperationAbsent(swarmQueueActorContext.rootPath);
    await this.noLegacyAssignments(poolClient);
    const existingSwarmQueueTaskV2=swarmQueueStateV3.tasks.find(swarmQueueTaskV1=>swarmQueueTaskV1.state==='working'&&swarmQueueTaskV1.claim?.sessionId===swarmQueueCommandV3.actor.sessionId);if(existingSwarmQueueTaskV2!==undefined){requireQueue(existingSwarmQueueTaskV2.claim?.workerGeneration===swarmQueueActorContext.workerGeneration,'worker generation changed');resultTaskSwarmQueueTaskV2=existingSwarmQueueTaskV2;break;}
    const swarmQueueCanonical=canonical(swarmQueueStateV3);swarmQueueStateV3=reconcileUnclaimed(swarmQueueStateV3,swarmQueueCanonical);const selectedSwarmQueueTaskV2=selectSwarmQueueTask(swarmQueueStateV3,swarmQueueCommandV3.actor.sessionId,swarmQueueCanonical);if(selectedSwarmQueueTaskV2===null)break;
    const generation=crypto.randomUUID();const leases=selectedSwarmQueueTaskV2.obligationIds.map(obligationId=>freezeObligationLease(swarmQueueCanonical.document,swarmQueueCanonical.history,{obligationId,generation,graphDigest:swarmQueueCanonical.digest,assessor:swarmQueueStateV3.assessor,authority:swarmQueueStateV3.authority}));
    const swarmQueueClaimV1:SwarmQueueClaimV1={generation,sessionId:swarmQueueCommandV3.actor.sessionId,workerGeneration:swarmQueueActorContext.workerGeneration,rootPath:swarmQueueActorContext.rootPath,base:git(swarmQueueActorContext.rootPath,['rev-parse','HEAD']).trim(),leases};
    resultTaskSwarmQueueTaskV2={...selectedSwarmQueueTaskV2,claimSequence:swarmQueueStateV3.sequence+1,state:'working',claim:swarmQueueClaimV1,claimHistory:selectedSwarmQueueTaskV2.claim===null?selectedSwarmQueueTaskV2.claimHistory:[...selectedSwarmQueueTaskV2.claimHistory,selectedSwarmQueueTaskV2.claim],candidate:null,review:null};swarmQueueStateV3={...swarmQueueStateV3,sequence:swarmQueueStateV3.sequence+1,tasks:swarmQueueStateV3.tasks.map(swarmQueueTaskV1=>swarmQueueTaskV1.id===selectedSwarmQueueTaskV2.id?resultTaskSwarmQueueTaskV2??swarmQueueTaskV1:swarmQueueTaskV1)};break;
   }
   case 'refresh-base':{
    requireQueue(swarmQueueCommandV3.actor.kind==='worker','refresh requires original worker');const swarmQueueTaskV1=swarmQueueStateV3.tasks.find(swarmQueueTaskV1=>swarmQueueTaskV1.id===swarmQueueCommandV3.taskId);requireQueue(swarmQueueTaskV1!==undefined&&swarmQueueTaskV1.state==='working'&&swarmQueueTaskV1.claim!==null&&swarmQueueTaskV1.claim.sessionId===swarmQueueCommandV3.actor.sessionId&&swarmQueueTaskV1.claim.workerGeneration===swarmQueueActorContext.workerGeneration&&swarmQueueTaskV1.claim.generation===swarmQueueCommandV3.generation,'stale or foreign working claim');
    requireRollingGitOperationAbsent(swarmQueueActorContext.rootPath);requireQueue(swarmQueueCommandV3.base===git(this.ownerRoot,['rev-parse','HEAD']).trim()&&gitResult(this.ownerRoot,['merge-base','--is-ancestor',swarmQueueTaskV1.claim.base,swarmQueueCommandV3.base]).status===0,'refresh base must be current descendant owner HEAD');
    const currentSwarmQueueCanonical=canonical(swarmQueueStateV3);requireQueue(swarmQueueTaskV1.claim.leases.every(leaseObligationLeaseV1=>isDeepStrictEqual(leaseObligationLeaseV1.binding,currentSwarmQueueCanonical.scope.bindings.get(leaseObligationLeaseV1.binding.obligationId))),'binding changed; hand off and renew through canonical graph');
    if(swarmQueueCommandV3.base===swarmQueueTaskV1.claim.base){resultTaskSwarmQueueTaskV2=swarmQueueTaskV1;break;}const generation=crypto.randomUUID();const preservedSwarmQueueCheckpointV2=await this.preserveSource(poolClient,swarmQueueActorContext.rootPath,swarmQueueStateV3,swarmQueueTaskV1);
    resultTaskSwarmQueueTaskV2={...swarmQueueTaskV1,claimHistory:[...swarmQueueTaskV1.claimHistory,swarmQueueTaskV1.claim],claim:{...swarmQueueTaskV1.claim,generation,base:swarmQueueCommandV3.base,leases:swarmQueueTaskV1.claim.leases.map(leaseObligationLeaseV1=>({...leaseObligationLeaseV1,generation}))},checkpoint:preservedSwarmQueueCheckpointV2,candidate:null,review:null};swarmQueueStateV3={...swarmQueueStateV3,tasks:swarmQueueStateV3.tasks.map(valueSwarmQueueTaskV2=>valueSwarmQueueTaskV2.id===swarmQueueTaskV1.id?resultTaskSwarmQueueTaskV2??valueSwarmQueueTaskV2:valueSwarmQueueTaskV2)};break;
   }
   case 'handoff':{
    requireQueue(swarmQueueCommandV3.actor.kind==='worker','handoff requires original worker');const swarmQueueTaskV1=swarmQueueStateV3.tasks.find(swarmQueueTaskV1=>swarmQueueTaskV1.id===swarmQueueCommandV3.taskId);
    requireQueue(swarmQueueTaskV1!==undefined&&swarmQueueTaskV1.claim!==null&&swarmQueueTaskV1.claim.sessionId===swarmQueueCommandV3.actor.sessionId&&swarmQueueTaskV1.claim.workerGeneration===swarmQueueActorContext.workerGeneration&&swarmQueueTaskV1.claim.generation===swarmQueueCommandV3.generation,'stale or foreign task claim');
    const existingSwarmQueueRequestV2=swarmQueueStateV3.requests.find(requestSwarmQueueRequestV2=>requestSwarmQueueRequestV2.id===swarmQueueCommandV3.requestId);if(existingSwarmQueueRequestV2!==undefined){requireQueue(existingSwarmQueueRequestV2.taskId===swarmQueueTaskV1.id&&existingSwarmQueueRequestV2.claimGeneration===swarmQueueCommandV3.generation&&existingSwarmQueueRequestV2.kind===swarmQueueCommandV3.kind&&existingSwarmQueueRequestV2.detail===swarmQueueCommandV3.detail&&isDeepStrictEqual(existingSwarmQueueRequestV2.evidencePaths,swarmQueueCommandV3.evidencePaths)&&isDeepStrictEqual(swarmQueueTaskV1.candidate,swarmQueueCommandV3.candidate),'request ID already differs');resultTaskSwarmQueueTaskV2=swarmQueueTaskV1;resultRequestSwarmQueueRequestV2=existingSwarmQueueRequestV2;break;}
    requireQueue(swarmQueueTaskV1.state==='working','task is not working');requireRollingGitOperationAbsent(swarmQueueActorContext.rootPath);
    swarmQueueCommandV3.evidencePaths.forEach(relative=>safeFile(swarmQueueActorContext.rootPath,relative));
    if(swarmQueueCommandV3.kind==='integration'){
     requireQueue(swarmQueueCommandV3.candidate===null||swarmQueueCommandV3.candidate.proofPaths.length>0||inspectionTask(swarmQueueTaskV1)&&swarmQueueCommandV3.evidencePaths.length>0,'inspection delivery requires a retained assessment artifact');
     requireQueue(swarmQueueCommandV3.candidate!==null,'integration requires exact reviewed candidate');this.preserveCandidate(swarmQueueActorContext.rootPath,swarmQueueStateV3,swarmQueueTaskV1,swarmQueueCommandV3.candidate);
    }else requireQueue(swarmQueueCommandV3.candidate===null,'help must preserve unfinished work, not claim reviewed completion');
    const capturedPaths=[...new Set([...swarmQueueCommandV3.evidencePaths,...(swarmQueueCommandV3.candidate===null?[]:[swarmQueueCommandV3.candidate.verdictPath,...swarmQueueCommandV3.candidate.proofPaths,...swarmQueueCommandV3.candidate.proofPaths.map(relative=>readObligationEvidence(parseSwarmQueueJson(readFile(swarmQueueActorContext.rootPath,relative))).outputPath)])])];
    const swarmQueuePayloads=new SwarmQueuePayloads(poolClient,this.projectId,this.ownerRoot,swarmQueueStateV3.campaignId);const captured:SwarmQueueArtifactV2[]=[];for(const relative of capturedPaths)captured.push({path:relative,blob:await swarmQueuePayloads.file(safeFile(swarmQueueActorContext.rootPath,relative))});
    const preservedSwarmQueueCheckpointV2=await this.preserveSource(poolClient,swarmQueueActorContext.rootPath,swarmQueueStateV3,swarmQueueTaskV1);
    const sequence=swarmQueueStateV3.sequence+1;resultRequestSwarmQueueRequestV2={id:swarmQueueCommandV3.requestId,sequence,taskId:swarmQueueTaskV1.id,claimGeneration:swarmQueueCommandV3.generation,kind:swarmQueueCommandV3.kind,detail:swarmQueueCommandV3.detail,evidencePaths:swarmQueueCommandV3.evidencePaths,artifacts:captured,outcome:null,state:'open',response:null};
    resultTaskSwarmQueueTaskV2={...swarmQueueTaskV1,state:swarmQueueCommandV3.kind,candidate:swarmQueueCommandV3.candidate,checkpoint:preservedSwarmQueueCheckpointV2,review:null};swarmQueueStateV3={...swarmQueueStateV3,sequence,tasks:swarmQueueStateV3.tasks.map(valueSwarmQueueTaskV2=>valueSwarmQueueTaskV2.id===swarmQueueTaskV1.id?resultTaskSwarmQueueTaskV2??valueSwarmQueueTaskV2:valueSwarmQueueTaskV2),requests:[...swarmQueueStateV3.requests,resultRequestSwarmQueueRequestV2]};break;
   }
   case 'record-review':{
    this.coordinator(swarmQueueCommandV3);const swarmQueueTaskV1=swarmQueueStateV3.tasks.find(swarmQueueTaskV1=>swarmQueueTaskV1.id===swarmQueueCommandV3.taskId);requireQueue(swarmQueueTaskV1!==undefined&&swarmQueueTaskV1.state==='integration'&&swarmQueueTaskV1.claim?.generation===swarmQueueCommandV3.generation&&swarmQueueTaskV1.candidate!==null&&swarmQueueTaskV1.candidate.reviewer===swarmQueueCommandV3.reviewer,'review differs from exact submitted candidate');
    if(swarmQueueTaskV1.review!==null){requireQueue(swarmQueueTaskV1.review.reviewer===swarmQueueCommandV3.reviewer&&swarmQueueTaskV1.review.hostEvidencePath===swarmQueueCommandV3.hostEvidencePath&&swarmQueueTaskV1.review.blob.sha256===await fileDigest(safeFile(this.ownerRoot,swarmQueueCommandV3.hostEvidencePath)),'review already differs');resultTaskSwarmQueueTaskV2=swarmQueueTaskV1;break;}
    const blob=await new SwarmQueuePayloads(poolClient,this.projectId,this.ownerRoot,swarmQueueStateV3.campaignId).file(safeFile(this.ownerRoot,swarmQueueCommandV3.hostEvidencePath));const trustedSwarmQueueReviewV2:SwarmQueueReviewV2={reviewer:swarmQueueCommandV3.reviewer,base:swarmQueueTaskV1.candidate.base,revision:swarmQueueTaskV1.candidate.revision,hostEvidencePath:swarmQueueCommandV3.hostEvidencePath,blob};
    resultTaskSwarmQueueTaskV2={...swarmQueueTaskV1,review:trustedSwarmQueueReviewV2};swarmQueueStateV3={...swarmQueueStateV3,tasks:swarmQueueStateV3.tasks.map(valueSwarmQueueTaskV2=>valueSwarmQueueTaskV2.id===swarmQueueTaskV1.id?resultTaskSwarmQueueTaskV2??valueSwarmQueueTaskV2:valueSwarmQueueTaskV2)};break;
   }
   case 'take':{this.coordinator(swarmQueueCommandV3);const requestSwarmQueueRequestV2=swarmQueueStateV3.requests.filter(requestSwarmQueueRequestV2=>requestSwarmQueueRequestV2.state==='open').sort((leftSwarmQueueRequestV2,rightSwarmQueueRequestV2)=>leftSwarmQueueRequestV2.sequence-rightSwarmQueueRequestV2.sequence)[0];if(requestSwarmQueueRequestV2===undefined)break;
    resultRequestSwarmQueueRequestV2={...requestSwarmQueueRequestV2,state:'processing'};swarmQueueStateV3={...swarmQueueStateV3,requests:swarmQueueStateV3.requests.map(valueSwarmQueueRequestV2=>valueSwarmQueueRequestV2.id===requestSwarmQueueRequestV2.id?resultRequestSwarmQueueRequestV2??valueSwarmQueueRequestV2:valueSwarmQueueRequestV2)};break;}
   case 'resolve':{
    this.coordinator(swarmQueueCommandV3);const requestSwarmQueueRequestV2=swarmQueueStateV3.requests.find(requestSwarmQueueRequestV2=>requestSwarmQueueRequestV2.id===swarmQueueCommandV3.requestId);requireQueue(requestSwarmQueueRequestV2!==undefined,'request absent');
    if(requestSwarmQueueRequestV2.state==='resolved'){requireQueue(requestSwarmQueueRequestV2.response===swarmQueueCommandV3.response&&requestSwarmQueueRequestV2.outcome===swarmQueueCommandV3.outcome,'request already resolved differently');resultRequestSwarmQueueRequestV2=requestSwarmQueueRequestV2;break;}
    requireQueue(requestSwarmQueueRequestV2.state==='processing','take request in arrival order before resolution');const swarmQueueTaskV1=swarmQueueStateV3.tasks.find(swarmQueueTaskV1=>swarmQueueTaskV1.id===requestSwarmQueueRequestV2.taskId);requireQueue(swarmQueueTaskV1!==undefined&&swarmQueueTaskV1.claim?.generation===requestSwarmQueueRequestV2.claimGeneration,'request claim changed');
    let nextTaskSwarmQueueTaskV2=swarmQueueTaskV1;
    if(swarmQueueCommandV3.outcome==='accepted'){
     requireQueue(requestSwarmQueueRequestV2.kind==='integration'&&swarmQueueTaskV1.candidate!==null&&swarmQueueTaskV1.review!==null&&swarmQueueTaskV1.review.base===swarmQueueTaskV1.candidate.base&&swarmQueueTaskV1.review.revision===swarmQueueTaskV1.candidate.revision&&swarmQueueTaskV1.review.reviewer===swarmQueueTaskV1.candidate.reviewer,'acceptance requires exact host-collected independent review');
     const swarmQueueCanonical=canonical(swarmQueueStateV3);requireQueue(swarmQueueTaskV1.obligationIds.every(id=>swarmQueueCanonical.scope.projection.satisfiedIds.includes(id)),'canonical obligations not discharged');
     const artifactDigests=new Map<string,string>();for(const certificate of swarmQueueCanonical.document.certificates.filter(certificate=>certificate.evidence.length===0&&certificate.obligationIds.some(id=>swarmQueueTaskV1.obligationIds.includes(id))&&swarmQueueCanonical.scope.projection.assessments.some(assessment=>assessment.id===certificate.id&&assessment.valid)))for(const artifact of certificate.artifacts)artifactDigests.set(artifact,await fileDigest(safeFile(this.ownerRoot,artifact)));
     requireQueue(swarmQueueTaskV1.obligationIds.every(id=>swarmQueueCanonical.document.certificates.some(certificateObligationCertificate=>swarmQueueCanonical.scope.projection.assessments.some(assessmentObligationAssessment=>assessmentObligationAssessment.id===certificateObligationCertificate.id&&assessmentObligationAssessment.valid)&&certificateObligationCertificate.obligationIds.includes(id)&&(certificateObligationCertificate.evidence.length>0?certificateObligationCertificate.evidence.every(evidenceObligationEvidence=>evidenceObligationEvidence.revision===swarmQueueTaskV1.candidate?.revision):inspectionTask(swarmQueueTaskV1)&&isObligationGitInputs(certificateObligationCertificate.inputs)&&certificateObligationCertificate.inputs.revision===swarmQueueTaskV1.candidate?.revision&&certificateObligationCertificate.artifacts.some(artifact=>requestSwarmQueueRequestV2.artifacts.some(capturedSwarmQueueArtifactV2=>requestSwarmQueueRequestV2.evidencePaths.includes(capturedSwarmQueueArtifactV2.path)&&artifactDigests.get(artifact)===capturedSwarmQueueArtifactV2.blob.sha256))))),'canonical acceptance is not bound to submitted candidate');
     requireQueue(inspectionTask(swarmQueueTaskV1)||gitResult(this.ownerRoot,['merge-base','--is-ancestor',swarmQueueTaskV1.candidate.revision,'HEAD']).status===0,'candidate not integrated in owner');nextTaskSwarmQueueTaskV2={...swarmQueueTaskV1,state:'done'};
    }else if(swarmQueueCommandV3.outcome==='retry'||swarmQueueCommandV3.outcome==='answered'){
     // The original owner keeps unfinished source; another worker must not acquire it.
     nextTaskSwarmQueueTaskV2={...swarmQueueTaskV1,state:'ready',preferredWorker:swarmQueueTaskV1.claim?.sessionId??swarmQueueTaskV1.preferredWorker};
    }
    resultRequestSwarmQueueRequestV2={...requestSwarmQueueRequestV2,state:'resolved',response:swarmQueueCommandV3.response,outcome:swarmQueueCommandV3.outcome};swarmQueueStateV3={...swarmQueueStateV3,tasks:swarmQueueStateV3.tasks.map(valueSwarmQueueTaskV2=>valueSwarmQueueTaskV2.id===swarmQueueTaskV1.id?nextTaskSwarmQueueTaskV2:valueSwarmQueueTaskV2),requests:swarmQueueStateV3.requests.map(valueSwarmQueueRequestV2=>valueSwarmQueueRequestV2.id===requestSwarmQueueRequestV2.id?resultRequestSwarmQueueRequestV2??valueSwarmQueueRequestV2:valueSwarmQueueRequestV2)};break;
   }
   case 'discover':case 'recover':{
    const discoveredSwarmQueueDiscoveryV1=swarmQueueCommandV3.command==='discover'?swarmQueueCommandV3.discovery:swarmQueueStateV3.pending;
    const existingSwarmQueueDiscoveryV1=swarmQueueCommandV3.command==='discover'?swarmQueueStateV3.discoveries.find(valueSwarmQueueDiscoveryV1=>valueSwarmQueueDiscoveryV1.id===swarmQueueCommandV3.discovery.id):swarmQueueStateV3.discoveries.find(valueSwarmQueueDiscoveryV1=>valueSwarmQueueDiscoveryV1.id===swarmQueueCommandV3.discoveryId);
    if(existingSwarmQueueDiscoveryV1!==undefined){if(swarmQueueCommandV3.command==='discover')requireQueue(isDeepStrictEqual(existingSwarmQueueDiscoveryV1,swarmQueueCommandV3.discovery),'discovery ID differs');break;}
    requireQueue(discoveredSwarmQueueDiscoveryV1!==null,'pending discovery absent');
    if(swarmQueueCommandV3.command==='discover')requireQueue(isDeepStrictEqual(discoveredSwarmQueueDiscoveryV1.actor,swarmQueueCommandV3.actor),'discovery actor differs');
    else requireQueue(discoveredSwarmQueueDiscoveryV1.id===swarmQueueCommandV3.discoveryId,'pending discovery ID differs');
    if(swarmQueueStateV3.pending===null){this.validateDiscovery(swarmQueueStateV3,discoveredSwarmQueueDiscoveryV1);swarmQueueStateV3={...swarmQueueStateV3,pending:discoveredSwarmQueueDiscoveryV1};await this.save(poolClient,swarmQueueStateV3);await poolClient.query('COMMIT');transaction=false;}
    else requireQueue(isDeepStrictEqual(swarmQueueStateV3.pending,discoveredSwarmQueueDiscoveryV1),'another discovery is pending');
    this.publishDiscovery(swarmQueueStateV3,discoveredSwarmQueueDiscoveryV1);
    const documentUpdateSwarmQueueDocumentUpdateV1=discoveredSwarmQueueDiscoveryV1.updates.find(updateSwarmQueueDocumentUpdateV1=>updateSwarmQueueDocumentUpdateV1.path===swarmQueueStateV3.documentPath);
    if(documentUpdateSwarmQueueDocumentUpdateV1!==undefined){requireQueue(documentUpdateSwarmQueueDocumentUpdateV1.beforeContent!==null,'canonical obligation document must exist');acceptCheckpoint(parseObligationDocument(documentUpdateSwarmQueueDocumentUpdateV1.beforeContent),parseObligationDocument(documentUpdateSwarmQueueDocumentUpdateV1.content),swarmQueueStateV3.ownerRoot);}
    if(!transaction){await poolClient.query('BEGIN');transaction=true;}
    swarmQueueStateV3=this.add({...swarmQueueStateV3,pending:null,discoveries:[...swarmQueueStateV3.discoveries,discoveredSwarmQueueDiscoveryV1]},discoveredSwarmQueueDiscoveryV1.tasks);break;
   }
   case 'abort-discovery':{
    requireQueue(swarmQueueStateV3.pending!==null&&swarmQueueStateV3.pending.id===swarmQueueCommandV3.discoveryId,'pending discovery differs');
    for(const updateSwarmQueueDocumentUpdateV1 of swarmQueueStateV3.pending.updates){const target=safeFile(swarmQueueStateV3.ownerRoot,updateSwarmQueueDocumentUpdateV1.path);const current=fs.existsSync(target)?fs.readFileSync(target,'utf8'):null;requireQueue(current===updateSwarmQueueDocumentUpdateV1.beforeContent||current===updateSwarmQueueDocumentUpdateV1.content,`recovery conflict: ${updateSwarmQueueDocumentUpdateV1.path}`);}
    for(const updateSwarmQueueDocumentUpdateV1 of [...swarmQueueStateV3.pending.updates].reverse()){if(updateSwarmQueueDocumentUpdateV1.beforeContent===null){const target=safeFile(swarmQueueStateV3.ownerRoot,updateSwarmQueueDocumentUpdateV1.path);if(fs.existsSync(target))fs.unlinkSync(target);}else this.publishDiscovery(swarmQueueStateV3,{...swarmQueueStateV3.pending,updates:[{path:updateSwarmQueueDocumentUpdateV1.path,beforeContent:updateSwarmQueueDocumentUpdateV1.content,content:updateSwarmQueueDocumentUpdateV1.beforeContent}]});}
    swarmQueueStateV3={...swarmQueueStateV3,pending:null};break;
   }
   case 'complete':this.coordinator(swarmQueueCommandV3);swarmQueueStateV3=reconcileUnclaimed(swarmQueueStateV3,canonical(swarmQueueStateV3));requireQueue(swarmQueueStateV3.pending===null&&swarmQueueStateV3.tasks.every(swarmQueueTaskV1=>swarmQueueTaskV1.state==='done')&&swarmQueueStateV3.requests.every(requestSwarmQueueRequestV2=>requestSwarmQueueRequestV2.state==='resolved')&&canonical(swarmQueueStateV3).scope.projection.complete,'campaign still has outstanding discoveries/tasks/requests/obligations');swarmQueueStateV3={...swarmQueueStateV3,state:'complete'};break;
   }
   const swarmQueueOperation:SwarmQueueOperation={queue:swarmQueueStateV3,task:resultTaskSwarmQueueTaskV2,request:resultRequestSwarmQueueRequestV2,page,artifact};requireQueue(Buffer.byteLength(JSON.stringify(createSwarmQueueResultV3(swarmQueueOperation)))<=1024*1024,'receipt exceeds 1 MiB; reduce page limit or task cluster');
   if(!readOnly)await this.save(poolClient,swarmQueueStateV3);await poolClient.query('COMMIT');transaction=false;
   return swarmQueueOperation;
  }catch(cause){if(transaction)await poolClient.query('ROLLBACK');throw cause;}
  finally{try{await poolClient.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[this.projectId]);}finally{poolClient.release();}}
 }
 private async preserveSource(poolClient:PoolClient,root:string,swarmQueueStateV3:SwarmQueueStateV3,swarmQueueTaskV2:SwarmQueueTaskV2):Promise<SwarmQueueCheckpointV2> {
  const revision=git(root,['rev-parse','HEAD']).trim();const ref=`refs/ponytail/swarm-queue-source/${digest(swarmQueueStateV3.campaignId)}/${digest(swarmQueueTaskV2.id)}/${swarmQueueTaskV2.claim?.generation}`;git(root,['update-ref',ref,revision]);
  const swarmQueuePayloads=new SwarmQueuePayloads(poolClient,this.projectId,this.ownerRoot,swarmQueueStateV3.campaignId);const untracked:SwarmQueueArtifactV2[]=[];
  for(const relative of git(root,['ls-files','--others','--exclude-standard','-z']).split('\0').filter(Boolean))untracked.push({path:relative,blob:await swarmQueuePayloads.file(safeFile(root,relative))});
  async function patch(args:readonly string[]):Promise<SwarmQueueBlobV1>{const childProcess=spawn('git',[...args],{cwd:root,stdio:['ignore','pipe','ignore']});const completion=once(childProcess,'close');try{const blob=await swarmQueuePayloads.stream(childProcess.stdout);const [code]=await completion;requireQueue(code===0,'source patch capture failed');return blob;}catch(cause){childProcess.kill();await completion.catch(()=>{});throw cause;}}
  return {revision,ref,indexPatch:await patch(['diff','--cached','--binary','--full-index']),worktreePatch:await patch(['diff','--binary','--full-index']),untracked};
 }
 private preserveCandidate(root:string,swarmQueueStateV3:SwarmQueueStateV3,swarmQueueTaskV1:SwarmQueueTaskV2,swarmQueueCandidateV1:SwarmQueueCandidateV1):void {
  requireQueue(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(swarmQueueCandidateV1.base)&&/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(swarmQueueCandidateV1.revision),'candidate requires exact Git object IDs');
  requireQueue(swarmQueueCandidateV1.base===swarmQueueTaskV1.claim?.base,'candidate must descend from its exact claim base');
  requireQueue(git(root,['rev-parse',`${swarmQueueCandidateV1.revision}^{commit}`]).trim()===swarmQueueCandidateV1.revision&&gitResult(root,['merge-base','--is-ancestor',swarmQueueCandidateV1.base,swarmQueueCandidateV1.revision]).status===0,'candidate/base history differs');
  requireQueue(swarmQueueCandidateV1.reviewer!==swarmQueueTaskV1.claim?.sessionId&&(swarmQueueCandidateV1.proofPaths.length>0||inspectionTask(swarmQueueTaskV1)),'independent reviewer and proof required');
  const swarmQueueVerdictV1=readSwarmQueueVerdictV1(parseSwarmQueueJson(readFile(root,swarmQueueCandidateV1.verdictPath)));
  requireQueue(swarmQueueVerdictV1.reviewer===swarmQueueCandidateV1.reviewer&&swarmQueueVerdictV1.base===swarmQueueCandidateV1.base&&swarmQueueVerdictV1.revision===swarmQueueCandidateV1.revision,'review does not accept exact candidate');
  const proofs=swarmQueueCandidateV1.proofPaths.map(relative=>readObligationEvidence(parseSwarmQueueJson(readFile(root,relative))));
  for(const proofObligationEvidence of proofs){requireQueue(proofObligationEvidence.revision===swarmQueueCandidateV1.revision&&proofObligationEvidence.outcome==='pass'&&proofObligationEvidence.finalization==='pass'&&!proofObligationEvidence.dirty&&proofObligationEvidence.failures===0&&proofObligationEvidence.skips===0,'proof is not finalized for exact candidate');
   requireQueue(isObligationGitInputs(proofObligationEvidence.inputs)?proofObligationEvidence.inputs.revision===swarmQueueCandidateV1.revision&&gitInputReasons(root,proofObligationEvidence.inputs).length===0:proofObligationEvidence.inputs.every(valueObligationInput=>inputDigest(root,valueObligationInput.path)===valueObligationInput.digest),'stale candidate proof inputs');safeFile(root,proofObligationEvidence.outputPath);}
  requireQueue(swarmQueueTaskV1.claim?.leases.every(leaseObligationLeaseV1=>leaseObligationLeaseV1.binding.execution.selection.every(selection=>proofs.some(proofObligationEvidence=>proofObligationEvidence.selection.includes(selection)&&(leaseObligationLeaseV1.binding.execution.target===null||proofObligationEvidence.target.identity===leaseObligationLeaseV1.binding.execution.target.identity&&proofObligationEvidence.target.profile===leaseObligationLeaseV1.binding.execution.target.profile)))),'proof does not cover frozen selections/targets');
  if(inspectionTask(swarmQueueTaskV1))requireQueue(swarmQueueCandidateV1.base===swarmQueueCandidateV1.revision,'inspection assessment cannot introduce source changes');
  const permitted=swarmQueueTaskV1.claim?.leases.filter(leaseObligationLeaseV1=>leaseObligationLeaseV1.binding.execution.operations.includes('edit')).flatMap(leaseObligationLeaseV1=>leaseObligationLeaseV1.binding.execution.plannedPaths)??[];
  const revisions=git(root,['rev-list',`${swarmQueueCandidateV1.base}..${swarmQueueCandidateV1.revision}`]).trim().split('\n').filter(Boolean);
  requireQueue(git(root,['rev-list','--merges',`${swarmQueueCandidateV1.base}..${swarmQueueCandidateV1.revision}`]).trim()==='','candidate requires a linear reviewed history');
  const changed=[...new Set(revisions.flatMap(revision=>git(root,['diff-tree','--no-commit-id','--no-renames','--name-only','-r','-z',revision,'--']).split('\0').filter(Boolean)))];
  requireQueue(changed.every(relative=>permitted.some(scope=>relative===scope||relative.startsWith(scope+'/'))),'candidate includes paths outside its claim');
  const ref=`refs/ponytail/swarm-queue/${digest(swarmQueueStateV3.campaignId)}/${digest(swarmQueueTaskV1.id)}/${swarmQueueTaskV1.claim?.generation}`;
  git(root,['update-ref',ref,swarmQueueCandidateV1.revision]);
 }
}

// Traceability: supports REQ-SWARM-QUEUES
export async function requireSwarmQueueLifecycleQuiescence(poolClient:PoolClient,projectId:string,ownerRoot:string,sessionId:string|null):Promise<void>{
 const rows=(await poolClient.query<Record<string,unknown>>('SELECT CASE WHEN storage_version=3 THEN state_text ELSE NULL END AS state_text FROM ponytail_index.swarm_queue_v1 WHERE project_id=$1 AND owner_root=$2 AND NOT closed',[projectId,ownerRoot])).rows;
 for(const row of rows){requireQueue(typeof row.state_text==='string','legacy queue requires authorized queue status migration');const swarmQueueStateV3=readSwarmQueueStateV3(parseSwarmQueueJson(row.state_text));if(swarmQueueStateV3.state==='suspended')continue;
  requireQueue(sessionId!==null&&swarmQueueStateV3.pending===null&&!swarmQueueStateV3.tasks.some(swarmQueueTaskV1=>swarmQueueTaskV1.state!=='done'&&swarmQueueTaskV1.claim?.sessionId===sessionId),'preserve and settle unfinished queue ownership before lifecycle removal');
 }
}

// Traceability: supports REQ-SWARM-QUEUES
export async function isSwarmQueueWorkerRetirementAuthorized(poolClient:PoolClient,projectId:string,ownerRoot:string,sessionId:string,generation:string,rootPath:string):Promise<boolean>{const row=(await poolClient.query<Record<string,unknown>>('SELECT state_text FROM ponytail_index.swarm_queue_v1 WHERE project_id=$1 AND owner_root=$2 AND storage_version=3 AND NOT closed',[projectId,ownerRoot])).rows[0];if(row===undefined)return false;requireQueue(typeof row.state_text==='string','invalid suspended queue');const state=readSwarmQueueStateV3(parseSwarmQueueJson(row.state_text));if(state.state!=='suspended')return false;if(state.suspension?.workers.some(worker=>worker.sessionId===sessionId&&worker.generation===generation&&worker.rootPath===rootPath))return true;const rows=(await poolClient.query<Record<string,unknown>>('SELECT authority_text FROM ponytail_index.swarm_queue_retirement_authority_v1 WHERE project_id=$1 AND owner_root=$2 AND campaign_id=$3',[projectId,ownerRoot,state.campaignId])).rows;return rows.some(row=>{requireQueue(typeof row.authority_text==='string','invalid retirement authority');const authority=readSwarmRetirementAuthorizationV1(parseSwarmQueueJson(row.authority_text));requireQueue(authority.ownerRoot===ownerRoot&&authority.campaignId===state.campaignId,'retirement authority scope differs');return authority.worktrees.some(worker=>worker.sessionId===sessionId&&worker.workerGeneration===generation&&worker.rootPath===rootPath);});}
