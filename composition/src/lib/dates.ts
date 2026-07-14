import { format, parseISO, addDays, isToday, isYesterday } from "date-fns";

/** The user's local calendar date as `yyyy-MM-dd` (never UTC). */
export function localDate(d: Date = new Date()): string {
  return format(d, "yyyy-MM-dd");
}

export function shiftDate(date: string, days: number): string {
  return format(addDays(parseISO(date), days), "yyyy-MM-dd");
}

export function displayDate(date: string): string {
  const d = parseISO(date);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, MMM d");
}

export function longDate(date: string): string {
  return format(parseISO(date), "EEEE, MMMM d");
}

export function shortDate(date: string): string {
  return format(parseISO(date), "MMM d");
}
