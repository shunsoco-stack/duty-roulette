"use client";
import { useState } from "react";
import { useApp } from "./app-provider";
import { PageHeading, Avatar } from "./ui";
import { addDays } from "@/lib/dates";
import { filterHistory, summarize, imbalance, methodLabel } from "@/lib/history";
import { download, historyCsv, countsCsv, csvFilename } from "@/lib/csv";
export function History() {
  const { state, today } = useApp();
  const [start, setStart] = useState(() => addDays(today, -59));
  const [end, setEnd] = useState(today);
  const [duty, setDuty] = useState("");
  const [member, setMember] = useState("");
  if (!state) return null;
  const records = filterHistory(state.history, start, end, duty, member);
  const rows = summarize(state, start, end, duty, member);
  const stats = imbalance(
    rows.filter((r) => r.member.active && r.eligibleDays > 0).map((r) => r.total),
  );
  const duties = state.duties.filter((d) => !duty || d.id === duty);
  const max = Math.max(1, ...rows.map((r) => r.total));
  const valid = !!start && !!end && start <= end;
  return (
    <>
      <PageHeading eyebrow="A FAIR SHARE" title="履歴と集計">
        これまでの出番を振り返って、次のひと回しをもっと公平に。
      </PageHeading>
      <section className="panel filters">
        <label>
          開始日
          <input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          終了日
          <input
            type="date"
            value={end}
            min={start}
            max={today}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <label>
          当番
          <select value={duty} onChange={(e) => setDuty(e.target.value)}>
            <option value="">すべての当番</option>
            {state.duties.map((d) => (
              <option value={d.id} key={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          メンバー
          <select value={member} onChange={(e) => setMember(e.target.value)}>
            <option value="">すべてのメンバー</option>
            {state.members.map((m) => (
              <option value={m.id} key={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </section>
      {!valid && (
        <p className="error" role="alert">
          正しい期間を指定してください。
        </p>
      )}
      <div className="stat-grid">
        <div>
          <span>期間内の担当</span>
          <strong>
            {rows.reduce((sum, r) => sum + r.total, 0)}
            <small>回</small>
          </strong>
        </div>
        <div>
          <span>最多と最少の差</span>
          <strong>
            {stats.difference}
            <small>回</small>
          </strong>
        </div>
        <div>
          <span>平均からのずれ（標準偏差）</span>
          <strong>
            {stats.deviation.toFixed(1)}
            <small>回</small>
          </strong>
        </div>
      </div>
      <section className="panel">
        <div className="section-heading">
          <h2>みんなの担当回数</h2>
          <button
            disabled={!valid}
            onClick={() =>
              download(
                countsCsv(state, start, end, duty, member),
                csvFilename("counts", start, end),
                "text/csv;charset=utf-8",
              )
            }
          >
            ↓ 回数表CSV
          </button>
        </div>
        <div className="bar-chart" role="img" aria-label="期間内のメンバー別合計担当回数">
          {rows.map((r) => (
            <div className="chart-row" key={r.member.id}>
              <span>{r.member.name}</span>
              <div>
                <i style={{ width: `${(r.total / max) * 100}%`, background: r.member.color }} />
              </div>
              <strong>{r.total}回</strong>
            </div>
          ))}
        </div>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="メンバーと当番の回数表"
        >
          <table>
            <thead>
              <tr>
                <th>メンバー</th>
                {duties.map((d) => (
                  <th key={d.id}>
                    {d.icon} {d.name}
                  </th>
                ))}
                <th>合計</th>
                <th>対象日数</th>
                <th>対象日あたり</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.member.id}>
                  <th>
                    {r.member.name}
                    {!r.member.active && <small>休止中</small>}
                  </th>
                  {duties.map((d) => (
                    <td key={d.id}>{r.counts[d.id]}</td>
                  ))}
                  <td>
                    <strong>{r.total}</strong>
                  </td>
                  <td>{r.eligibleDays}日</td>
                  <td>{r.eligibleDays ? `${r.rate.toFixed(2)}回` : "対象外"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">
          偏りの目安は、有効で対象日があるメンバーを比較します。対象日数は現在の有効設定・参加日・実施曜日・対象メンバー・不在・チーム休業日をもとに算出（直近回避や同日重複は含みません）。設定変更前の状態は復元しないため、参考値です。
        </p>
      </section>
      <section className="panel history-panel">
        <div className="section-heading">
          <h2>
            担当の履歴 <span className="muted">{records.length}件</span>
          </h2>
          <button
            disabled={!valid}
            onClick={() =>
              download(
                historyCsv(state, start, end, duty, member),
                csvFilename("history", start, end),
                "text/csv;charset=utf-8",
              )
            }
          >
            ↓ 履歴CSV
          </button>
        </div>
        {!records.length && <p className="empty">この期間の履歴はありません。</p>}
        <div className="history-list">
          {records.map((h) => {
            const d = state.duties.find((d) => d.id === h.dutyId)!;
            return (
              <article key={h.id}>
                <div className="history-date">
                  <strong>{h.date}</strong>
                  <small>{h.time}</small>
                </div>
                <div className="history-duty">
                  {d.icon} {d.name}
                  <small>
                    {methodLabel[h.method]}
                    {h.note && ` · ${h.note}`}
                  </small>
                </div>
                <div className="history-people">
                  {h.memberIds.map((id) => {
                    const m = state.members.find((m) => m.id === id)!;
                    return (
                      <span className="person" key={id}>
                        <Avatar member={m} />
                        {m.name}
                      </span>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <details className="panel audit-panel">
        <summary>回し直し・交代の記録（仮の結果も含む）</summary>
        {state.audit
          .filter(
            (a) =>
              a.date >= start &&
              a.date <= end &&
              (!duty || a.dutyId === duty) &&
              (!member || [...a.from, ...a.to].includes(member)),
          )
          .slice()
          .reverse()
          .map((a) => (
            <p key={a.id}>
              {a.date} {a.time} · {state.duties.find((d) => d.id === a.dutyId)?.name} ·{" "}
              {a.kind === "redraw" ? "回し直し" : "交代"}
              <br />
              {a.from.map((id) => state.members.find((m) => m.id === id)?.name).join("・")} →{" "}
              {a.to.map((id) => state.members.find((m) => m.id === id)?.name).join("・")}
              <br />
              <span className="muted">{a.reason}</span>
            </p>
          ))}
      </details>
    </>
  );
}
