Poniżej znajdziesz kompletny, gotowy do realizacji plan budowy WarsztatPro — zorganizowany tak, żeby bez problemu realizować go krok po kroku w Claude Code.

Plan budowy WarsztatPro — Dokument techniczny
1. Struktura folderów projektu
text
warsztat-pro/
├── app/                              # Next.js 14 App Router
│   ├── (auth)/                       # Route group — niezalogowani
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx                # Layout bez sidebar
│   ├── (dashboard)/                  # Route group — zalogowani
│   │   ├── layout.tsx                # Główny layout z sidebar + header
│   │   ├── page.tsx                  # Redirect → /calendar
│   │   ├── calendar/
│   │   │   ├── page.tsx              # Widok tygodniowy (stanowiska)
│   │   │   └── [appointmentId]/
│   │   │       └── page.tsx          # Modal/drawer szczegółów zlecenia
│   │   ├── vehicles/
│   │   │   ├── page.tsx              # Lista pojazdów + search
│   │   │   └── [vehicleId]/
│   │   │       └── page.tsx          # Profil pojazdu + historia napraw
│   │   ├── customers/
│   │   │   ├── page.tsx              # Lista klientów
│   │   │   └── [customerId]/
│   │   │       └── page.tsx          # Profil klienta + powiązane pojazdy
│   │   ├── reminders/
│   │   │   └── page.tsx              # Zarządzanie szablonami i kolejką SMS
│   │   └── settings/
│   │       ├── page.tsx              # Ustawienia warsztatu (dane, stanowiska)
│   │       ├── billing/page.tsx      # Stripe — plan, faktury
│   │       └── notifications/page.tsx # Konfiguracja SMS/email
│   ├── api/                          # Route Handlers (Next.js)
│   │   ├── webhooks/
│   │   │   ├── stripe/route.ts       # Stripe webhook handler
│   │   │   └── smsapi/route.ts       # Opcjonalne: delivery reports
│   │   └── vin/
│   │       └── decode/route.ts       # Proxy do NHTSA (ukrywa origin)
│   ├── layout.tsx                    # Root layout (fonts, providers)
│   └── globals.css
│
├── components/
│   ├── ui/                           # shadcn/ui (auto-generowane, nie edytuj)
│   ├── calendar/
│   │   ├── WeekView.tsx              # Główna siatka kalendarza
│   │   ├── AppointmentCard.tsx       # Kafelek zlecenia na siatce
│   │   ├── AppointmentForm.tsx       # Formularz nowego/edycji zlecenia
│   │   └── StationColumn.tsx         # Kolumna jednego stanowiska
│   ├── vehicles/
│   │   ├── VehicleForm.tsx           # Formularz dodawania/edycji pojazdu
│   │   ├── VinDecoder.tsx            # Input VIN + przycisk Pobierz dane
│   │   └── RepairHistoryTimeline.tsx # Oś czasu napraw
│   ├── customers/
│   │   ├── CustomerForm.tsx
│   │   └── CustomerCard.tsx
│   ├── reminders/
│   │   ├── ReminderTemplateEditor.tsx
│   │   └── ReminderQueueTable.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── MobileNav.tsx
│   └── shared/
│       ├── ConfirmDialog.tsx
│       ├── DataTable.tsx             # Generyczny (TanStack Table)
│       ├── PhoneInput.tsx            # Input z maską PL (+48)
│       └── StatusBadge.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # createBrowserClient()
│   │   ├── server.ts                 # createServerClient() (cookies)
│   │   └── middleware.ts             # Auth middleware helper
│   ├── nhtsa.ts                      # Fetch + typy dla vPIC API
│   ├── smsapi.ts                     # Wrapper wysyłki SMS przez SMSAPI.pl
│   ├── resend.ts                     # Szablony email przez Resend
│   ├── stripe.ts                     # Stripe SDK singleton
│   └── utils.ts                      # cn(), formatDate(), formatPhone() itp.
│
├── hooks/
│   ├── useWorkshop.ts                # Aktualny tenant (workshop_id z sesji)
│   ├── useCalendar.ts                # Stan widoku tygodniowego, nawigacja
│   ├── useVinDecoder.ts              # Wywołanie /api/vin/decode + loading/error
│   └── useSubscription.ts           # Aktualny plan Stripe
│
├── types/
│   ├── database.ts                   # Typy auto-gen przez Supabase CLI (`supabase gen types`)
│   ├── api.ts                        # Typy odpowiedzi zewnętrznych API
│   └── forms.ts                      # Zod schematy + typy formularzy
│
├── supabase/
│   ├── migrations/                   # Kolejne pliki .sql z migracjami
│   └── seed.sql                      # Dane testowe
│
├── middleware.ts                     # Auth guard — redirect niezalogowanych
├── .env.local                        # Klucze API (gitignore!)
└── next.config.ts
2. Schemat bazy danych PostgreSQL
Każda tabela biznesowa zawiera workshop_id — klucz do izolacji danych przez RLS.

Tabele
sql
-- ============================================================
-- WARSZTATY (jeden rekord = jeden tenant)
-- ============================================================
CREATE TABLE workshops (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  nip             TEXT,                        -- NIP do faktur
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  smsapi_token    TEXT,                        -- zaszyfrowany token SMSAPI
  station_count   SMALLINT NOT NULL DEFAULT 2, -- liczba stanowisk (1–5)
  stripe_customer_id TEXT,
  stripe_sub_id   TEXT,
  plan            TEXT NOT NULL DEFAULT 'trial', -- trial | starter | pro
  plan_expires_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- UŻYTKOWNICY WARSZTATU (role: owner | mechanic)
-- ============================================================
CREATE TABLE workshop_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'mechanic', -- owner | mechanic
  UNIQUE(workshop_id, user_id)
);

-- ============================================================
-- KLIENCI
-- ============================================================
CREATE TABLE customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  phone       TEXT,               -- format: +48XXXXXXXXX
  email       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- POJAZDY
-- ============================================================
CREATE TABLE vehicles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id     UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  vin             TEXT,
  license_plate   TEXT NOT NULL,
  make            TEXT,           -- z NHTSA
  model           TEXT,           -- z NHTSA
  year            SMALLINT,       -- z NHTSA
  engine          TEXT,           -- z NHTSA (DisplacementL + FuelTypePrimary)
  color           TEXT,
  mileage_last    INTEGER,        -- ostatni znany przebieg (km)
  oc_expires_at   DATE,           -- ważność OC
  inspection_expires_at DATE,     -- ważność przeglądu
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX vehicles_vin_workshop_idx ON vehicles(workshop_id, vin) WHERE vin IS NOT NULL;

-- ============================================================
-- ZLECENIA (wizyty/naprawy)
-- ============================================================
CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id     UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
  customer_id     UUID REFERENCES customers(id),
  station_number  SMALLINT NOT NULL,  -- 1..N (mapowane na kolumny kalendarza)
  title           TEXT NOT NULL,      -- krótki opis: "Wymiana oleju"
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled',
                  -- scheduled | in_progress | waiting_for_parts
                  -- | ready | completed | cancelled
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end   TIMESTAMPTZ NOT NULL,
  actual_start    TIMESTAMPTZ,
  actual_end      TIMESTAMPTZ,
  mileage_in      INTEGER,
  total_price     NUMERIC(10,2),
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- POZYCJE ZLECENIA (usługi + części — Faza 1 uproszczone)
-- ============================================================
CREATE TABLE appointment_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id    UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  type           TEXT NOT NULL DEFAULT 'service', -- service | part
  name           TEXT NOT NULL,
  quantity       NUMERIC(8,2) NOT NULL DEFAULT 1,
  unit_price     NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_rate       SMALLINT NOT NULL DEFAULT 23,    -- % VAT
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PRZYPOMNIENIA SMS / EMAIL
-- ============================================================
CREATE TABLE reminder_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,   -- appointment_reminder | car_ready | oc_expiry | inspection_expiry
  channel     TEXT NOT NULL,   -- sms | email
  offset_hours INTEGER NOT NULL DEFAULT -24,  -- ujemne = przed, dodatnie = po zdarzeniu
  subject     TEXT,            -- tylko email
  body        TEXT NOT NULL,   -- treść z placeholderami: {{customer_name}}, {{car}}, {{date}}
  active      BOOLEAN DEFAULT true
);

CREATE TABLE reminder_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id     UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  template_id     UUID REFERENCES reminder_templates(id),
  appointment_id  UUID REFERENCES appointments(id),
  vehicle_id      UUID REFERENCES vehicles(id),
  customer_id     UUID REFERENCES customers(id),
  channel         TEXT NOT NULL,
  recipient       TEXT NOT NULL,       -- numer tel lub email
  body            TEXT NOT NULL,       -- gotowa treść po podstawieniu placeholderów
  scheduled_at    TIMESTAMPTZ NOT NULL,
  sent_at         TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | sent | failed
  error_message   TEXT,
  smsapi_message_id TEXT              -- do śledzenia delivery
);
CREATE INDEX reminder_queue_pending_idx ON reminder_queue(scheduled_at) WHERE status = 'pending';
Polityki RLS
sql
-- Wzorzec dla każdej tabeli biznesowej:
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON customers
  USING (
    workshop_id IN (
      SELECT workshop_id FROM workshop_users
      WHERE user_id = auth.uid()
    )
  );
-- To samo powtarzasz dla: vehicles, appointments,
-- appointment_items, reminder_templates, reminder_queue
Supabase RLS egzekwuje izolację danych na poziomie bazy — nawet błędne zapytanie z aplikacji nie zwróci danych innego tenanta.

Pomocnicza funkcja JWT (unikanie N+1 w RLS)
sql
-- Przechowaj workshop_id w JWT claim zamiast subquery per row:
CREATE FUNCTION get_my_workshop_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT workshop_id FROM workshop_users
  WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Polityka uproszczona (szybsza):
CREATE POLICY "tenant_isolation" ON customers
  USING (workshop_id = get_my_workshop_id());
3. Trasy aplikacji (routes)
Ścieżka	Opis	Kluczowe komponenty
/login	Logowanie przez email+hasło lub magic link	Supabase Auth UI lub własny form z RHF
/register	Rejestracja warsztatu (krok 1: dane, krok 2: stanowiska)	Wielokrokowy formularz, zapis do workshops + workshop_users
/calendar	Główny widok — siatka tygodniowa ze stanowiskami jako kolumny	WeekView, StationColumn, AppointmentCard
/calendar/[appointmentId]	Szczegóły/edycja zlecenia — drawer po prawej	AppointmentForm, VinDecoder, StatusBadge
/vehicles	Lista pojazdów z filtrowaniem (marka, tablica, klient)	DataTable, search input
/vehicles/[vehicleId]	Profil pojazdu: dane z VIN, historia napraw, daty ważności	RepairHistoryTimeline, alerty OC/przegląd
/customers	Lista klientów z wyszukiwarką	DataTable, CustomerCard
/customers/[customerId]	Profil klienta: dane kontaktowe, lista pojazdów, historia zleceń	CustomerForm, tabela pojazdów
/reminders	Szablony przypomnień + kolejka oczekujących/wysłanych	ReminderTemplateEditor, ReminderQueueTable
/settings	Dane warsztatu, liczba stanowisk, nazwy stanowisk	Formularz z zod
/settings/billing	Plan subskrypcji, historia płatności, Stripe Customer Portal	useSubscription, Stripe redirect
/settings/notifications	Token SMSAPI, adres nadawcy, konfiguracja email	Formularz z testem wysyłki
4. Kolejność implementacji
Etap 0 — Setup (dzień 1)
npx create-next-app@latest warsztat-pro --typescript --tailwind --app

Instalacja shadcn/ui: npx shadcn@latest init

Instalacja: @supabase/ssr, @supabase/supabase-js, zod, react-hook-form, @hookform/resolvers

Konfiguracja projektu Supabase (nowy projekt na supabase.com)

supabase init + pierwsza migracja (schema z punktu 2)

Uzupełnienie .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

middleware.ts — guard przekierowujący niezalogowanych

Etap 1 — Fundament auth + multi-tenancy (dni 2–4)
Blokuje wszystko inne — zrób to pierwsze.

Strony /login i /register z Supabase Auth

Logika rejestracji warsztatu: po auth.signUp() utwórz rekord w workshops i workshop_users przez supabase-service-role (Edge Function lub Server Action)

Hook useWorkshop() — odczytuje workshop_id zalogowanego użytkownika

Wszystkie polityki RLS na tabelach

Sidebar + layout dashboardu

Etap 2 — Klienci i pojazdy (dni 5–8)
CRUD klientów (/customers, /customers/[id])

CRUD pojazdów (/vehicles, /vehicles/[id])

Integracja NHTSA VIN — komponent VinDecoder.tsx + Route Handler /api/vin/decode

Alerty dat ważności (OC, przegląd) na profilu pojazdu

Etap 3 — Kalendarz rezerwacji (dni 9–14)
To najtrudniejszy moduł — zaplanuj więcej czasu.

Struktura danych kalendarza: zapytanie do appointments dla wybranego tygodnia

Komponent WeekView — siatka CSS Grid (kolumny = stanowiska, wiersze = godziny)

AppointmentCard — drag (opcjonalne, Faza 2) lub klik do edycji

AppointmentForm — tworzenie/edycja z wyborem klienta, pojazdu, stanowiska, czasu

Walidacja kolizji: sprawdzenie czy stanowisko jest wolne w danym przedziale czasowym

Etap 4 — Przypomnienia SMS/Email (dni 15–19)
Tabele reminder_templates + reminder_queue

Strona /reminders z edytorem szablonów i podglądem placeholderów

Supabase Edge Function process-reminders — uruchamiana co 5 minut przez pg_cron lub Supabase Cron

Integracja SMSAPI.pl w lib/smsapi.ts

Integracja Resend w lib/resend.ts

Logika auto-enqueue: trigger PostgreSQL lub wywołanie po zapisaniu appointment

Etap 5 — Billing Stripe (dni 20–23)
Tworzenie Stripe Customer przy rejestracji warsztatu

Strona /settings/billing z Stripe Customer Portal (hosted)

Webhook /api/webhooks/stripe — obsługa customer.subscription.updated/deleted

Middleware sprawdzający plan_expires_at — blokada funkcji premium po wygaśnięciu

Etap 6 — Magazyn + Fakturowanie PDF (Faza 2)
Po stabilizacji Fazy 1. Fakturowanie wymaga implementacji polskich wymogów (KSeF, JPK-V7).

5. Integracje zewnętrzne
NHTSA vPIC API
API jest publiczne, bezpłatne, bez kluczy.

typescript
// lib/nhtsa.ts
export interface NHTSAVehicle {
  Make: string;
  Model: string;
  ModelYear: string;
  DisplacementL: string;
  FuelTypePrimary: string;
  BodyClass: string;
  EngineCylinders: string;
}

export async function decodeVin(vin: string): Promise<NHTSAVehicle | null> {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`;
  const res = await fetch(url, { next: { revalidate: 86400 } }); // cache 24h
  if (!res.ok) return null;
  const data = await res.json();
  return data.Results?.[0] ?? null;
}
Route Handler jako proxy (/api/vin/decode/route.ts) — wywołuj NHTSA po stronie serwera, żeby:

ukryć origin aplikacji przed CORS,

dodać cache na poziomie Next.js (revalidate: 86400),

nie wystawiać prosto do klienta zewnętrznego URL.

Ważne: NHTSA vPIC dekoduje VIN-y głównie dla pojazdów sprzedawanych w USA. Europejskie VIN-y (polskie) mogą zwracać niepełne dane — poinformuj użytkownika o tym w UI.

SMSAPI.pl
Uwierzytelnianie przez Bearer token OAuth2 generowany w panelu SMSAPI.

typescript
// lib/smsapi.ts
const SMSAPI_URL = "https://api.smsapi.pl/sms.do";

export async function sendSms(params: {
  to: string;       // +48XXXXXXXXX
  message: string;
  from?: string;    // nazwa nadawcy (wymaga rejestracji w SMSAPI)
}): Promise<{ status: "ok" | "error"; messageId?: string; error?: string }> {
  const token = process.env.SMSAPI_TOKEN; // z ustawień warsztatu lub globalny
  const body = new URLSearchParams({
    to: params.to,
    message: params.message,
    from: params.from ?? "WarsztatPro",
    format: "json",
  });
  const res = await fetch(SMSAPI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  const json = await res.json();
  if (json.error) return { status: "error", error: json.message };
  return { status: "ok", messageId: json.list?.[0]?.id };
}
Każdy warsztat powinien mieć własny token SMSAPI — przechowuj go zaszyfrowany w kolumnie workshops.smsapi_token (użyj pgcrypto lub Supabase Vault).

Stripe Billing
typescript
// lib/stripe.ts
import Stripe from "stripe";
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});
Proponowane produkty w Stripe:

Trial — 14 dni gratis (limit: 50 zleceń)

Starter — 49 zł/mies. (1–2 stanowiska, SMS do 100/mies.)

Pro — 99 zł/mies. (do 5 stanowisk, SMS bez limitu, magazyn + faktury)

Webhook stripe/route.ts musi obsługiwać zdarzenia:

customer.subscription.created → ustaw plan + plan_expires_at

customer.subscription.updated → zaktualizuj plan

customer.subscription.deleted → downgrade do expired

invoice.payment_failed → wyślij email ostrzeżenia przez Resend

Resend
typescript
// lib/resend.ts
import { Resend } from "resend";
export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReminderEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  return resend.emails.send({
    from: "WarsztatPro <no-reply@warsztatpro.pl>",
    ...params,
  });
}
Zweryfikuj domenę warsztatpro.pl w panelu Resend (rekordy DNS: SPF, DKIM) przed wysyłką produkcyjną.

6. Pułapki i trudne miejsca techniczne
Kalendarz — kolizje stanowisk
Walidacja musi odbywać się po stronie bazy, nie tylko w UI — inaczej dwa mechanicy mogą jednocześnie zarezerwować to samo stanowisko:

sql
-- Funkcja sprawdzająca kolizję (wywołaj przed INSERT/UPDATE)
CREATE FUNCTION check_station_conflict(
  p_workshop_id UUID, p_station SMALLINT,
  p_start TIMESTAMPTZ, p_end TIMESTAMPTZ,
  p_exclude_id UUID DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE sql AS $$
  SELECT EXISTS (
    SELECT 1 FROM appointments
    WHERE workshop_id = p_workshop_id
      AND station_number = p_station
      AND status NOT IN ('cancelled', 'completed')
      AND id IS DISTINCT FROM p_exclude_id
      AND tstzrange(scheduled_start, scheduled_end) && tstzrange(p_start, p_end)
  );
$$;
Multi-tenant token SMSAPI
Każdy warsztat ma własny token — nie przechowuj go w localStorage ani nie zwracaj do klienta. Wywołania SMSAPI powinny przechodzić wyłącznie przez Supabase Edge Functions lub Next.js Route Handlers z SUPABASE_SERVICE_ROLE_KEY. Rozważ szyfrowanie przez Supabase Vault.

Supabase RLS a Server Components
W Next.js App Router używasz dwóch klientów Supabase:

createBrowserClient — w Client Components (Realtime, interaktywność)

createServerClient — w Server Components i Server Actions (czyta cookies sesji)

Błędem jest użycie createBrowserClient w Server Component — nie będzie miał kontekstu sesji i RLS zwróci puste dane zamiast błędu.

Strefa czasowa
Warsztaty polskie działają w Europe/Warsaw (UTC+1/+2). Przechowuj wszystkie timestampy w UTC (domyślne w PostgreSQL TIMESTAMPTZ), ale renderuj i przyjmuj dane od użytkownika w strefie lokalnej. Użyj date-fns-tz lub Intl.DateTimeFormat z timeZone: 'Europe/Warsaw'. Nie używaj new Date() bez konwersji strefy w logice kalendarza.

Cron dla przypomnień SMS
Supabase oferuje pg_cron (wbudowane) lub Supabase Cron (beta). Alternatywnie użyj Vercel Cron Jobs (/api/cron/reminders + vercel.json). Pamiętaj: Vercel Cron na planie Hobby jest ograniczone do 1/dzień — na planie Pro możesz ustawić co 5 minut.

Stripe webhook w Vercel
Route Handler musi odczytać raw body do weryfikacji podpisu Stripe. W Next.js 14 App Router:

typescript
// app/api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const rawBody = await req.text(); // NIE req.json() — to niszczy podpis
  const sig = req.headers.get("stripe-signature")!;
  const event = stripe.webhooks.constructEvent(
    rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!
  );
  // ...
}
Polskie VIN-y a NHTSA
NHTSA vPIC jest bazą producencką dla rynku USA. Europejskie VIN-y (np. VW, BMW, Fiat) mogą zwracać puste pola Make/Model. Przygotuj fallback: po nieudanym fetch z NHTSA pozwól użytkownikowi uzupełnić dane ręcznie. Możesz rozważyć komercyjną alternatywę (np. autodna.pl API lub dekoder EUcar) dla lepszego pokrycia europejskich pojazdów.

Fakturowanie PDF zgodne z polskim prawem (Faza 2)
Faktury w Polsce muszą zawierać: NIP nabywcy/sprzedawcy, numer faktury wg schematu (np. FV/001/04/2026), stawki VAT (23%, 8%, ZW), data sprzedaży oddzielna od daty wystawienia. Od 2026 roku obowiązkowy jest KSeF (Krajowy System e-Faktur) dla faktur B2B — zaplanuj integrację z API MF przed wdrożeniem modułu fakturowania.

Masz teraz gotowy blueprint — zacznij od Etapu 0 i 1, ponieważ bez działającego auth i RLS każdy kolejny moduł będzie wymagał przeróbek. Powodzenia z budową WarsztatPro.