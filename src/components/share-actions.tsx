"use client";
import { useState } from "react";
import Link from "next/link";
import type { ShareData } from "@/lib/types";
import { shareText, encodeShare } from "@/lib/share";
export function ShareActions({ data }: { data: ShareData }) {
  const [fallback, setFallback] = useState("");
  const [message, setMessage] = useState("");
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("コピーしました");
      setFallback("");
    } catch {
      setFallback(value);
      setMessage("下のテキストを選択してコピーしてください");
    }
  }
  return (
    <div className="share-actions">
      <div className="button-row">
        <button onClick={() => copy(shareText(data))}>▣ テキストをコピー</button>
        <button onClick={() => copy(`${location.origin}/share?data=${encodeShare(data)}`)}>
          ↗ 共有リンク
        </button>
        <Link className="button" href="/board">
          ⛶ 大きく表示
        </Link>
        {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
          <button
            onClick={async () => {
              try {
                await navigator.share({ title: "今日の当番", text: shareText(data) });
              } catch {
                setMessage("共有を終了しました");
              }
            }}
          >
            共有
          </button>
        )}
      </div>
      <p className="action-message" role="status">
        {message}
      </p>
      {fallback && (
        <textarea
          aria-label="コピー用テキスト"
          readOnly
          value={fallback}
          onFocus={(event) => event.target.select()}
          rows={5}
        />
      )}
    </div>
  );
}
