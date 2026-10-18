// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

export interface RollingCommandField {readonly name:string;readonly kind:'string' | 'json';readonly required:boolean;readonly description:string;}
export interface RollingCommandDefinition {readonly cli:boolean;readonly name:string;readonly description:string;readonly preconditions:string;readonly mutations:string;readonly result:string;readonly fields:readonly RollingCommandField[];}
// Historical inspection is the only retained campaign command.
export const rollingCommandDefinitions = [
 {cli:true,name:'legacy',description:'Explicitly inspect historical campaign records.',preconditions:'Read-only legacy command: validate, report, list, status or reservation-audit.',mutations:'None.',result:'Historical inspection from the existing reader.',fields:[{name:'command',kind:'string',required:true,description:'Legacy inspection command; trailing arguments belong to that reader.'},{name:'arguments',kind:'json',required:false,description:'Array of literal historical-reader arguments.'}]}
] as const;
export type RollingCommandName = 'legacy';
export function isRollingCommandName(value:string):value is RollingCommandName {return value==='legacy';}

// Historical coverage: implements REQ-ROLLING-INTERFACES
export function rollingCampaignHelp(commandName?:string):string {
 if (commandName === undefined) return 'Usage: ponytail campaign <command> [arguments]\n\n'+rollingCommandDefinitions.filter(command=>command.cli).map(command=>`  ${command.name.padEnd(28)} ${command.description}`).join('\n')+'\n\nUse ponytail campaign <command> --help for arguments and behavior.\n';
 const command = rollingCommandDefinitions.find(item=>item.cli && item.name === commandName);
 if (!command) throw new Error(`rolling campaign: unknown command ${commandName}`);
 return `Usage: ponytail campaign ${command.name} `+command.fields.map(field=>`${field.required ? '' : '['}--${field.name} <${field.kind === 'json' ? 'JSON|@file' : 'value'}>${field.required ? '' : ']'}`).join(' ')
  +`\n\n${command.description}\nPreconditions: ${command.preconditions}\nMutations: ${command.mutations}\nResult: ${command.result}\n\n`
  +command.fields.map(field=>`  --${field.name}: ${field.description}${field.required ? ' Required.' : ' Optional.'}`).join('\n')+'\n';
}
