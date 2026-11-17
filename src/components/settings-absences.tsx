"use client";
import { useState } from "react";
import { useApp } from "./app-provider";
export function AbsenceSettings() {
  const { state, today, update, notify } = useApp();
  const [error, setError] = useState("");
  if (!state) return null;
  return (
    <div className="settings-columns">
      <section className="panel">
        <h2>不在の予定・メモ</h2>
        <p className="hint">期間中は抽選から除外します。勤怠記録ではありません。</p>
        {!state.absences.length && <p>登録されている不在はありません。</p>}
        <div className="absence-list">
          {[...state.absences]
            .sort((a, b) => b.start.localeCompare(a.start))
            .map((a) => (
              <article key={a.id}>
                <div>
                  <strong>{state.members.find((m) => m.id === a.memberId)?.name}</strong>
                  <p>
                    {a.start} 〜 {a.end}
                    <br />
                    {a.reason}
                  </p>
                </div>
                <button
                  onClick={() =>
                    update({
                      ...state,
                      absences: state.absences.filter((item) => item.id !== a.id),
                    })
                  }
                >
                  削除
                </button>
              </article>
            ))}
        </div>
      </section>
      <form
        className="panel settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const start = String(data.get("start"));
          const end = String(data.get("end"));
          const reason = String(data.get("reason")).trim();
          if (start > end || !reason) {
            setError("期間と理由を確認してください。");
            return;
          }
          update({
            ...state,
            absences: [
              ...state.absences,
              { id: crypto.randomUUID(), memberId: String(data.get("member")), start, end, reason },
            ],
          });
          setError("");
          notify("不在の予定を登録しました。");
        }}
      >
        <h2>期間を指定して登録</h2>
        <label>
          メンバー
          <select name="member">
            {state.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          開始日
          <input type="date" name="start" defaultValue={today} required />
        </label>
        <label>
          終了日
          <input type="date" name="end" defaultValue={today} required />
        </label>
        <label>
          理由
          <input name="reason" maxLength={200} required placeholder="出張・有休・在宅など" />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary" type="submit">
          ＋ 不在を登録
        </button>
      </form>
    </div>
  );
}
