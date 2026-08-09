
import { Megaphone } from "lucide-react";
import { ComingSoonPage } from "@/components/ComingSoonPage";



export default function ComplaintsPage() {
  return (
    <ComingSoonPage
      title="Complaints"
      icon={Megaphone}
      label="Complaints"
      description="File a complaint about a pickup and follow its status through to resolution."
    />
  );
}
