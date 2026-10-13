// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout } from 'node:timers/promises';
import { Pool } from 'pg';
import { databaseOptions } from '../src/project-index-database.js';

// Traceability: verifies REQ-REPOSITORY-TEXT-INDEX
test('overlay pruning preserves concurrent shared-store blob publication', async t => {
  const repositoryRoot = path.resolve(__dirname, '../..');
  const directory = fs.mkdtempSync(path.join(repositoryRoot, 'tmp/document-cleanup-'));
  const root = path.join(directory, 'caller');
  fs.mkdirSync(root);
  const projectId = crypto.randomUUID();
  const peerProjectId = crypto.randomUUID();
  const pool = new Pool(databaseOptions(repositoryRoot));
  const writerPoolClient = await pool.connect();
  const content = `retained peer blob ${projectId}\n`;
  const documentId = crypto.createHash('sha256').update(content).digest('hex');
  const applicationName = `cleanup-${projectId}`;
  t.after(async () => {
    await writerPoolClient.query('ROLLBACK');
    writerPoolClient.release();
    try {
      await pool.query(`DELETE FROM ponytail_index.worktree_v1 WHERE repository_id IN
        (SELECT repository_id FROM ponytail_index.repository_v1 WHERE project_id = $1::uuid)`, [projectId]);
      await pool.query('DELETE FROM ponytail_index.repository_v1 WHERE project_id = $1::uuid', [projectId]);
      await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id = $1::uuid', [projectId]);
      await pool.query('DELETE FROM ponytail_index.repository_v1 WHERE project_id = $1::uuid', [peerProjectId]);
      await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id = $1::uuid', [peerProjectId]);
      await pool.query('DELETE FROM ponytail_index.text_document_v1 WHERE document_id = $1', [documentId]);
    } finally {
      await pool.end();
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
  const git = (argv: readonly string[]): string => execFileSync('git', ['-C', root, ...argv], { encoding: 'utf8' }).trim();
  git(['init', '-q', '-b', 'main']);
  fs.copyFileSync(path.join(repositoryRoot, 'ponytail-journal.json'), path.join(root, 'ponytail-journal.json'));
  const journal: unknown = JSON.parse(fs.readFileSync(path.join(root, 'ponytail-journal.json'), 'utf8'));
  assert.ok(typeof journal === 'object' && journal !== null);
  fs.writeFileSync(path.join(root, 'ponytail-journal.json'), JSON.stringify({ ...journal, projectId, projectName: applicationName }));
  fs.writeFileSync(path.join(root, 'value.txt'), `base ${projectId}\n`);
  git(['add', '.']);
  git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'base']);
  const update = () => promisify(execFile)(process.execPath, [path.join(repositoryRoot, 'src/project-index.js'), 'search', 'update-index'], {
    cwd: root, env: { ...process.env, PGAPPNAME: applicationName }, timeout: 20000,
  });
  await update();
  fs.writeFileSync(path.join(root, 'value.txt'), content);
  await update();
  fs.writeFileSync(path.join(root, 'value.txt'), `changed overlay ${projectId}\n`);
  await pool.query('INSERT INTO ponytail_index.project_v1 (project_id, project_name) VALUES ($1::uuid, $2)', [peerProjectId, `peer-${peerProjectId}`]);
  await pool.query('INSERT INTO ponytail_index.repository_v1 (project_id, common_directory) VALUES ($1::uuid, $2)', [peerProjectId, path.join(directory, 'peer')]);
  await writerPoolClient.query('BEGIN');
  await writerPoolClient.query(`INSERT INTO ponytail_index.text_document_v1 (document_id, content) VALUES ($1, $2)
    ON CONFLICT (document_id) DO NOTHING`, [documentId, content]);
  await writerPoolClient.query(`INSERT INTO ponytail_index.git_blob_v1 (repository_id, blob_oid, byte_length, document_id)
    SELECT repository_id, $2, $3, $4 FROM ponytail_index.repository_v1 WHERE project_id = $1::uuid`,
  [peerProjectId, crypto.randomBytes(20).toString('hex'), Buffer.byteLength(content), documentId]);
  let completed = false;
  const publication = update().then(output => { completed = true; return { output, error: null }; },
    (error: unknown) => { completed = true; return { output: null, error }; });
  // Observe the actual blocked PostgreSQL operation before releasing the writer.
  const deadline = Date.now() + 10000;
  let blocked = false;
  while (!blocked && !completed && Date.now() < deadline) {
    const result = await pool.query<{ blocked: boolean }>(`SELECT EXISTS (
      SELECT 1 FROM pg_stat_activity WHERE application_name = $1 AND wait_event_type = 'Lock') AS blocked`, [applicationName]);
    blocked = result.rows[0]?.blocked === true;
    if (!blocked) await setTimeout(10);
  }
  const completedBeforeWriterCommit = completed;
  await writerPoolClient.query('COMMIT');
  const result = await publication;
  assert.equal(result.error, null);
  assert.ok(completedBeforeWriterCommit, 'pruning must not wait for a peer document writer');
  assert.ok(result.output);
  assert.match(result.output.stdout, /Index updated:/);
  const retained = await pool.query<{ count: string }>('SELECT count(*) FROM ponytail_index.text_document_v1 WHERE document_id = $1', [documentId]);
  assert.equal(retained.rows[0]?.count, '1');
  await update();
  const superseded = await pool.query<{ count: string }>(`SELECT count(*) FROM ponytail_index.worktree_text_generation_v1 generation
    JOIN ponytail_index.worktree_v1 worktree USING (worktree_id)
    JOIN ponytail_index.repository_v1 repository USING (repository_id)
    WHERE repository.project_id = $1::uuid`, [projectId]);
  assert.equal(superseded.rows[0]?.count, '1', 'unchanged refresh prunes retained stale ownership after writer commits');
  const abandonedContent = `abandoned peer document ${projectId}\n`;
  const abandonedDocumentId = crypto.createHash('sha256').update(abandonedContent).digest('hex');
  fs.writeFileSync(path.join(root, 'value.txt'), abandonedContent);
  await update();
  await writerPoolClient.query('BEGIN');
  await writerPoolClient.query('SELECT document_id FROM ponytail_index.text_document_v1 WHERE document_id = $1 FOR UPDATE', [abandonedDocumentId]);
  fs.writeFileSync(path.join(root, 'value.txt'), `final overlay ${projectId}\n`);
  await update();
  await writerPoolClient.query('ROLLBACK');
  await update();
  const abandoned = await pool.query<{ count: string }>('SELECT count(*) FROM ponytail_index.text_document_v1 WHERE document_id = $1', [abandonedDocumentId]);
  assert.equal(abandoned.rows[0]?.count, '0', 'unchanged refresh prunes a busy document whose writer aborted');
});
