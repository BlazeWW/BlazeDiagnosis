import { AppShell } from '@/components/common/appShell';
import {
  FeatureChecklist,
  FeatureMetricGrid,
  FeatureRecordList,
} from '@/components/common/featureDashboard';
import {
  customerChecklist,
  customerMessageRecords,
} from '@/lib/sampleWorkflows';
import { ChatInbox } from '@/features/chat/components/chatInbox';

export default function CustomerMessagesPage() {
  return (
    <AppShell
      surface="customer"
      title="Messages"
    >
      <FeatureMetricGrid
        items={[
          {
            description: 'Requires customer response',
            label: 'Open threads',
            value: '1',
          },
          {
            description: 'Unread updates',
            label: 'Unread',
            value: '1',
          },
          {
            description: 'Resolved discussions',
            label: 'Closed',
            value: '9',
          },
          {
            description: 'Average station reply',
            label: 'Response time',
            value: '18m',
          },
        ]}
      />

      <FeatureRecordList
        description="Message threads are grouped by service job so customers do not need to understand internal ticket numbers."
        items={customerMessageRecords}
        title="Service conversations"
      />

      <FeatureChecklist
        description="Future production work should add attachments, read receipts, and notification preferences."
        items={customerChecklist}
        title="Messaging checklist"
      />

      <ChatInbox surface="customer" />
    </AppShell>
  );
}
