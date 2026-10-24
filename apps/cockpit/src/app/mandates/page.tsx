import { getMandates } from "@/lib/actions/mandates";
import { MandatesView } from "@/components/mandates/MandatesView";

export const metadata = {
  title: "Mandates & Policy Governance — Agent Leash",
  description: "Manage cryptographically-signed agent spending mandates, limits, and MCC category allowlists.",
};

export const dynamic = "force-dynamic";

export default async function MandatesPage() {
  const data = await getMandates();

  return <MandatesView initialMandates={data.mandates} />;
}
