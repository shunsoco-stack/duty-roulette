"use client";
import { useState } from "react";
import { useApp } from "./app-provider";
import { Avatar } from "./ui";
import type { Member } from "@/lib/types";
export function MemberSettings() {
  const { state, today, update, notify } = useApp();
  const [editing, setEditing] = useState<Member | null>(null);
  if (!state) return null;
  function move(index: number, delta: number) {
    if (!state) return;
    const members = [...state.members];
    [members[index], members[index + delta]] = [members[index + delta], members[index]];
    update({ ...state, members });
  }
  return (
    <div className="settings-columns">
      <section className="panel">
        <div className="section-heading">
          <h2>
            メンバー <span className="muted">{state.members.length}人</span>
          </h2>
        </div>
        <div className="settings-member-list">
          {state.members.map((m, i) => (
            <div key={m.id}>
              <div className="person">
                <Avatar member={m} />
                <span>
                  <strong>{m.name}</strong>
                  <small>
                    {m.active ? "有効" : "休止中"} · {m.since} 加入
                  </small>
                </span>
              </div>
              <div className="button-row">
                <button
                  aria-label={`${m.name}を上へ`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </button>
                <button
                  aria-label={`${m.name}を下へ`}
                  disabled={i === state.members.length - 1}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </button>
                <button onClick={() => setEditing(m)}>編集</button>
                <button
                  onClick={() =>
                    update({
                      ...state,
                      members: state.members.map((member) =>
                        member.id === m.id ? { ...member, active: !member.active } : member,
                      ),
                    })
                  }
                >
                  {m.active ? "休止" : "再開"}
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="hint">
          休止しても担当履歴は残ります。対象日数の集計には現在の有効／休止設定を使用します。
        </p>
      </section>
      <form
        key={editing?.id ?? "new"}
        className="panel settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const name = String(data.get("name")).trim();
          if (!name) return;
          const member: Member = {
            id: editing?.id ?? crypto.randomUUID(),
            name,
            color: String(data.get("color")),
            active: editing?.active ?? true,
            since: editing?.since ?? today,
          };
          update({
            ...state,
            members: editing
              ? state.members.map((m) => (m.id === editing.id ? member : m))
              : [...state.members, member],
          });
          setEditing(null);
          e.currentTarget.reset();
          notify(editing ? "メンバーを更新しました。" : "メンバーを追加しました。");
        }}
      >
        <h2>{editing ? "メンバーを編集" : "メンバーを追加"}</h2>
        <label>
          名前（架空）
          <input name="name" required maxLength={40} defaultValue={editing?.name ?? ""} />
        </label>
        <label>
          アバターの色
          <input type="color" name="color" defaultValue={editing?.color ?? "#438b80"} />
        </label>
        <button type="submit" className="primary" disabled={!editing && state.members.length >= 50}>
          {editing ? "変更を保存" : "＋ メンバーを追加"}
        </button>
        {editing && (
          <button type="button" onClick={() => setEditing(null)}>
            キャンセル
          </button>
        )}
      </form>
    </div>
  );
}
