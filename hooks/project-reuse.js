#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const guidance = `For nontrivial code changes, look for relevant existing implementations,
patterns, and callers with the code-search MCP. Load codebase-memory-search
for project selection, query routing, and revision/coverage checks. Use rg
or Git for exact strings and history; skip extra retrieval when the relevant
code is already known. Reopen promising hits and their callers/tests in the
target checkout before reuse, checking that their behavior and constraints fit.
Name the reused pattern or the concrete mismatch that warrants new code.

When the task calls for issue-tracker work, load issue-tracking and the project's
adapter skill (cao-issue-tracker for CAO-backed projects) and follow that workflow.
Use qmd-document-search for quick lookup of relevant repository documentation,
designs, and conventions, scoped to the project's receipt-bound collections.

Use configured onboarding mappings and account for branch-local changes.
Unavailable/stale indexes and empty results do not prove absence; continue
with direct source. This lookup does not install, index, or refresh anything.
Existing role-specific recall restrictions and independent review rules apply.
`;

function contextFor(payload) {
  const event = payload?.hook_event_name;
  const cwd = payload?.cwd;
  if (!['SessionStart', 'UserPromptSubmit'].includes(event) || typeof cwd !== 'string' || !cwd) return;
  try {
    const root = fs.realpathSync(execFileSync('git', ['-C', cwd, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf8', timeout: 1000, stdio: ['ignore', 'pipe', 'pipe'],
    }).trim());
    let context = 'Project reuse context. Session checkout: ' + root + '\n';
    const manifest = path.join(root, '.agent-tools', 'code-intelligence.yml');
    if (fs.existsSync(manifest) && fs.statSync(manifest).isFile()) {
      context += 'Project search onboarding manifest: ' + manifest + '\n';
    }
    return { hookSpecificOutput: { hookEventName: event, additionalContext: context + '\n' + guidance } };
  } catch (_) {
    return;
  }
}

let input = '';
let done = false;
function finish() {
  if (done) return;
  done = true;
  try {
    const output = contextFor(JSON.parse(input.replace(/^\uFEFF/, '')));
    if (output) process.stdout.write(JSON.stringify(output) + '\n');
  } catch (_) {}
}
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', finish);
process.stdin.on('error', () => { finish(); process.exit(0); });
setTimeout(() => { finish(); process.exit(0); }, 1000).unref();
