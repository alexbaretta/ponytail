// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {cliHelpCommands} from '../src/cli-help.js';

// Traceability: verifies REQ-SWARM-SKILL
test('swarm instructions use shipped resource commands and retire session API instructions',()=>{
 const root=path.resolve(__dirname,'../..');
 const skill=fs.readFileSync(path.join(root,'skills/swarm/SKILL.md'),'utf8');
 for(const cliHelpCommand of cliHelpCommands.filter(command=>command.chapter==='swarm'))
  assert.ok(skill.includes(cliHelpCommand.name),`missing swarm command: ${cliHelpCommand.name}`);
 const procedure=fs.readFileSync(path.join(root,'skills/plan-execution/references/rolling-campaigns.md'),'utf8');
 for(const retired of ['provision-worker','dispatch-worker','collect-submission','suspend-worker','start-review','dispatch-review','inspect-review','retire-worker','campaign reset'])
  assert.ok(!procedure.includes(retired),`retired session instruction: ${retired}`);
 assert.match(skill,/coordinator\nperforms session operations through the host tools/);
 assert.match(skill,/Implementation workers are top-level sessions/);
 assert.match(skill,/Each worker uses a local,\nread-only subagent for adversarial review/);
 assert.match(skill,/The coordinator\nrecords that review and performs publication; it does not repeat the review/);
 assert.match(procedure,/local read-only reviewer subagent/);
 assert.match(procedure,/The coordinator verifies and records the attestation; it does not repeat the\n   adversarial review/);
 assert.match(skill,/freeze its exact\nnon-null `projectId`/);
 assert.match(skill,/coordinator session's project is the project for every\nworker it creates/);
 assert.match(skill,/Never dispatch or bind a `projectless` worker/);
 assert.match(skill,/`move_thread_to_project`/);
 assert.match(skill,/worker and coordinator have the same non-null\n   `projectId`/);
 assert.match(skill,/fresh worker with `create_thread`/);
 assert.match(skill,/environment: \{type: "worktree"\}/);
 assert.match(procedure,/hostAction/);
});
