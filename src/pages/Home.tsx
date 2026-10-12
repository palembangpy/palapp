import { useShell } from "@/components/AppShell";
import Dashboard from "@/pages/Dashboard";
import MemberHome from "@/pages/MemberHome";
import SpeakerHome from "@/pages/SpeakerHome";

/** "/" renders the dashboard for the active mode (Admin / Speaker / Member; guests get the public overview). */
export default function Home() {
  const { mode } = useShell();
  if (mode === "member") return <MemberHome />;
  if (mode === "speaker") return <SpeakerHome />;
  return <Dashboard />;
}
