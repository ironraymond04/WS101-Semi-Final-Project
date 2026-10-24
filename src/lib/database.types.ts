export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

type Profile = {
  id: string
  email: string
  full_name: string
  role: "student" | "admin"
  created_at: string
}

type Category = { id: number; name: string; active: boolean }

type LostReport = {
  id: string
  title: string
  description: string
  category_id: number
  last_seen_on: string | null
  last_seen_location: string | null
  image_path: string | null
  status: "open" | "recovered" | "withdrawn" | "closed"
  created_at: string
  updated_at: string
}

type FoundNotice = {
  id: string
  title: string
  description: string
  category_id: number
  found_at_on: string | null
  found_at_location: string | null
  image_path: string | null
  status: "pre_desk" | "received" | "reserved" | "returned" | "disposed" | "withdrawn" | "duplicate"
  canonical_found_notice_id: string | null
  received_at: string | null
  disposed_at: string | null
  disposition: string | null
  created_at: string
  updated_at: string
}

type ReportOwner = {
  id: string
  owner_id: string
  lost_report_id: string | null
  found_notice_id: string | null
  created_at: string
}

type PossibleMatch = {
  found_notice_id: string
  lost_report_id: string
  created_by: string
  created_at: string
}

type ClaimAttempt = {
  id: string
  found_notice_id: string
  claimant_id: string
  lost_report_id: string | null
  evidence: string
  status: "pending" | "needs_info" | "approved" | "rejected" | "withdrawn" | "completed" | "reservation_released" | "closed"
  created_at: string
  updated_at: string
}

type ClaimMessage = {
  id: string
  claim_id: string
  sender_id: string
  message: string
  created_at: string
}

type AuditLog = {
  id: number
  actor_id: string
  action: string
  lost_report_id: string | null
  found_notice_id: string | null
  claim_id: string | null
  details: Json
  created_at: string
}

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" }
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Profile> & { id: string }>
      categories: Table<Category, Partial<Category> & { name: string }>
      lost_reports: Table<LostReport, Partial<LostReport> & { title: string; description: string; category_id: number }>
      found_notices: Table<FoundNotice, Partial<FoundNotice> & { title: string; description: string; category_id: number }>
      report_owners: Table<ReportOwner>
      lost_report_private_details: Table<{ lost_report_id: string; details: string }>
      found_notice_private_details: Table<{ found_notice_id: string; details: string }>
      possible_matches: Table<PossibleMatch>
      claim_attempts: Table<ClaimAttempt, Partial<ClaimAttempt> & { found_notice_id: string; evidence: string }>
      claim_messages: Table<ClaimMessage, Partial<ClaimMessage> & { claim_id: string; message: string }>
      item_audit_log: Table<AuditLog>
    }
    Views: Record<never, never>
    Functions: {
      current_user_is_admin: { Args: Record<never, never>; Returns: boolean }
      current_user_is_campus_member: { Args: Record<never, never>; Returns: boolean }
      owns_lost_report: { Args: { report_id: string }; Returns: boolean }
      owns_found_notice: { Args: { notice_id: string }; Returns: boolean }
      create_lost_report: {
        Args: { report_id: string; report_title: string; report_description: string; report_category_id: number; seen_on: string | null; seen_location: string | null; private_details: string; report_image_path: string | null }
        Returns: string
      }
      create_found_notice: {
        Args: { notice_id: string; notice_title: string; notice_description: string; notice_category_id: number; found_on: string | null; found_location: string | null; private_details: string; report_image_path: string | null }
        Returns: string
      }
      owner_update_lost_report: {
        Args: { report_id: string; report_title: string; report_description: string; report_category_id: number; seen_on: string | null; seen_location: string | null; private_details: string }
        Returns: undefined
      }
      owner_update_found_notice: {
        Args: { notice_id: string; notice_title: string; notice_description: string; notice_category_id: number; found_on: string | null; found_location: string | null; private_details: string }
        Returns: undefined
      }
      claimant_create_claim: { Args: { notice_id: string; report_id: string | null; proof: string }; Returns: string }
      owner_withdraw_lost_report: { Args: { report_id: string }; Returns: undefined }
      owner_withdraw_found_notice: { Args: { notice_id: string }; Returns: undefined }
      admin_mark_duplicate_notice: { Args: { notice_id: string; canonical_id: string }; Returns: undefined }
      admin_receive_found_notice: { Args: { notice_id: string }; Returns: undefined }
      admin_review_claim: {
        Args: { claim_id: string; decision: Database["public"]["Enums"]["claim_status"]; message?: string | null }
        Returns: undefined
      }
      claimant_respond_to_claim: { Args: { claim_id: string; message: string }; Returns: undefined }
      claimant_withdraw_claim: { Args: { claim_id: string }; Returns: undefined }
      admin_release_reservation: { Args: { claim_id: string; reason: string }; Returns: undefined }
      admin_record_handover: { Args: { claim_id: string; notes?: string | null }; Returns: undefined }
      admin_close_stale_lost_report: { Args: { report_id: string; reason: string }; Returns: undefined }
      admin_dispose_found_notice: { Args: { notice_id: string; outcome: string }; Returns: undefined }
      admin_appoint_admin: { Args: { user_id: string }; Returns: undefined }
    }
    Enums: {
      user_role: "student" | "admin"
      lost_report_status: "open" | "recovered" | "withdrawn" | "closed"
      found_notice_status: "pre_desk" | "received" | "reserved" | "returned" | "disposed" | "withdrawn" | "duplicate"
      claim_status: "pending" | "needs_info" | "approved" | "rejected" | "withdrawn" | "completed" | "reservation_released" | "closed"
    }
    CompositeTypes: Record<never, never>
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals["public"]

export type Tables<Name extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][Name]["Row"]
export type TablesInsert<Name extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][Name]["Insert"]
export type TablesUpdate<Name extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][Name]["Update"]
export type Enums<Name extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][Name]
