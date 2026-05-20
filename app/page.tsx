"use client";

import { useState } from "react";
import { TriageView } from "@/components/TriageView";
import { BatchView } from "@/components/BatchView";

type Tab = "triage" | "batch";

const TAB_LABELS: Record<Tab, string> = {
  triage: "Triage",
  batch: "Batch eval",
};

export default function Page() {
  const [tab, setTab] = useState<Tab>("triage");

  return (
    <div className="min-h-screen bg-bg text-text-main">
      <header className="border-b border-border-soft">
        <div className="flex items-center justify-between px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xs bg-accent">
              <span className="font-mono-ui text-[10px] font-bold tracking-tight text-black">
                NW
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono-ui text-[11px] font-semibold uppercase tracking-[0.14em] text-text-main">
                Northwind
              </span>
              <span className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-text-faint">
                Triage System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-p3"
              style={{ animation: "pulse-dot 2.5s ease-in-out infinite" }}
            />
            <span className="font-mono-ui text-[9px] uppercase tracking-widest text-text-faint">
              Online
            </span>
          </div>
        </div>

        <div className="flex border-t border-border-soft px-5 sm:px-8">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-mono-ui relative border-b-[1.5px] px-4 py-2.5 text-[10px] uppercase tracking-widest transition-colors ${
                tab === t
                  ? "border-accent text-accent"
                  : "border-transparent text-text-faint hover:text-text-muted"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </header>

      <div className={tab === "triage" ? "block" : "hidden"}>
        <TriageView />
      </div>
      <div className={tab === "batch" ? "block" : "hidden"}>
        <BatchView />
      </div>
    </div>
  );
}
