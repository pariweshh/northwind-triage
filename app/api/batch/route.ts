import { NextResponse } from "next/server";
import { runTriage } from "@/lib/agent";
import { scoreFields } from "@/lib/score";
import type { InboundMessage } from "@/lib/score";
import type { BatchResultRow, BenchmarkDecision } from "@/types";

import inboundMessages from "@/data/inbound_messages.json";
import benchmarkData from "@/data/benchmark.json";

// 20 messages × ~3s each with margin — tell the runtime not to cut us off at 30s.
export const maxDuration = 90;

const MESSAGE_TIMEOUT_MS = 30_000;

export async function POST(): Promise<NextResponse> {
  const messages = inboundMessages.messages as InboundMessage[];
  const benchmarkDecisions = (
    benchmarkData as { decisions: BenchmarkDecision[] }
  ).decisions;
  const benchmarkMap = new Map(benchmarkDecisions.map((d) => [d.id, d]));

  const results: BatchResultRow[] = [];
  const errors: { id: string; error: string }[] = [];

  // Run sequentially to avoid rate-limit issues
  for (const msg of messages) {
    try {
      const result = await Promise.race([
        runTriage({
          message: msg.body,
          meta: {
            id: msg.id,
            channel: msg.channel,
            sender_name: msg.sender_name,
            received_at: msg.received_at,
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Triage timed out after ${MESSAGE_TIMEOUT_MS}ms`)),
            MESSAGE_TIMEOUT_MS,
          ),
        ),
      ]);

      const benchmark = benchmarkMap.get(msg.id);
      const scores = benchmark ? scoreFields(result, benchmark) : undefined;

      results.push({ id: msg.id, result, benchmark, scores });
    } catch (err) {
      errors.push({
        id: msg.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const scored = results.filter((r) => r.scores);
  const n = scored.length;

  const strictCount = scored.filter((r) => r.scores!.strict).length;
  const strictAccuracy = n > 0 ? Math.round((strictCount / n) * 100) : 0;

  const avg = (
    field: "category" | "priority" | "route_to" | "needs_human_review",
  ) =>
    n > 0
      ? Math.round(
          (scored.reduce((sum, r) => sum + (r.scores![field] as number), 0) /
            n) *
            100,
        )
      : 0;

  const summary = {
    total: messages.length,
    scored: n,
    errors: errors.length,
    strict_accuracy_pct: strictAccuracy,
    per_field: {
      category_pct: avg("category"),
      priority_pct: avg("priority"),
      route_to_pct: avg("route_to"),
      needs_human_review_pct: avg("needs_human_review"),
    },
  };

  return NextResponse.json({ summary, results, errors });
}
