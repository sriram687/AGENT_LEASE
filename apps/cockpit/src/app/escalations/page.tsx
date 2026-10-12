import { Suspense } from "react";
import { EscalationInbox } from "@/components/escalations/EscalationInbox";
import { getPendingEscalations } from "@/lib/api/escalations";

export const metadata = { title: "Escalations — Agent Leash" };
export const dynamic = "force-dynamic"; // Always fresh — escalations change in real time

export default async function EscalationsPage() {
  const escalations = await getPendingEscalations();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-50">Escalation Inbox</h1>
          <p className="text-sm text-gray-400 mt-1">
            Purchase requests that exceeded the auto-approve threshold and require your review.
            Requests expire if not actioned.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)", background: "var(--color-surface-1)" }}>
          <span className="font-semibold text-gray-200">{escalations.length}</span>
          &nbsp;pending
        </div>
      </div>

      <Suspense fallback={<InboxSkeleton />}>
        {/* EscalationInbox is a client component, receives serialized data from server */}
        <EscalationInbox escalations={escalations as any} />
      </Suspense>
    </div>
  );
}

function InboxSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card-elevated h-52 animate-pulse rounded-xl" />
      ))}
    </div>
  );
}
