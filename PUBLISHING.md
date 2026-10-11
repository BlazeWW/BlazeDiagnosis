# Authorized publication steps

The connected GitHub app currently has read-only effective access (403 when writing). This script uses an **authorized maintainer's** local `git` and GitHub CLI session. It is not executed automatically.

1. Extract this ZIP and clone `https://github.com/BlazeWW/BlazeDiagnosis.git` separately.
2. Install `gh`, authenticate with `gh auth login`, verify branch/issue/PR permissions.
3. From the clean repository checkout, run `/path/to/extracted/publish.sh`. This creates a branch, commits documentation, pushes and opens a PR.
4. After confirming the task list, create the GitHub issues with:

    python3 /path/to/extracted/import_issues.py /path/to/extracted/github-issues.csv BlazeWW/BlazeDiagnosis

5. Assign each issue to the correct student; configure branch protection, required check statuses, CODEOWNERS and cloud architecture migration verification. Review and merge the documentation PR.

No script automatically configures branch protection, migrates a production DB or grants permissions.
