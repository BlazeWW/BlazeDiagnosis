#!/usr/bin/env python3
"""Fix six verified broken relative Markdown links in an existing repo document.
Default is --check, --apply performs exact substitutions to avoid rewriting other text.
"""
import argparse
from pathlib import Path
import sys

REPLACEMENTS={
    '](apps/web/src/components/customers/customerVehicleWizard.tsx)':'](../../apps/web/src/components/customers/customerVehicleWizard.tsx)',
    '](apps/web/src/features/customers/services/customerService.ts)':'](../../apps/web/src/features/customers/services/customerService.ts)',
    '](apps/web/src/features/vehicles/services/vehicleService.ts)':'](../../apps/web/src/features/vehicles/services/vehicleService.ts)',
    '](apps/web/src/lib/auth/auth-guards.ts)':'](../../apps/web/src/lib/auth/auth-guards.ts)',
    '](docs/active/13-current-application-state.md)':'](./13-current-application-state.md)',
    '](docs/active/16-page-readiness-matrix.md)':'](./16-page-readiness-matrix.md)',
}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo',required=True,help='Path to BlazeDiagnosis git clone')
    parser.add_argument('--apply',action='store_true',help='Write changes; otherwise only report')
    args=parser.parse_args()
    f=Path(args.repo)/'docs/active/18-project-readiness-report.md'
    if not f.is_file():raise SystemExit('Cannot find '+str(f))
    before=f.read_text(encoding='utf-8');after=before;changed=0
    for wrong,correct in REPLACEMENTS.items():
        if wrong in after:
            after=after.replace(wrong,correct);changed+=1
        elif correct in after:
            pass # already corrected
        else:
            print('NOTICE: reference not found (document may have changed): '+wrong)
    print(f'{changed} link patterns require correction.')
    if args.apply and changed:
        f.write_text(after,encoding='utf-8')
        print('Updated '+str(f))
    elif not args.apply:
        print('Dry-run only; run --apply to write after reviewing.')
    return 0
if __name__=='__main__':sys.exit(main())
