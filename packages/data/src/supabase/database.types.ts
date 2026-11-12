// Types générés par Supabase (generate_typescript_types), ramenés à l'essentiel : les lignes et les RPC du schéma public.
// À régénérer après chaque migration.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] }

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' }
  public: {
    Tables: {
      availability_rules: Table<{ end_min: number; id: number; start_min: number; teacher_id: string; weekday: number }>
      bookings: Table<{
        amount: number; created_at: string; currency: string; delivered_at: string | null; id: string; kind: string; learner_id: string; video_room: string | null
        minutes: number; starts_at: string; status: string; subject: string; subscription_id: string | null; teacher_id: string
      }>
      countries: Table<{ code: string; currency: string; payments: string[] }>
      disputes: Table<{ booking_id: string; created_at: string; id: string; reason: string; status: string }>
      families: Table<{
        country: string; created_at: string; id: string; is_adult_learner: boolean
        owner_id: string; parent_name: string; timezone: string
      }>
      learners: Table<{ birth_year: number; created_at: string; family_id: string; goals: string; id: string; level: string; name: string }>
      ledger_entries: Table<{
        booking_id: string | null; commission_rate: number; created_at: string; currency: string; gross: number; gross_eur: number
        id: number; net_eur: number; teacher_id: string
      }>
      payments: Table<{
        amount: number; booking_id: string | null; created_at: string; currency: string; family_id: string; id: string; method: string
        provider: string; provider_ref: string | null; status: string; subscription_id: string | null
      }>
      plans: Table<{ id: string; sessions: number }>
      pricing_settings: Table<{
        booking_lead_minutes: number; course_minutes: number; trial_minutes: number; escrow_hours: number; eur_to_cad: number; eur_to_usd: number; free_cancel_hours: number
        id: boolean; trial_discount: number; xof_to_gmd: number
      }>
      profiles: Table<{ created_at: string; display_name: string | null; full_name: string; id: string; role: string }>
      reviews: Table<{ author: string; body: string; date_label: string; id: number; position: number; rating: number; teacher_id: string }>
      session_reports: Table<{
        ayah_from: number | null; ayah_to: number | null; booking_id: string; comment: string; covered: string; created_at: string
        homework: string; surah: number | null; tajwid_notes: string
      }>
      subscriptions: Table<{
        created_at: string; currency: string; id: string; learner_id: string; plan_id: string; price: number; renews_at: string
        sessions_per_month: number; sessions_remaining: number; teacher_id: string
      }>
      teacher_credentials: Table<{
        id: number; institution: string; kind: string; position: number; riwaya: string | null; sanad: string[] | null
        teacher_id: string; title: string; verified: boolean; year: number
      }>
      teachers: Table<{
        age_groups: string[]; arabic_tracks: string[]; bio: string; city: string; country_label: string; created_at: string
        diploma_verified: boolean; disputes: number; gender: string | null; headline: string; hours_taught: number; id: string
        identity_verified: boolean; ijaza_verified: boolean; languages: string[]; levels: string[]; madhahib: string[]; name: string
        published: boolean; rate_eur: number | null; rate_xof: number | null; rating: number; riwayat: string[]; subjects: string[]; timezone: string
        user_id: string | null; status: string; review_note: string | null; submitted_at: string | null; reviewed_at: string | null
      }>
    }
    Views: { [_ in never]: never }
    Functions: {
      book_session: {
        Args: { p_choice: string; p_family: string; p_learner: string; p_method?: string; p_starts_at: string; p_subject: string; p_teacher: string }
        Returns: Json
      }
      cancel_booking: { Args: { p_booking: string }; Returns: string }
      deliver_session: { Args: { p_booking: string; p_report: Json }; Returns: undefined }
      dispute_booking: { Args: { p_booking: string; p_reason?: string }; Returns: undefined }
      ensure_my_family: { Args: { p_country: string; p_timezone: string }; Returns: string }
      free_slots: { Args: { p_days?: number; p_from: string; p_teacher: string; p_minutes?: number }; Returns: string[] }
      mark_session_missed: { Args: { p_booking: string }; Returns: undefined }
      my_teacher_id: { Args: Record<string, never>; Returns: string | null }
      price_list: { Args: { p_family: string }; Returns: { amount: number; currency: string; teacher_id: string }[] }
      price_list_for_country: { Args: { p_country: string }; Returns: { amount: number; currency: string; teacher_id: string }[] }
      quote: { Args: { p_family: string; p_learner: string; p_teacher: string }; Returns: Json }
      review_teacher_application: {
        Args: { p_teacher: string; p_approve: boolean; p_note?: string; p_identity?: boolean; p_diploma?: boolean; p_ijaza?: boolean }
        Returns: undefined
      }
      save_teacher_application: { Args: { p: Json }; Returns: undefined }
      set_my_availability: { Args: { p_rules: Json }; Returns: undefined }
      start_teacher_application: { Args: Record<string, never>; Returns: string }
      submit_teacher_application: { Args: Record<string, never>; Returns: undefined }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
