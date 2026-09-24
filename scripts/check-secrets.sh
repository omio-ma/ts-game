#!/usr/bin/env bash
# Scans pending changes (tracked edits + untracked files) for secrets and
# sensitive files. Exits 1 and lists findings if anything is found.
# Run manually with: npm run check:secrets
set -uo pipefail

cd "$(git rev-parse --show-toplevel)" || exit 1

SELF="scripts/check-secrets.sh"

# Filenames that should never be committed
BAD_NAMES='(^|/)(\.env(\.[^/]*)?|id_rsa[^/]*|id_ed25519[^/]*|credentials\.json|service-account[^/]*\.json|\.npmrc)$|\.(pem|key|p12|pfx|keystore|jks)$'
ALLOWED_NAMES='(^|/)\.env\.example$'

# Content patterns for common credentials
PATTERNS=(
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
  'AKIA[0-9A-Z]{16}'
  'gh[pousr]_[A-Za-z0-9]{36}'
  'github_pat_[A-Za-z0-9_]{22,}'
  'sk-ant-[A-Za-z0-9_-]{20,}'
  'sk-(proj-)?[A-Za-z0-9_-]{32,}'
  'xox[abprs]-[A-Za-z0-9-]{10,}'
  'AIza[0-9A-Za-z_-]{35}'
  '(api[_-]?key|secret|password|passwd|access[_-]?token|auth[_-]?token)["'"'"']?[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"'[:space:]]{8,}["'"'"']'
)

if git rev-parse --verify -q HEAD >/dev/null; then
  changed=$(git diff HEAD --name-only --diff-filter=ACMR)
  added_lines=$(git diff HEAD --diff-filter=ACMR -U0 -- . ":(exclude)$SELF" | grep -E '^\+[^+]' || true)
else
  changed=$(git diff --cached --name-only --diff-filter=ACMR)
  added_lines=$(git diff --cached --diff-filter=ACMR -U0 -- . ":(exclude)$SELF" | grep -E '^\+[^+]' || true)
fi
untracked=$(git ls-files --others --exclude-standard)

findings=""

files=$(printf '%s\n%s\n' "$changed" "$untracked" | grep -v '^$' || true)
bad_files=$(printf '%s\n' "$files" | grep -E "$BAD_NAMES" | grep -Ev "$ALLOWED_NAMES" || true)
if [ -n "$bad_files" ]; then
  findings+=$'Sensitive files:\n'"$(printf '%s\n' "$bad_files" | sed 's/^/  /')"$'\n'
fi

untracked_content=""
while IFS= read -r f; do
  [ -z "$f" ] || [ "$f" = "$SELF" ] || [ ! -f "$f" ] && continue
  grep -Iq . "$f" 2>/dev/null || continue # skip binary files
  untracked_content+=$(sed "s|^|$f: |" "$f")$'\n'
done <<< "$untracked"

for p in "${PATTERNS[@]}"; do
  hits=$(printf '%s\n%s\n' "$added_lines" "$untracked_content" | grep -iE -e "$p" | cut -c1-120 || true)
  if [ -n "$hits" ]; then
    findings+=$'Possible secret:\n'"$(printf '%s\n' "$hits" | sed 's/^/  /')"$'\n'
  fi
done

if [ -n "$findings" ]; then
  echo "Secret check FAILED — remove these before committing:" >&2
  printf '%s' "$findings" >&2
  exit 1
fi
echo "Secret check passed."
