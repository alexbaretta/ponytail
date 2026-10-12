#!/usr/bin/env node
// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';
import {registerRollingCampaignTools} from './rolling.js';

// The existing instruction builder remains the sole owner of mode policy.
const instructionsPath = './instructions.js';
const dependency:unknown = await import(instructionsPath);
if (dependency === null || typeof dependency !== 'object' || !('MODES' in dependency) || !('resolveMode' in dependency) || !('buildInstructions' in dependency)) throw new Error('Invalid instruction-builder exports');
const modes:unknown = dependency.MODES;
const resolveMode:unknown = dependency.resolveMode;
const buildInstructions:unknown = dependency.buildInstructions;
if (!Array.isArray(modes) || !modes.every((value:unknown)=>typeof value === 'string') || typeof resolveMode !== 'function' || typeof buildInstructions !== 'function') throw new Error('Invalid instruction-builder contract');
function instructions(requested:string | undefined):{mode:string;instructions:string} {
 if (typeof resolveMode !== 'function' || typeof buildInstructions !== 'function') throw new Error('Invalid instruction-builder functions');
 const mode:unknown = resolveMode(requested);
 const text:unknown = buildInstructions(mode);
 if (typeof mode !== 'string' || typeof text !== 'string') throw new Error('Invalid instruction-builder result');
 return {mode,instructions:text};
}
const metadata:unknown = JSON.parse(await fs.promises.readFile(new URL('../package.json',import.meta.url),'utf8'));
if (metadata === null || typeof metadata !== 'object' || !('version' in metadata) || typeof metadata.version !== 'string') throw new Error('Invalid package version');
const mcpServer = new McpServer({name:'ponytail',version:metadata.version});
const modeArg = z.string().refine(value=>modes.includes(value),'Unknown Ponytail mode').optional().describe('Ponytail intensity; omit for the configured default.');
mcpServer.registerPrompt('ponytail',{
 title:'Ponytail mode',description:'Lazy senior dev instructions: YAGNI, stdlib first, the smallest correct change.',argsSchema:{mode:modeArg}
},({mode})=>({messages:[{role:'user',content:{type:'text',text:instructions(mode).instructions}}]}));
mcpServer.registerTool('ponytail_instructions',{
 title:'Ponytail instructions',description:'Return the Ponytail ruleset for the requested intensity.',inputSchema:{mode:modeArg},
 outputSchema:{mode:z.string(),instructions:z.string()},annotations:{readOnlyHint:true,openWorldHint:false}
},({mode})=> {
 const structuredContent = instructions(mode);
 return {content:[{type:'text',text:structuredContent.instructions}],structuredContent};
});
registerRollingCampaignTools(mcpServer);
await mcpServer.connect(new StdioServerTransport());
