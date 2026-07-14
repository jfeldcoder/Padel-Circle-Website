interface Props {
  eaten: number;
  burned: number;
  target: number | null;
}

/** The Today calorie ring: consumed vs target, netted against workout burn. */
export default function CalorieRing({ eaten, burned, target }: Props) {
  const net = eaten - burned;
  const effectiveTarget = target ?? 0;
  const pct = effectiveTarget > 0 ? Math.min(net / effectiveTarget, 1.25) : 0;
  const over = effectiveTarget > 0 && net > effectiveTarget;

  const size = 216;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(pct, 1)) * c;

  const remaining = effectiveTarget - net;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--line)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={over ? "var(--over)" : "var(--accent)"}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="stat text-5xl leading-none">{net.toLocaleString()}</span>
          <span className="label mt-2">
            {target
              ? over
                ? `${Math.abs(remaining).toLocaleString()} over`
                : `${remaining.toLocaleString()} left`
              : "net kcal"}
          </span>
        </div>
      </div>
      <div className="flex gap-8 mt-5">
        {[
          { label: "Eaten", value: eaten },
          { label: "Burned", value: burned },
          { label: "Net", value: net },
        ].map((x) => (
          <div key={x.label} className="text-center">
            <div className="stat text-lg">{x.value.toLocaleString()}</div>
            <div className="label mt-0.5">{x.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
