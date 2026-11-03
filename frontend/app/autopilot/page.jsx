import { redirect } from "next/navigation";

// Autopilot lives in the floating chat on every page; old links land here once.
export default function AutopilotRedirect() {
  redirect("/dashboard?autopilot=1");
}
