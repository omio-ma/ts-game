#!/usr/bin/env bash
# Claude Code PreToolUse hook: runs the secret check before any `git commit`
# or `git push` and blocks the command if it finds anything.
cmd=$(jq -r '.tool_input.command // ""')
if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+(commit|push)'; then
  if ! out=$("$CLAUDE_PROJECT_DIR/scripts/check-secrets.sh" 2>&1); then
    printf '%s\n' "$out" >&2
    exit 2
  fi
fi
exit 0
