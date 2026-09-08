import json
from pathlib import Path
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "hooks/project-reuse.js"


class ProjectReuseHookTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.repo = self.root / "repo with spaces"
        self.repo.mkdir()
        subprocess.run(["git", "init", "-q", str(self.repo)], check=True)

    def run_hook(self, payload):
        result = subprocess.run(
            ["node", str(SCRIPT)], input=payload,
            capture_output=True, text=True, timeout=3, check=True,
        )
        self.assertEqual(result.stderr, "")
        return json.loads(result.stdout) if result.stdout else None

    def test_nested_checkout_and_onboarding_are_injected_for_both_events(self):
        nested = self.repo / "src"
        nested.mkdir()
        manifest = self.repo / ".agent-tools/code-intelligence.yml"
        manifest.parent.mkdir()
        manifest.write_text("project: example\n")
        for event in ("SessionStart", "UserPromptSubmit"):
            with self.subTest(event=event):
                output = self.run_hook(json.dumps({
                    "hook_event_name": event, "cwd": str(nested), "source": "compact",
                }))["hookSpecificOutput"]
                self.assertEqual(output["hookEventName"], event)
                context = output["additionalContext"]
                self.assertIn("Session checkout: " + str(self.repo) + "\n", context)
                self.assertIn(str(manifest), context)
                for skill in ("codebase-memory-search", "cao-issue-tracker", "qmd-document-search"):
                    self.assertIn(skill, context)
                self.assertNotIn("permissionDecision", output)

    def test_worktree_uses_its_own_checkout(self):
        subprocess.run([
            "git", "-C", str(self.repo), "-c", "user.name=Test",
            "-c", "user.email=test@example.invalid", "commit", "--allow-empty", "-qm", "initial",
        ], check=True)
        worktree = self.root / "feature"
        subprocess.run([
            "git", "-C", str(self.repo), "worktree", "add", "-q", "-b", "feature", str(worktree),
        ], check=True)
        output = self.run_hook(json.dumps({"hook_event_name": "SessionStart", "cwd": str(worktree)}))
        context = output["hookSpecificOutput"]["additionalContext"]
        self.assertIn(str(worktree), context)
        self.assertNotIn(str(self.repo), context)

    def test_non_repo_bad_payload_and_subagent_events_are_quiet(self):
        for payload in (
            "not json", "[]", "null", "{}",
            json.dumps({"hook_event_name": "SessionStart", "cwd": str(self.root)}),
            json.dumps({"hook_event_name": "SessionStart", "cwd": str(self.root / "missing")}),
            json.dumps({"hook_event_name": "SubagentStart", "cwd": str(self.repo)}),
        ):
            with self.subTest(payload=payload):
                self.assertIsNone(self.run_hook(payload))

    def test_plugin_wires_each_reminder_once_alongside_ponytail(self):
        data = json.loads((ROOT / "hooks/claude-codex-hooks.json").read_text())
        self.assertNotIn("SubagentStart", data["hooks"])
        for event, script in (("SessionStart", "ponytail-activate.js"),
                              ("UserPromptSubmit", "ponytail-mode-tracker.js")):
            groups = data["hooks"][event]
            handlers = [h for group in groups for h in group["hooks"]]
            self.assertEqual(len(handlers), 2)
            self.assertEqual(sum(script in h["command"] for h in handlers), 1)
            reminders = [h for h in handlers if "project-reuse.js" in h["command"]]
            self.assertEqual(len(reminders), 1)
            self.assertEqual(reminders[0]["timeout"], 2)
            self.assertNotIn("async", reminders[0])
            if event == "SessionStart":
                self.assertEqual(groups[0]["matcher"], "startup|resume|clear|compact")


if __name__ == "__main__":
    unittest.main()
