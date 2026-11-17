import type { Absence, State } from "./types";
export function absenceOn(absences: Absence[], memberId: string, date: string) {
  return absences.find(
    (item) => item.memberId === memberId && item.start <= date && item.end >= date,
  );
}
export function toggleAbsence(state: State, memberId: string, date: string, reason: string): State {
  const present = absenceOn(state.absences, memberId, date);
  if (!present)
    return {
      ...state,
      absences: [
        ...state.absences,
        {
          id: `a-${memberId}-${date}`,
          memberId,
          start: date,
          end: date,
          reason: reason.trim() || "不在",
        },
      ],
    };
  // A one-day toggle never discards the surrounding dates of a planned absence.
  const remaining = state.absences.flatMap((a) => {
    if (a.memberId !== memberId || a.start > date || a.end < date) return [a];
    const parts: Absence[] = [];
    if (a.start < date) parts.push({ ...a, end: addDays(date, -1) });
    if (a.end > date) parts.push({ ...a, id: a.id + "-after", start: addDays(date, 1) });
    return parts;
  });
  return { ...state, absences: remaining };
}
import { addDays } from "./dates";
