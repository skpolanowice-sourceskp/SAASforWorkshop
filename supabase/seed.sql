-- Dane testowe — uruchamiaj tylko na środowisku deweloperskim!
-- Zakłada, że istnieje użytkownik z podanym ID (utwórz go najpierw przez Supabase Auth)

-- Zamień poniższe UUID na ID użytkownika z auth.users:
DO $$
DECLARE
  v_workshop_id UUID;
  v_user_id     UUID := '00000000-0000-0000-0000-000000000001'; -- ZMIEŃ NA PRAWDZIWY USER ID
  v_customer_id UUID;
  v_vehicle_id  UUID;
BEGIN

  -- Warsztat testowy
  INSERT INTO workshops (name, phone, address, station_count, plan)
  VALUES ('Auto Serwis Demo', '+48123456789', 'ul. Mechaniczna 1, 00-001 Warszawa', 3, 'pro')
  RETURNING id INTO v_workshop_id;

  -- Właściciel
  INSERT INTO workshop_users (workshop_id, user_id, role)
  VALUES (v_workshop_id, v_user_id, 'owner');

  -- Klient
  INSERT INTO customers (workshop_id, full_name, phone, email, notes)
  VALUES (v_workshop_id, 'Jan Kowalski', '+48600100200', 'jan@example.com', 'Stały klient, preferuje wizyty rano')
  RETURNING id INTO v_customer_id;

  -- Pojazd
  INSERT INTO vehicles (
    workshop_id, customer_id, vin, license_plate,
    make, model, year, engine, color,
    mileage_last, oc_expires_at, inspection_expires_at
  )
  VALUES (
    v_workshop_id, v_customer_id,
    'WBA3A5G50ENP37548',
    'WA12345',
    'BMW', '3 Series', 2018, '2.0L Benzyna', 'Czarny',
    125000,
    '2025-03-31',
    '2025-06-15'
  )
  RETURNING id INTO v_vehicle_id;

  -- Zlecenie
  INSERT INTO appointments (
    workshop_id, vehicle_id, customer_id,
    station_number, title, status,
    scheduled_start, scheduled_end, mileage_in
  )
  VALUES (
    v_workshop_id, v_vehicle_id, v_customer_id,
    1, 'Wymiana oleju + filtrów', 'scheduled',
    now() + interval '1 day' + interval '9 hours',
    now() + interval '1 day' + interval '10 hours 30 minutes',
    125100
  );

  -- Szablony przypomnień
  INSERT INTO reminder_templates (workshop_id, type, channel, offset_hours, subject, body)
  VALUES
    (
      v_workshop_id, 'appointment_reminder', 'sms', -24,
      NULL,
      'WarsztatPro: Przypomnienie o wizycie jutro o {{time}} dla pojazdu {{car}}. Adres: {{address}}. Info: {{phone}}'
    ),
    (
      v_workshop_id, 'car_ready', 'sms', 0,
      NULL,
      'WarsztatPro: Twój pojazd {{car}} jest gotowy do odbioru. Zapraszamy!'
    ),
    (
      v_workshop_id, 'oc_expiry', 'sms', -720,  -- 30 dni przed
      NULL,
      'WarsztatPro: Twoje OC dla pojazdu {{car}} wygasa {{date}}. Skontaktuj się z nami!'
    );

END $$;
