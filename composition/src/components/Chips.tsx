interface ChipsProps<T extends string | number> {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
}

export default function Chips<T extends string | number>({
  options,
  value,
  onChange,
  format,
}: ChipsProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={String(opt)}
          type="button"
          className={`chip ${opt === value ? "chip-active" : ""}`}
          onClick={() => onChange(opt)}
        >
          {format ? format(opt) : String(opt)}
        </button>
      ))}
    </div>
  );
}
