const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-portable-'));
const repo = path.join(temp, 'repo with spaces');
fs.mkdirSync(repo);
execFileSync('git', ['init', '-q', repo]);
const env = { ...process.env, XDG_CACHE_HOME: temp, PONYTAIL_DEFAULT_MODE: 'lite' };
function run(host, prompt = 'fix the bug', session_id = 'first', event = 'UserPromptSubmit') {
  const stdout = execFileSync('node', [path.join(root, 'hooks/ponytail-prompt.js'), host], {
    env, input: JSON.stringify({ hook_event_name: event, session_id, cwd: repo, prompt }), encoding: 'utf8',
  });
  if (!stdout) return null;
  const output = JSON.parse(stdout);
  return host === 'muse' ? { context: output.hookSpecificOutput.additionalContext } : output;
}

test('portable hooks deliver rules and project context in each host’s output format', () => {
  for (const [host, key] of [['muse', 'context'], ['kimi', 'message']]) {
    const output = run(host);
    assert.deepEqual(Object.keys(output), [key]);
    assert.match(output[key], /PONYTAIL MODE ACTIVE — level: lite/);
    assert.ok(output[key].includes(fs.realpathSync(repo)));
    assert.match(output[key], /keeping all affected issues current/);
    assert.equal(run(host, '', 'first', 'Stop'), null);
  }
});

test('Kimi content-part prompts switch mode, preserve off, and isolate sessions and hosts', () => {
  assert.match(run('kimi', [{ type: 'text', text: 'ponytail ultra' }]).message, /level: ultra/);
  assert.match(run('kimi').message, /level: ultra/);
  assert.match(run('kimi', 'fix it', 'second').message, /level: lite/);
  assert.match(run('muse').context, /level: lite/);
  const off = run('kimi', 'stop ponytail').message;
  assert.doesNotMatch(off, /lazy senior developer/);
  assert.match(off, /keeping all affected issues current/);
  assert.match(run('kimi').message, /PONYTAIL MODE OFF/);
  assert.match(run('kimi', 'ponytail full').message, /level: full/);
});

test.after(() => fs.rmSync(temp, { recursive: true, force: true }));
