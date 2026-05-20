"use client";

import { useState } from "react";
import type { TriageResult } from "@/types";
import { CATEGORY_STYLES, PRIORITY_STYLES } from "@/constants";

interface FormState {
  message: string;
  senderName: string;
  channel: string;
}

type TriageStatus = "idle" | "loading" | "success" | "error";

export function TriageView() {
  const [form, setForm] = useState<FormState>({
    message: "",
    senderName: "",
    channel: "email",
  });
  const [status, setStatus] = useState<TriageStatus>("idle");
  const [result, setResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!form.message.trim()) return;
    setStatus("loading");
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: form.message,
          meta: {
            sender_name: form.senderName || undefined,
            channel: form.channel || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Unknown error");
        setStatus("error");
        return;
      }
      setResult(data.result);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setStatus("error");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <main className="grid min-h-[calc(100vh-88px)] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(440px,580px)]">
      {/* Left panel — input */}
      <section className="flex min-h-[55vh] flex-col gap-5 border-b border-border-soft p-5 sm:p-7 md:p-9 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-2.5 border-b border-border-soft pb-4">
          <span className="font-mono-ui text-[9px] uppercase tracking-[0.15em] text-text-faint">
            01
          </span>
          <span className="font-mono-ui text-[10px] uppercase tracking-widest text-text-muted">
            Inbound message
          </span>
        </div>

        <div className="flex flex-1 flex-col">
          <textarea
            className="min-h-52 w-full flex-1 rounded-app border border-border-soft bg-surface px-4 py-3.5 text-sm leading-[1.75] text-text-main outline-none transition-colors placeholder:text-text-faint focus:border-border-strong sm:min-h-64"
            placeholder="Paste or type a customer message…"
            value={form.message}
            onChange={(e) =>
              setForm((f) => ({ ...f, message: e.target.value }))
            }
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-text-faint">
              Sender
            </label>
            <input
              type="text"
              placeholder="e.g. Sarah Patel"
              value={form.senderName}
              onChange={(e) =>
                setForm((f) => ({ ...f, senderName: e.target.value }))
              }
              className="font-mono-ui rounded-app border border-border-soft bg-surface px-3 py-2 text-[11px] text-text-main outline-none transition-colors placeholder:text-text-faint focus:border-border-strong"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-text-faint">
              Channel
            </label>
            <select
              value={form.channel}
              onChange={(e) =>
                setForm((f) => ({ ...f, channel: e.target.value }))
              }
              className="font-mono-ui rounded-app border border-border-soft bg-surface px-3 py-2 text-[11px] text-text-main outline-none transition-colors focus:border-border-strong"
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="webform">Web form</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={status === "loading" || !form.message.trim()}
            className="font-mono-ui rounded-app bg-accent px-6 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-black transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {status === "loading" ? "Processing…" : "Run triage"}
          </button>
          <span className="font-mono-ui text-[9px] uppercase tracking-widest text-text-faint">
            ⌘↵
          </span>
        </div>
      </section>

      {/* Right panel — result */}
      <section className="flex min-h-[45vh] flex-col gap-5 overflow-y-auto p-5 sm:p-7 md:p-9">
        <div className="flex items-center gap-2.5 border-b border-border-soft pb-4">
          <span className="font-mono-ui text-[9px] uppercase tracking-[0.15em] text-text-faint">
            02
          </span>
          <span className="font-mono-ui text-[10px] uppercase tracking-widest text-text-muted">
            Classification
          </span>
        </div>

        {status === "idle" && (
          <div className="flex flex-1 items-center justify-center">
            <span className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-text-faint">
              — awaiting signal —
            </span>
          </div>
        )}

        {status === "loading" && (
          <div className="flex items-center gap-3">
            <span
              className="inline-block h-2 w-2 rounded-full bg-accent"
              style={{ animation: "pulse-dot 1s ease-in-out infinite" }}
            />
            <span className="font-mono-ui text-[10px] uppercase tracking-widest text-text-muted">
              Classifying…
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

        {status === "success" && result && (
          <div className="animate-fade-in overflow-hidden rounded-app border border-border-soft bg-surface">
            <div className="flex flex-wrap items-center gap-2 border-b border-border-soft px-4 py-4 sm:px-5">
              <span className={CATEGORY_STYLES[result.category]}>
                {result.category}
              </span>
              <span className={PRIORITY_STYLES[result.priority]}>
                {result.priority}
              </span>
              <span
                className="badge text-text-muted"
                style={{ borderColor: "var(--border-dark)", background: "var(--surface-raised)" }}
              >
                {result.route_to}
              </span>
              {result.needs_human_review && (
                <span
                  className="font-mono-ui inline-flex items-center gap-1.5 rounded-xs px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] lg:ml-auto"
                  style={{
                    background: "var(--flag-bg)",
                    border: "1px solid var(--flag-border)",
                    color: "var(--flag-text)",
                  }}
                >
                  ⚑ Human review
                </span>
              )}
            </div>

            <div className="flex flex-col divide-y divide-border-soft">
              <div className="px-4 py-4 sm:px-5">
                <p className="font-mono-ui mb-2.5 text-[9px] uppercase tracking-[0.15em] text-text-faint">
                  Draft reply
                </p>
                {result.draft_reply ? (
                  <p className="text-sm leading-[1.8] text-text-main">
                    {result.draft_reply}
                  </p>
                ) : (
                  <p className="font-mono-ui text-[11px] text-text-faint">
                    No reply — message flagged as not actionable.
                  </p>
                )}
              </div>

              <div className="px-4 py-4 sm:px-5">
                <p className="font-mono-ui mb-2.5 text-[9px] uppercase tracking-[0.15em] text-text-faint">
                  Reasoning
                </p>
                <p className="text-[13px] leading-[1.7] text-text-muted">
                  {result.reasoning}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
