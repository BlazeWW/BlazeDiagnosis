
'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  useCallback,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  BookOpen,
  CheckCircle2,
  CircleHelp,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  hasDismissedOnboarding,
  setOnboardingDismissed,
  type OnboardingSurface,
} from './onboardingPreferences';

const PREFERENCE_CHANGE_EVENT = 'onboarding-preference-change';

const guideContent: Record<
  OnboardingSurface,
  {
    description: string;
    steps: {
      title: string;
      description: string;
      href: string;
      action: string;
    }[];
    hint: string;
  }
> = {
  customer: {
    description:
      'A quick guide to your customer dashboard and the records available in your portal.',
    hint:
      'Use your dashboard to check linked vehicles, open quotes, unpaid invoices and pending service requests. Open the relevant portal section for more details.',
    steps: [
      {
        title: 'Explore your customer dashboard',
        description:
          'Your dashboard provides an overview of vehicles linked to your profile, open quotes, unpaid invoices and pending service requests.',
        href: '/customer',
        action: 'Open dashboard',
      },
      {
        title: 'Find your vehicles and service activity',
        description:
          'Use Vehicles to review vehicle records and Services to follow service activity available to your account.',
        href: '/customer/vehicles',
        action: 'View vehicles',
      },
      {
        title: 'Review quotes and invoices',
        description:
          'Open Quotes to review quote information and Invoices to view billing records available in the portal.',
        href: '/customer/quotes',
        action: 'View quotes',
      },
    ],
  },
  station: {
    description:
      'A short orientation to the station dashboard and the main workshop workflows.',
    hint:
      'Use the dashboard for an overview of workshop activity. The navigation gives you access to customer, job-card, quote and invoice areas.',
    steps: [
      {
        title: 'Review the workshop dashboard',
        description:
          'Start here for the operational overview, including open work, approvals and parts items returned by the dashboard.',
        href: '/station',
        action: 'Open dashboard',
      },
      {
        title: 'Find customers and job cards',
        description:
          'Use Customers to find customer records and Job cards to review workshop work.',
        href: '/station/customers',
        action: 'View customers',
      },
      {
        title: 'Continue to quotes and invoices',
        description:
          'Use Quotes to review quote workflows and Invoices to access invoice records.',
        href: '/station/quotes',
        action: 'View quotes',
      },
    ],
  },
};

export function ContextualHint({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        'flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm',
        className,
      )}
      aria-label="Contextual help"
    >
      <CircleHelp
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-primary"
      />
      <div className="min-w-0 leading-6 text-muted-foreground">
        {children}
      </div>
    </aside>
  );
}

export function ContextualHelp({
  surface,
}: {
  surface: OnboardingSurface;
}) {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'en';
  const content = guideContent[surface];

  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener('storage', callback);
    window.addEventListener(PREFERENCE_CHANGE_EVENT, callback);

    return () => {
      window.removeEventListener('storage', callback);
      window.removeEventListener(PREFERENCE_CHANGE_EVENT, callback);
    };
  }, []);

  const getSnapshot = useCallback(
    () => hasDismissedOnboarding(window.localStorage, surface),
    [surface],
  );

  const getServerSnapshot = useCallback(() => false, []);

  const isDismissed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const [openOverride, setOpenOverride] = useState<{
    surface: OnboardingSurface;
    isOpen: boolean;
  } | null>(null);

  const isOpen =
    openOverride?.surface === surface
      ? openOverride.isOpen
      : !isDismissed;

  const dismissGuide = () => {
    setOnboardingDismissed(window.localStorage, surface, true);

    window.dispatchEvent(new Event(PREFERENCE_CHANGE_EVENT));

    setOpenOverride({
      surface,
      isOpen: false,
    });
  };

  const reopenGuide = () => {
    setOnboardingDismissed(window.localStorage, surface, false);

    window.dispatchEvent(new Event(PREFERENCE_CHANGE_EVENT));

    setOpenOverride({
      surface,
      isOpen: true,
    });
  };

  if (!isOpen) {
    return (
      <div className="flex justify-end">
        <Button
          aria-label="Show getting started guide"
          onClick={reopenGuide}
          size="sm"
          type="button"
          variant="outline"
        >
          <BookOpen aria-hidden="true" className="size-4" />
          Show getting started guide
        </Button>
      </div>
    );
  }

  return (
    <section
      aria-labelledby={`${surface}-onboarding-title`}
      aria-describedby={`${surface}-onboarding-description`}
      className="rounded-2xl border border-primary/25 bg-card p-4 shadow-soft sm:p-6"
      data-testid="onboarding-guide"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen aria-hidden="true" className="size-5" />
          </span>

          <div className="min-w-0 space-y-1">
            <h2
              className="text-lg font-semibold tracking-tight"
              id={`${surface}-onboarding-title`}
            >
              Getting started
            </h2>

            <p
              className="text-sm leading-6 text-muted-foreground"
              id={`${surface}-onboarding-description`}
            >
              {content.description}
            </p>
          </div>
        </div>

        <Button
          aria-label="Dismiss getting started guide"
          className="self-end sm:self-start"
          onClick={dismissGuide}
          size="sm"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" className="size-4" />
          Dismiss
        </Button>
      </div>

      <ol className="mt-5 grid gap-3 md:grid-cols-3">
        {content.steps.map((step, index) => (
          <li
            className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-background/70 p-4"
            key={step.title}
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                {index + 1}
              </span>

              <h3 className="text-sm font-semibold">
                {step.title}
              </h3>
            </div>

            <p className="flex-1 text-sm leading-6 text-muted-foreground">
              {step.description}
            </p>

            <Button asChild size="sm" variant="outline">
              <Link href={`/${locale}${step.href}` as Route}>
                {step.action}
              </Link>
            </Button>
          </li>
        ))}
      </ol>

      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <CheckCircle2
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0"
        />
        {content.hint}
      </p>

      <div className="mt-4 flex justify-end">
        <Button
          onClick={dismissGuide}
          size="sm"
          type="button"
        >
          <CheckCircle2 aria-hidden="true" className="size-4" />
          Got it
        </Button>
      </div>
    </section>
  );
}
