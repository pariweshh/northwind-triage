import type { BenchmarkDecision, FieldScores, TriageResult } from "@/types";

// Shared interface for inbound messages from the dataset.
export interface InboundMessage {
  id: string;
  channel: string;
  received_at: string;
  sender_name: string;
  sender_address?: string;
  subject?: string | null;
  body: string;
}

// Scores a single triage result against its benchmark entry.
export function scoreFields(
  result: TriageResult,
  bench: BenchmarkDecision,
): FieldScores {
  const category = result.category === bench.category ? 1 : 0;
  const priority = result.priority === bench.priority ? 1 : 0;
  const needs_human_review =
    result.needs_human_review === bench.needs_human_review ? 1 : 0;

  let route_to: 0 | 0.5 | 1 = 0;
  const agentRoute = result.route_to.toLowerCase();
  const benchRoute = bench.route_to.toLowerCase();

  if (agentRoute === benchRoute) {
    route_to = 1;
  } else {
    const agentPrimary = agentRoute.split("+")[0].trim();
    const benchPrimary = benchRoute.split("+")[0].trim();
    if (agentPrimary === benchPrimary) route_to = 0.5;
  }

  const strict =
    category === 1 &&
    priority === 1 &&
    route_to === 1 &&
    needs_human_review === 1;

  return { category, priority, route_to, needs_human_review, strict };
}
