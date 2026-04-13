# WarsztatPro — Kontekst dla Claude

> Aktualizuj ten plik po każdej sensownej zmianie (nowy moduł, nowa zależność, zmiana architektury, ważna decyzja). Trzymaj poniżej 5000 znaków.

## Co to jest
SaaS dla polskich warsztatów samochodowych. Multi-tenant (1 rekord workshops = 1 klient). Stack: Next.js 14 App Router + Supabase + Tailwind + shadcn/ui.

## Stan projektu
- **Etap 0** ✅ Setup (package.json, tsconfig, tailwind, next.config, .gitignore)
- **Etap 1** ✅ Auth + multi-tenancy (login, register, middleware, RLS, Sidebar, Header)
- **Etap 2** ⬜ Klienci + Pojazdy + VIN decoder
- **Etap 3** ⬜ Kalendarz rezerwacji (WeekView, CSS Grid)
- **Etap 4** ⬜ Przypomnienia SMS/Email (SMSAPI.pl + Resend)
- **Etap 5** ⬜ Billing Stripe

## Struktura folderów
```
app/
  (auth)/login|register  — publiczne, bez auth
  (dashboard)/           — wymaga zalogowania, layout z Sidebar+Header
  api/workshops/create   — tworzy warsztat po rejestracji (service role)
components/
  ui/                    — shadcn/ui ręcznie (button, input, label, card, badge)
  layout/                — Sidebar, Header, MobileNav
lib/supabase/
  client.ts              — createBrowserClient() — tylko Client Components
  server.ts              — createServerClient() — Server Components/Actions
  middleware.ts          — updateSession() — odświeżanie sesji w middleware
hooks/useWorkshop.ts     — odczyt warsztatu w Client Components
types/
  database.ts            — ręczne typy DB (docelowo: supabase gen types)
  forms.ts               — Zod schematy formularzy
supabase/migrations/     — SQL migrations (run w Supabase Studio lub CLI)
middleware.ts            — auth guard, redirect niezalogowanych → /login
```

## Kluczowe decyzje architektoniczne
- **Izolacja tenantów**: każda tabela ma `workshop_id` + RLS policy `workshop_id = get_my_workshop_id()`
- **Dwa klienty Supabase**: browser (Client Components) vs server (Server Components). NIE mieszaj — browser w SC nie ma sesji i RLS zwraca puste dane
- **Workshop creation flow**: register page → `auth.signUp()` → `POST /api/workshops/create` (service role, omija RLS) → tworzy `workshops` + `workshop_users`
- **Strefy czasowe**: przechowuj UTC w DB, renderuj w `Europe/Warsaw`. Używaj `date-fns-tz` lub `Intl.DateTimeFormat`
- **VIN decoder**: proxy przez `/api/vin/decode` (ukrywa origin, cache 24h). NHTSA słabo radzi z EU VIN-ami — dodaj fallback ręczny

## Zmienne środowiskowe (patrz .env.local.example)
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — tylko serwer (workshop creation, Edge Functions)
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` — Etap 5
- `RESEND_API_KEY` — Etap 4 (email)
- `SMSAPI_TOKEN` — globalny fallback; każdy warsztat ma własny token w `workshops.smsapi_token`

## Uruchomienie
```bash
npm install
cp .env.local.example .env.local  # uzupełnij klucze
# Utwórz projekt na supabase.com, skopiuj URL i klucze
# Uruchom migrację: wklej supabase/migrations/... w SQL Editor Supabase Studio
npm run dev
```

## Ważne pułapki
- Kolizje stanowisk: waliduj po stronie DB (`check_station_conflict()`), nie tylko w UI
- Stripe webhook: używaj `req.text()` NIE `req.json()` — inaczej niszczysz podpis
- RLS + Server Actions: zawsze używaj `createServerClient` z cookies, nie service role (chyba że celowo)
- `supabase gen types` regeneruj po każdej migracji, tymczasowo typy w `types/database.ts`
- Plan trial ma limit 50 zleceń — sprawdzaj middleware dla funkcji premium

## Następne kroki (Etap 2)
1. `app/(dashboard)/customers/` — CRUD klientów z DataTable
2. `app/(dashboard)/vehicles/` — CRUD pojazdów + VinDecoder
3. `lib/nhtsa.ts` + `app/api/vin/decode/route.ts`
4. Alerty wygaśnięcia OC/przeglądu na profilu pojazdu
