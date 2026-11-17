"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { decodeShare } from "@/lib/share";
import { dateLabel } from "@/lib/dates";
import type { ShareData } from "@/lib/types";
export function Shared() {
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const value = new URLSearchParams(location.search).get("data");
        if (!value)
          throw new Error("共有リンクがありません。ホームで共有リンクを作成してください。");
        setData(decodeShare(encodeURIComponent(value)));
      } catch (e) {
        setError((e as Error).message);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="shared-page">
      <div className="brand">
        <span className="brand-symbol">◉</span>今日の当番ルーレット
      </div>
      <span className="tag">共有された当番 · 読み取り専用</span>
      {error ? (
        <div className="empty">
          <h1>リンクを表示できません</h1>
          <p role="alert">{error}</p>
        </div>
      ) : data ? (
        <>
          <p className="eyebrow">HAVE A GOOD DAY</p>
          <h1>{dateLabel(data.date)}の当番</h1>
          <p className="muted">{data.team}</p>
          <div className="shared-duties">
            {data.duties.map((d, i) => (
              <article key={i}>
                <span>{d.icon}</span>
                <h2>{d.name}</h2>
                <strong>{d.names.join("・") || "未決定"}</strong>
              </article>
            ))}
          </div>
          {!data.duties.length && <p className="empty">今日は当番のない日です</p>}
          <p className="hint">
            リンク作成時点の内容です。変更は自動では反映されません。
            <br />
            日付・チーム名・当番・担当者だけを表示しています。
          </p>
        </>
      ) : (
        <p>共有内容を読み込み中…</p>
      )}
      <Link className="button" href="/">
        今日の当番ルーレットを開く
      </Link>
      <p className="hint">デモ用の架空データです</p>
    </div>
  );
}
