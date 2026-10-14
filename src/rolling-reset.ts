// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
import type {PoolClient} from 'pg';
import {parse} from 'lossless-json';
import {parseRollingProjectConfig} from './rolling-campaign.js';
import {readRollingPhysicalDirectory,validateRollingSessionMarker,requireRollingGitOperationAbsent} from './rolling-worktrees.js';
import {git,gitResult} from './rolling-integration.js';
import {parseRollingWorkerCreation,type RollingWorkerCreationV1,identifyRollingWorkerCreation} from './rolling-worker.js';
import {RollingCodex} from './rolling-codex.js';
import {parseRollingReviewRequest} from './rolling-review.js';

export interface RollingResetRequestV1 {readonly schemaVersion:1;readonly id:string;readonly reason:string;readonly authority:readonly string[];}
export interface RollingResetWorktree {
 readonly rootPath:string;readonly disposition:'retain'|'reuse'|'remove';readonly sessionId:string|null;
 readonly assignmentId:string|null;readonly generation:string|null;readonly resourceGeneration:string|null;readonly number:number|null;
}
export interface RollingProjectResetV1 {
 readonly schemaVersion:1;readonly request:RollingResetRequestV1;readonly coordinatorRoot:string;readonly mainRoot:string;
 readonly managedDirectory:string;readonly gitDirectory:string;readonly baseCommit:string;readonly campaignIds:readonly string[];
 readonly actors:readonly RollingWorkerCreationV1[];readonly worktrees:readonly RollingResetWorktree[];
 readonly retirementCommands:readonly (readonly string[])[];readonly completedActors:readonly string[];
 readonly completedWorktrees:readonly string[];readonly state:'PENDING'|'COMPLETE';
}
function requireReset(value:unknown,message:string):asserts value {if(!value)throw new Error(`rolling reset: ${message}`);}
function isRecord(value:unknown):value is Record<string,unknown> {return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function object(value:unknown):Record<string,unknown> {requireReset(isRecord(value),'expected object');return value;}
function keys(value:Record<string,unknown>,names:readonly string[]):void {requireReset(isDeepStrictEqual(Object.keys(value).sort(),[...names].sort()),'invalid fields');}
function strings(value:unknown):readonly string[] {requireReset(Array.isArray(value)&&value.every((item:unknown)=>typeof item==='string'&&item.length>0),'expected nonempty strings');return value;}
function text(value:unknown):string {requireReset(typeof value==='string'&&value.length>0&&!/[\0\r\n]/u.test(value),'invalid string');return value;}
export function readRollingResetRequestV1(value:unknown):RollingResetRequestV1 {
 const input=object(value);keys(input,['schemaVersion','id','reason','authority']);
 requireReset(input.schemaVersion===1&&typeof input.id==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/u.test(input.id),'invalid reset V1 identity');
 const authority=strings(input.authority);requireReset(authority.length>0,'explicit reset authority required');
 return {schemaVersion:1,id:input.id,reason:text(input.reason),authority};
}
export const RollingResetRequestReaders={V1:readRollingResetRequestV1};
export function readRollingProjectResetV1(value:unknown):RollingProjectResetV1 {
 const input=object(value);keys(input,['schemaVersion','request','coordinatorRoot','mainRoot','managedDirectory','gitDirectory','baseCommit','campaignIds','actors','worktrees','retirementCommands','completedActors','completedWorktrees','state']);
 requireReset(input.schemaVersion===1&&(input.state==='PENDING'||input.state==='COMPLETE'),'invalid reset version/state');
 requireReset(Array.isArray(input.actors)&&Array.isArray(input.worktrees)&&Array.isArray(input.retirementCommands),'invalid inventory');
 const actors=input.actors.map((actor:unknown)=>parseRollingWorkerCreation(JSON.stringify(actor)));
 const worktrees=input.worktrees.map((value:unknown):RollingResetWorktree=>{
  const tree=object(value);keys(tree,['rootPath','disposition','sessionId','assignmentId','generation','resourceGeneration','number']);
  requireReset(tree.disposition==='retain'||tree.disposition==='reuse'||tree.disposition==='remove','invalid disposition');
  requireReset(tree.number===null||typeof tree.number==='number'&&Number.isSafeInteger(tree.number)&&tree.number>=101,'invalid worktree number');
  return {rootPath:text(tree.rootPath),disposition:tree.disposition,sessionId:tree.sessionId===null?null:text(tree.sessionId),assignmentId:tree.assignmentId===null?null:text(tree.assignmentId),generation:tree.generation===null?null:text(tree.generation),resourceGeneration:tree.resourceGeneration===null?null:text(tree.resourceGeneration),number:tree.number};
 });
 const retirementCommands=input.retirementCommands.map((value:unknown)=>{const argv=strings(value);requireReset(argv.length>0,'empty cleanup command');return argv;});
 for(const root of [input.coordinatorRoot,input.mainRoot,input.managedDirectory,input.gitDirectory,...worktrees.map(tree=>tree.rootPath)])requireReset(typeof root==='string'&&path.isAbsolute(root)&&path.normalize(root)===root,'inventory requires physical absolute roots');
 requireReset(typeof input.baseCommit==='string'&&/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(input.baseCommit),'invalid base commit');
 const completedActors=strings(input.completedActors),completedWorktrees=strings(input.completedWorktrees);
 requireReset(completedActors.every(id=>actors.some(actor=>actor.threadId===id))&&completedWorktrees.every(root=>worktrees.some(tree=>tree.rootPath===root&&tree.disposition!=='retain')),'progress escaped inventory');
 return {schemaVersion:1,request:readRollingResetRequestV1(input.request),coordinatorRoot:text(input.coordinatorRoot),mainRoot:text(input.mainRoot),managedDirectory:text(input.managedDirectory),gitDirectory:text(input.gitDirectory),baseCommit:text(input.baseCommit),campaignIds:strings(input.campaignIds),actors,worktrees,retirementCommands,completedActors,completedWorktrees,state:input.state};
}
export const RollingProjectResetReaders={V1:readRollingProjectResetV1};
function decodeReset(text:string):RollingProjectResetV1 {return readRollingProjectResetV1(parse(text,null,token=>{const value=Number(token);requireReset(Number.isSafeInteger(value),'reset numbers must be exact safe integers');return value;}));}
function nullableText(value:unknown):string|null {return value===null?null:text(value);}
function inventoryRoots(root:string):readonly string[] {return git(root,['worktree','list','--porcelain','-z']).split('\0').filter(field=>field.startsWith('worktree ')).map(field=>field.slice(9));}
function poolMember(root:string,directory:string):boolean {const number=Number(path.basename(root));return path.dirname(root)===directory&&Number.isSafeInteger(number)&&number>=101&&String(number)===path.basename(root);}

// Traceability: implements REQ-ROLLING-RESET
async function inventoryReset(poolClient:PoolClient,projectId:string,root:string,rollingResetRequestV1:RollingResetRequestV1,rollingCodex:RollingCodex|null):Promise<RollingProjectResetV1> {
 const coordinatorRoot=fs.realpathSync(root);requireReset(git(root,['rev-parse','--show-toplevel']).trim()===coordinatorRoot,'invoking root must be a checkout root');
 const roots=inventoryRoots(root),mainRoot=roots[0];requireReset(mainRoot,'missing main checkout');
 const configurationText=fs.readFileSync(path.join(root,'.agents/config/project/rolling-campaigns.json'),'utf8');
 requireReset(configurationText.trim()===git(root,['show','HEAD:.agents/config/project/rolling-campaigns.json']).trim(),'commit coordinator pool configuration before reset');
 const configuration=parseRollingProjectConfig(configurationText);
 requireReset(configuration.retirementCommands!==null,'declare project retirement cleanup before reset');
 const managedDirectory=readRollingPhysicalDirectory(path.resolve(mainRoot,configuration.managedWorktrees.directory));
 requireReset(managedDirectory!==mainRoot&&managedDirectory!==coordinatorRoot,'pool cannot be main/coordinator checkout');
 const campaigns=(await poolClient.query<Record<string,unknown>>('SELECT campaign_id,coordinator_root FROM ponytail_index.rolling_campaign_v1 WHERE project_id=$1 ORDER BY campaign_id',[projectId])).rows;
 const assignments=(await poolClient.query<Record<string,unknown>>('SELECT a.*,w.root_path FROM ponytail_index.rolling_assignment_v1 a JOIN ponytail_index.rolling_worktree_v1 w USING(project_id) WHERE a.project_id=$1 AND a.worktree_number=w.number AND a.state<>\'RELEASED\' ORDER BY a.worktree_number',[projectId])).rows;
 const creations=(await poolClient.query<Record<string,unknown>>('SELECT c.result_text FROM ponytail_index.rolling_action_v1 c JOIN ponytail_index.rolling_assignment_v1 a USING(project_id,assignment_id) WHERE c.project_id=$1 AND c.kind=\'START_WORKER\' AND c.result_text IS NOT NULL AND a.state<>\'RELEASED\'',[projectId])).rows.map(row=>parseRollingWorkerCreation(text(row.result_text)));
 const unknown=(await poolClient.query('SELECT 1 FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND state=\'STARTED\' AND result_text IS NULL LIMIT 1',[projectId])).rows;
 requireReset(unknown.length===0,'unknown native creation must be reconciled before reset');
 const actors:RollingWorkerCreationV1[]=[...creations];
 const reviews=(await poolClient.query<Record<string,unknown>>('SELECT d.reviewer_thread_id,r.request_text,i.root_path FROM ponytail_index.rolling_review_dispatch_v1 d JOIN ponytail_index.rolling_review_v1 r USING(project_id,campaign_id,review_id) JOIN ponytail_index.rolling_assignment_v1 a USING(project_id,campaign_id,assignment_id) JOIN ponytail_index.rolling_worktree_v1 i ON i.project_id=a.project_id AND i.number=a.worktree_number WHERE d.project_id=$1',[projectId])).rows;
 for(const row of reviews) {const threadId=text(row.reviewer_thread_id);if(!actors.some(actor=>actor.threadId===threadId))actors.push({schemaVersion:1,threadId,sessionId:parseRollingReviewRequest(text(row.request_text)).reviewerSessionId,rootPath:text(row.root_path)});}
 const worktrees:RollingResetWorktree[]=[];
 const protectedRoots=new Set([mainRoot,coordinatorRoot,...campaigns.map(row=>text(row.coordinator_root))]);
 for(const rootPath of roots) {
  requireReset(fs.existsSync(rootPath)&&fs.realpathSync(rootPath)===rootPath,'missing or redirected registered checkout; recover physical ownership first');
  const assignment=assignments.find(row=>row.root_path===rootPath);
  const marker=path.join(rootPath,'session_id.txt');
  const sessionId=fs.existsSync(marker)?fs.readFileSync(marker,'utf8').trim():null;
  const isPool=poolMember(rootPath,managedDirectory);
  const codexOwned=rootPath.split(path.sep).includes('.codex')&&rootPath.split(path.sep).includes('worktrees');
  const disposition=protectedRoots.has(rootPath)?'retain':isPool?'reuse':assignment||codexOwned?'remove':'retain';
  if(disposition!=='retain') {
   if(rollingCodex!==null)for(const actor of await inventoryResetActors(rollingCodex,rootPath))if(!actors.some(existing=>existing.threadId===actor.threadId))actors.push(actor);
   if(sessionId!==null) {validateRollingSessionMarker(rootPath,sessionId);if(!actors.some(actor=>actor.rootPath===rootPath&&actor.sessionId===sessionId)) {requireReset(rollingCodex!==null,'marker requires native owner discovery');const identity=await rollingCodex.readThreadIdentity(sessionId,rootPath);requireReset(identity.sessionId===sessionId,'marker owner differs');actors.push({schemaVersion:1,...identity});}}
   if(assignment)requireReset(sessionId===assignment.session_id||assignment.session_id===null,'marker differs from original leased worker');
   requireReset(sessionId!==null||!codexOwned||rollingCodex!==null||actors.some(actor=>actor.rootPath===rootPath),'external Codex checkout has no verifiable actor; retain it');
  }
  const allocation=assignment?(await poolClient.query<Record<string,unknown>>('SELECT generation FROM ponytail_index.rolling_action_v1 WHERE project_id=$1 AND assignment_id=$2 AND kind=\'START_WORKER\'',[projectId,assignment.assignment_id])).rows[0]:undefined;
  worktrees.push({rootPath,disposition,sessionId,assignmentId:assignment?text(assignment.assignment_id):null,generation:assignment?text(assignment.generation):null,resourceGeneration:allocation?text(allocation.generation):null,number:isPool?Number(path.basename(rootPath)):assignment?Number(assignment.worktree_number):null});
 }
 requireReset(assignments.every(row=>worktrees.some(tree=>tree.rootPath===row.root_path&&tree.disposition!=='retain')),'a live lease targets a protected or missing checkout');
 return {schemaVersion:1,request:rollingResetRequestV1,coordinatorRoot,mainRoot,managedDirectory,gitDirectory:fs.realpathSync(git(root,['rev-parse','--path-format=absolute','--git-common-dir']).trim()),baseCommit:git(root,['rev-parse','HEAD']).trim(),campaignIds:campaigns.map(row=>text(row.campaign_id)),actors,worktrees,retirementCommands:configuration.retirementCommands,completedActors:[],completedWorktrees:[],state:'PENDING'};
}

async function inventoryResetActors(rollingCodex:RollingCodex,root:string):Promise<readonly RollingWorkerCreationV1[]> {
 const actors:RollingWorkerCreationV1[]=[];
 let cursor:string|null=null;const cursors=new Set<string>();
 for(;;) {
  const response=object(await rollingCodex.request('thread/list',{archived:false,cwd:root,cursor,limit:100}));
  requireReset(Array.isArray(response.data),'invalid root actor inventory');
  for(const value of response.data) {const thread=object(value);requireReset(thread.cwd===root,'actor inventory escaped checkout');const threadId=text(thread.id);const identity=await rollingCodex.readThreadIdentity(threadId,root);actors.push({schemaVersion:1,...identity});}
  if(response.nextCursor===null)break;
  cursor=text(response.nextCursor);requireReset(!cursors.has(cursor),'actor inventory cursor repeated');cursors.add(cursor);
 }
 return actors;
}

async function stopResetActor(rollingCodex:RollingCodex,rollingWorkerCreationV1:RollingWorkerCreationV1):Promise<void> {
 if(await rollingCodex.isThreadArchived(rollingWorkerCreationV1.threadId,rollingWorkerCreationV1.rootPath))return;
 const identity=await rollingCodex.readThreadIdentity(rollingWorkerCreationV1.threadId,rollingWorkerCreationV1.rootPath);
 requireReset(identity.threadId===rollingWorkerCreationV1.threadId&&identity.sessionId===rollingWorkerCreationV1.sessionId,'native owner differs from inventory');
 const rollingNativeThread=await rollingCodex.resumeThread(rollingWorkerCreationV1.threadId,rollingWorkerCreationV1.rootPath);
 requireReset(isDeepStrictEqual(identifyRollingWorkerCreation(rollingNativeThread,rollingWorkerCreationV1.rootPath),rollingWorkerCreationV1),'resumed actor differs');
 const activity=await rollingCodex.readThreadActivity(rollingWorkerCreationV1.threadId);
 if(activity.status==='active') {const turn=await rollingCodex.readLatestTurn(rollingWorkerCreationV1.threadId);requireReset(turn.status==='inProgress','active actor has unknown latest turn');await rollingCodex.interruptTurn(rollingWorkerCreationV1.threadId,turn.id);await rollingCodex.waitForTurn(rollingWorkerCreationV1.threadId,turn.id);}
 requireReset((await rollingCodex.readThreadActivity(rollingWorkerCreationV1.threadId)).status==='idle','original actor is not stopped');
 await rollingCodex.archiveThread(rollingWorkerCreationV1.threadId);
 requireReset(await rollingCodex.isThreadArchived(rollingWorkerCreationV1.threadId,rollingWorkerCreationV1.rootPath),'native archival not observed');
}
function resetCheckout(rollingProjectResetV1:RollingProjectResetV1,rollingResetWorktree:RollingResetWorktree,index:number):void {
 const root=rollingResetWorktree.rootPath;
 if(!inventoryRoots(rollingProjectResetV1.coordinatorRoot).includes(root)) {requireReset(rollingResetWorktree.disposition==='remove'&&!fs.existsSync(root),'lost checkout ownership');return;}
 requireReset(fs.realpathSync(root)===root&&git(root,['rev-parse','--show-toplevel']).trim()===root,'checkout identity changed');
 requireReset(fs.realpathSync(git(root,['rev-parse','--path-format=absolute','--git-common-dir']).trim())===rollingProjectResetV1.gitDirectory,'checkout now belongs to another Git repository');
 requireRollingGitOperationAbsent(root);
 const marker=path.join(root,'session_id.txt');
 if(fs.existsSync(marker)) {requireReset(rollingResetWorktree.sessionId!==null,'unexpected new session marker');validateRollingSessionMarker(root,rollingResetWorktree.sessionId);}
 const env:NodeJS.ProcessEnv={...process.env,PONYTAIL_WORKTREE_ROOT:root,PONYTAIL_MAIN_WORKTREE_ROOT:rollingProjectResetV1.mainRoot,
  PONYTAIL_WORKTREE_NUMBER:rollingResetWorktree.number===null?'':String(rollingResetWorktree.number),PONYTAIL_SESSION_ID:rollingResetWorktree.sessionId??'',PONYTAIL_ASSIGNMENT_ID:rollingResetWorktree.assignmentId??'',
  PONYTAIL_ASSIGNMENT_GENERATION:rollingResetWorktree.generation??'',PONYTAIL_WORKTREE_GENERATION:rollingResetWorktree.resourceGeneration??''};
 for(const argv of rollingProjectResetV1.retirementCommands) {const executable=argv[0];requireReset(executable,'missing cleanup executable');const result=spawnSync(executable,argv.slice(1),{cwd:root,env,encoding:'utf8'});requireReset(!result.error&&result.status===0,result.error?.message||result.stderr.trim()||'resource cleanup failed');}
 const prefix=`refs/ponytail/reset/${rollingProjectResetV1.request.id}/${index}`;
 const stashMessage=`ponytail reset ${rollingProjectResetV1.request.id}/${index}`;
 if(gitResult(root,['show-ref','--verify','--quiet',`${prefix}/changes`]).status!==0) {
  const history=gitResult(root,['reflog','show','--format=%H%x00%gs','refs/stash']);
  if(history.status===0)for(const entry of history.stdout.split('\n')) {const [revision,message]=entry.split('\0');if(revision&&message?.endsWith(`: ${stashMessage}`)) {git(root,['update-ref',`${prefix}/changes`,revision]);break;}}
 }
 if(gitResult(root,['show-ref','--verify','--quiet',`${prefix}/head`]).status!==0)git(root,['update-ref',`${prefix}/head`,git(root,['rev-parse','HEAD']).trim()]);
 if(git(root,['status','--porcelain']).trim()!=='') {
  git(root,['stash','push','--include-untracked','--message',stashMessage]);
  git(root,['update-ref',`${prefix}/changes`,git(root,['rev-parse','refs/stash']).trim()]);
 }
 // Recovery refs retain source changes. Git itself owns the object history.
 requireReset(git(root,['status','--porcelain']).trim()==='','source checkpoint did not settle checkout');
 if(fs.existsSync(marker))fs.unlinkSync(marker);
 if(rollingResetWorktree.disposition==='remove') {git(rollingProjectResetV1.coordinatorRoot,['worktree','remove','--force','--',root]);requireReset(!fs.existsSync(root)&&!inventoryRoots(rollingProjectResetV1.coordinatorRoot).includes(root),'external checkout removal incomplete');}
 else {requireReset(poolMember(root,rollingProjectResetV1.managedDirectory),'reuse escaped configured pool');git(root,['switch','--detach',rollingProjectResetV1.baseCommit]);}
}

// Traceability: implements REQ-ROLLING-RESET
export async function resetRollingProject(poolClient:PoolClient,projectId:string,root:string,request:unknown,execute:boolean,rollingCodex:RollingCodex|null):Promise<RollingProjectResetV1> {
 const rollingResetRequestV1=readRollingResetRequestV1(request);
 const locked=(await poolClient.query<Record<string,unknown>>('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked',[projectId])).rows[0];
 requireReset(locked?.locked===true,'another project operation owns reset/scheduling');
 try {
  requireReset((await poolClient.query('SELECT 1 FROM ponytail_index.swarm_worktree_v1 WHERE project_id=$1 LIMIT 1',[projectId])).rowCount===0,'release retained swarm worktree memberships before project reset');
  const existing=(await poolClient.query<Record<string,unknown>>('SELECT reset_text FROM ponytail_index.rolling_reset_v1 WHERE project_id=$1',[projectId])).rows[0];
  let rollingProjectResetV1:RollingProjectResetV1;
  if(existing) {
   rollingProjectResetV1=decodeReset(text(existing.reset_text));
   if(rollingProjectResetV1.request.id===rollingResetRequestV1.id) {requireReset(isDeepStrictEqual(rollingProjectResetV1.request,rollingResetRequestV1)&&rollingProjectResetV1.coordinatorRoot===fs.realpathSync(root),'reset retry differs from original request/root');if(rollingProjectResetV1.state==='COMPLETE')return rollingProjectResetV1;}
   else {requireReset(rollingProjectResetV1.state==='COMPLETE','resume original pending reset request');rollingProjectResetV1=await inventoryReset(poolClient,projectId,root,rollingResetRequestV1,rollingCodex);}
  } else rollingProjectResetV1=await inventoryReset(poolClient,projectId,root,rollingResetRequestV1,rollingCodex);
  if(!execute)return rollingProjectResetV1;
  requireReset(rollingCodex!==null||rollingProjectResetV1.actors.length===0,'native ownership transport required');
  const busy=(await poolClient.query('SELECT 1 FROM ponytail_index.rolling_publication_batch_v1 WHERE project_id=$1 AND NOT withdrawn AND state IN (\'PREPARING\',\'QA_RUNNING\',\'PUSHING\',\'UNCONFIRMED\') UNION ALL SELECT 1 FROM ponytail_index.rolling_increment_v1 WHERE project_id=$1 AND state IN (\'REBASING\',\'PUSHING\',\'UNCONFIRMED\')',[projectId])).rows;
  requireReset(busy.length===0,'settle external QA/preparation/replay/push before reset');
  async function save():Promise<void> {await poolClient.query('INSERT INTO ponytail_index.rolling_reset_v1(project_id,reset_text,state) VALUES($1,$2,$3) ON CONFLICT(project_id) DO UPDATE SET reset_text=EXCLUDED.reset_text,state=EXCLUDED.state',[projectId,JSON.stringify(rollingProjectResetV1),rollingProjectResetV1.state]);}
  await save();
  for(const actor of rollingProjectResetV1.actors) {if(rollingProjectResetV1.completedActors.includes(actor.threadId))continue;requireReset(rollingCodex!==null,'missing native transport');await stopResetActor(rollingCodex,actor);rollingProjectResetV1={...rollingProjectResetV1,completedActors:[...rollingProjectResetV1.completedActors,actor.threadId]};await save();}
  for(const [index,tree] of rollingProjectResetV1.worktrees.entries()) {if(tree.disposition==='retain'||rollingProjectResetV1.completedWorktrees.includes(tree.rootPath))continue;resetCheckout(rollingProjectResetV1,tree,index);rollingProjectResetV1={...rollingProjectResetV1,completedWorktrees:[...rollingProjectResetV1.completedWorktrees,tree.rootPath]};await save();}
  requireReset(fs.realpathSync(git(root,['rev-parse','--path-format=absolute','--git-common-dir']).trim())===rollingProjectResetV1.gitDirectory,'coordinator repository changed during reset');
  await poolClient.query('BEGIN');
  try {await poolClient.query('DELETE FROM ponytail_index.rolling_publication_member_v1 WHERE project_id=$1',[projectId]);await poolClient.query('DELETE FROM ponytail_index.rolling_pool_v1 WHERE project_id=$1',[projectId]);rollingProjectResetV1={...rollingProjectResetV1,state:'COMPLETE'};await save();await poolClient.query('COMMIT');}
  catch(cause){await poolClient.query('ROLLBACK');throw cause;}
  return rollingProjectResetV1;
 } finally {await poolClient.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[projectId]);}
}
