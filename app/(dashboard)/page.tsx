import { redirect } from "next/navigation";

// Root dashboard redirects to calendar
export default function DashboardPage() {
  redirect("/calendar");
}
