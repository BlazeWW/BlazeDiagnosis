#!/usr/bin/env python3
"""Idempotent GitHub issue creator via gh CLI, using individual issue IDs."""
import csv, json, subprocess, sys
if len(sys.argv) != 3:
    raise SystemExit('Usage: python3 import_issues.py github-issues.csv owner/repo')
filename, repo = sys.argv[1:]
for task in csv.DictReader(open(filename, newline='', encoding='utf-8')):
    marker = task['id']
    title = f"[{marker}] {task['title']}"
    existing = subprocess.run(['gh','issue','list','-R',repo,'--state','all','--search',f'"{marker}" in:title','--json','title','--limit','100'],capture_output=True,text=True,check=True)
    if any(marker in item['title'] for item in json.loads(existing.stdout)):
        print('SKIP', marker)
        continue
    body = '\n'.join([f"**Assignment ID:** {marker}", f"**Team:** {task['team']}", f"**Area:** {task['area']}", f"**Suggested student level:** {task['level']}", f"**Priority:** {task['priority']}", '', '**Scope and deliverable**', task['scope'], '', '**Acceptance requirements**', '- [ ] Independently demonstrated working change or review evidence', '- [ ] Automated tests or documented verification as appropriate', '- [ ] Authorization and tenant scoping verified where relevant', '- [ ] Documentation and PR evidence updated', '- [ ] Reviewed and approved by BlazeWebWorks technical lead', '', 'Reference: docs/active/21-70-intern-task-register.md'])
    subprocess.run(['gh','issue','create','-R',repo,'--title',title,'--body',body],check=True)
    print('CREATED', marker)
