// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const { Pool } = require('pg');
const { databaseOptions, refreshRepositoryTextIndex, grepRepository } = require('../src/project-index');

// Traceability: verifies REQ-REPOSITORY-TEXT-INDEX
test('worktree indexing tolerates peer commits while fencing caller HEAD and content', async t => {
  const repositoryRoot = path.resolve(__dirname, '..');
  const directory = fs.mkdtempSync(path.join(repositoryRoot, 'tmp/ref-isolation-'));
  const root = path.join(directory, 'caller');
  const peer = path.join(directory, 'peer');
  fs.mkdirSync(root);
  const projectId = crypto.randomUUID();
  const pool = new Pool(databaseOptions(repositoryRoot));
  const git = (worktree, ...args) => execFileSync('git', ['-C', worktree, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const commit = (worktree, message) => {
    git(worktree, 'add', '.');
    git(worktree, '-c', 'user.name=Test', '-c', 'user.email=test@example.test',
      'commit', '-qm', message);
  };
  t.after(async () => {
    try {
      await pool.query(`DELETE FROM ponytail_index.worktree_v1 WHERE repository_id IN
        (SELECT repository_id FROM ponytail_index.repository_v1 WHERE project_id = $1::uuid)`, [projectId]);
      await pool.query('DELETE FROM ponytail_index.repository_v1 WHERE project_id = $1::uuid', [projectId]);
      await pool.query('DELETE FROM ponytail_index.project_v1 WHERE project_id = $1::uuid', [projectId]);
    } finally {
      await pool.end();
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
  git(root, 'init', '-q', '-b', 'main');
  fs.writeFileSync(path.join(root, 'ponytail-journal.json'), JSON.stringify({
    schemaVersion: 1, projectId, projectName: `ref-isolation-${projectId}`,
    database: JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'ponytail-journal.json'))).database,
  }));
  fs.writeFileSync(path.join(root, 'value.txt'), 'caller base\n');
  commit(root, 'base');
  git(root, 'worktree', 'add', '-q', '-b', 'peer', peer);
  const initial = await refreshRepositoryTextIndex({ root, pool });
  const publishedRefs = () => pool.query(`SELECT ref_name, commit_oid
    FROM ponytail_index.git_ref_current_v1 WHERE repository_id = $1::uuid ORDER BY ref_name`,
  [initial.repositoryId]);
  const publishedOverlay = () => pool.query(`SELECT generation.generation_id, generation.state_digest
    FROM ponytail_index.published_worktree_text_generation_v1 published
    JOIN ponytail_index.worktree_text_generation_v1 generation USING (generation_id)
    WHERE published.worktree_id = $1::uuid`, [initial.worktreeId]);
  const beforeRefs = (await publishedRefs()).rows;
  const callerHead = git(root, 'rev-parse', 'HEAD');
  fs.writeFileSync(path.join(root, 'value.txt'), 'caller pending evidence\n');
  git(root, 'add', 'value.txt');

  const refreshed = await refreshRepositoryTextIndex({
    root, pool, scope: 'worktree',
    onPublish() {
      fs.writeFileSync(path.join(peer, 'peer.txt'), 'peer-only content\n');
      commit(peer, 'independent peer commit');
    },
  });
  assert.equal(refreshed.headCommit, callerHead);
  assert.deepEqual((await publishedRefs()).rows, beforeRefs);
  const search = query => grepRepository({
    query, selector: 'worktree', selectorValue: null, path: null, ignoreCase: false,
  }, { root, pool, refreshed });
  assert.equal((await search('caller pending evidence')).length, 1);
  assert.equal((await search('peer-only content')).length, 0);
  const beforeOverlay = (await publishedOverlay()).rows;

  await assert.rejects(refreshRepositoryTextIndex({
    root, pool, scope: 'worktree', onPublish() { commit(root, 'caller advances'); },
  }), error => error.code === 'REPOSITORY_INDEX_UNSTABLE');
  assert.deepEqual((await publishedOverlay()).rows, beforeOverlay);
  assert.deepEqual((await publishedRefs()).rows, beforeRefs);
  await refreshRepositoryTextIndex({ root, pool, scope: 'worktree' });
  const cleanOverlay = (await publishedOverlay()).rows;

  let mutated = false;
  const publicationPool = {
    async connect() {
      const client = await pool.connect();
      return {
        async query(sql, values) {
          const result = await client.query(sql, values);
          if (!mutated && sql.includes('SELECT generation.generation_id, generation.state_digest')) {
            mutated = true;
            fs.writeFileSync(path.join(root, 'value.txt'), 'changed during publication\n');
          }
          return result;
        },
        release() { client.release(); },
      };
    },
  };
  await assert.rejects(refreshRepositoryTextIndex({ root, pool: publicationPool, scope: 'worktree' }),
    error => error.code === 'REPOSITORY_INDEX_UNSTABLE' && /worktree changed/.test(error.message));
  assert.equal(mutated, true);
  assert.deepEqual((await publishedOverlay()).rows, cleanOverlay);

  await refreshRepositoryTextIndex({ root, pool });
  assert.equal((await publishedRefs()).rows.find(row => row.ref_name === 'refs/heads/peer').commit_oid,
    git(peer, 'rev-parse', 'HEAD'));
  const beforeRejectedRefs = (await publishedRefs()).rows;
  const beforeRejectedOverlay = (await publishedOverlay()).rows;
  await assert.rejects(refreshRepositoryTextIndex({ root, pool, onPublish() {
    fs.writeFileSync(path.join(peer, 'peer.txt'), 'another peer commit\n');
    commit(peer, 'peer advances during repository publication');
  } }), error => error.code === 'REPOSITORY_INDEX_UNSTABLE');
  assert.deepEqual((await publishedRefs()).rows, beforeRejectedRefs);
  assert.deepEqual((await publishedOverlay()).rows, beforeRejectedOverlay);
});
