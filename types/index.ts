// ─── Triage output shape ────────────────────────────────────────────────────

export type Category =
  | "BOOKING"
  | "QUOTE"
  | "COMPLAINT"
  | "EMERGENCY"
  | "BILLING"
  | "OUT_OF_SCOPE";

export type Priority = "P1" | "P2" | "P3";

export type RouteTarget =
  | "Dispatch"
  | "Sales"
  | "Accounts"
  | "Customer Care"
  | "Customer Care + Accounts";

export interface TriageResult {
  category: Category;
  priority: Priority;
  route_to: RouteTarget;
  draft_reply: string | null;
  needs_human_review: boolean;
  reasoning: string;
}

// ─── API request / response shapes ──────────────────────────────────────────

export interface TriageRequest {
  message: string;
  /** Optional metadata — included when running batch from the dataset */
  meta?: {
    id?: string;
    channel?: string;
    sender_name?: string;
    received_at?: string;
  };
}

export interface TriageResponse {
  ok: true;
  result: TriageResult;
}

export interface TriageErrorResponse {
  ok: false;
  error: string;
}

// ─── Batch run types ─────────────────────────────────────────────────────────

export interface BatchResultRow {
  id: string;
  result: TriageResult;
  benchmark?: BenchmarkDecision;
  scores?: FieldScores;
}

export interface BenchmarkDecision {
  id: string;
  category: Category;
  priority: Priority;
  route_to: string;
  needs_human_review: boolean;
  draft_reply_must_include: string[];
  draft_reply_must_not_include: string[];
  notes: string;
}

export interface FieldScores {
  category: 0 | 1;
  priority: 0 | 1;
  route_to: 0 | 0.5 | 1;
  needs_human_review: 0 | 1;
  strict: boolean;
}
