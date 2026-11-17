"use client";
import { useState } from "react";
import { useApp } from "./app-provider";
import { encodeBackup, decodeBackup, backupFilename } from "@/lib/backup";
import { download } from "@/lib/csv";
import type { State } from "@/lib/types";
export function BackupSettings() {
  const { state, today, update, notify } = useApp();
  const [pending, setPending] = useState<State | null>(null);
  const [message, setMessage] = useState("");
  if (!state) return null;
  return (
    <section className="panel settings-form">
      <h2>データのバックアップ</h2>
      <p>
        チーム設定・メンバー・当番・不在・履歴・回し直しと交代の記録を、JSONファイルで保管できます。
      </p>
      <button
        onClick={() => download(encodeBackup(state), backupFilename(today), "application/json")}
      >
        ↓ バックアップを書き出す（JSON）
      </button>
      <div className="file-control">
        <input
          className="visually-hidden"
          id="backup-file"
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            setPending(null);
            if (!file) return;
            try {
              if (file.size > 10_000_000) throw new Error("10MB以下のJSONを選択してください");
              const parsed = decodeBackup(await file.text(), new Date());
              setPending(parsed);
              setMessage("");
            } catch (error) {
              setMessage((error as Error).message);
            }
          }}
        />
        <label className="button" htmlFor="backup-file">
          バックアップを読み込む（JSON）
        </label>
      </div>
      {message && (
        <p className="error" role="alert">
          {message}
        </p>
      )}
      {pending && (
        <div className="import-preview">
          <h3>読み込み内容を確認</h3>
          <p>
            {pending.team}
            <br />
            メンバー{pending.members.length}人 / 当番{pending.duties.length}種類 / 履歴
            {pending.history.length}件
          </p>
          <p>現在のデータをこの内容で置き換えます。</p>
          <div className="button-row">
            <button
              className="primary"
              onClick={() => {
                update(pending);
                setPending(null);
                notify("バックアップを読み込みました。");
              }}
            >
              この内容で置き換える
            </button>
            <button onClick={() => setPending(null)}>キャンセル</button>
          </div>
        </div>
      )}
      <p className="hint">
        データは外部に送信しません。壊れたデータや未来の決定記録を含むファイルは読み込みません。
      </p>
    </section>
  );
}
