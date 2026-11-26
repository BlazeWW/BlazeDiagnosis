#!/usr/bin/env python3
"""Add task-specific documentation to the existing BD-001..BD-070 GitHub issues.

Safe defaults:
- Dry run unless --apply is specified.
- Never modify assignees, labels, milestones, title, or issue state.
- Preserve existing issue body and replace only our clearly marked section.
- Before applying, verify every referenced Markdown guide is present on main.
- Only apply after the documentation PR has been merged.

Requires Python 3.9+ stdlib; requires GITHUB_TOKEN with Issues:write for --apply.
"""
import argparse
import csv
import json
import os
from pathlib import Path
import re
import sys
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT=Path(__file__).resolve().parents[1]
REPO='BlazeWW/BlazeDiagnosis'
BASE='https://api.github.com'
START='<!-- BEGIN BD-INTERN-GUIDE: do not edit this marker -->'
END='<!-- END BD-INTERN-GUIDE -->'


def request_json(path, token, method='GET', payload=None):
    url=BASE+path
    body=json.dumps(payload).encode('utf-8') if payload is not None else None
    headers={'Accept':'application/vnd.github+json','User-Agent':'BlazeDiagnosis-Intern-Guide-Sync','X-GitHub-Api-Version':'2022-11-28'}
    if token:headers['Authorization']='Bearer '+token
    if body:headers['Content-Type']='application/json'
    req=Request(url,headers=headers,data=body,method=method)
    try:
        with urlopen(req,timeout=40) as resp:
            return json.load(resp)
    except HTTPError as e:
        detail=e.read().decode('utf-8','replace')[:350]
        raise RuntimeError(f'GitHub {method} {path}: {e.code} {detail}') from e
    except URLError as e:
        raise RuntimeError(f'GitHub unreachable for {path}: {e}') from e


def section(s, title, next_title):
    a=s.index(title)+len(title)
    b=s.index(next_title,a)
    return s[a:b].strip()


def guidance(row):
    issue_id=row['id']; filename=ROOT/row['guide_file']; body=filename.read_text(encoding='utf-8')
    steps=section(body,'## Implementation sequence','## Verification scenarios')
    tests=section(body,'## Verification scenarios','## First practical session') if '## First practical session' in body[body.index('## Verification scenarios'):] else section(body,'## Verification scenarios','## Constraints and dependencies')
    # Avoid repeating more than 4 implementation steps on the issue; full guide holds evidence and constraints.
    tests='\n'.join(line for line in tests.splitlines() if line.strip())
    guide_url=f'https://github.com/{REPO}/blob/main/{row["guide_file"]}'
    index_url=f'https://github.com/{REPO}/blob/main/docs/active/26-intern-issue-start-here.md'
    return (f'{START}\n'
            f'## Detailed instructions for {issue_id}\n\n'
            f'**[Open the individual {issue_id} implementation guide]({guide_url})** — source locations, practical first steps, test scenarios, boundaries and PR evidence.\n\n'
            f'### Required implementation steps\n\n{steps}\n\n'
            f'### Task-specific verification checklist\n\n{tests}\n\n'
            f'### Submission and review\n\n'
            '- Create an individually attributable branch and PR linked to this issue.\n'
            '- Include tests or reproducible audit evidence, relevant screenshots/logs, and docs changes.\n'
            '- Record lint, typecheck, test and build outcomes or review-only exceptions.\n'
            '- Do not expose credentials or personal data; verify tenant and role checks where applicable.\n'
            '- Request independent technical-lead review; do not self-approve.\n\n'
            f'[Complete issue index and initial setup]({index_url})\n'
            f'{END}')


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--apply',action='store_true',help='Write to GitHub; default only prints a preview')
    p.add_argument('--only',nargs='*',type=int,help='Issue numbers, e.g. --only 93 161')
    p.add_argument('--limit',type=int,default=70,help='Max number of issues to process')
    p.add_argument('--pause',type=float,default=0.2,help='Pause between issue writes')
    args=p.parse_args()
    with (ROOT/'issue-guide-mapping.csv').open(encoding='utf-8',newline='') as f: rows=list(csv.DictReader(f))
    if args.only:rows=[r for r in rows if int(r['issue_number']) in args.only]
    rows=rows[:args.limit]
    if not rows:raise SystemExit('No matching issues')
    token=os.environ.get('GITHUB_TOKEN','')
    if args.apply and not token:raise SystemExit('GITHUB_TOKEN is required for --apply; no changes made')
    for r in rows:
        path=ROOT/r['guide_file']
        if not path.is_file():raise SystemExit(f'Missing local guide: {path}')
        guide=guidance(r)
        if '## Required implementation steps' not in guide or '### Task-specific verification' not in guide:
            raise SystemExit(f'Invalid generated guidance for {r["id"]}')
    if not args.apply:
        print(f'DRY RUN: {len(rows)} issue bodies would receive the marked guidance block.')
        for r in rows:
            print(f'  #{r["issue_number"]} {r["id"]} | {len(guidance(r))} characters | {r["guide_file"]}')
        print('No GitHub requests were made. Merge the documentation PR first; then run --apply with GITHUB_TOKEN.')
        return 0
    # Preflight all docs in one Git tree request before touching a single issue.
    tree=request_json(f'/repos/{REPO}/git/trees/main?recursive=1',token)
    if tree.get('truncated'):raise SystemExit('Git tree truncated: cannot verify guide links; no changes made')
    paths={x['path'] for x in tree.get('tree',[])}
    required={'docs/active/26-intern-issue-start-here.md'}|{r['guide_file'] for r in rows}
    missing=sorted(required-paths)
    if missing:raise SystemExit('Documentation is not merged into main; no issues updated. Missing: '+', '.join(missing))
    successes=[];failures=[]
    for row in rows:
        n=int(row['issue_number']);path=f'/repos/{REPO}/issues/{n}'
        try:
            issue=request_json(path,token)
            if issue.get('pull_request'):
                raise ValueError('Not an issue')
            if f'[BD-{n-92:03d}]' not in issue.get('title',''):
                raise ValueError('Issue title changed or unexpected issue number; manual review required')
            old=issue.get('body') or ''
            block=guidance(row)
            if START in old:
                if END not in old:raise ValueError('Unclosed prior guide marker, review manually')
                new=re.sub(re.escape(START)+r'.*?'+re.escape(END),lambda _:block,old,flags=re.S,count=1)
            else:
                new=old.rstrip()+'\n\n---\n\n'+block+'\n'
            if new==old:
                print(f'SKIP #{n} unchanged');successes.append(n);continue
            request_json(path,token,method='PATCH',payload={'body':new})
            successes.append(n);print(f'UPDATED #{n} {row["id"]}')
            time.sleep(max(0.0,args.pause))
        except Exception as e:
            print(f'FAILED #{n}: {e}',file=sys.stderr);failures.append(n)
    print(f'Updated/unchanged: {len(successes)}; failed: {len(failures)}')
    if failures:
        print('Safe to rerun --apply for failed issue numbers: --only '+' '.join(map(str,failures)),file=sys.stderr)
    return 1 if failures else 0

if __name__=='__main__':sys.exit(main())
