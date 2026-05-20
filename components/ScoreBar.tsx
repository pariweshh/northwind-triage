interface ScoreBarProps {
  pct: number;
}

export function ScoreBar({ pct }: ScoreBarProps) {
  const accentColor =
    pct === 100 ? "var(--p3)" : pct >= 80 ? "var(--p2)" : "var(--p1)";

  return (
    <div className="flex flex-col gap-2">
      <span
        className="font-mono-ui text-xl font-semibold leading-none"
        style={{ color: accentColor }}
      >
        {pct}
        <span className="text-xs" style={{ color: "var(--text-faint)" }}>
          %
        </span>
      </span>
      <div className="h-px w-full overflow-hidden rounded-full bg-border-strong">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: accentColor }}
        />
      </div>
    </div>
  );
}
