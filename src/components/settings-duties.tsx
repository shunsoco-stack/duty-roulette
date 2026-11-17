"use client";
import { useState } from "react";
import type { Duty } from "@/lib/types";
import { validEmoji } from "@/lib/validation";
import { useApp } from "./app-provider";
export function DutySettings() {
  const { state, update, notify } = useApp();
  const [editing, setEditing] = useState<Duty | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(false);
  if (!state) return null;
  return (
    <div className="settings-columns">
      <section className="panel">
        <h2>当番一覧</h2>
        <div className="settings-duty-list">
          {state.duties.map((d) => (
            <article key={d.id}>
              <span className="duty-icon">{d.icon}</span>
              <div>
                <h3>{d.name}</h3>
                <p>
                  {d.count}人 ·{" "}
                  {d.weekdays.map((n) => "日月火水木金土"[n]).join("・") || "曜日なし"}
                  <br />
                  直近{d.avoid}回を回避 ·{" "}
                  {d.memberIds.length ? `${d.memberIds.length}人が対象` : "全員が対象"}
                </p>
              </div>
              <button
                onClick={() => {
                  setEditing(d);
                  setSelected(!!d.memberIds.length);
                  setError("");
                }}
              >
                編集
              </button>
            </article>
          ))}
        </div>
      </section>
      <form
        key={editing?.id ?? "new"}
        className="panel settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const name = String(data.get("name")).trim();
          const icon = String(data.get("icon"));
          if (!name || !validEmoji(icon)) {
            setError("名前と絵文字1つを入力してください。");
            return;
          }
          const memberIds = selected ? data.getAll("memberIds").map(String) : [];
          if (selected && !memberIds.length) {
            setError("対象メンバーを1人以上選択してください。");
            return;
          }
          const duty: Duty = {
            id: editing?.id ?? crypto.randomUUID(),
            name,
            icon,
            count: Number(data.get("count")),
            weekdays: data.getAll("days").map(Number),
            memberIds,
            avoid: Number(data.get("avoid")),
          };
          update({
            ...state,
            duties: editing
              ? state.duties.map((d) => (d.id === editing.id ? duty : d))
              : [...state.duties, duty],
          });
          setEditing(null);
          setSelected(false);
          setError("");
          e.currentTarget.reset();
          notify("当番の設定を保存しました。");
        }}
      >
        <h2>{editing ? "当番を編集" : "当番を追加"}</h2>
        <label>
          当番の名前
          <input name="name" required maxLength={60} defaultValue={editing?.name ?? ""} />
        </label>
        <label>
          アイコン（絵文字1つ）
          <input name="icon" required maxLength={20} defaultValue={editing?.icon ?? "🧹"} />
        </label>
        <label>
          人数
          <select name="count" defaultValue={editing?.count ?? 1}>
            <option value={1}>1人</option>
            <option value={2}>2人</option>
          </select>
        </label>
        <fieldset>
          <legend>実施する曜日</legend>
          <div className="weekday-options">
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <label key={n}>
                <input
                  type="checkbox"
                  name="days"
                  value={n}
                  defaultChecked={(editing?.weekdays ?? [1, 2, 3, 4, 5]).includes(n)}
                />
                {"日月火水木金土"[n]}
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          対象メンバー
          <select
            value={selected ? "selected" : "all"}
            onChange={(e) => setSelected(e.target.value === "selected")}
          >
            <option value="all">全員</option>
            <option value="selected">メンバーを選択</option>
          </select>
        </label>
        {selected && (
          <fieldset>
            <legend>抽選の対象</legend>
            {state.members.map((m) => (
              <label key={m.id} className="checkbox-label">
                <input
                  type="checkbox"
                  name="memberIds"
                  value={m.id}
                  defaultChecked={editing?.memberIds.includes(m.id)}
                />
                {m.name}
              </label>
            ))}
          </fieldset>
        )}
        <label>
          直近の担当を避ける回数
          <input
            type="number"
            name="avoid"
            required
            min={0}
            max={10}
            defaultValue={editing?.avoid ?? 1}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="primary" disabled={!editing && state.duties.length >= 30}>
          {editing ? "変更を保存" : "＋ 当番を追加"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setSelected(false);
            }}
          >
            キャンセル
          </button>
        )}
      </form>
    </div>
  );
}
