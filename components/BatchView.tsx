"use client";

import { useState } from "react";
import type { BatchResultRow } from "@/types";
import { ScoreBar } from "@/components/ScoreBar";
import { BatchRow } from "@/components/BatchRow";

interface BatchSummary {
  total: number;
  scored: number;
  errors: number;
  strict_accuracy_pct: number;
  per_field: {
    category_pct: number;
    priority_pct: number;
    route_to_pct: number;
    needs_human_review_pct: number;
  };
}

interface BatchResponse {
  summary: BatchSummary;
  results: BatchResultRow[];
  errors: { id: string; error: string }[];
}

type BatchStatus = "idle" | "loading" | "done" | "error";

const SUMMARY_FIELDS: [
  string,
  keyof BatchSummary["per_field"] | "strict_accuracy_pct",
][] = [
  ["Strict accuracy", "strict_accuracy_pct"],
  ["Category", "category_pct"],
  ["Priority", "priority_pct"],
  ["Route to", "route_to_pct"],
  ["Human review", "needs_human_review_pct"],
];

export function BatchView() {
  const [status, setStatus] = useState<BatchStatus>("idle");
  const [data, setData] = useState<BatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runBatch() {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/batch", { method: "POST" });
      if (!res.ok) {
        setError(`Server error: ${res.status}`);
        setStatus("error");
        return;
      }
      const json = await res.json();
      setData(json);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-6 p-5 sm:p-7 md:p-9">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono-ui text-[9px] uppercase tracking-[0.15em] text-text-faint">
            Batch evaluation
          </p>
          <p className="mt-1.5 text-sm text-text-muted">
            Runs all 20 messages against the benchmark.
          </p>
        </div>
        <button
          onClick={runBatch}
          disabled={status === "loading"}
          className="font-mono-ui shrink-0 rounded-app bg-accent px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-black transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {status === "loading" ? "Running…" : "Run batch"}
        </button>
      </div>

      {status === "loading" && (
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-2 w-2 rounded-full bg-accent"
            style={{ animation: "pulse-dot 1s ease-in-out infinite" }}
          />
          <span className="font-mono-ui text-[10px] uppercase tracking-widest text-text-muted">
            Processing 20 messages — ~30 seconds…
          </span>
        </div>
      )}

      {status === "error" && error && (
        <div
          className="font-mono-ui rounded-app border px-4 py-3 text-[11px]"
          style={{
            background: "var(--p1-bg)",
            borderColor: "rgba(255, 69, 69, 0.2)",
            color: "var(--p1)",
          }}
        >
          Error: {error}
        </div>
      )}

      {status === "done" && data && (
        <div className="animate-fade-in flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {SUMMARY_FIELDS.map(([label, key]) => {
              const pct =
                key === "strict_accuracy_pct"
                  ? data.summary.strict_accuracy_pct
                  : data.summary.per_field[
                      key as keyof BatchSummary["per_field"]
                    ];
              return (
                <div
                  key={label}
                  className="flex flex-col gap-3 rounded-app border border-border-soft bg-surface px-4 py-3.5"
                >
                  <p className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-text-faint">
                    {label}
                  </p>
                  <ScoreBar pct={pct} />
                </div>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-app border border-border-soft bg-surface">
            <div className="flex items-center gap-3 border-b border-border-soft bg-bg px-4 py-2 sm:px-5">
              <span className="w-4 shrink-0" />
              <span className="font-mono-ui w-20 shrink-0 text-[9px] uppercase tracking-widest text-text-faint">
                ID
              </span>
              <span className="font-mono-ui text-[9px] uppercase tracking-widest text-text-faint">
                Category
              </span>
              <span className="font-mono-ui text-[9px] uppercase tracking-widest text-text-faint">
                Priority
              </span>
              <span className="font-mono-ui hidden text-[9px] uppercase tracking-widest text-text-faint sm:block">
                Route
              </span>
            </div>

            {data.results.map((row) => (
              <BatchRow key={row.id} row={row} />
            ))}

            {data.errors.length > 0 && (
              <div className="border-t border-border-soft px-4 py-4 sm:px-5">
                <p
                  className="font-mono-ui mb-2 text-[9px] uppercase tracking-[0.12em]"
                  style={{ color: "var(--p1)" }}
                >
                  {data.errors.length} message(s) errored
                </p>
                <div className="flex flex-col gap-1.5">
                  {data.errors.map((e) => (
                    <div key={e.id} className="flex gap-2 text-[12px]">
                      <span
                        className="font-mono-ui shrink-0"
                        style={{ color: "var(--p1)" }}
                      >
                        {e.id}
                      </span>
                      <span className="text-text-muted">{e.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {status === "idle" && (
        <div className="flex items-center justify-center rounded-app border border-border-soft bg-surface py-16">
          <p className="font-mono-ui text-[10px] uppercase tracking-widest text-text-faint">
            — no results yet —
          </p>
        </div>
      )}
    </div>
  );
}
