-- ============================================================
-- WarsztatPro — Inicjalna migracja
-- ============================================================

-- ============================================================
-- WARSZTATY (jeden rekord = jeden tenant)
-- ============================================================
CREATE TABLE workshops (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  nip             TEXT,
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  smsapi_token    TEXT,                        -- zaszyfrowany token SMSAPI (pgcrypto lub Vault)
  station_count   SMALLINT NOT NULL DEFAULT 2,
  stripe_customer_id TEXT,
  stripe_sub_id   TEXT,
  plan            TEXT NOT NULL DEFAULT 'trial',  -- trial | starter | pro | expired
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
  role        TEXT NOT NULL DEFAULT 'mechanic',
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
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  customer_id           UUID REFERENCES customers(id) ON DELETE SET NULL,
  vin                   TEXT,
  license_plate         TEXT NOT NULL,
  make                  TEXT,           -- z NHTSA
  model                 TEXT,           -- z NHTSA
  year                  SMALLINT,       -- z NHTSA
  engine                TEXT,           -- z NHTSA (DisplacementL + FuelTypePrimary)
  color                 TEXT,
  mileage_last          INTEGER,        -- ostatni znany przebieg (km)
  oc_expires_at         DATE,
  inspection_expires_at DATE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX vehicles_vin_workshop_idx
  ON vehicles(workshop_id, vin)
  WHERE vin IS NOT NULL;

-- ============================================================
-- ZLECENIA
-- ============================================================
CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id     UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
  customer_id     UUID REFERENCES customers(id),
  station_number  SMALLINT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled',
  -- scheduled | in_progress | waiting_for_parts | ready | completed | cancelled
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
-- POZYCJE ZLECENIA (usługi + części)
-- ============================================================
CREATE TABLE appointment_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id    UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  type           TEXT NOT NULL DEFAULT 'service',  -- service | part
  name           TEXT NOT NULL,
  quantity       NUMERIC(8,2) NOT NULL DEFAULT 1,
  unit_price     NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_rate       SMALLINT NOT NULL DEFAULT 23,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PRZYPOMNIENIA SMS / EMAIL
-- ============================================================
CREATE TABLE reminder_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  -- appointment_reminder | car_ready | oc_expiry | inspection_expiry
  channel     TEXT NOT NULL,   -- sms | email
  offset_hours INTEGER NOT NULL DEFAULT -24,
  subject     TEXT,
  body        TEXT NOT NULL,
  active      BOOLEAN DEFAULT true
);

CREATE TABLE reminder_queue (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id       UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  template_id       UUID REFERENCES reminder_templates(id),
  appointment_id    UUID REFERENCES appointments(id),
  vehicle_id        UUID REFERENCES vehicles(id),
  customer_id       UUID REFERENCES customers(id),
  channel           TEXT NOT NULL,
  recipient         TEXT NOT NULL,
  body              TEXT NOT NULL,
  scheduled_at      TIMESTAMPTZ NOT NULL,
  sent_at           TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'pending',  -- pending | sent | failed
  error_message     TEXT,
  smsapi_message_id TEXT
);

CREATE INDEX reminder_queue_pending_idx
  ON reminder_queue(scheduled_at)
  WHERE status = 'pending';

-- ============================================================
-- POMOCNICZA FUNKCJA — workshop_id zalogowanego użytkownika
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_workshop_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT workshop_id FROM workshop_users
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- WALIDACJA KOLIZJI STANOWISK
-- ============================================================
CREATE OR REPLACE FUNCTION check_station_conflict(
  p_workshop_id UUID,
  p_station     SMALLINT,
  p_start       TIMESTAMPTZ,
  p_end         TIMESTAMPTZ,
  p_exclude_id  UUID DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM appointments
    WHERE workshop_id     = p_workshop_id
      AND station_number  = p_station
      AND status NOT IN ('cancelled', 'completed')
      AND id IS DISTINCT FROM p_exclude_id
      AND tstzrange(scheduled_start, scheduled_end) && tstzrange(p_start, p_end)
  );
$$;

-- ============================================================
-- POLITYKI RLS
-- ============================================================

-- workshops: tylko właściciel warsztatu może czytać/modyfikować swój rekord
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workshop_owner_select" ON workshops
  FOR SELECT USING (id = get_my_workshop_id());

CREATE POLICY "workshop_owner_update" ON workshops
  FOR UPDATE USING (id = get_my_workshop_id());

-- workshop_users
ALTER TABLE workshop_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON workshop_users
  FOR ALL USING (workshop_id = get_my_workshop_id());

-- customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON customers
  FOR ALL USING (workshop_id = get_my_workshop_id());

-- vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON vehicles
  FOR ALL USING (workshop_id = get_my_workshop_id());

-- appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON appointments
  FOR ALL USING (workshop_id = get_my_workshop_id());

-- appointment_items
ALTER TABLE appointment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON appointment_items
  FOR ALL USING (workshop_id = get_my_workshop_id());

-- reminder_templates
ALTER TABLE reminder_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON reminder_templates
  FOR ALL USING (workshop_id = get_my_workshop_id());

-- reminder_queue
ALTER TABLE reminder_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON reminder_queue
  FOR ALL USING (workshop_id = get_my_workshop_id());

-- ============================================================
-- TRIGGER: automatyczna aktualizacja updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
