import { createClient } from "@/lib/supabase/server";

export default async function CalendarPage() {
  const supabase = await createClient();

  const { data: rawWorkshopUser } = await supabase
    .from("workshop_users")
    .select("workshop_id, workshops(station_count)")
    .single();

  const workshopUser = rawWorkshopUser as unknown as
    | { workshops: { station_count: number } }
    | null;

  const stationCount = workshopUser?.workshops?.station_count ?? 2;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kalendarz</h1>
        <p className="text-muted-foreground">
          Widok tygodniowy — {stationCount}{" "}
          {stationCount === 1
            ? "stanowisko"
            : stationCount < 5
            ? "stanowiska"
            : "stanowisk"}
        </p>
      </div>

      {/* WeekView zostanie zaimplementowany w Etapie 3 */}
      <div className="flex items-center justify-center h-96 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Kalendarz rezerwacji</p>
          <p className="text-sm">Implementacja w Etapie 3</p>
        </div>
      </div>
    </div>
  );
}
