import { addDays } from "./dates";
import { absenceOn } from "./absence";
import type { Candidate, Duty, State } from "./types";

export function candidates(state: State, duty: Duty, date: string) {
  const records = state.history
    .filter((h) => h.dutyId === duty.id && h.date < date)
    .sort((a, b) => b.date.localeCompare(a.date));
  const recent = new Set(records.slice(0, duty.avoid).flatMap((h) => h.memberIds));
  const used = new Set(
    state.history
      .filter((h) => h.date === date && h.dutyId !== duty.id)
      .flatMap((h) => h.memberIds),
  );
  const rows: Candidate[] = state.members.map((member) => {
    const reasons: string[] = [];
    if (!member.active) reasons.push("休止");
    if (member.since > date) reasons.push("参加前");
    if (duty.memberIds.length && !duty.memberIds.includes(member.id)) reasons.push("対象外");
    const absence = absenceOn(state.absences, member.id, date);
    if (absence) reasons.push(`不在：${absence.reason}`);
    if (recent.has(member.id)) reasons.push("直近担当");
    const count = records.filter(
      (h) =>
        h.date >= member.since &&
        h.date >= addDays(date, 1 - state.period) &&
        h.memberIds.includes(member.id),
    ).length;
    return { member, count, weight: 0, probability: 0, reasons };
  });
  const available = rows.filter((r) => !r.reasons.length);
  const fresh = available.filter((r) => !used.has(r.member.id));
  const overlapRelaxed =
    state.noOverlap && fresh.length < duty.count && available.some((r) => used.has(r.member.id));
  if (state.noOverlap && !overlapRelaxed)
    rows.forEach((r) => {
      if (used.has(r.member.id)) r.reasons.push("今日ほかの当番あり");
    });
  const eligible = rows.filter((r) => !r.reasons.length);
  const min = Math.min(...eligible.map((r) => r.count));
  eligible.forEach((r) => {
    r.weight = 1 / (1 + r.count - min);
  });
  const total = eligible.reduce((sum, r) => sum + r.weight, 0);
  // Marginal inclusion probability for weighted sampling without replacement (up to two).
  eligible.forEach((r) => {
    let probability = r.weight / total;
    if (duty.count === 2 && eligible.length >= 2) {
      probability += eligible
        .filter((other) => other !== r)
        .reduce(
          (sum, other) => sum + ((other.weight / total) * r.weight) / (total - other.weight),
          0,
        );
    }
    r.probability = eligible.length < duty.count ? 0 : probability * 100;
  });
  return { rows, overlapRelaxed, enough: eligible.length >= duty.count };
}
