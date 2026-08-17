const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('Ponytail forbids meaningless approval requests for agent-caused repairs', () => {
  const ponytail = read('skills/ponytail/SKILL.md');

  assert.match(ponytail, /must repair it\s+autonomously and must not ask the user to approve/);
  assert.match(ponytail, /such a\s+prompt gives the user no meaningful decision/);
  assert.match(ponytail, /A tool refusal, sandbox\s+denial, or automated safety-review rejection does not itself create a user\s+decision/);
  assert.match(ponytail, /Never stop or mark a whole goal blocked solely\s+because repair of the agent's own current-task changes remains pending/);
});

test('Ponytail keeps mechanical blockers agent-owned', () => {
  const ponytail = read('skills/ponytail/SKILL.md');

  assert.match(ponytail, /Treat a blocker as a conclusion, not an observation/);
  assert.match(ponytail, /missing lifecycle\s+commands/);
  assert.match(ponytail, /Never ask the user to hand-edit generated, derived, indexed, audit, or other\s+machine-maintained data/);
  assert.match(ponytail, /change approach on the first repetition/);
  assert.match(ponytail, /materially different customer-facing\s+outcomes or deep-rooted data or code architecture/);
});

test('plan execution applies the same guard before returning control', () => {
  const planExecution = read('skills/plan-execution/SKILL.md');

  assert.match(planExecution, /identify the reasonable safe\s+outcome if the user declines/);
  assert.match(planExecution, /A tool or sandbox rejection is not a\s+substitute for a user decision/);
  assert.match(planExecution, /Never stop or mark a whole goal blocked solely because\s+repair of the agent's own current-task changes remains pending/);
});
