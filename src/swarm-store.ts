// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import type {Pool,PoolClient} from 'pg';
import {git} from './rolling-integration.js';
import type {SwarmUserWorktree} from './swarm-owner.js';
import {resolveRollingManagedDirectory} from './rolling-worktrees.js';

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
 async bindCoordinator(ownerRoot:string,sessionId:string):Promise<SwarmCoordinatorBinding> {
  if(!sessionId.trim()||sessionId!==sessionId.trim()) throw new Error('swarm: coordinator session ID must be nonempty without surrounding whitespace');
  return this.transaction(async poolClient=>{
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
