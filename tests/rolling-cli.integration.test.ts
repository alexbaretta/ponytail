// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {createServer,type Socket} from 'node:net';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';

// Traceability: verifies REQ-CLI-INTERRUPTION
// Traceability: verifies REQ-ROLLING-INTERFACES
test('direct campaign CLI preserves quiet exit 130 when cancellation precedes a connection error',async testContext=> {
 const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'rolling-cli-cancel-')));
 const server = createServer();
 await new Promise<void>((resolve,reject)=> {server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const addressInfo = server.address();assert.ok(addressInfo !== null && typeof addressInfo !== 'string');
 // This legacy journal is external boundary data. The transport fixture never
 // sends a PostgreSQL response or supplies product state.
 fs.writeFileSync(path.join(root,'ponytail-journal.json'),JSON.stringify({schemaVersion:1,projectId:crypto.randomUUID(),projectName:'cancellation-fixture',database:{host:'127.0.0.1',port:addressInfo.port,name:'fixture',role:'fixture'}}));
 const connected = new Promise<Socket>(resolve=>server.once('connection',resolve));
 const childProcessWithoutNullStreams = spawn(process.execPath,[path.join(process.cwd(),'src/rolling-operations.js'),'status','--campaign','pilot'],{cwd:root,stdio:['pipe','pipe','pipe']});
 let stdout = '',stderr = '';
 childProcessWithoutNullStreams.stdout.setEncoding('utf8').on('data',(value:string)=>{stdout+=value;});
 childProcessWithoutNullStreams.stderr.setEncoding('utf8').on('data',(value:string)=>{stderr+=value;});
 const exited = new Promise<number | null>(resolve=>childProcessWithoutNullStreams.once('exit',code=>resolve(code)));
 let socket:Socket | null = null;
 testContext.after(async()=> {
  socket?.destroy();
  if (childProcessWithoutNullStreams.exitCode === null && childProcessWithoutNullStreams.signalCode === null) {childProcessWithoutNullStreams.kill();await exited;}
  await new Promise<void>(resolve=>server.close(()=>resolve()));
  fs.rmSync(root,{recursive:true,force:true});
 });
 socket = await connected;
 assert.equal(childProcessWithoutNullStreams.kill('SIGINT'),true);
 // The installed SIGINT handler has no output acknowledgement. Allow one short
 // event-loop interval before releasing the deliberately pending transport.
 await setTimeout(50);
 socket.destroy();
 assert.equal(await exited,130,stderr);
 assert.equal(stdout,'');assert.equal(stderr,'');
});
