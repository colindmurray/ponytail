# Colin’s Ponytail installation

This fork packages Ponytail’s skills and lifecycle hooks with a repository-search
reminder. The canonical checkout is `~/Projects/ponytail` on each Mac. `origin`
points to `colindmurray/ponytail`; `upstream` points to `DietrichGebert/ponytail`.
Develop changes in a feature worktree and publish them to the fork.

## Claude and Codex

Run these commands on each Mac from the canonical checkout:

```sh
claude plugin marketplace add /Users/colin/Projects/ponytail
claude plugin install ponytail@colin-ponytail --scope user
codex plugin marketplace add /Users/colin/Projects/ponytail
codex plugin add ponytail@colin-ponytail
codex-aether plugin marketplace add /Users/colin/Projects/ponytail
codex-aether plugin add ponytail@colin-ponytail
```

Review and trust the four plugin hook commands in Codex `/hooks` for each
account on each Mac. Trust is local. Restart existing Claude and Codex sessions
after installation or updates. The plugin supplies its six skills directly;
Skillshare supplies the existing search and tracker skills it references.

`dev-environment` owns plugin enablement and the shared
`~/.config/ponytail/config.json`, which selects `lite` by default. Session mode
commands still work. Change the shared default in its managed source and run
`dev-configs sync` on both Macs.

## OpenCode and Pi

OpenCode's managed `opencode.json` includes the absolute path
`/Users/colin/Projects/ponytail/.opencode/plugins/ponytail.mjs`. Run
`dev-configs sync` after deploying its source, then restart OpenCode. The plugin
registers the six commands and skills and appends the current rules and project
reminder to each model request.

Install the Pi package on each Mac:

```sh
pi install /Users/colin/Projects/ponytail
```

Pi loads its six skills and extension from that checkout. Restart Pi or use
`/reload`. The extension adds the rules and reminder at `before_agent_start`.
Pi's settings remain tool-owned; the package install does not replace them.

## Muse Code

Muse accepts one plugin-manifest family per bundle. Build a native bundle from
the shared runtime files, then install and approve its prompt hook:

```sh
node scripts/build-muse.js
MUSE_EXPERIMENTAL_PLUGINS=1 muse plugins validate ./dist/muse --json
MUSE_EXPERIMENTAL_PLUGINS=1 muse plugins install ./dist/muse --scope user --json
MUSE_EXPERIMENTAL_PLUGINS=1 muse plugins approve ponytail --json
```

The experimental flag exposes Muse's plugin-management commands. Review and
approval happen locally on each Mac; runtime hooks work in ordinary sessions.
Rebuild and reinstall after changing the fork, then start a new Muse session.

## Kimi Code

In Kimi's interactive TUI:

```text
/plugins install /Users/colin/Projects/ponytail
/plugins info ponytail
/reload
```

Trust the local fork in the installation dialog. Kimi copies its native plugin
into `~/.kimi-code/plugins/managed/ponytail`; reinstall after source changes.
It loads the six skills and one `UserPromptSubmit` hook.

Muse and Kimi use `hooks/ponytail-prompt.js`, which emits each host's context
format and keeps mode switches scoped to the host and session. Send
`ponytail lite`, `ponytail full`, `ponytail ultra`, or `stop ponytail` as a plain
message. Their skill menus expose the review, audit, debt, gain, and help skills.
Mode state lives under the local cache and is not synchronized between Macs.

## Runtime

- Claude/Codex `SessionStart`, including resume and compaction, loads Ponytail and the
  repository-search reminder.
- `UserPromptSubmit` handles Ponytail mode commands and refreshes the search
  reminder. It also suggests keeping all affected issues current when starting
  work and before reporting results: claim or accept work, file when warranted,
  update context, status, and blocker links, and close verified fixes.
  Sessions with nothing to track or update can skip that suggestion.
  Muse and Kimi deliver the rules and reminder on `UserPromptSubmit`.
  These command hooks do not run after tool calls.
- Subagents receive their assigned instructions; the plugin has no
  `SubagentStart` registration.

The reminder resolves the exact Git checkout and its onboarding manifest.
It directs implementation discovery to the code-search MCP or the search
skill’s CLI, quick repository
documentation lookup to QMD, and actual tracker operations to the issue-tracker
skills. It performs no searches itself. Fixing an incidental problem immediately
does not require searching or filing an issue. Ponytail’s `off` mode controls its
simplification rules; the repository-search reminder remains available.

The issue reminder is delivered with the prompt so the agent can act before its
final response. There is no `Stop` hook: turn-ending feedback would resume the
agent, adding a continuation to an otherwise complete turn.

The reminder lives in `hooks/project-reuse.js`, shared by every adapter. Global
instruction documents carry no copy. Plugin hooks/extensions own its delivery; a user hook pointing to the standalone `dev-environment` script must
be removed when installing this package.

## Update and verify

Fast-forward each canonical checkout from the fork’s `origin`, then refresh the
installed copies:

```sh
claude plugin update ponytail@colin-ponytail
python3 scripts/update-codex.py
CODEX_HOME="$HOME/.codex-account-2" python3 scripts/update-codex.py
python3 tests/test_codex_update.py
uv run --no-project --with pandas npm test
```

The Codex updater preserves previous cached versions. Running CLI sessions keep
absolute hook paths from startup; a plain `codex plugin add` can delete those
files, producing two “Hook failed / hook exited with code 1” messages on every
prompt. Existing sessions can continue using their original files while new
sessions load the updated plugin. Restart or resume a session to load new hooks.
Old versions may be removed once every session using them has exited.

Review changed hook definitions in `/hooks` before starting new sessions.
Repeat the Muse build/install and Kimi install steps to update their cached copies.
OpenCode and Pi read the canonical checkout directly.

Fetch `upstream` and review its changes in a worktree when incorporating upstream
updates; installed marketplaces resolve this fork.
