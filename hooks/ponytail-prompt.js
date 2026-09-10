#!/usr/bin/env node
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { getDefaultMode, normalizePersistedMode, normalizeMode, isDeactivationCommand, writeDefaultMode } = require('./ponytail-config');
const { getPonytailInstructions } = require('./ponytail-instructions');
const { getProjectReuseContext } = require('./project-reuse');

function promptContext(payload, host) {
  if (!['muse', 'kimi'].includes(host) || payload?.hook_event_name !== 'UserPromptSubmit') return '';
  const prompt = (Array.isArray(payload.prompt)
    ? payload.prompt.filter(p => p.type === 'text').map(p => p.text).join('\n')
    : String(payload.prompt || '')).trim().toLowerCase();
  const session = typeof payload.session_id === 'string' && payload.session_id;
  const statePath = session ? path.join(
    process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'ponytail', host,
    createHash('sha256').update(session).digest('hex') + '.mode',
  ) : null;
  let mode = getDefaultMode();
  if (statePath) try { mode = normalizePersistedMode(fs.readFileSync(statePath, 'utf8')) || mode; } catch (_) {}
  const command = prompt.match(/^[/@$]?(?:skill:)?(?:ponytail:)?ponytail(?:\s+(.*))?$/);
  let next;
  let notice = '';
  if (isDeactivationCommand(prompt)) next = 'off';
  else if (command) {
    const [arg, value] = (command[1] || '').split(/\s+/);
    if (arg === 'default' && normalizeMode(value)) {
      const saved = writeDefaultMode(value);
      notice = 'PONYTAIL DEFAULT SET — ' + saved;
    } else next = normalizePersistedMode(arg);
  }
  if (next) {
    mode = next;
    if (statePath) {
      fs.mkdirSync(path.dirname(statePath), { recursive: true });
      fs.writeFileSync(statePath, mode);
    }
  }
  return [notice, mode === 'off' ? 'PONYTAIL MODE OFF' : getPonytailInstructions(mode),
    getProjectReuseContext(payload.cwd)].filter(Boolean).join('\n\n');
}

module.exports = { promptContext };

if (require.main === module) {
  let input = '';
  let done = false;
  function finish() {
    if (done) return;
    done = true;
    try {
      const context = promptContext(JSON.parse(input.replace(/^\uFEFF/, '')), process.argv[2]);
      if (context) process.stdout.write(JSON.stringify(process.argv[2] === 'kimi'
        ? { message: context } : { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: context } }) + '\n');
    } catch (_) {}
  }
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', finish);
  process.stdin.on('error', () => { finish(); process.exit(0); });
  setTimeout(() => { finish(); process.exit(0); }, 1000).unref();
}
