import { dateLabel, isDutyDay, validDate } from "./dates";
import { validEmoji } from "./validation";
import type { ShareData, State } from "./types";
export function createShare(state: State, date: string): ShareData {
  return {
    version: 1,
    date,
    team: state.team,
    duties: state.duties
      .filter((d) => isDutyDay(date, d, state))
      .map((d) => ({
        name: d.name,
        icon: d.icon,
        names: (
          state.history.find((h) => h.date === date && h.dutyId === d.id)?.memberIds ?? []
        ).map((id) => state.members.find((m) => m.id === id)?.name ?? "不明"),
      })),
  };
}
export function shareText(data: ShareData) {
  return `【${dateLabel(data.date)}の当番】\n${data.team}\n${data.duties.length ? data.duties.map((d) => `${d.icon} ${d.name}：${d.names.join("・") || "未決定"}`).join("\n") : "今日は当番のない日です"}`;
}
export function encodeShare(data: ShareData) {
  return encodeURIComponent(JSON.stringify(data));
}
export function decodeShare(value: string): ShareData {
  if (value.length > 30000) throw new Error("共有リンクが長すぎます");
  try {
    const data = JSON.parse(decodeURIComponent(value));
    if (
      !data ||
      data.version !== 1 ||
      !validDate(data.date) ||
      typeof data.team !== "string" ||
      !data.team.trim() ||
      data.team.length > 100 ||
      !Array.isArray(data.duties) ||
      data.duties.length > 30
    )
      throw new Error();
    if (
      !data.duties.every(
        (d: ShareData["duties"][number]) =>
          d &&
          typeof d.name === "string" &&
          d.name.trim() &&
          d.name.length <= 60 &&
          validEmoji(d.icon) &&
          Array.isArray(d.names) &&
          d.names.length <= 2 &&
          d.names.every((n) => typeof n === "string" && n.trim() && n.length <= 40),
      )
    )
      throw new Error();
    return {
      version: 1,
      date: data.date,
      team: data.team,
      duties: data.duties.map((d: ShareData["duties"][number]) => ({
        name: d.name,
        icon: d.icon,
        names: d.names,
      })),
    };
  } catch {
    throw new Error(
      "共有リンクが不正、または対応していない形式です。新しいリンクを作成してください。",
    );
  }
}
