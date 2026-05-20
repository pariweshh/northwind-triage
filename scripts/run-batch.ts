/**
 * Batch runner — processes all 20 inbound messages and scores against benchmark.
 *
 * Usage:
 *   npm run batch
 *   (which runs: npx tsx scripts/run-batch.ts)
 *
 * Requires ANTHROPIC_API_KEY in your .env.local or environment.
 * Outputs a results JSON file and a readable summary to stdout.
 */

import { writeFileSync, readFileSync } from "fs";
import { join } from "path";

// ─── Load .env.local FIRST ────────────────────────────────────────────────────
// tsx runs outside Next.js so .env.local isn't loaded automatically.
// Must use readFileSync here (not import) so it runs before the Anthropic SDK
// is initialised inside agent.ts. ES imports are hoisted; require() is not.
try {
  const envPath = join(process.cwd(), ".env.local");
  const envFile = readFileSync(envPath, "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
} catch {
  // .env.local not found — rely on environment variables already set in shell
}

// ─── Now safe to load the agent (Anthropic SDK reads process.env on init) ────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { runTriage } = require("../lib/agent") as typeof import("../lib/agent");

import type { BatchResultRow, BenchmarkDecision, FieldScores } from "../types";
import { scoreFields } from "../lib/score";
import type { InboundMessage } from "../lib/score";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const inboundMessages = require("../data/inbound_messages.json");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const benchmarkData = require("../data/benchmark.json");

async function main() {
  const messages: InboundMessage[] = inboundMessages.messages;
  const decisions: BenchmarkDecision[] = benchmarkData.decisions;
  const benchmarkMap = new Map(
    decisions.map((d: BenchmarkDecision) => [d.id, d]),
  );

  const results: BatchResultRow[] = [];
  const errors: { id: string; error: string }[] = [];

  console.log(`\nNorthwind Triage — Batch Run`);
  console.log(`Processing ${messages.length} messages…\n`);

  for (const msg of messages) {
    process.stdout.write(`  ${msg.id}  `);
    try {
      const result = await runTriage({
        message: msg.body,
        meta: {
          id: msg.id,
          channel: msg.channel,
          sender_name: msg.sender_name,
          received_at: msg.received_at,
        },
      });

      const benchmark = benchmarkMap.get(msg.id);
      const scores = benchmark ? scoreFields(result, benchmark) : undefined;
      results.push({ id: msg.id, result, benchmark, scores });

      const tick = scores?.strict ? "✓" : "✗";
      console.log(
        `${tick}  ${result.category.padEnd(12)} ${result.priority}  → ${result.route_to}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ id: msg.id, error: message });
      console.log(`ERROR  ${message}`);
    }
  }

  // ─── Scoring ───────────────────────────────────────────────────────────────
  const scored = results.filter((r) => r.scores);
  const n = scored.length;

  const strictCount = scored.filter((r) => r.scores!.strict).length;
  const strictAccuracy = n > 0 ? ((strictCount / n) * 100).toFixed(1) : null;

  const avg = (field: keyof Omit<FieldScores, "strict">): number | null =>
    n > 0
      ? parseFloat(
          (
            (scored.reduce((sum, r) => sum + (r.scores![field] as number), 0) /
              n) *
            100
          ).toFixed(1),
        )
      : null;

  const fmt = (v: number | null) => (v !== null ? `${v}%` : "n/a");

  console.log("\n─────────────────────────────────────────────");
  console.log(
    `STRICT ACCURACY       ${strictCount}/${n} = ${fmt(strictAccuracy !== null ? parseFloat(strictAccuracy) : null)}`,
  );
  console.log(`  category            ${fmt(avg("category"))}`);
  console.log(`  priority            ${fmt(avg("priority"))}`);
  console.log(`  route_to            ${fmt(avg("route_to"))}`);
  console.log(`  needs_human_review  ${fmt(avg("needs_human_review"))}`);
  if (errors.length > 0) {
    console.log(`  errors              ${errors.length}`);
  }
  console.log("─────────────────────────────────────────────\n");

  // ─── Write results file ────────────────────────────────────────────────────
  const outPath = join(process.cwd(), "data", "batch_results.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        run_at: new Date().toISOString(),
        summary: {
          strict_accuracy_pct:
            strictAccuracy !== null ? parseFloat(strictAccuracy) : null,
          per_field: {
            category_pct: avg("category"),
            priority_pct: avg("priority"),
            route_to_pct: avg("route_to"),
            needs_human_review_pct: avg("needs_human_review"),
          },
        },
        results,
        errors,
      },
      null,
      2,
    ),
  );

  console.log(`Full results written to data/batch_results.json`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
