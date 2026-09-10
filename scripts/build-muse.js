#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const destination = path.resolve(process.argv[2] || path.join(root, 'dist/muse'));
// Muse accepts one manifest family per bundle; export only its runtime files.
fs.mkdirSync(destination, { recursive: true });
for (const name of ['hooks', 'skills', 'LICENSE']) {
  fs.cpSync(path.join(root, name), path.join(destination, name), { recursive: true });
}
fs.mkdirSync(path.join(destination, '.muse-plugin'), { recursive: true });
fs.writeFileSync(path.join(destination, '.muse-plugin/plugin.json'), JSON.stringify({
  schemaVersion: 1,
  name: 'ponytail',
  displayName: 'Ponytail (Colin’s fork)',
  version: require('../package.json').version,
  description: 'Ponytail with repository search and optional issue-tracker reminders.',
  compat: { source: 'native', manifestDir: '.muse-plugin' },
  capabilities: {
    skills: fs.readdirSync(path.join(root, 'skills')).filter(name =>
      fs.existsSync(path.join(root, 'skills', name, 'SKILL.md')),
    ).map(name => ({ id: name, path: `skills/${name}/SKILL.md`, enabledDefault: true })),
    hooks: [{ id: 'prompt', event: 'UserPromptSubmit',
      command: ['node', 'hooks/ponytail-prompt.js', 'muse'], timeoutMs: 3000 }],
  },
}, null, 2) + '\n');
console.log(destination);
