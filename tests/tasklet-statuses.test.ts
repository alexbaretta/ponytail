// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTaskletStatuses } from '../skills/plan-execution/scripts/tasklet-statuses.js';

test('heading parser retains the exact pending, done and error statuses', () => {
  assert.deepEqual([...parseTaskletStatuses('S01.md', '### [ ] Tasklet S01-F01-T01: pending\r\n### [DONE] Tasklet S01-F01-T02: done\n### [ERROR] Tasklet S01-F01-T03: error')],
    [['S01-F01-T01', 'PENDING'], ['S01-F01-T02', 'DONE'], ['S01-F01-T03', 'ERROR']]);
  assert.equal(parseTaskletStatuses('S01.md', '# No tasklets', true).size, 0);
});
test('heading parser rejects malformed, duplicate and required empty declarations', () => {
  assert.throws(() => parseTaskletStatuses('S01.md', '### [PENDING] Tasklet S01-F01-T01: invalid'), /malformed tasklet heading/);
  const heading = '### [DONE] Tasklet S01-F01-T01: duplicate';
  assert.throws(() => parseTaskletStatuses('S01.md', `${heading}\n${heading}`), /duplicate tasklet heading/);
  assert.throws(() => parseTaskletStatuses('S01.md', '# No tasklets'), /contains no tasklet headings/);
});
