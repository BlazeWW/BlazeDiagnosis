import { AppShell } from '@/components/common/appShell';
import { ChatInbox } from '@/features/chat/components/chatInbox';

export default function SupplierMessagesPage() {
  return (
    <AppShell
      description="Station-to-supplier chat threads for parts requests and delivery exceptions."
      surface="supplier"
      title="Supplier messages"
    >
      <ChatInbox surface="supplier" />
    </AppShell>
  );
}
