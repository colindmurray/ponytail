# Colin’s Ponytail installation

This fork packages Ponytail’s skills and lifecycle hooks with a repository-search
reminder. The canonical checkout is `~/Projects/ponytail` on each Mac. `origin`
points to `colindmurray/ponytail`; `upstream` points to `DietrichGebert/ponytail`.
Develop changes in a feature worktree and publish them to the fork.

## Install

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

## Runtime

- `SessionStart`, including resume and compaction, loads Ponytail and the
  repository-search reminder.
- `UserPromptSubmit` handles Ponytail mode commands and refreshes the search
  reminder. It also suggests keeping all affected issues current when starting
  work and before reporting results: claim or accept work, file when warranted,
  update context, status, and blocker links, and close verified fixes.
  Sessions with nothing to track or update can skip that suggestion.
  Tool calls do not trigger either hook.
- Subagents receive their assigned instructions; the plugin has no
  `SubagentStart` registration.

The reminder resolves the exact Git checkout and its onboarding manifest.
It directs implementation discovery to the code-search MCP, quick repository
documentation lookup to QMD, and actual tracker operations to the issue-tracker
skills. It performs no searches itself. Fixing an incidental problem immediately
does not require searching or filing an issue. Ponytail’s `off` mode controls its
simplification rules; the repository-search reminder remains available.

The issue reminder is delivered with the prompt so the agent can act before its
final response. There is no `Stop` hook: turn-ending feedback would resume the
agent, adding a continuation to an otherwise complete turn.

The reminder lives in `hooks/project-reuse.js`. Global instruction documents
carry no copy. The native plugin hooks are the only registration for this
reminder; a user hook pointing to the standalone `dev-environment` script must
be removed when installing this package.

## Update and verify

Fast-forward each canonical checkout from the fork’s `origin`, then refresh the
installed copies:

```sh
claude plugin update ponytail@colin-ponytail
codex plugin add ponytail@colin-ponytail
codex-aether plugin add ponytail@colin-ponytail
uv run --no-project --with pandas npm test
```

Review changed hook definitions in `/hooks` before starting new sessions.
Fetch `upstream` and review its changes in a worktree when incorporating upstream
updates; installed marketplaces resolve this fork.
