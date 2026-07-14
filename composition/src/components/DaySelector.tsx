import { displayDate, localDate, shiftDate } from "../lib/dates";

interface Props {
  date: string;
  onChange: (date: string) => void;
}

export default function DaySelector({ date, onChange }: Props) {
  const isToday = date === localDate();
  return (
    <div className="flex items-center justify-between py-1">
      <button
        aria-label="Previous day"
        className="p-2 -ml-2 text-muted"
        onClick={() => onChange(shiftDate(date, -1))}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>
      <button
        className="font-display text-lg font-medium"
        onClick={() => onChange(localDate())}
      >
        {displayDate(date)}
      </button>
      <button
        aria-label="Next day"
        className="p-2 -mr-2 text-muted disabled:opacity-30"
        disabled={isToday}
        onClick={() => onChange(shiftDate(date, 1))}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}
