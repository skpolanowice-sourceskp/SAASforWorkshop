import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  type WorkshopUserRow = {
    workshop_id: string;
    role: string;
    workshops: { id: string; name: string; station_count: number; plan: string };
  };

  // Pobierz warsztat użytkownika
  const { data: rawWorkshopUser } = await supabase
    .from("workshop_users")
    .select("workshop_id, role, workshops(id, name, station_count, plan)")
    .eq("user_id", user.id)
    .single();

  if (!rawWorkshopUser) {
    // Użytkownik zalogowany, ale bez warsztatu — wyślij z powrotem do rejestracji
    redirect("/register");
  }

  const workshopUser = rawWorkshopUser as unknown as WorkshopUserRow;
  const workshop = workshopUser.workshops;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        workshopName={workshop.name}
        plan={workshop.plan}
        role={workshopUser.role}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <Header user={user} workshopName={workshop.name} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
