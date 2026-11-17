import type { State } from "./types";
import { filterHistory, methodLabel, summarize } from "./history";
export function csv(rows: (string | number)[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value);
            const safe = /^[=+@\-\t\r]/.test(text) ? "'" + text : text;
            return '"' + safe.replaceAll('"', '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}
export function csvFilename(kind: "history" | "counts", start: string, end: string) {
  return `${kind === "history" ? "当番履歴" : "担当回数"}_${start}_${end}.csv`;
}
export function historyCsv(state: State, start: string, end: string, dutyId = "", memberId = "") {
  return csv([
    ["日付", "時刻", "当番", "担当者", "決め方", "メモ"],
    ...filterHistory(state.history, start, end, dutyId, memberId).map((h) => [
      h.date,
      h.time,
      state.duties.find((d) => d.id === h.dutyId)?.name ?? "",
      h.memberIds.map((id) => state.members.find((m) => m.id === id)?.name).join("・"),
      methodLabel[h.method],
      h.note,
    ]),
  ]);
}
export function countsCsv(state: State, start: string, end: string, dutyId = "", memberId = "") {
  const duties = state.duties.filter((d) => !dutyId || d.id === dutyId);
  return csv([
    ["メンバー", ...duties.map((d) => d.name), "合計", "対象日数", "対象日あたり"],
    ...summarize(state, start, end, dutyId, memberId).map((r) => [
      r.member.name,
      ...duties.map((d) => r.counts[d.id]),
      r.total,
      r.eligibleDays,
      r.rate.toFixed(2),
    ]),
  ]);
}
export function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
