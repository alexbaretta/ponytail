// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
/// <reference lib="dom" />
import path from 'node:path';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {rollingCommandDefinitions} from '../src/rolling-cli-registry.js';
import {executeRollingCommand} from '../src/rolling-operations.js';

// Historical coverage: implements REQ-ROLLING-INTERFACES
export function registerRollingCampaignTools(mcpServer:McpServer):void {
 for (const rollingCommandDefinition of rollingCommandDefinitions.filter(command=>command.cli)) {
  const inputSchema:Record<string,z.ZodType<unknown>> = {
   root:z.string().refine(path.isAbsolute,'An absolute invoking project root is required.')
  };
  for (const rollingCommandField of rollingCommandDefinition.fields) {
   const schema = (rollingCommandField.kind === 'string' ? z.string() : z.unknown().refine(value=>value !== undefined,'A JSON argument is required.')).describe(rollingCommandField.description);
   inputSchema[rollingCommandField.name] = rollingCommandField.required ? schema : schema.optional();
  }
  mcpServer.registerTool(`ponytail_campaign_${rollingCommandDefinition.name.replaceAll('-','_')}`,{
   description:`${rollingCommandDefinition.description}\nPreconditions: ${rollingCommandDefinition.preconditions}\nMutations: ${rollingCommandDefinition.mutations}\nResult: ${rollingCommandDefinition.result}`,
   inputSchema,
   annotations:{readOnlyHint:rollingCommandDefinition.mutations === 'None.',openWorldHint:true}
  },async (arguments_,extra)=> {
   const root:unknown = arguments_.root;
   if (typeof root !== 'string' || !path.isAbsolute(root)) throw new Error('rolling campaign: absolute project root required');
   const input:Record<string,unknown> = {};
   for (const rollingCommandField of rollingCommandDefinition.fields) {
    const value:unknown = arguments_[rollingCommandField.name];
    if (value !== undefined) input[rollingCommandField.name] = value;
   }
   const rollingOperationResponse = await executeRollingCommand(root,rollingCommandDefinition.name,input,extra.signal);
   return {content:[{type:'text',text:JSON.stringify(rollingOperationResponse)}]};
  });
 }
}
