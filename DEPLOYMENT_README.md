# BlazeDiagnosis internship issue documentation — deployment guide

This package was prepared from the publicly accessible `main` repository on **3 November 2026**, after GitHub connected write calls returned `403 Resource not accessible by integration`. **Nothing in this package has been pushed or applied to live issues.** It contains 70 individual, task-specific markdown briefs, a clickable index, an issue mapping CSV and a safe issue-body update script.

## What is included

- `docs/active/issue-guides/BD-001.md` … `BD-070.md` — 70 distinct briefs, each with exact starting files, 3–4 steps, at least 2 verification scenarios, boundaries, tests and evidence requirements.
- `docs/active/26-intern-issue-start-here.md` — clickable navigation to all 70 briefs and existing verified central documentation.
- `issue-guide-mapping.csv` — issue number, title, level, priority, squad and guide path.
- `scripts/sync_issue_guides.py` — optional idempotent update of existing GitHub issues **after** docs have been merged. By default the script is a dry run.

## Step 1: Add and review the documentation through a PR

```bash
git clone https://github.com/BlazeWW/BlazeDiagnosis.git
cd BlazeDiagnosis
git switch -c docs/expand-intern-task-guides
# Copy the package's docs/active/issue-guides directory and its 26-intern-issue-start-here.md
# into the corresponding paths in your repository.
git add docs/active/issue-guides docs/active/26-intern-issue-start-here.md
git commit -m "docs: add actionable briefs for BD-001 through BD-070"
git push -u origin docs/expand-intern-task-guides
```

Open a PR from `docs/expand-intern-task-guides` into `main`. Have a technical lead review paths and steps against the latest code. If any source path has changed since 3 November, correct it in the guide before merging. **Do not use the issue updater until the docs are on `main`.**

## Step 2: Preview updates to the 70 existing issues

With Python 3.9+ installed, run from this extracted package directory:

```bash
python scripts/sync_issue_guides.py
python scripts/sync_issue_guides.py --only 93 161
```

The default dry run requires no GitHub token or network. It prints every issue that would gain its own steps, tests and link.

## Step 3: Update issue descriptions (explicit action required)

After the PR is merged, set a GitHub token with **Issues: write** for `BlazeWW/BlazeDiagnosis`. Do not save the token in files, screenshots or Git history.

Linux/macOS Bash:
```bash
export GITHUB_TOKEN='YOUR_TOKEN_FROM_SECURE_SECRET_STORE'
python scripts/sync_issue_guides.py --apply --only 93 161
python scripts/sync_issue_guides.py --apply
unset GITHUB_TOKEN
```

Windows PowerShell:
```powershell
$env:GITHUB_TOKEN = 'YOUR_TOKEN_FROM_SECURE_SECRET_STORE'
python scripts/sync_issue_guides.py --apply --only 93 161
python scripts/sync_issue_guides.py --apply
Remove-Item Env:GITHUB_TOKEN
```

Do a small two-issue test (`--only 93 161`), review how the issue descriptions render, then apply all. The script checks that the documentation is present on `main`, preserves issue bodies outside a clearly marked generated block, changes only the issue body, and is safe to rerun. Failures are printed with issue IDs for individual retry. New assignment evidence and comments remain intact.

## Notes for mentors

- Do not close issues or mark work complete solely because the new documentation is published.
- Verify that the particular issue still needs the work; old readiness summaries may be stale.
- Keep production credentials, real customer data and destructive migrations out of student labs.
- Merge documentation independently of application changes. Code changes should be separate reviewed PRs.
- Existing docs: `AGENTS.md`, `docs/active/13-current-application-state.md`, `docs/active/21-70-intern-task-register.md`, `docs/active/25-issue-expectations-y1-y2-se1-se2.md`.

### Suggested small follow-up cleanup

The repository's root `README.md` has an outdated statement indicating docs were not committed, although the active docs now exist. Consider updating it separately after verifying main. The task guide index clarifies the authoritative paths without overwriting the root README in this package.

## Step 1b: Repair six verified document references

Before committing the documentation PR, run the included link fixer against the cloned repo:

```bash
python scripts/fix_broken_doc_links.py --repo /path/to/BlazeDiagnosis
python scripts/fix_broken_doc_links.py --repo /path/to/BlazeDiagnosis --apply
```

Include `docs/active/18-project-readiness-report.md` in the same PR and review the six substitutions. See `LINK_AUDIT.md` for an exact before/after mapping.
