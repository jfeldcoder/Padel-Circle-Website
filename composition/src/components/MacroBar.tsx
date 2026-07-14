interface Props {
  label: string;
  value: number;
  target: number | null;
}

export default function MacroBar({ label, value, target }: Props) {
  const pct = target && target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const over = target !== null && target > 0 && value > target;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="label">{label}</span>
        <span className="text-sm text-ink font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
          {Math.round(value)}
          <span className="text-muted font-normal">{target ? ` / ${target} g` : " g"}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-line overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: over ? "var(--over)" : "var(--accent)",
          }}
        />
      </div>
    </div>
  );
}
