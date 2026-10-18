// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {rollingCommandDefinitions,rollingCampaignHelp,isRollingCommandName} from './rolling-cli-registry.js';

class RollingLegacyInspectionError extends Error {
 constructor(readonly exitCode:number,message:string) {super(message);}
}
function readJson(text:string):unknown {return JSON.parse(text);}
export interface RollingOperationResponse {readonly command:'legacy';readonly result:string;}

// Traceability: implements REQ-ROLLING-INTERFACES
export async function executeRollingCommand(root:string,command:string,value:unknown,signal?:AbortSignal):Promise<RollingOperationResponse> {
 if (command !== 'legacy') throw new Error(`campaign: retired operation ${command}; use native host tools and Git`);
 if (!path.isAbsolute(root)) throw new Error('campaign: absolute invoking root required');
 if (value===null || typeof value!=='object' || Array.isArray(value) || !('command' in value)
  || Object.keys(value).some(key=>key!=='command' && key!=='arguments')) throw new Error('campaign: expected historical inspection command and optional arguments');
 const inspection:unknown=value.command;
 if (typeof inspection!=='string' || !['validate','report','list','status','reservation-audit'].includes(inspection)) throw new Error('campaign: only read-only historical inspection is supported');
 const arguments_:unknown='arguments' in value ? value.arguments : [];
 if (!Array.isArray(arguments_) || !arguments_.every((item:unknown)=>typeof item==='string' && item.length>0)) throw new Error('campaign: arguments must be a string array');
 signal?.throwIfAborted();
 const result=spawnSync(process.execPath,[path.join(__dirname,'campaign-census.js'),inspection,...arguments_],{cwd:root,encoding:'utf8'});
 if (result.error || result.status!==0) throw new RollingLegacyInspectionError(result.status??1,result.error?.message || result.stderr.trim() || 'historical campaign inspection failed');
 return {command:'legacy',result:result.stdout};
}

// Traceability: implements REQ-ROLLING-INTERFACES
export async function runRollingOperationCli(argv:readonly string[]):Promise<void> {
 const [command,...arguments_] = argv;
 if (command === undefined || command === '--help') {process.stdout.write(rollingCampaignHelp());return;}
 if (!isRollingCommandName(command)) throw new Error(`rolling campaign: unknown command ${command}`);
 const definition = rollingCommandDefinitions.find(item=>item.name === command);
 if (!definition?.cli) throw new Error(`rolling campaign: unknown or retired CLI command ${command}; session operations belong to the coordinator host tools`);
 if (arguments_.length === 1 && arguments_[0] === '--help') {process.stdout.write(rollingCampaignHelp(command));return;}
 const input:Record<string,unknown> = {};
 let jsonOutput = false;
 for (let index=0;index<arguments_.length;index++) {
  const flag = arguments_[index];
  if (flag === '--json') {if (jsonOutput) throw new Error('rolling campaign: repeated --json');jsonOutput=true;continue;}
  const field = definition.fields.find(item=>`--${item.name}` === flag);
  if (!field || Object.hasOwn(input,field.name)) throw new Error(`rolling campaign: unknown or repeated argument ${flag}`);
  const value = arguments_[++index];
  if (value === undefined || value.startsWith('--')) throw new Error(`rolling campaign: missing value for ${flag}`);
  input[field.name] = field.kind === 'json' ? readJson(value.startsWith('@') ? fs.readFileSync(value.slice(1),'utf8') : value) : value;
 }
 const abortController = new AbortController();
 const cancel = ():void=>abortController.abort();
 process.once('SIGINT',cancel);
 try {
  const rollingOperationResponse = await executeRollingCommand(fs.realpathSync(process.cwd()),command,input,abortController.signal);
  process.stdout.write(JSON.stringify(rollingOperationResponse)+'\n');
 } finally {process.removeListener('SIGINT',cancel);if (abortController.signal.aborted) process.exitCode=130;}
}
if (require.main === module) runRollingOperationCli(process.argv.slice(2)).catch((error:unknown)=> {
 if (process.exitCode === 130) return;
 process.stderr.write((error instanceof Error ? error.message : String(error))+'\n');process.exitCode=error instanceof RollingLegacyInspectionError ? error.exitCode : 1;
});
