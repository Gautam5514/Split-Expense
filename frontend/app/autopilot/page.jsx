import AutopilotWorkspace from "@/components/autopilot/AutopilotWorkspace";

export const metadata = {
  title: "Autopilot | SplitEase",
  description: "Plan trips, split bills and settle up by saying what you need. Review the plan, then approve.",
  robots: { index: false, follow: false }, // a signed-in workspace; the public page is /features/autopilot
};

export default function AutopilotPage() {
  return <AutopilotWorkspace />;
}
