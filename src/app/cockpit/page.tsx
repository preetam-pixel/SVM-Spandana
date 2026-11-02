import { redirect } from "next/navigation";

// The Organizer Cockpit now lives in the core workspace.
export default function CockpitRedirect() {
  redirect("/core/insights");
}
