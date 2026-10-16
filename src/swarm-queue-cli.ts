// Copyright (c) 2026 Alex Baretta.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import {Pool} from 'pg';
import {renderCliHelp} from './cli-help.js';
import {databaseOptions} from './project-index-database.js';
import {git} from './rolling-integration.js';
import {SwarmQueueStore,parseSwarmQueueJson,readSwarmQueueCommandV1} from './swarm-queue.js';
import {inspectSwarmInfo} from './swarm-info.js';
// Traceability: implements REQ-SWARM-QUEUES
export async function runSwarmQueueCli(argv:readonly string[]):Promise<void>{
 if(argv.length===0||argv.includes('--help')||argv.includes('-h')){process.stdout.write(renderCliHelp(['swarm','queue'])+'\n');return;}
 if(argv.length!==3||argv[1]!=='--request'||!argv[2]?.startsWith('@')){process.stderr.write(renderCliHelp(['swarm','queue'])+'\n');process.exitCode=2;return;}
 const swarmQueueCommandV1=readSwarmQueueCommandV1(parseSwarmQueueJson(fs.readFileSync(argv[2].slice(1),'utf8')));
 if(swarmQueueCommandV1.command!==argv[0])throw new Error('swarm queue: request command differs from CLI command');
 const root=fs.realpathSync(git(process.cwd(),['rev-parse','--show-toplevel']).trim());
 const journal:unknown=JSON.parse(fs.readFileSync(path.join(root,'ponytail-journal.json'),'utf8'));
 if(journal===null||typeof journal!=='object'||!('schemaVersion' in journal)||journal.schemaVersion!==1||!('projectId' in journal)||typeof journal.projectId!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(journal.projectId))throw new Error('swarm queue: invoking project requires V1 journal identity');
 const pool=new Pool(databaseOptions(root));
 try{const inventorySwarmInfoV5=await inspectSwarmInfo(root,pool,journal.projectId);const swarmQueueStore=new SwarmQueueStore(pool,journal.projectId,inventorySwarmInfoV5.ownerRoot);
  const resultSwarmQueueResultV1=await swarmQueueStore.execute(swarmQueueCommandV1,root);process.stdout.write(JSON.stringify(resultSwarmQueueResultV1)+'\n');
 }finally{await pool.end();}
}
