// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, fork } = require('node:child_process');
const { once } = require('node:events');
const test = require('node:test');
const { Client } = require('pg');
const { collectTraceabilityProjection, databaseOptions,
  publishTraceabilityGeneration } = require('../src/project-index');

async function crashWorker(configurationPath, databaseRoot) {
  const client = new Client(databaseOptions(databaseRoot));
  await client.connect();
  let commits = 0;
  const checkpointClient = { async query(text, values) {
    const result = await client.query(text, values);
    if (text === 'COMMIT' && ++commits === 2) {
      process.send({ checkpoint: true });
      await new Promise(() => {});
    }
    return result;
  } };
  await publishTraceabilityGeneration(checkpointClient,
    collectTraceabilityProjection(configurationPath), { batchSize: 3 });
  await client.end();
}

if (process.argv[2] === '--crash-worker') {
  crashWorker(process.argv[3], process.argv[4]).catch(error => {
    process.stderr.write(`${error.stack}\n`);
    process.exitCode = 1;
  });
} else {
  // Traceability: verifies REQ-TRACEABILITY-BATCH-RESUME
  test('real PostgreSQL retains batches across SIGKILL without partial publication',
    { timeout: 60000 }, async t => {
      const databaseRoot = path.resolve(__dirname, '..');
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-batch-resume-'));
      const projectId = crypto.randomUUID();
      const client = new Client(databaseOptions(databaseRoot));
      const peerClient = new Client(databaseOptions(databaseRoot));
      let worker;
      t.after(async () => {
        if (worker && worker.exitCode === null && worker.signalCode === null) worker.kill('SIGKILL');
        await peerClient.end();
        // Only this test's isolated project identity is removed.
        try {
          await client.query(`DELETE FROM ponytail_index.generation_v1 WHERE worktree_id IN
            (SELECT worktree_id FROM ponytail_index.worktree_v1 JOIN ponytail_index.repository_v1
            USING (repository_id) WHERE project_id = $1::uuid)`, [projectId]);
          await client.query('DELETE FROM ponytail_index.parse_result_v1 WHERE project_id = $1::uuid', [projectId]);
          await client.query(`DELETE FROM ponytail_index.worktree_v1 WHERE repository_id IN
            (SELECT repository_id FROM ponytail_index.repository_v1 WHERE project_id = $1::uuid)`, [projectId]);
          await client.query('DELETE FROM ponytail_index.repository_v1 WHERE project_id = $1::uuid', [projectId]);
          await client.query('DELETE FROM ponytail_index.project_v1 WHERE project_id = $1::uuid', [projectId]);
        } finally {
          await client.end();
          fs.rmSync(root, { recursive: true, force: true });
        }
      });
      await client.connect();
      await peerClient.connect();
      fs.mkdirSync(path.join(root, '.agents/config/project'), { recursive: true });
      fs.mkdirSync(path.join(root, 'pm/requirements'), { recursive: true });
      fs.mkdirSync(path.join(root, 'src'));
      fs.writeFileSync(path.join(root, 'ponytail-journal.json'), JSON.stringify({
        schemaVersion: 1, projectId, projectName: `batch-resume-${projectId}`,
      }));
      fs.writeFileSync(path.join(root, 'pm/requirements/value.md'),
        '# Value\n\n**Identifier:** `REQ-VALUE`\n');
      const configurationPath = path.join(root, '.agents/config/project/traceability.json');
      const configuration = {
        schemaVersion: 2, projectRoot: '../../..',
        requirements: [{ id: 'REQ-VALUE', sourcePath: 'pm/requirements/value.md' }],
        artifacts: Array.from({ length: 12 }, (_, index) => ({
          class: 'implementation', path: `src/value-${index}.js`, locator: 'text',
        })),
        generatedArtifacts: [], reverseViewPath: 'pm/requirements/traceability.generated.md',
        index: { searchableFields: ['entityId', 'entityKind', 'requirementId', 'path'] },
      };
      for (const artifact of configuration.artifacts) fs.writeFileSync(path.join(root, artifact.path),
        '// Trace' + 'ability: implements REQ-VALUE\n');
      fs.writeFileSync(configurationPath, JSON.stringify(configuration));
      execFileSync('git', ['init', '-q'], { cwd: root });
      execFileSync('git', ['add', '.'], { cwd: root });
      execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com',
        'commit', '-qm', 'baseline'], { cwd: root });
      const original = collectTraceabilityProjection(configurationPath);
      const first = await publishTraceabilityGeneration(client, original, { batchSize: 3 });
      for (const artifact of configuration.artifacts) fs.appendFileSync(path.join(root, artifact.path),
        '// changed before crash\n');
      worker = fork(__filename, ['--crash-worker', configurationPath, databaseRoot],
        { silent: true });
      const messages = once(worker, 'message');
      let workerErrors = '';
      worker.stderr.on('data', bytes => { workerErrors += bytes.toString(); });
      const ready = await Promise.race([
        messages,
        once(worker, 'exit').then(() => { throw new Error(`worker exited before checkpoint: ${workerErrors}`); }),
      ]);
      assert.equal(ready[0].checkpoint, true);
      const current = collectTraceabilityProjection(configurationPath);
      await assert.rejects(() => publishTraceabilityGeneration(peerClient, current), /already active/);
      const durable = await client.query(`SELECT count(*)::integer AS count
        FROM ponytail_index.parse_result_v1 WHERE project_id = $1::uuid`, [projectId]);
      assert.equal(durable.rows[0].count, original.files.length + 1);
      const peer = await publishTraceabilityGeneration(peerClient,
        { ...current, files: [], worktreePath: `${root}/independent` }, { batchSize: 3 });
      assert.ok(peer.generationId);
      const pointer = await client.query(`SELECT published.generation_id
        FROM ponytail_index.published_generation_v1 published
        JOIN ponytail_index.worktree_v1 worktree USING (worktree_id)
        JOIN ponytail_index.repository_v1 repository USING (repository_id)
        WHERE repository.project_id = $1::uuid AND worktree.root_path = $2`,
      [projectId, original.worktreePath]);
      assert.equal(pointer.rows[0].generation_id, first.generationId);
      const exit = once(worker, 'exit');
      worker.kill('SIGKILL');
      const [, signal] = await exit;
      assert.equal(signal, 'SIGKILL');
      fs.appendFileSync(path.join(root, 'src/value-0.js'), '// changed checkpoint before restart\n');
      const restart = collectTraceabilityProjection(configurationPath);
      const resumed = await publishTraceabilityGeneration(client, restart, { batchSize: 3 });
      assert.equal(resumed.reusedFiles, 2);
      assert.equal(resumed.parsedFiles, restart.files.length - 2);
      const clean = await publishTraceabilityGeneration(peerClient,
        { ...restart, worktreePath: `${root}/independent` }, { batchSize: 3 });
      const graph = async generationId => {
        const result = await client.query(`SELECT entity_id, entity_kind, path, annotation
          FROM ponytail_index.entity_v1 WHERE generation_id = $1::uuid ORDER BY entity_id`, [generationId]);
        const relationships = await client.query(`SELECT source_entity_id, target_entity_id, role
          FROM ponytail_index.relationship_v1 WHERE generation_id = $1::uuid
          ORDER BY source_entity_id, target_entity_id, role`, [generationId]);
        return { entities: result.rows, relationships: relationships.rows };
      };
      assert.deepEqual(await graph(resumed.generationId), await graph(clean.generationId));
      // Dirty content and configuration changes invalidate only compatible identities.
      fs.appendFileSync(path.join(root, 'src/value-0.js'), '// post-crash edit\n');
      const dirty = await publishTraceabilityGeneration(client,
        collectTraceabilityProjection(configurationPath), { batchSize: 3 });
      assert.equal(dirty.parsedFiles, 1);
      assert.equal(dirty.reusedFiles, current.files.length - 1);
      configuration.index.searchableFields.push('annotation');
      fs.writeFileSync(configurationPath, JSON.stringify(configuration));
      const changedConfiguration = collectTraceabilityProjection(configurationPath);
      const reconfigured = await publishTraceabilityGeneration(client, changedConfiguration, { batchSize: 3 });
      assert.equal(reconfigured.parsedFiles, changedConfiguration.files.length);
      assert.equal(reconfigured.reusedFiles, 0);
      fs.renameSync(path.join(root, 'src/value-1.js'), path.join(root, 'src/renamed.js'));
      configuration.artifacts[1].path = 'src/renamed.js';
      fs.unlinkSync(path.join(root, 'src/value-2.js'));
      configuration.artifacts.splice(2, 1);
      fs.writeFileSync(path.join(root, 'src/added.js'), '// Trace' + 'ability: implements REQ-VALUE\n');
      configuration.artifacts.push({ class: 'implementation', path: 'src/added.js', locator: 'text' });
      fs.writeFileSync(configurationPath, JSON.stringify(configuration));
      fs.appendFileSync(path.join(root, 'pm/requirements/value.md'), '\nUpdated requirement description.\n');
      const evolved = await publishTraceabilityGeneration(client,
        collectTraceabilityProjection(configurationPath), { batchSize: 3 });
      const evolvedGraph = await graph(evolved.generationId);
      const paths = evolvedGraph.entities.map(entity => entity.path);
      assert.ok(paths.includes('src/renamed.js'));
      assert.ok(paths.includes('src/added.js'));
      assert.equal(paths.includes('src/value-1.js'), false);
      assert.equal(paths.includes('src/value-2.js'), false);
    });
}
