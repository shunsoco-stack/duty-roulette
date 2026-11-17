"use client";
import Link from "next/link";
import { useApp } from "./app-provider";
import { createShare } from "@/lib/share";
import { dateLabel } from "@/lib/dates";
export function Board() {
  const { state, today } = useApp();
  if (!state) return <p>今日の当番を読み込み中…</p>;
  const data = createShare(state, today);
  return (
    <div className="board">
      <div className="board-header">
        <span className="eyebrow">TODAY&apos;S TEAM</span>
        <Link href="/">← 通常の表示に戻る</Link>
      </div>
      <p>{state.team}</p>
      <h1>{dateLabel(today)}の当番</h1>
      <div className="board-grid">
        {data.duties.map((d, i) => (
          <article key={i}>
            <span>{d.icon}</span>
            <h2>{d.name}</h2>
            <strong>{d.names.join("・") || "未決定"}</strong>
          </article>
        ))}
      </div>
      {!data.duties.length && <p className="empty">今日は当番のない日です</p>}
      <p className="hint">デモ用の架空データです · 日本時間 · このブラウザの保存データを表示</p>
    </div>
  );
}
