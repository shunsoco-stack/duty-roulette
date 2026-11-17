import type { Duty, State } from "./types";

export function japanNow(now: Date) {
  const local = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}
export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
export function addDays(date: string, days: number) {
  return new Date(new Date(date + "T00:00:00Z").getTime() + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function weekday(date: string) {
  return new Date(date + "T00:00:00Z").getUTCDay();
}
type BusinessCalendar = Pick<State, "businessDays" | "holidays" | "annualHolidays">;
export function isBusinessDay(date: string, state: BusinessCalendar) {
  const monthDay = date.slice(5);
  const annualHoliday = state.annualHolidays?.some(({ start, end }) =>
    start <= end ? monthDay >= start && monthDay <= end : monthDay >= start || monthDay <= end,
  );
  return (
    state.businessDays.includes(weekday(date)) && !state.holidays.includes(date) && !annualHoliday
  );
}
export function isDutyDay(date: string, duty: Duty, state: BusinessCalendar) {
  return isBusinessDay(date, state) && duty.weekdays.includes(weekday(date));
}
export function nextDay(date: string, state: State, duty?: Duty) {
  for (let step = 1; step <= 370; step++) {
    const candidate = addDays(date, step);
    if (duty ? isDutyDay(candidate, duty, state) : isBusinessDay(candidate, state))
      return candidate;
  }
  return null;
}
export function dateLabel(date: string) {
  return `${Number(date.slice(5, 7))}月${Number(date.slice(8))}日（${"日月火水木金土"[weekday(date)]}）`;
}
export function dateRange(start: string, end: string) {
  const days: string[] = [];
  if (!validDate(start) || !validDate(end) || start > end) return days;
  for (let day = start; day <= end && days.length < 3660; day = addDays(day, 1)) days.push(day);
  return days;
}
