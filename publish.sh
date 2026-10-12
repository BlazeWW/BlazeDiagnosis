#!/usr/bin/env bash
set -euo pipefail
REPO="${REPO:-BlazeWW/BlazeDiagnosis}"
BRANCH="${BRANCH:-plan/70-intern-production-readiness-2026}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
command -v gh >/dev/null || { echo 'Install GitHub CLI (gh)'; exit 1; }
command -v git >/dev/null || { echo 'Install git'; exit 1; }
command -v python3 >/dev/null || { echo 'Python 3 required to parse CSV'; exit 1; }
gh auth status >/dev/null
git rev-parse --is-inside-work-tree >/dev/null || { echo 'Run from inside a BlazeDiagnosis git checkout'; exit 1; }
origin="$(git remote get-url origin)"
case "$origin" in *BlazeWW/BlazeDiagnosis* ) ;; *) echo "Unexpected origin: $origin"; exit 1 ;; esac
[[ -z "$(git status --porcelain)" ]] || { echo 'Commit/stash local changes first.'; exit 1; }
git switch -c "$BRANCH"
mkdir -p docs/active
if [[ "$(realpath "$ROOT/docs/active")" != "$(realpath "docs/active")" ]]; then
    cp "$ROOT"/docs/active/*.md docs/active/
fi
git add docs/active/20-70-intern-programme.md docs/active/21-70-intern-task-register.md docs/active/22-cloud-migration-quality-gate.md docs/active/23-release-and-assessment.md
git commit -m 'docs: establish 70-intern production completion programme'
git push -u origin "$BRANCH"
gh pr create --repo "$REPO" --base main --head "$BRANCH" --title 'docs: 70-intern production completion programme and migration gate' --body '70 individually owned tasks, production release gates and cloud architect migration safety controls. No CI migration gate is implemented by documentation alone.'
