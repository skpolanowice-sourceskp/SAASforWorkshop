"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface WorkshopInfo {
  id: string;
  name: string;
  stationCount: number;
  plan: string;
  role: "owner" | "mechanic";
}

/**
 * Hook do odczytu aktualnego warsztatu zalogowanego użytkownika.
 * Używaj wyłącznie w Client Components.
 * W Server Components pobierz dane bezpośrednio przez createClient() z lib/supabase/server.ts.
 */
export function useWorkshop() {
  const [workshop, setWorkshop] = useState<WorkshopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchWorkshop() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      type WorkshopUserRow = {
        role: string;
        workshops: { id: string; name: string; station_count: number; plan: string };
      };

      const { data: rawData, error: dbError } = await supabase
        .from("workshop_users")
        .select("role, workshops(id, name, station_count, plan)")
        .eq("user_id", user.id)
        .single();

      if (dbError || !rawData) {
        setError("Nie można załadować danych warsztatu.");
        setLoading(false);
        return;
      }

      const data = rawData as unknown as WorkshopUserRow;

      const ws = data.workshops;

      setWorkshop({
        id: ws.id,
        name: ws.name,
        stationCount: ws.station_count,
        plan: ws.plan,
        role: data.role as "owner" | "mechanic",
      });
      setLoading(false);
    }

    fetchWorkshop();
  }, []);

  return { workshop, loading, error };
}
