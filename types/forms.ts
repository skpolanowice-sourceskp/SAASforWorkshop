import { z } from "zod";

// ============================================================
// KLIENCI
// ============================================================
export const customerSchema = z.object({
  full_name: z.string().min(2, "Imię i nazwisko są wymagane"),
  phone: z
    .string()
    .regex(/^\+?48\d{9}$|^\d{9}$/, "Podaj prawidłowy numer PL (+48XXXXXXXXX)")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Nieprawidłowy email").optional().or(z.literal("")),
  notes: z.string().optional(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

// ============================================================
// POJAZDY
// ============================================================
export const vehicleSchema = z.object({
  license_plate: z
    .string()
    .min(2, "Numer rejestracyjny jest wymagany")
    .max(10)
    .toUpperCase(),
  vin: z
    .string()
    .length(17, "VIN musi mieć dokładnie 17 znaków")
    .toUpperCase()
    .optional()
    .or(z.literal("")),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.coerce
    .number()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .optional()
    .nullable(),
  engine: z.string().optional(),
  color: z.string().optional(),
  mileage_last: z.coerce.number().min(0).optional().nullable(),
  oc_expires_at: z.string().optional().nullable(),
  inspection_expires_at: z.string().optional().nullable(),
  customer_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional(),
});

export type VehicleFormData = z.infer<typeof vehicleSchema>;

// ============================================================
// ZLECENIA
// ============================================================
export const appointmentSchema = z.object({
  vehicle_id: z.string().uuid("Wybierz pojazd"),
  customer_id: z.string().uuid().optional().nullable(),
  station_number: z.coerce.number().min(1).max(5),
  title: z.string().min(2, "Tytuł jest wymagany").max(100),
  description: z.string().optional(),
  status: z.enum([
    "scheduled",
    "in_progress",
    "waiting_for_parts",
    "ready",
    "completed",
    "cancelled",
  ]),
  scheduled_start: z.string().min(1, "Podaj datę i godzinę rozpoczęcia"),
  scheduled_end: z.string().min(1, "Podaj datę i godzinę zakończenia"),
  mileage_in: z.coerce.number().min(0).optional().nullable(),
});

export type AppointmentFormData = z.infer<typeof appointmentSchema>;

// ============================================================
// USTAWIENIA WARSZTATU
// ============================================================
export const workshopSettingsSchema = z.object({
  name: z.string().min(2, "Nazwa warsztatu jest wymagana"),
  nip: z
    .string()
    .regex(/^\d{10}$/, "NIP musi składać się z 10 cyfr")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .regex(/^\+?48\d{9}$|^\d{9}$/, "Podaj prawidłowy numer PL")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Nieprawidłowy email").optional().or(z.literal("")),
  address: z.string().optional(),
  station_count: z.coerce.number().min(1).max(5),
});

export type WorkshopSettingsFormData = z.infer<typeof workshopSettingsSchema>;
