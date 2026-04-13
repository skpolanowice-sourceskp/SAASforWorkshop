import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Endpoint wywoływany zaraz po auth.signUp() — tworzy warsztat i przypisuje użytkownika
// Używa service role, żeby ominąć RLS przy pierwszym zapisie
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, phone, address, stationCount } = body;

    if (!userId || !name || !stationCount) {
      return NextResponse.json(
        { error: "Brakujące dane: userId, name, stationCount są wymagane." },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Utwórz warsztat
    const { data: workshop, error: workshopError } = await supabase
      .from("workshops")
      .insert({
        name,
        phone: phone ?? null,
        address: address ?? null,
        station_count: stationCount,
        plan: "trial",
      })
      .select("id")
      .single();

    if (workshopError || !workshop) {
      console.error("Workshop insert error:", workshopError);
      return NextResponse.json(
        { error: "Błąd tworzenia warsztatu." },
        { status: 500 }
      );
    }

    // Przypisz użytkownika jako właściciela
    const { error: userError } = await supabase.from("workshop_users").insert({
      workshop_id: workshop.id,
      user_id: userId,
      role: "owner",
    });

    if (userError) {
      console.error("Workshop user insert error:", userError);
      // Rollback: usuń warsztat
      await supabase.from("workshops").delete().eq("id", workshop.id);
      return NextResponse.json(
        { error: "Błąd przypisania użytkownika do warsztatu." },
        { status: 500 }
      );
    }

    return NextResponse.json({ workshopId: workshop.id }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Nieoczekiwany błąd serwera." }, { status: 500 });
  }
}
