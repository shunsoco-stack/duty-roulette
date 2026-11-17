import type { State, Assignment } from "./types";
import { dateRange, isDutyDay } from "./dates";
import { absenceOn } from "./absence";
export function filterHistory(
  history: Assignment[],
  start: string,
  end: string,
  dutyId = "",
  memberId = "",
) {
  return history
    .filter(
      (h) =>
        h.date >= start &&
        h.date <= end &&
        (!dutyId || h.dutyId === dutyId) &&
        (!memberId || h.memberIds.includes(memberId)),
    )
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
}
export function summarize(state: State, start: string, end: string, dutyId = "", memberId = "") {
  const records = filterHistory(state.history, start, end, dutyId, memberId);
  const duties = state.duties.filter((d) => !dutyId || d.id === dutyId);
  return state.members
    .filter((m) => !memberId || m.id === memberId)
    .map((member) => {
      const counts = Object.fromEntries(
        duties.map((d) => [
          d.id,
          records.filter(
            (h) => h.date >= member.since && h.dutyId === d.id && h.memberIds.includes(member.id),
          ).length,
        ]),
      );
      const eligibleDays = dateRange(start, end).filter(
        (day) =>
          member.active &&
          member.since <= day &&
          !absenceOn(state.absences, member.id, day) &&
          duties.some(
            (d) =>
              isDutyDay(day, d, state) && (!d.memberIds.length || d.memberIds.includes(member.id)),
          ),
      ).length;
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return { member, counts, total, eligibleDays, rate: eligibleDays ? total / eligibleDays : 0 };
    });
}
export function imbalance(values: number[]) {
  if (!values.length) return { difference: 0, deviation: 0, average: 0 };
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  return {
    average,
    difference: Math.max(...values) - Math.min(...values),
    deviation: Math.sqrt(values.reduce((sum, v) => sum + (v - average) ** 2, 0) / values.length),
  };
}
export const methodLabel = { roulette: "ルーレット", redraw: "回し直し後", replacement: "交代" };
