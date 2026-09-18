export type ActivityCategory =
  | "STUDY"
  | "WORK"
  | "HEALTH"
  | "FITNESS"
  | "PERSONAL"
  | "SHOPPING"
  | "TRAVEL"
  | "APPOINTMENT"
  | "FINANCE"
  | "SOCIAL"
  | "OTHER";

export type ActivityPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type ActivityStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export type RecurrenceFrequency =
  | "NONE"
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "CUSTOM";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  days_of_week?: string[] | null;
  interval?: number | null;
  end_date?: string | null;
}

export interface ActivityExtraction {
  title: string;
  description?: string | null;
  category: ActivityCategory;
  priority: ActivityPriority;
  status: ActivityStatus;
  start_datetime?: string | null;
  due_datetime?: string | null;
  duration_minutes?: number | null;
  recurrence?: RecurrenceRule | null;
  reminder_minutes_before?: number | null;
  confidence: number;
  needs_clarification: boolean;
  clarification_question?: string | null;
}

export interface Activity extends ActivityExtraction {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityUpdatePayload {
  title?: string;
  description?: string | null;
  category?: ActivityCategory;
  priority?: ActivityPriority;
  status?: ActivityStatus;
  start_datetime?: string | null;
  due_datetime?: string | null;
  duration_minutes?: number | null;
  recurrence?: RecurrenceRule | null;
  reminder_minutes_before?: number | null;
  needs_clarification?: boolean;
  clarification_question?: string | null;
}

export interface ActivityListResponse {
  success: boolean;
  data: Activity[];
  total: number;
  limit: number;
  offset: number;
}

export interface ActivitySingleResponse {
  success: boolean;
  data: Activity | null;
  error?: string | null;
  detail?: string | null;
}

export interface ActivityParseResponse {
  success: boolean;
  data: ActivityExtraction | null;
  error?: string | null;
  detail?: string | null;
}

export interface HealthResponse {
  status: string;
  database?: string;
}
