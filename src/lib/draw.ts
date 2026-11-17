import type { Candidate, State, Assignment } from "./types";
import { japanNow, isDutyDay } from "./dates";
import { candidates } from "./fairness";

export function draw(rows: Candidate[], count: number, random: () => number): string[] {
  const pool = rows.filter((r) => !r.reasons.length && r.weight > 0);
  if (pool.length < count || count < 1 || count > 2)
    throw new Error("候補者が足りません。対象・不在・直近回避の設定をご確認ください。");
  const selected: string[] = [];
  for (let i = 0; i < count; i++) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error("乱数が不正です");
    let threshold = value * pool.reduce((sum, row) => sum + row.weight, 0);
    let index = pool.length - 1;
    for (let j = 0; j < pool.length; j++) {
      threshold -= pool[j].weight;
      if (threshold < 0) {
        index = j;
        break;
      }
    }
    selected.push(pool[index].member.id);
    pool.splice(index, 1);
  }
  return selected;
}
export function secureRandom() {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
}
export function recordRedraw(
  state: State,
  dutyId: string,
  from: string[],
  to: string[],
  reason: string,
  now: Date,
): State {
  if (!reason.trim() || reason.length > 200)
    throw new Error("回し直す理由を200文字以内で入力してください");
  return {
    ...state,
    audit: [
      ...state.audit,
      {
        id: `redraw-${now.getTime()}`,
        ...japanNow(now),
        dutyId,
        kind: "redraw",
        from,
        to,
        reason: reason.trim(),
      },
    ],
  };
}
export function confirmDraw(state: State, dutyId: string, memberIds: string[], now: Date): State {
  const { date, time } = japanNow(now);
  const duty = state.duties.find((d) => d.id === dutyId);
  if (!duty || !isDutyDay(date, duty, state)) throw new Error("今日はこの当番の日ではありません");
  if (state.history.some((h) => h.date === date && h.dutyId === dutyId))
    throw new Error("すでに確定しています");
  const valid = candidates(state, duty, date)
    .rows.filter((r) => !r.reasons.length)
    .map((r) => r.member.id);
  if (
    memberIds.length !== duty.count ||
    new Set(memberIds).size !== duty.count ||
    memberIds.some((id) => !valid.includes(id))
  )
    throw new Error("候補者の状態が変わりました。回し直してください。");
  const redraws = state.audit.filter(
    (a) => a.date === date && a.dutyId === dutyId && a.kind === "redraw",
  );
  const record: Assignment = {
    id: `h-${date}-${dutyId}`,
    date,
    time,
    dutyId,
    memberIds,
    method: redraws.length ? "redraw" : "roulette",
    note: redraws
      .map((a) => a.reason)
      .join(" / ")
      .slice(0, 2000),
  };
  return { ...state, history: [...state.history, record] };
}
export function replaceAssignment(
  state: State,
  recordId: string,
  fromId: string,
  toId: string,
  reason: string,
  now: Date,
): State {
  const record = state.history.find((h) => h.id === recordId);
  const duty = state.duties.find((d) => d.id === record?.dutyId);
  if (
    !record ||
    !duty ||
    record.date !== japanNow(now).date ||
    !record.memberIds.includes(fromId) ||
    record.memberIds.includes(toId) ||
    !reason.trim() ||
    reason.length > 200
  )
    throw new Error("交代先と理由を確認してください");
  const row = candidates(state, duty, record.date).rows.find((r) => r.member.id === toId);
  if (!row || row.reasons.length) throw new Error("このメンバーは交代の対象外です");
  const memberIds = record.memberIds.map((id) => (id === fromId ? toId : id));
  return {
    ...state,
    history: state.history.map((h) =>
      h.id === recordId
        ? { ...h, time: japanNow(now).time, memberIds, method: "replacement", note: reason.trim() }
        : h,
    ),
    audit: [
      ...state.audit,
      {
        id: `replace-${now.getTime()}`,
        ...japanNow(now),
        dutyId: duty.id,
        kind: "replacement",
        from: record.memberIds,
        to: memberIds,
        reason: reason.trim(),
      },
    ],
  };
}
