import { AppShell } from '@/components/common/appShell';
import { ChatInbox } from '@/features/chat/components/chatInbox';

export default function CustomerMessagesPage() {
  return (
    <AppShell
      description="Customer-to-station chat threads with service, quote, invoice, and collection context."
      surface="customer"
      title="Messages"
    >
      <ChatInbox surface="customer" />
    </AppShell>
  );
}
