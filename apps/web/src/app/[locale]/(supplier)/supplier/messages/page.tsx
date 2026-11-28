import { AppShell } from '@/components/common/appShell';
import {
  FeatureChecklist,
  FeatureMetricGrid,
  FeatureRecordList,
} from '@/components/common/featureDashboard';
import {
  supplierChecklist,
  supplierMessageRecords,
} from '@/lib/sampleWorkflows';
import { ChatInbox } from '@/features/chat/components/chatInbox';

export default function SupplierMessagesPage() {
  return (
    <AppShell
      surface="supplier"
      title="Supplier messages"
    >
      <FeatureMetricGrid
        items={[
          {
            description: 'Supplier response required',
            label: 'Needs reply',
            value: '1',
          },
          {
            description: 'Unread station updates',
            label: 'Unread',
            value: '2',
          },
          {
            description: 'Resolved delivery threads',
            label: 'Resolved',
            value: '8',
          },
          {
            description: 'Average reply speed',
            label: 'Response time',
            value: '24m',
          },
        ]}
      />

      <FeatureRecordList
        description="Messages stay attached to requests, quote responses, orders, and delivery issues so supplier users have context."
        items={supplierMessageRecords}
        title="Supplier conversations"
      />

      <FeatureChecklist
        description="Next production work should add attachments, read receipts, and notification preferences."
        items={supplierChecklist}
        title="Supplier messaging checklist"
      />

      <ChatInbox surface="supplier" />
    </AppShell>
  );
}
