// Copyright (c) 2026 Alex Baretta.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import {Pool} from 'pg';
import {renderCliHelp} from './cli-help.js';
import {databaseOptions} from './project-index-database.js';
import {git} from './rolling-integration.js';
import {SwarmQueueStore,parseSwarmQueueJson,readSwarmQueueCommand,createSwarmQueueResultV3} from './swarm-queue.js';
// Traceability: implements REQ-SWARM-QUEUES
export async function runSwarmQueueCli(argv:readonly string[]):Promise<void>{
 if(argv.length===0||argv.includes('--help')||argv.includes('-h')){process.stdout.write(renderCliHelp(['swarm','queue'])+'\n');return;}
 if(argv.length!==3||argv[1]!=='--request'||!argv[2]?.startsWith('@')){process.stderr.write(renderCliHelp(['swarm','queue'])+'\n');process.exitCode=2;return;}
 if(fs.statSync(argv[2].slice(1)).size>8*1024*1024)throw new Error('swarm queue: request metadata exceeds 8 MiB; retain large evidence in artifact files');
 const swarmQueueCommandV3=readSwarmQueueCommand(parseSwarmQueueJson(fs.readFileSync(argv[2].slice(1),'utf8')));
 if(swarmQueueCommandV3.command!==argv[0])throw new Error('swarm queue: request command differs from CLI command');
 const root=fs.realpathSync(git(process.cwd(),['rev-parse','--show-toplevel']).trim());
 const journal:unknown=JSON.parse(fs.readFileSync(path.join(root,'ponytail-journal.json'),'utf8'));
 if(journal===null||typeof journal!=='object'||!('schemaVersion' in journal)||journal.schemaVersion!==1||!('projectId' in journal)||typeof journal.projectId!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(journal.projectId))throw new Error('swarm queue: invoking project requires V1 journal identity');
 const pool=new Pool(databaseOptions(root));
 try{const rows=(await pool.query<Record<string,unknown>>(`SELECT owner_root FROM ponytail_index.swarm_owner_v1 WHERE project_id=$1 AND owner_root=$2
  UNION ALL SELECT s.owner_root FROM ponytail_index.swarm_worktree_v1 s JOIN ponytail_index.rolling_worktree_v1 w USING(project_id,number)
  WHERE s.project_id=$1 AND w.root_path=$2`,[journal.projectId,root])).rows;
  const row=rows[0];if(rows.length!==1||row===undefined||typeof row.owner_root!=='string')throw new Error('swarm queue: invoking checkout requires one recorded owner');
  const swarmQueueStore=new SwarmQueueStore(pool,journal.projectId,row.owner_root);
  const swarmQueueOperation=await swarmQueueStore.execute(swarmQueueCommandV3,root);process.stdout.write(JSON.stringify(createSwarmQueueResultV3(swarmQueueOperation))+'\n');
 }finally{await pool.end();}
}
