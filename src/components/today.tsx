"use client";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "./app-provider";
import { PageHeading, Avatar } from "./ui";
import { ShareActions } from "./share-actions";
import { createShare } from "@/lib/share";
import { dateLabel, isDutyDay, nextDay } from "@/lib/dates";
import { absenceOn, toggleAbsence } from "@/lib/absence";
export function Today() {
  const { state, today, update } = useApp();
  const [reason, setReason] = useState("お休み");
  if (!state) return null;
  const duties = state.duties.filter((d) => isDutyDay(today, d, state));
  const done = state.history.filter(
    (h) => h.date === today && duties.some((d) => d.id === h.dutyId),
  );
  const next = nextDay(today, state);
  return (
    <>
      <div className="heading-row">
        <PageHeading eyebrow="A LITTLE DUTY, A GOOD DAY" title="今日も、みんなで気持ちよく。">
          小さな当番は、ひと回しで公平に。
        </PageHeading>
        <div className="date-chip">
          <span>{today.slice(0, 4)}</span>
          <strong>{dateLabel(today)}</strong>
          <small>朝会 {state.meeting} / 日本時間</small>
        </div>
      </div>
      <section className="today-panel">
        <div className="section-heading">
          <h2>
            <span className="dot" />
            今日の当番
          </h2>
          <span className="tag">
            {done.length} / {duties.length} 決定
          </span>
        </div>
        {!duties.length ? (
          <div className="empty">
            <span>☕</span>
            <h3>今日は当番のない日です</h3>
            <p>次の営業日：{next ? dateLabel(next) : "営業日を設定してください"}</p>
          </div>
        ) : (
          <div className="duty-grid">
            {duties.map((d) => {
              const record = done.find((h) => h.dutyId === d.id);
              return (
                <article key={d.id} className={`duty-card ${record ? "decided" : ""}`}>
                  <div className="duty-top">
                    <span className="duty-icon">{d.icon}</span>
                    <span className={`status ${record ? "success" : "pending"}`}>
                      {record ? "✓ 決定済み" : "未決定"}
                    </span>
                  </div>
                  <h3>{d.name}</h3>
                  <p className="duty-meta">{d.count}人の当番</p>
                  <div className="assigned">
                    {record ? (
                      record.memberIds.map((id) => {
                        const m = state.members.find((m) => m.id === id)!;
                        return (
                          <div className="person" key={id}>
                            <Avatar member={m} />
                            <strong>{m.name}</strong>
                          </div>
                        );
                      })
                    ) : (
                      <p className="undecided">今日は、だれの出番？</p>
                    )}
                  </div>
                  <Link
                    className={`button ${record ? "subtle" : "primary"}`}
                    href={`/spin/${d.id}`}
                  >
                    {record ? "担当を確認・交代" : "↻ ルーレットを回す"}
                    <span>→</span>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
        <div className="panel-bottom">
          <span>↗ 今日の担当を、チームへお知らせ</span>
          <ShareActions data={createShare(state, today)} />
        </div>
      </section>
      <div className="home-bottom">
        <section className="panel">
          <div className="section-heading">
            <h2>今日のメンバー</h2>
            <span className="muted small">タップで不在を切り替え</span>
          </div>
          <label className="inline-field">
            不在の理由
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              placeholder="休み・出張・外出など"
            />
          </label>
          <div className="member-grid">
            {state.members.map((member) => {
              const absence = absenceOn(state.absences, member.id, today);
              return (
                <button
                  disabled={!member.active}
                  key={member.id}
                  className={`member-button ${absence ? "absent" : ""}`}
                  aria-pressed={!!absence}
                  onClick={() => update(toggleAbsence(state, member.id, today, reason))}
                >
                  <Avatar member={member} />
                  <span>
                    <strong>{member.name}</strong>
                    <small>
                      {!member.active
                        ? "休止中（育休など）"
                        : absence
                          ? `不在 · ${absence.reason}`
                          : "参加できます"}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="hint">
            不在は抽選から外すためのメモです。勤怠記録ではありません。確定済みの担当は交代画面から変更できます。
          </p>
        </section>
        <aside className="fairness-note">
          <span className="note-icon">⚖</span>
          <p className="eyebrow">FAIR, NOT JUST RANDOM</p>
          <h2>
            「いつも同じ人」を
            <br />
            少しずつ、なくそう。
          </h2>
          <p>
            過去{state.period}
            日間の担当回数をもとに、少ない人ほど当たりやすく。不在の人と直近の担当者には、ひと休み。
          </p>
          <Link href="/history">
            みんなの担当回数を見る <span>→</span>
          </Link>
          <div className="mini-bars" aria-hidden="true">
            {[45, 68, 51, 78, 56, 62].map((height, i) => (
              <i key={i} style={{ height }} />
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
