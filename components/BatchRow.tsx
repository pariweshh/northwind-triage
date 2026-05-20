"use client";

import { useState } from "react";
import type { BatchResultRow } from "@/types";
import { CATEGORY_STYLES, PRIORITY_STYLES } from "@/constants";

interface BatchRowProps {
  row: BatchResultRow;
}

const SCORE_FIELDS: [
  string,
  keyof NonNullable<BatchRowProps["row"]["scores"]>,
][] = [
  ["category", "category"],
  ["priority", "priority"],
  ["route", "route_to"],
  ["human flag", "needs_human_review"],
];

export function BatchRow({ row }: BatchRowProps) {
  const [open, setOpen] = useState(false);
  const strict = row.scores?.strict;

  const strictColor =
    strict === true
      ? "var(--p3)"
      : strict === false
        ? "var(--p1)"
        : "var(--text-faint)";

  return (
    <div className="border-b border-border-soft last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-raised sm:px-5"
      >
        <span
          className="font-mono-ui w-4 shrink-0 text-[11px] font-medium"
          style={{ color: strictColor }}
        >
          {strict === true ? "✓" : strict === false ? "✗" : "—"}
        </span>

        <span className="font-mono-ui w-20 shrink-0 text-[10px] text-text-muted">
          {row.id}
        </span>

        <span className={`${CATEGORY_STYLES[row.result.category]} shrink-0`}>
          {row.result.category}
        </span>

        <span className={`${PRIORITY_STYLES[row.result.priority]} shrink-0`}>
          {row.result.priority}
        </span>

        <span className="font-mono-ui hidden shrink-0 text-[10px] text-text-muted sm:block">
          {row.result.route_to}
        </span>

        <span className="font-mono-ui ml-auto shrink-0 text-[9px] text-text-faint">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="border-t border-border-soft bg-bg px-4 pb-4 pt-3 sm:px-5">
          {row.scores && (
            <div className="mb-3 flex flex-wrap gap-3">
              {SCORE_FIELDS.map(([label, field]) => {
                const score = row.scores![field] as number;
                const scoreColor =
                  score === 1
                    ? "var(--p3)"
                    : score === 0.5
                      ? "var(--p2)"
                      : "var(--p1)";
                return (
                  <span
                    key={label}
                    className="font-mono-ui inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide"
                    style={{ color: scoreColor }}
                  >
                    {score === 1 ? "✓" : score === 0.5 ? "~" : "✗"} {label}
                  </span>
                );
              })}
            </div>
          )}

          {row.result.draft_reply && (
            <div className="mb-3">
              <p className="font-mono-ui mb-1.5 text-[9px] uppercase tracking-[0.12em] text-text-faint">
                Draft reply
              </p>
              <p className="text-sm leading-[1.75] text-text-main">
                {row.result.draft_reply}
              </p>
            </div>
          )}

          <div className="mb-3">
            <p className="font-mono-ui mb-1.5 text-[9px] uppercase tracking-[0.12em] text-text-faint">
              Reasoning
            </p>
            <p className="text-[13px] leading-[1.65] text-text-muted">
              {row.result.reasoning}
            </p>
          </div>

          {row.benchmark?.notes && (
            <div className="rounded-app border border-border-soft bg-surface px-3 py-2.5">
              <p className="font-mono-ui mb-1.5 text-[9px] uppercase tracking-[0.12em] text-text-faint">
                Benchmark note
              </p>
              <p className="text-[12px] leading-[1.65] text-text-muted">
                {row.benchmark.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
