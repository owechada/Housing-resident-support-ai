/**
 * Plain English for everything the database stores as an enum.
 *
 * Enum values are internal. A manager should never have to work out that
 * "damp_mould" and "in_progress" are the same kind of thing as the words around
 * them, so nothing renders a raw column value.
 */
import type {
  PhotoStatus,
  TicketCategory,
  TicketStatus,
  TicketUrgency,
} from "@/lib/database.types";

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  needs_review: "Needs review",
  acknowledged: "Acknowledged",
  assigned: "Assigned",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
  reopened: "Reopened",
  cancelled: "Cancelled",
};

export const URGENCY_LABELS: Record<TicketUrgency, string> = {
  emergency: "Emergency",
  high: "High",
  normal: "Normal",
  low: "Low",
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  appliance: "Appliance",
  structural: "Structural",
  damp_mould: "Damp or mould",
  pest: "Pests",
  cleaning: "Cleaning",
  security: "Security",
  internet: "Internet",
  other: "Something else",
};

export const PHOTO_STATUS_LABELS: Record<PhotoStatus, string> = {
  provided: "Photo attached",
  refused: "Resident declined a photo",
  none: "No photo",
};

/**
 * Field names as they appear in `missing_fields`, in words. The agent records
 * what it could not get out of the interview; the manager needs to read it.
 */
export const FIELD_LABELS: Record<string, string> = {
  category: "What kind of problem it is",
  location_in_unit: "Where in the home",
  description: "What is wrong",
  onset: "When it started",
  safety_flag: "Whether anyone is at risk",
  access_window: "When someone can come round",
  photo: "Photo",
  photo_status: "Photo",
};

export function fieldLabel(field: string) {
  return FIELD_LABELS[field] ?? field.replace(/_/g, " ");
}

/**
 * `missing_fields` is jsonb, so it can hold anything. Read it defensively.
 */
export function missingFieldNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** "just now", "12 minutes ago", "3 hours ago", "2 days ago". */
export function relativeAge(iso: string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));

  if (seconds < MINUTE) return "just now";
  if (seconds < HOUR) return count(Math.floor(seconds / MINUTE), "minute");
  if (seconds < DAY) return count(Math.floor(seconds / HOUR), "hour");
  if (seconds < WEEK) return count(Math.floor(seconds / DAY), "day");
  return count(Math.floor(seconds / WEEK), "week");
}

function count(n: number, unit: string) {
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}

/** "12 Sept 2026, 14:32" in the estate's timezone, for hover and screen readers. */
export function absoluteTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}
