// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from ponytail-mcp/rolling.ts by npm run build.
import path from 'node:path';
import { z } from 'zod';
import { rollingCommandDefinitions } from '../src/rolling-cli-registry.js';
import { executeRollingCommand } from '../src/rolling-operations.js';
export function registerRollingCampaignTools(mcpServer) {
    for (const rollingCommandDefinition of rollingCommandDefinitions.filter(command => command.cli)) {
        const inputSchema = {
            root: z.string().refine(path.isAbsolute, 'An absolute invoking project root is required.')
        };
        for (const rollingCommandField of rollingCommandDefinition.fields) {
            const schema = (rollingCommandField.kind === 'string' ? z.string() : z.unknown().refine(value => value !== undefined, 'A JSON argument is required.')).describe(rollingCommandField.description);
            inputSchema[rollingCommandField.name] = rollingCommandField.required ? schema : schema.optional();
        }
        mcpServer.registerTool(`ponytail_campaign_${rollingCommandDefinition.name.replaceAll('-', '_')}`, {
            description: `${rollingCommandDefinition.description}\nPreconditions: ${rollingCommandDefinition.preconditions}\nMutations: ${rollingCommandDefinition.mutations}\nResult: ${rollingCommandDefinition.result}`,
            inputSchema,
            annotations: { readOnlyHint: rollingCommandDefinition.mutations === 'None.', openWorldHint: true }
        }, async (arguments_, extra) => {
            const root = arguments_.root;
            if (typeof root !== 'string' || !path.isAbsolute(root))
                throw new Error('rolling campaign: absolute project root required');
            const input = {};
            for (const rollingCommandField of rollingCommandDefinition.fields) {
                const value = arguments_[rollingCommandField.name];
                if (value !== undefined)
                    input[rollingCommandField.name] = value;
            }
            const rollingOperationResponse = await executeRollingCommand(root, rollingCommandDefinition.name, input, extra.signal);
            return { content: [{ type: 'text', text: JSON.stringify(rollingOperationResponse) }] };
        });
    }
}
