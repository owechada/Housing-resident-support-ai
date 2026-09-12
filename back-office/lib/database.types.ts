/**
 * Hand-written types for the slice of the schema this app touches.
 * Source of truth is /db/schema.sql — keep them in step.
 *
 * Tickets are deliberately `Insert: never`. The agent creates tickets through
 * its gated n8n sub-workflow; the back office must never be able to open one.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export const TICKET_STATUSES = [
  "open",
  "needs_review",
  "acknowledged",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
  "reopened",
  "cancelled",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_URGENCIES = ["emergency", "high", "normal", "low"] as const;
export type TicketUrgency = (typeof TICKET_URGENCIES)[number];

export const TICKET_CATEGORIES = [
  "plumbing",
  "electrical",
  "appliance",
  "structural",
  "damp_mould",
  "pest",
  "cleaning",
  "security",
  "internet",
  "other",
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const PHOTO_STATUSES = ["provided", "refused", "none"] as const;
export type PhotoStatus = (typeof PHOTO_STATUSES)[number];

export type Channel = "whatsapp" | "telegram" | "web_chat";

export type ActorType = "agent" | "manager" | "resident" | "system";

export type TicketRow = {
  id: string;
  reference: string;
  estate_id: string;
  unit_id: string;
  resident_id: string | null;
  channel: Channel;
  category: TicketCategory;
  urgency: TicketUrgency;
  location_in_unit: string | null;
  description: string | null;
  onset: string | null;
  access_window: string | null;
  safety_flag: boolean;
  photo_status: PhotoStatus;
  photo_url: string | null;
  confidence: number | null;
  status: TicketStatus;
  review_reason: string | null;
  /** Field names the agent could not fill. Validated on read — jsonb can hold anything. */
  missing_fields: string[];
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  /** auth.users id of the person who closed it. The enforce_human_close trigger requires it. */
  closed_by: string | null;
};

/** What a manager is allowed to change. No reference, no estate, no created_at. */
export type TicketUpdate = Partial<
  Pick<
    TicketRow,
    | "category"
    | "urgency"
    | "location_in_unit"
    | "description"
    | "onset"
    | "access_window"
    | "safety_flag"
    | "status"
    | "closed_at"
    | "closed_by"
  >
>;

export type TicketEventRow = {
  id: number;
  ticket_reference: string;
  actor_type: ActorType;
  actor_id: string | null;
  event_type: string;
  detail: Json;
  created_at: string;
};

export type TicketEventInsert = {
  ticket_reference: string;
  actor_type: ActorType;
  actor_id?: string | null;
  event_type: string;
  detail?: Json;
};

export type MessageRow = {
  id: number;
  estate_id: string | null;
  resident_id: string | null;
  channel: string;
  channel_user_id: string;
  inbound_text: string | null;
  outbound_text: string | null;
  photo_url: string | null;
  provider_message_id: string | null;
  created_at: string;
};

export type ResidentRow = {
  id: string;
  estate_id: string;
  unit_id: string;
  full_name: string;
  is_active: boolean;
  is_self_registered: boolean;
  created_at: string;
};

export type SelfResolutionRow = {
  id: number;
  estate_id: string | null;
  unit_id: string | null;
  channel: string | null;
  resolution_type: "kb_answer" | "self_fix" | null;
  summary: string | null;
  created_at: string;
};

export type UnitRow = {
  id: string;
  estate_id: string;
  label: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      tickets: {
        Row: TicketRow;
        Insert: never;
        Update: TicketUpdate;
        Relationships: [
          {
            foreignKeyName: "tickets_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_resident_id_fkey";
            columns: ["resident_id"];
            isOneToOne: false;
            referencedRelation: "residents";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_events: {
        Row: TicketEventRow;
        Insert: TicketEventInsert;
        Update: never;
        Relationships: [];
      };
      messages: {
        Row: MessageRow;
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "messages_resident_id_fkey";
            columns: ["resident_id"];
            isOneToOne: false;
            referencedRelation: "residents";
            referencedColumns: ["id"];
          },
        ];
      };
      residents: {
        Row: ResidentRow;
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "residents_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      self_resolutions: {
        Row: SelfResolutionRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      units: {
        Row: UnitRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
