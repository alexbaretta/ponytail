// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import type {Pool,PoolClient} from 'pg';
import {git,gitResult} from './rolling-integration.js';
import type {SwarmUserWorktree} from './swarm-owner.js';
import {resolveRollingManagedDirectory,requireRollingSessionMarkerAbsent,requireRollingGitOperationAbsent,provisionRollingWorktree} from './rolling-worktrees.js';
import type {RollingNativeThreadIdentity} from './rolling-codex.js';
import {readWorktree} from './rolling-campaign-store.js';
import type {RollingWorktreeLease} from './rolling-worktrees.js';

export interface SwarmWorktreeMembership extends RollingWorktreeLease {
 readonly ownerRoot:string;
}

export type SwarmWorktreeRequest={readonly kind:'retained'}|{readonly kind:'provision';readonly baseCommit:string};

export type SwarmWorktreeDeletionResult={readonly number:number;readonly rootPath:string;readonly outcome:'deleted'}|{readonly number:number;readonly rootPath:string;readonly outcome:'retained'|'protected';readonly reason:string};

export interface SwarmCoordinatorBinding {
 readonly swarmUserWorktree:SwarmUserWorktree;
 readonly sessionId:string|null;
}
function stringColumn(value:unknown):string {
 if(typeof value!=='string'||!value.length) throw new Error('swarm: invalid owner database value');
 return value;
}
function readBinding(row:Record<string,unknown>):SwarmCoordinatorBinding {
 return {swarmUserWorktree:{rootPath:stringColumn(row.owner_root),gitCommonDirectory:stringColumn(row.git_common_directory)},
  sessionId:row.coordinator_session_id===null?null:stringColumn(row.coordinator_session_id)};
}
function physicalOwner(swarmUserWorktree:SwarmUserWorktree):void {
 if(fs.realpathSync(swarmUserWorktree.rootPath)!==swarmUserWorktree.rootPath
  ||git(swarmUserWorktree.rootPath,['rev-parse','--show-toplevel']).trim()!==swarmUserWorktree.rootPath
  ||fs.realpathSync(git(swarmUserWorktree.rootPath,['rev-parse','--path-format=absolute','--git-common-dir']).trim())!==swarmUserWorktree.gitCommonDirectory)
  throw new Error('swarm: owner must be a canonical physical Git checkout');
}
// Traceability: implements REQ-SWARM-OWNERSHIP
export class SwarmStore {
 constructor(private readonly pool:Pool,private readonly projectId:string) {}
 // Traceability: implements REQ-SWARM-WORKTREES
 async releaseWorktree(swarmWorktreeMembership:SwarmWorktreeMembership):Promise<void> {
  return this.transaction(async poolClient=>{
   await poolClient.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[this.projectId]);
   const row=(await poolClient.query<Record<string,unknown>>(`SELECT w.*,s.base_commit,o.git_common_directory FROM ponytail_index.swarm_worktree_v1 s
    JOIN ponytail_index.rolling_worktree_v1 w USING(project_id,number)
    JOIN ponytail_index.swarm_owner_v1 o ON o.project_id=s.project_id AND o.owner_root=s.owner_root
    WHERE s.project_id=$1 AND s.number=$2 AND s.owner_root=$3 AND s.generation=$4 FOR UPDATE`,
    [this.projectId,swarmWorktreeMembership.number,swarmWorktreeMembership.ownerRoot,swarmWorktreeMembership.generation])).rows[0];
   if(row===undefined) throw new Error('swarm: checkout membership changed or is absent; no ownership was released');
   const rollingStoredWorktree=readWorktree(row);
   if(rollingStoredWorktree.rootPath!==swarmWorktreeMembership.rootPath||rollingStoredWorktree.state!=='RESERVED') throw new Error('swarm: checkout has conflicting identity or activity; preserve ownership');
   if(fs.realpathSync(rollingStoredWorktree.rootPath)!==rollingStoredWorktree.rootPath
    ||fs.realpathSync(git(rollingStoredWorktree.rootPath,['rev-parse','--path-format=absolute','--git-common-dir']).trim())!==row.git_common_directory)
    throw new Error('swarm: checkout repository identity changed; preserve ownership');
   if((await poolClient.query("SELECT 1 FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND worktree_number=$2 AND state<>'RELEASED'",[this.projectId,rollingStoredWorktree.number])).rowCount
    ||(await poolClient.query('SELECT 1 FROM ponytail_index.swarm_native_session_v1 WHERE project_id=$1 AND root_path=$2',[this.projectId,rollingStoredWorktree.rootPath])).rowCount)
    throw new Error('swarm: checkout retains an assignment or native actor; establish cessation and remove worker ownership first');
   requireRollingGitOperationAbsent(rollingStoredWorktree.rootPath);
   requireRollingSessionMarkerAbsent(rollingStoredWorktree.rootPath);
   if(row.base_commit!==null) this.cleanupWorktree(swarmWorktreeMembership);
   const state=git(rollingStoredWorktree.rootPath,['status','--porcelain']).trim()?'QUARANTINED':'AVAILABLE';
   await poolClient.query('DELETE FROM ponytail_index.swarm_worktree_v1 WHERE project_id=$1 AND number=$2',[this.projectId,rollingStoredWorktree.number]);
   await poolClient.query('UPDATE ponytail_index.rolling_worktree_v1 SET state=$3 WHERE project_id=$1 AND number=$2',[this.projectId,rollingStoredWorktree.number,state]);
  });
 }
 // Traceability: implements REQ-SWARM-WORKTREES
 async reserveWorktree(ownerRoot:string,swarmWorktreeRequest:SwarmWorktreeRequest):Promise<SwarmWorktreeMembership|null> {
  return this.transaction(async poolClient=>{
   await poolClient.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[this.projectId]);
   if((await poolClient.query("SELECT 1 FROM ponytail_index.rolling_reset_v1 WHERE project_id=$1 AND state='PENDING'",[this.projectId])).rowCount)
    throw new Error('swarm: pending project reset must be resolved before checkout admission');
   const owner=(await poolClient.query<Record<string,unknown>>('SELECT * FROM ponytail_index.swarm_owner_v1 WHERE project_id=$1 AND owner_root=$2 FOR UPDATE',[this.projectId,ownerRoot])).rows[0];
   if(owner===undefined) throw new Error('swarm: enroll the user owner before claiming a checkout');
   const swarmCoordinatorBinding=readBinding(owner);physicalOwner(swarmCoordinatorBinding.swarmUserWorktree);
   const rollingManagedDirectory=resolveRollingManagedDirectory(ownerRoot);
   const pool=(await poolClient.query<Record<string,unknown>>('SELECT managed_directory FROM ponytail_index.rolling_pool_v1 WHERE project_id=$1 FOR UPDATE',[this.projectId])).rows[0];
   if(swarmWorktreeRequest.kind==='provision'&&(!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(swarmWorktreeRequest.baseCommit)
    ||git(ownerRoot,['rev-parse',`${swarmWorktreeRequest.baseCommit}^{commit}`]).trim()!==swarmWorktreeRequest.baseCommit)) throw new Error('swarm: setup requires an exact reachable base commit');
   if(pool===undefined) {
    if(swarmWorktreeRequest.kind==='retained') return null;
    await poolClient.query('INSERT INTO ponytail_index.rolling_pool_v1(project_id,managed_directory) VALUES($1,$2)',[this.projectId,rollingManagedDirectory.directory]);
   }
   if(pool!==undefined&&pool.managed_directory!==rollingManagedDirectory.directory) throw new Error('swarm: configured physical directory differs from the registered pool');
   let row=(await poolClient.query<Record<string,unknown>>(`SELECT w.* FROM ponytail_index.rolling_worktree_v1 w
    WHERE w.project_id=$1 AND w.state='AVAILABLE'
    AND NOT EXISTS(SELECT 1 FROM ponytail_index.swarm_worktree_v1 s WHERE s.project_id=w.project_id AND s.number=w.number)
    AND NOT EXISTS(SELECT 1 FROM ponytail_index.rolling_assignment_v1 a WHERE a.project_id=w.project_id AND a.worktree_number=w.number AND a.state<>'RELEASED')
    AND NOT EXISTS(SELECT 1 FROM ponytail_index.swarm_worktree_deletion_v1 d WHERE d.project_id=w.project_id AND d.number=w.number)
    ORDER BY w.number LIMIT 1 FOR UPDATE`,[this.projectId])).rows[0];
   let created=false;
   if(row===undefined) {
    if(swarmWorktreeRequest.kind==='retained') return null;
    const numbers=(await poolClient.query<Record<string,unknown>>('SELECT number FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 ORDER BY number',[this.projectId])).rows;
    let number=101;
    for(const row of numbers) {if(Number(row.number)!==number)break;number++;}
    if(!Number.isSafeInteger(number)) throw new Error('swarm: worktree numbers exhausted');
    const rootPath=path.join(rollingManagedDirectory.directory,String(number));
    if(fs.existsSync(rootPath)||rollingManagedDirectory.worktrees.includes(rootPath)) throw new Error('swarm: unrecorded checkout occupies the next pool number; preserve it for enrollment');
    row=(await poolClient.query<Record<string,unknown>>("INSERT INTO ponytail_index.rolling_worktree_v1(project_id,number,root_path,state) VALUES($1,$2,$3,'PROVISIONING') RETURNING *",[this.projectId,number,rootPath])).rows[0];
    created=true;
   }
   const rollingStoredWorktree=readWorktree(row);
   if(!created) {
   if(rollingStoredWorktree.rootPath!==path.join(rollingManagedDirectory.directory,String(rollingStoredWorktree.number))
    ||!rollingManagedDirectory.worktrees.includes(rollingStoredWorktree.rootPath)
    ||fs.realpathSync(rollingStoredWorktree.rootPath)!==rollingStoredWorktree.rootPath
    ||fs.realpathSync(git(rollingStoredWorktree.rootPath,['rev-parse','--path-format=absolute','--git-common-dir']).trim())!==swarmCoordinatorBinding.swarmUserWorktree.gitCommonDirectory)
    throw new Error('swarm: available checkout has inconsistent physical pool identity; preserve it for recovery');
   requireRollingGitOperationAbsent(rollingStoredWorktree.rootPath);
   requireRollingSessionMarkerAbsent(rollingStoredWorktree.rootPath);
   if((await poolClient.query('SELECT 1 FROM ponytail_index.swarm_native_session_v1 WHERE project_id=$1 AND root_path=$2',[this.projectId,rollingStoredWorktree.rootPath])).rowCount)
    throw new Error('swarm: available checkout retains a native actor; establish cessation before reuse');
   if(git(rollingStoredWorktree.rootPath,['status','--porcelain']).trim()) throw new Error('swarm: available checkout contains uncommitted work; preserve it');
   }
   const generation=crypto.randomUUID();
   await poolClient.query('INSERT INTO ponytail_index.swarm_worktree_v1(project_id,number,owner_root,generation,base_commit) VALUES($1,$2,$3,$4,$5)',[this.projectId,rollingStoredWorktree.number,ownerRoot,generation,swarmWorktreeRequest.kind==='provision'?swarmWorktreeRequest.baseCommit:null]);
   await poolClient.query('UPDATE ponytail_index.rolling_worktree_v1 SET state=$3 WHERE project_id=$1 AND number=$2',[this.projectId,rollingStoredWorktree.number,swarmWorktreeRequest.kind==='provision'?'PROVISIONING':'RESERVED']);
   return {number:rollingStoredWorktree.number,rootPath:rollingStoredWorktree.rootPath,ownerRoot,generation};
  });
 }
 // Traceability: implements REQ-SWARM-WORKTREES
 async provisionWorktree(swarmWorktreeMembership:SwarmWorktreeMembership):Promise<void> {
  const poolClient=await this.pool.connect();
  try {
   await poolClient.query('SELECT pg_advisory_lock(hashtextextended($1,0))',[this.projectId]);
   const row=(await poolClient.query<Record<string,unknown>>(`SELECT w.*,s.base_commit,o.owner_root,o.git_common_directory,o.coordinator_session_id FROM ponytail_index.swarm_worktree_v1 s
    JOIN ponytail_index.rolling_worktree_v1 w USING(project_id,number)
    JOIN ponytail_index.swarm_owner_v1 o ON o.project_id=s.project_id AND o.owner_root=s.owner_root
    WHERE s.project_id=$1 AND s.number=$2 AND s.owner_root=$3 AND s.generation=$4`,[this.projectId,swarmWorktreeMembership.number,swarmWorktreeMembership.ownerRoot,swarmWorktreeMembership.generation])).rows[0];
   if(row===undefined) throw new Error('swarm: checkout membership changed or is absent; setup refused');
   const swarmCoordinatorBinding=readBinding(row);physicalOwner(swarmCoordinatorBinding.swarmUserWorktree);
   const rollingStoredWorktree=readWorktree(row);
   if(fs.existsSync(rollingStoredWorktree.rootPath)&&fs.realpathSync(git(rollingStoredWorktree.rootPath,['rev-parse','--path-format=absolute','--git-common-dir']).trim())!==swarmCoordinatorBinding.swarmUserWorktree.gitCommonDirectory) throw new Error('swarm: setup checkout belongs to another repository; preserve it');
   if(rollingStoredWorktree.rootPath!==swarmWorktreeMembership.rootPath||row.base_commit===null) throw new Error('swarm: checkout has no matching setup intent');
   if(rollingStoredWorktree.state==='RESERVED') return;
   if(rollingStoredWorktree.state!=='PROVISIONING') throw new Error('swarm: conflicting checkout state; setup refused');
   if(fs.existsSync(rollingStoredWorktree.rootPath)) requireRollingGitOperationAbsent(rollingStoredWorktree.rootPath);
   provisionRollingWorktree(swarmWorktreeMembership.ownerRoot,swarmWorktreeMembership,stringColumn(row.base_commit));
   await poolClient.query("UPDATE ponytail_index.rolling_worktree_v1 SET state='RESERVED' WHERE project_id=$1 AND number=$2",[this.projectId,rollingStoredWorktree.number]);
  } finally {
   try {await poolClient.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[this.projectId]);} finally {poolClient.release();}
  }
 }
 private cleanupWorktree(swarmWorktreeMembership:SwarmWorktreeMembership):void {
  const rollingManagedDirectory=resolveRollingManagedDirectory(swarmWorktreeMembership.ownerRoot);
  if(rollingManagedDirectory.configuration.retirementCommands===null) throw new Error('swarm: project retirement cleanup is unspecified; preserve ownership');
  if(rollingManagedDirectory.configuration.retirementCommands.length&&!swarmWorktreeMembership.generation) throw new Error('swarm: original resource generation is unknown; preserve checkout for cleanup');
  for(const argv of rollingManagedDirectory.configuration.retirementCommands) {
   const result=spawnSync(argv[0],argv.slice(1),{cwd:swarmWorktreeMembership.rootPath,encoding:'utf8',env:{...process.env,
    PONYTAIL_WORKTREE_ROOT:swarmWorktreeMembership.rootPath,PONYTAIL_MAIN_WORKTREE_ROOT:rollingManagedDirectory.mainRoot,
    PONYTAIL_WORKTREE_NUMBER:String(swarmWorktreeMembership.number),PONYTAIL_WORKTREE_GENERATION:swarmWorktreeMembership.generation}});
   if(result.error||result.status!==0) throw new Error('swarm: project resource cleanup failed; preserve ownership');
  }
 }
 // Traceability: implements REQ-SWARM-WORKTREES
 async deleteWorktrees(ownerRoot:string,number:number|null):Promise<readonly SwarmWorktreeDeletionResult[]> {
  const poolClient=await this.pool.connect();
  try {
   await poolClient.query('SELECT pg_advisory_lock(hashtextextended($1,0))',[this.projectId]);
   const owner=(await poolClient.query<Record<string,unknown>>('SELECT * FROM ponytail_index.swarm_owner_v1 WHERE project_id=$1 AND owner_root=$2',[this.projectId,ownerRoot])).rows[0];
   if(owner===undefined) throw new Error('swarm: enroll the user owner before deleting managed checkouts');
   const swarmCoordinatorBinding=readBinding(owner);physicalOwner(swarmCoordinatorBinding.swarmUserWorktree);
   const rollingManagedDirectory=resolveRollingManagedDirectory(ownerRoot);
   const rows=(await poolClient.query<Record<string,unknown>>(`SELECT w.* FROM ponytail_index.rolling_worktree_v1 w
    LEFT JOIN ponytail_index.swarm_worktree_deletion_v1 d USING(project_id,number)
    WHERE w.project_id=$1 AND ($2::bigint IS NULL OR w.number=$2) AND ($2::bigint IS NOT NULL OR d.state IS DISTINCT FROM 'COMPLETE') ORDER BY w.number`,[this.projectId,number])).rows;
   if(number!==null&&!rows.length) throw new Error('swarm: selected managed checkout is not recorded');
   const results:SwarmWorktreeDeletionResult[]=[];
   for(const row of rows) {
    const rollingStoredWorktree=readWorktree(row);
    try {
     if(rollingStoredWorktree.rootPath!==path.join(rollingManagedDirectory.directory,String(rollingStoredWorktree.number))) throw new Error('swarm: checkout is outside the configured physical pool');
     if((await poolClient.query('SELECT 1 FROM ponytail_index.swarm_worktree_v1 WHERE project_id=$1 AND number=$2',[this.projectId,rollingStoredWorktree.number])).rowCount
      ||(await poolClient.query("SELECT 1 FROM ponytail_index.rolling_assignment_v1 WHERE project_id=$1 AND worktree_number=$2 AND state<>'RELEASED'",[this.projectId,rollingStoredWorktree.number])).rowCount
      ||(await poolClient.query('SELECT 1 FROM ponytail_index.swarm_native_session_v1 WHERE project_id=$1 AND root_path=$2',[this.projectId,rollingStoredWorktree.rootPath])).rowCount) {results.push({number:rollingStoredWorktree.number,rootPath:rollingStoredWorktree.rootPath,outcome:'protected',reason:'checkout remains assigned or has a retained native actor'});continue;}
     let deletion=(await poolClient.query<Record<string,unknown>>('SELECT * FROM ponytail_index.swarm_worktree_deletion_v1 WHERE project_id=$1 AND number=$2',[this.projectId,rollingStoredWorktree.number])).rows[0];
     if(deletion!==undefined&&(deletion.owner_root!==ownerRoot||deletion.root_path!==rollingStoredWorktree.rootPath||deletion.git_common_directory!==swarmCoordinatorBinding.swarmUserWorktree.gitCommonDirectory)) throw new Error('swarm: deletion belongs to another owner or repository');
     let registered=git(ownerRoot,['worktree','list','--porcelain','-z']).split('\0').includes(`worktree ${rollingStoredWorktree.rootPath}`);
     const exists=fs.lstatSync(rollingStoredWorktree.rootPath,{throwIfNoEntry:false})!==undefined;
     if(deletion?.state==='COMPLETE') {
      if(exists||registered) throw new Error('swarm: a replacement checkout exists after recorded deletion; preserve it');
      results.push({number:rollingStoredWorktree.number,rootPath:rollingStoredWorktree.rootPath,outcome:'deleted'});continue;
     }
     if(deletion===undefined&&(!exists||!registered||!['AVAILABLE','QUARANTINED'].includes(rollingStoredWorktree.state))) throw new Error('swarm: checkout is not safely unassigned or requires recovery');
     if(deletion!==undefined&&!['AVAILABLE','QUARANTINED'].includes(rollingStoredWorktree.state)) throw new Error('swarm: checkout has conflicting activity during deletion recovery');
     if(deletion!==undefined&&rollingStoredWorktree.state!=='QUARANTINED') await poolClient.query("UPDATE ponytail_index.rolling_worktree_v1 SET state='QUARANTINED' WHERE project_id=$1 AND number=$2",[this.projectId,rollingStoredWorktree.number]);
     if(exists) {
      if(!registered||fs.realpathSync(rollingStoredWorktree.rootPath)!==rollingStoredWorktree.rootPath
       ||fs.realpathSync(git(rollingStoredWorktree.rootPath,['rev-parse','--path-format=absolute','--git-common-dir']).trim())!==swarmCoordinatorBinding.swarmUserWorktree.gitCommonDirectory) throw new Error('swarm: managed checkout identity changed');
      requireRollingGitOperationAbsent(rollingStoredWorktree.rootPath);requireRollingSessionMarkerAbsent(rollingStoredWorktree.rootPath);
      if(git(rollingStoredWorktree.rootPath,['status','--porcelain']).trim()) throw new Error('swarm: checkout contains uncommitted source; preserve it');
      const revision=git(rollingStoredWorktree.rootPath,['rev-parse','HEAD']).trim();
      if(deletion!==undefined&&deletion.revision!==revision) throw new Error('swarm: source changed since deletion intent; preserve it');
      if(deletion===undefined) {
       const branch=gitResult(rollingStoredWorktree.rootPath,['symbolic-ref','--quiet','--short','HEAD']);
       if(branch.error||(branch.status!==0&&branch.status!==1)) throw new Error('swarm: cannot observe resource branch');
       const generation=branch.status===0?new RegExp(`^ponytail/worker-${rollingStoredWorktree.number}/([0-9a-f-]{36})$`,'u').exec(branch.stdout.trim())?.[1]??null:null;
       deletion=(await poolClient.query<Record<string,unknown>>(`WITH deletion AS (
        INSERT INTO ponytail_index.swarm_worktree_deletion_v1(project_id,number,owner_root,root_path,git_common_directory,revision,resource_generation)
        VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *)
        UPDATE ponytail_index.rolling_worktree_v1 w SET state='QUARANTINED' FROM deletion d
        WHERE w.project_id=d.project_id AND w.number=d.number RETURNING d.*`,[this.projectId,rollingStoredWorktree.number,ownerRoot,rollingStoredWorktree.rootPath,swarmCoordinatorBinding.swarmUserWorktree.gitCommonDirectory,revision,generation])).rows[0];
      }
      if(deletion===undefined) throw new Error('swarm: deletion intent was not recorded');
      // Git retains committed source; deletion never removes its branch or this ref.
      git(ownerRoot,['update-ref',`refs/ponytail/swarm/deleted/${rollingStoredWorktree.number}/${stringColumn(deletion.revision)}`,stringColumn(deletion.revision)]);
      if(deletion.cleanup_complete!==true) {
       this.cleanupWorktree({number:rollingStoredWorktree.number,rootPath:rollingStoredWorktree.rootPath,ownerRoot,generation:deletion.resource_generation===null?'':stringColumn(deletion.resource_generation)});
       requireRollingGitOperationAbsent(rollingStoredWorktree.rootPath);requireRollingSessionMarkerAbsent(rollingStoredWorktree.rootPath);
       if(git(rollingStoredWorktree.rootPath,['status','--porcelain']).trim()||git(rollingStoredWorktree.rootPath,['rev-parse','HEAD']).trim()!==deletion.revision) throw new Error('swarm: cleanup changed source; preserve checkout');
       await poolClient.query('UPDATE ponytail_index.swarm_worktree_deletion_v1 SET cleanup_complete=true WHERE project_id=$1 AND number=$2',[this.projectId,rollingStoredWorktree.number]);
      }
      git(ownerRoot,['worktree','remove','--',rollingStoredWorktree.rootPath]);
     } else {
      if(deletion===undefined||deletion.cleanup_complete!==true) throw new Error('swarm: missing checkout has no completed cleanup receipt');
      if(registered) git(ownerRoot,['worktree','remove','--force','--',rollingStoredWorktree.rootPath]);
     }
     registered=git(ownerRoot,['worktree','list','--porcelain','-z']).split('\0').includes(`worktree ${rollingStoredWorktree.rootPath}`);
     if(fs.lstatSync(rollingStoredWorktree.rootPath,{throwIfNoEntry:false})!==undefined||registered) throw new Error('swarm: checkout removal is incomplete');
     await poolClient.query("UPDATE ponytail_index.swarm_worktree_deletion_v1 SET state='COMPLETE' WHERE project_id=$1 AND number=$2",[this.projectId,rollingStoredWorktree.number]);
     results.push({number:rollingStoredWorktree.number,rootPath:rollingStoredWorktree.rootPath,outcome:'deleted'});
    } catch(cause) {results.push({number:rollingStoredWorktree.number,rootPath:rollingStoredWorktree.rootPath,outcome:'retained',reason:cause instanceof Error?cause.message:String(cause)});}
   }
   return results;
  } finally {try {await poolClient.query('SELECT pg_advisory_unlock(hashtextextended($1,0))',[this.projectId]);} finally {poolClient.release();}}
 }
 private async transaction<T>(operation:(poolClient:PoolClient)=>Promise<T>):Promise<T> {
  const poolClient=await this.pool.connect();
  try {await poolClient.query('BEGIN');const result=await operation(poolClient);await poolClient.query('COMMIT');return result;}
  catch(cause) {await poolClient.query('ROLLBACK');throw cause;}
  finally {poolClient.release();}
 }
 async enrollOwner(swarmUserWorktree:SwarmUserWorktree):Promise<SwarmCoordinatorBinding> {
  physicalOwner(swarmUserWorktree);
  const rollingManagedDirectory=resolveRollingManagedDirectory(swarmUserWorktree.rootPath);
  const relative=path.relative(rollingManagedDirectory.directory,swarmUserWorktree.rootPath);
  if(relative===''||relative!=='..'&&!relative.startsWith(`..${path.sep}`)&&!path.isAbsolute(relative))
   throw new Error('swarm: a managed checkout cannot enroll as a user owner');
  return this.transaction(async poolClient=>{
   // Reuse the project fence even when reset has removed the pool row.
   await poolClient.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[this.projectId]);
   if((await poolClient.query('SELECT number FROM ponytail_index.rolling_worktree_v1 WHERE project_id=$1 AND root_path=$2',[this.projectId,swarmUserWorktree.rootPath])).rowCount)
    throw new Error('swarm: a managed checkout cannot enroll as a user owner');
   await poolClient.query(`INSERT INTO ponytail_index.swarm_owner_v1(project_id,owner_root,git_common_directory)
    VALUES($1,$2,$3) ON CONFLICT(project_id,owner_root) DO NOTHING`,[this.projectId,swarmUserWorktree.rootPath,swarmUserWorktree.gitCommonDirectory]);
   const row=(await poolClient.query<Record<string,unknown>>('SELECT * FROM ponytail_index.swarm_owner_v1 WHERE project_id=$1 AND owner_root=$2 FOR UPDATE',[this.projectId,swarmUserWorktree.rootPath])).rows[0];
   if(row===undefined) throw new Error('swarm: owner enrollment is missing');
   const swarmCoordinatorBinding=readBinding(row);
   if(swarmCoordinatorBinding.swarmUserWorktree.gitCommonDirectory!==swarmUserWorktree.gitCommonDirectory) throw new Error('swarm: enrolled owner repository identity changed');
   return swarmCoordinatorBinding;
  });
 }
 async bindCoordinator(ownerRoot:string,rollingNativeThreadIdentity:RollingNativeThreadIdentity):Promise<SwarmCoordinatorBinding> {
  const {sessionId,threadId,rootPath}=rollingNativeThreadIdentity;
  if(!sessionId.trim()||sessionId!==sessionId.trim()) throw new Error('swarm: coordinator session ID must be nonempty without surrounding whitespace');
  if(!threadId.trim()||threadId!==threadId.trim()||rootPath!==ownerRoot) throw new Error('swarm: observed coordinator thread/checkout differs from owner');
  return this.transaction(async poolClient=>{
   await poolClient.query(`INSERT INTO ponytail_index.swarm_native_session_v1(session_id,thread_id,project_id,root_path)
    VALUES($1,$2,$3,$4) ON CONFLICT(session_id) DO NOTHING`,[sessionId,threadId,this.projectId,rootPath]);
   const native=(await poolClient.query<Record<string,unknown>>('SELECT * FROM ponytail_index.swarm_native_session_v1 WHERE session_id=$1 FOR UPDATE',[sessionId])).rows[0];
   if(native===undefined||native.thread_id!==threadId||native.project_id!==this.projectId||native.root_path!==rootPath)
    throw new Error('swarm: native session identity or original checkout changed');
   const row=(await poolClient.query<Record<string,unknown>>(`UPDATE ponytail_index.swarm_owner_v1 SET coordinator_session_id=$3
    WHERE project_id=$1 AND owner_root=$2 AND (coordinator_session_id IS NULL OR coordinator_session_id=$3) RETURNING *`,[this.projectId,ownerRoot,sessionId])).rows[0];
   if(row===undefined) throw new Error('swarm: owner is not enrolled or has another coordinator; inspect its binding before recovery');
   const swarmCoordinatorBinding=readBinding(row);
   physicalOwner(swarmCoordinatorBinding.swarmUserWorktree);
   return swarmCoordinatorBinding;
  });
 }
 async unbindCoordinator(ownerRoot:string,sessionId:string):Promise<SwarmCoordinatorBinding> {
  return this.transaction(async poolClient=>{
   const row=(await poolClient.query<Record<string,unknown>>(`UPDATE ponytail_index.swarm_owner_v1 SET coordinator_session_id=NULL
    WHERE project_id=$1 AND owner_root=$2 AND coordinator_session_id=$3 RETURNING *`,[this.projectId,ownerRoot,sessionId])).rows[0];
   if(row===undefined) throw new Error('swarm: coordinator binding changed or is absent; no ownership was released');
   return readBinding(row);
  });
 }
 async coordinatorBinding(ownerRoot:string):Promise<SwarmCoordinatorBinding|null> {
  const row=(await this.pool.query<Record<string,unknown>>('SELECT * FROM ponytail_index.swarm_owner_v1 WHERE project_id=$1 AND owner_root=$2',[this.projectId,ownerRoot])).rows[0];
  return row===undefined?null:readBinding(row);
 }
}
