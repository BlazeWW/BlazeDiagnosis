
import { AppShell } from '@/components/common/appShell';
import {
  FeatureChecklist,
  FeatureMetricGrid,
  FeatureRecordList,
} from '@/components/common/featureDashboard';
import { NotificationPreferences } from '@/features/notifications/components/notificationPreferences';
import { customerChecklist, customerMessageRecords } from '@/lib/sampleWorkflows';

export default function CustomerMessagesPage() {
  return (
    <AppShell
      description="Customer-to-station chat threads with service, quote, invoice, and collection context."
      surface="customer"
      title="Messages"
    >
      <FeatureMetricGrid
        items={[
          { description: 'Requires customer response', label: 'Open threads', value: '1' },
          { description: 'Unread updates', label: 'Unread', value: '1' },
          { description: 'Resolved discussions', label: 'Closed', value: '9' },
          { description: 'Average station reply', label: 'Response time', value: '18m' },
        ]}
      />

      <NotificationPreferences />

      <FeatureRecordList
        description="Message threads are grouped by service job so customers do not need to understand internal ticket numbers."
        items={customerMessageRecords}
        title="Service conversations"
      />

      <FeatureChecklist
        description="Future production work should add attachments and read receipts."
        items={customerChecklist}
        title="Messaging checklist"
      />
    </AppShell>
  );
}
