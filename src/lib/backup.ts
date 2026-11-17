import { validateState } from "./validation";
import type { State } from "./types";
export function encodeBackup(state: State) {
  return JSON.stringify(state, null, 2);
}
export function decodeBackup(raw: string, now: Date): State {
  if (raw.length > 10_000_000) throw new Error("ファイルは10MB以下にしてください");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("JSONを読み取れませんでした");
  }
  if (!validateState(parsed, now))
    throw new Error("形式・日付・メンバー参照などが不正です。データは変更していません。");
  return parsed;
}
export function backupFilename(date: string) {
  return `当番ルーレット_バックアップ_${date}.json`;
}
