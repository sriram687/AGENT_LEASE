import { getMandates } from "@/lib/actions/mandates";
import { getAssignedTasks } from "@/lib/actions/agent";
import { TaskStudioView } from "@/components/tasks/TaskStudioView";

export const metadata = {
  title: "Agent Tasks & Mission Dispatch — Agent Leash",
  description: "Assign autonomous procurement tasks to AI agents guarded by cryptographic mandates and PayPal 2PC escrow.",
};

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [mandatesRes, initialTasks] = await Promise.all([
    getMandates(),
    getAssignedTasks(),
  ]);

  return (
    <TaskStudioView
      mandates={mandatesRes.mandates ?? []}
      initialTasks={initialTasks ?? []}
    />
  );
}
