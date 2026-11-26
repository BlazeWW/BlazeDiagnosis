
'use client';

import { useState } from 'react';

type NotificationPreferences = {
  repairUpdates: boolean;
  quoteNotifications: boolean;
  invoiceNotifications: boolean;
};

const defaultPreferences: NotificationPreferences = {
  repairUpdates: true,
  quoteNotifications: true,
  invoiceNotifications: true,
};

export function NotificationPreferences() {
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(defaultPreferences);
  const [savedPreferences, setSavedPreferences] =
    useState<NotificationPreferences>(defaultPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const hasChanges =
    preferences.repairUpdates !== savedPreferences.repairUpdates ||
    preferences.quoteNotifications !== savedPreferences.quoteNotifications ||
    preferences.invoiceNotifications !== savedPreferences.invoiceNotifications;

  function updatePreference(
    preference: keyof NotificationPreferences,
    checked: boolean,
  ) {
    setPreferences((current) => ({
      ...current,
      [preference]: checked,
    }));
    setMessage('');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasChanges || isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      // Temporary mock save until an approved persistence adapter is available.
      await Promise.resolve();

      setSavedPreferences({ ...preferences });
      setMessage('Your notification preferences have been saved.');
    } catch {
      setMessage('Unable to save your preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setPreferences({ ...savedPreferences });
    setMessage('');
  }

  return (
    <section className="rounded-lg border p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Notification preferences</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which updates you would like to see in your in-app
          notifications.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <fieldset className="space-y-4">
          <legend className="mb-3 text-sm font-medium">
            Notification categories
          </legend>

          <label className="flex items-start gap-3">
            <input
              checked={preferences.repairUpdates}
              className="mt-1"
              onChange={(event) =>
                updatePreference('repairUpdates', event.target.checked)
              }
              type="checkbox"
            />
            <span>
              <span className="block font-medium">Repair updates</span>
              <span className="text-sm text-muted-foreground">
                Updates about your vehicle&apos;s repair progress.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              checked={preferences.quoteNotifications}
              className="mt-1"
              onChange={(event) =>
                updatePreference('quoteNotifications', event.target.checked)
              }
              type="checkbox"
            />
            <span>
              <span className="block font-medium">Quotation notifications</span>
              <span className="text-sm text-muted-foreground">
                Updates when a quotation is available or needs your decision.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              checked={preferences.invoiceNotifications}
              className="mt-1"
              onChange={(event) =>
                updatePreference('invoiceNotifications', event.target.checked)
              }
              type="checkbox"
            />
            <span>
              <span className="block font-medium">Invoice notifications</span>
              <span className="text-sm text-muted-foreground">
                Updates about invoices and payment status.
              </span>
            </span>
          </label>
        </fieldset>

        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasChanges || isSaving}
            type="submit"
          >
            {isSaving ? 'Saving...' : 'Save preferences'}
          </button>

          <button
            className="rounded-md border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasChanges || isSaving}
            onClick={handleCancel}
            type="button"
          >
            Cancel
          </button>
        </div>

        <p aria-live="polite" className="text-sm" role="status">
          {message}
        </p>
      </form>
    </section>
  );
}
