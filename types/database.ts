/**
 * Typy bazy danych — docelowo generowane przez `supabase gen types typescript`.
 * Poniżej ręczna wersja dla Fazy 1.
 * Uruchom: npx supabase gen types typescript --local > types/database.ts
 */

export type Database = {
  public: {
    Tables: {
      workshops: {
        Row: {
          id: string;
          name: string;
          nip: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          smsapi_token: string | null;
          station_count: number;
          stripe_customer_id: string | null;
          stripe_sub_id: string | null;
          plan: "trial" | "starter" | "pro" | "expired";
          plan_expires_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["workshops"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workshops"]["Insert"]>;
      };
      workshop_users: {
        Row: {
          id: string;
          workshop_id: string;
          user_id: string;
          role: "owner" | "mechanic";
        };
        Insert: Omit<Database["public"]["Tables"]["workshop_users"]["Row"], "id"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workshop_users"]["Insert"]>;
      };
      customers: {
        Row: {
          id: string;
          workshop_id: string;
          full_name: string;
          phone: string | null;
          email: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["customers"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
      };
      vehicles: {
        Row: {
          id: string;
          workshop_id: string;
          customer_id: string | null;
          vin: string | null;
          license_plate: string;
          make: string | null;
          model: string | null;
          year: number | null;
          engine: string | null;
          color: string | null;
          mileage_last: number | null;
          oc_expires_at: string | null;
          inspection_expires_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vehicles"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vehicles"]["Insert"]>;
      };
      appointments: {
        Row: {
          id: string;
          workshop_id: string;
          vehicle_id: string;
          customer_id: string | null;
          station_number: number;
          title: string;
          description: string | null;
          status:
            | "scheduled"
            | "in_progress"
            | "waiting_for_parts"
            | "ready"
            | "completed"
            | "cancelled";
          scheduled_start: string;
          scheduled_end: string;
          actual_start: string | null;
          actual_end: string | null;
          mileage_in: number | null;
          total_price: number | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["appointments"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["appointments"]["Insert"]>;
      };
      appointment_items: {
        Row: {
          id: string;
          workshop_id: string;
          appointment_id: string;
          type: "service" | "part";
          name: string;
          quantity: number;
          unit_price: number;
          vat_rate: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["appointment_items"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["appointment_items"]["Insert"]>;
      };
      reminder_templates: {
        Row: {
          id: string;
          workshop_id: string;
          type:
            | "appointment_reminder"
            | "car_ready"
            | "oc_expiry"
            | "inspection_expiry";
          channel: "sms" | "email";
          offset_hours: number;
          subject: string | null;
          body: string;
          active: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["reminder_templates"]["Row"], "id"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reminder_templates"]["Insert"]>;
      };
      reminder_queue: {
        Row: {
          id: string;
          workshop_id: string;
          template_id: string | null;
          appointment_id: string | null;
          vehicle_id: string | null;
          customer_id: string | null;
          channel: "sms" | "email";
          recipient: string;
          body: string;
          scheduled_at: string;
          sent_at: string | null;
          status: "pending" | "sent" | "failed";
          error_message: string | null;
          smsapi_message_id: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["reminder_queue"]["Row"], "id"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reminder_queue"]["Insert"]>;
      };
    };
    Functions: {
      get_my_workshop_id: {
        Args: Record<never, never>;
        Returns: string;
      };
      check_station_conflict: {
        Args: {
          p_workshop_id: string;
          p_station: number;
          p_start: string;
          p_end: string;
          p_exclude_id?: string;
        };
        Returns: boolean;
      };
    };
  };
};
