import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Uruchom middleware na wszystkich ścieżkach z wyjątkiem:
     * - _next/static (pliki statyczne)
     * - _next/image (optymalizacja obrazów)
     * - favicon.ico, sitemap.xml, robots.txt
     * - /api/webhooks/* (webhooki Stripe/SMSAPI nie wymagają sesji)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/webhooks).*)",
  ],
};
