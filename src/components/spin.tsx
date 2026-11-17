"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./app-provider";
import { PageHeading, Avatar } from "./ui";
import { Wheel } from "./wheel";
import { candidates } from "@/lib/fairness";
import { confirmDraw, draw, recordRedraw, replaceAssignment, secureRandom } from "@/lib/draw";
import { dateLabel, isDutyDay, nextDay } from "@/lib/dates";
import { playSpinSound } from "@/lib/sound";
export function Spin({ dutyId }: { dutyId: string }) {
  const { today } = useApp();
  return <SpinSession key={`${today}-${dutyId}`} dutyId={dutyId} />;
}
function SpinSession({ dutyId }: { dutyId: string }) {
  const { state, today, update } = useApp();
  const [provisional, setProvisional] = useState<string[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [duration, setDuration] = useState(3000);
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => () => cleanup.current(), []);
  if (!state) return null;
  const duty = state.duties.find((d) => d.id === dutyId);
  if (!duty)
    return (
      <section className="empty">
        <h1>見つかりません</h1>
        <Link href="/">今日の当番へ戻る</Link>
      </section>
    );
  if (!isDutyDay(today, duty, state)) {
    const next = nextDay(today, state, duty);
    return (
      <section className="empty">
        <h1>今日はこの当番の日ではありません</h1>
        <p>
          {duty.icon} {duty.name}
        </p>
        <p>次の実施日：{next ? dateLabel(next) : "実施曜日を設定してください"}</p>
        <Link href="/">今日の当番へ戻る</Link>
      </section>
    );
  }
  const options = candidates(state, duty, today);
  const record = state.history.find((h) => h.date === today && h.dutyId === dutyId);
  const redraws = state.audit.filter((a) => a.date === today && a.kind === "redraw");
  const result = record?.memberIds ?? provisional;
  function spin() {
    if (!state || !duty || spinning) return;
    setError("");
    try {
      if (provisional.length && !reason.trim()) throw new Error("回し直す理由を入力してください");
      const winners = draw(options.rows, duty.count, secureRandom);
      if (provisional.length)
        update(recordRedraw(state, dutyId, provisional, winners, reason, new Date()));
      const ms = matchMedia("(prefers-reduced-motion: reduce)").matches ? 180 : 3000;
      setDuration(ms);
      const eligible = options.rows.filter((r) => !r.reasons.length);
      const index = eligible.findIndex((r) => r.member.id === winners[0]);
      const target = 360 - ((index + 0.5) / eligible.length) * 360;
      setRotation(Math.ceil(rotation / 360) * 360 + 1800 + target);
      setSpinning(true);
      const stopSound = state.sound ? playSpinSound(ms) : () => {};
      const timer = setTimeout(() => {
        setProvisional(winners);
        setSpinning(false);
        setReason("");
      }, ms);
      cleanup.current = () => {
        clearTimeout(timer);
        stopSound();
      };
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <Link className="back-link" href="/">
        ← 今日の当番
      </Link>
      <PageHeading eyebrow="LET'S SPIN" title={`${duty.icon} ${duty.name}`}>
        {dateLabel(today)} · {duty.count}人の当番 · 直近{duty.avoid}回の担当を回避
      </PageHeading>
      <div className="spin-layout">
        <section className="panel spin-panel">
          <span className={`status ${record ? "success" : "pending"}`}>
            {record ? "✓ 確定済み" : "確定するまでは仮の結果です"}
          </span>
          <Wheel rows={options.rows} rotation={rotation} duration={duration} />
          <p className="wheel-caption">
            扇の大きさは均等です。抽選は右の確率に基づきます。
            <br />
            {duty.count === 2 && "針は1人目を示し、2人目は残りの候補から抽選します。"}
          </p>
          <div className="spin-result" aria-live="polite">
            {spinning ? (
              <h2>だれの出番かな…</h2>
            ) : result.length ? (
              <>
                <p>{record ? "今日の担当、よろしくお願いします！" : "今日の担当候補はこちら！"}</p>
                {result.map((id) => {
                  const member = state.members.find((m) => m.id === id)!;
                  return (
                    <div className="winner" key={id}>
                      <Avatar member={member} />
                      <strong>{member.name}</strong>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <h2>今日の出番を、ひと回し。</h2>
                <p>候補と確率を確認したら、スタート。</p>
              </>
            )}
          </div>
          {!record && (
            <>
              <button
                className="primary large"
                disabled={spinning || !options.enough || !!provisional.length}
                onClick={spin}
              >
                {spinning ? "ルーレット回転中…" : "↻ ルーレットを回す"}
              </button>
              {provisional.length > 0 && !spinning && (
                <div className="result-actions">
                  <button
                    className="primary large"
                    onClick={() => {
                      try {
                        update((current) => confirmDraw(current, dutyId, provisional, new Date()));
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    この担当で確定する
                  </button>
                  <label>
                    回し直す理由
                    <input
                      maxLength={200}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="来客対応のため、など"
                    />
                  </label>
                  <button onClick={spin}>理由を記録して回し直す</button>
                </div>
              )}
            </>
          )}
          {record && (
            <form
              className="replacement-form"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  update((current) =>
                    replaceAssignment(
                      current,
                      record.id,
                      from || record.memberIds[0],
                      to,
                      reason,
                      new Date(),
                    ),
                  );
                  setReason("");
                  setTo("");
                  setFrom("");
                  setError("");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <h3>担当を交代する</h3>
              <label>
                現在の担当
                <select
                  value={from || record.memberIds[0]}
                  onChange={(e) => setFrom(e.target.value)}
                >
                  {record.memberIds.map((id) => (
                    <option key={id} value={id}>
                      {state.members.find((m) => m.id === id)?.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                交代先
                <select required value={to} onChange={(e) => setTo(e.target.value)}>
                  <option value="">選択してください</option>
                  {options.rows
                    .filter((r) => !r.reasons.length && !record.memberIds.includes(r.member.id))
                    .map((r) => (
                      <option key={r.member.id} value={r.member.id}>
                        {r.member.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                交代の理由
                <input
                  required
                  maxLength={200}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <button type="submit">交代を記録する</button>
            </form>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <p className="hint">
            今日の回し直し：{redraws.length}回（この当番{" "}
            {redraws.filter((a) => a.dutyId === dutyId).length}回）
          </p>
        </section>
        <section className="panel probability-panel">
          <div className="section-heading">
            <h2>当選確率と対象メンバー</h2>
            <span className="tag">過去{state.period}日</span>
          </div>
          <p className="hint">
            {duty.count === 2
              ? "2人のいずれかに選ばれる確率です（合計200%）。"
              : "担当回数が少ない人ほど当たりやすくなります。"}
          </p>
          {options.overlapRelaxed && (
            <p className="notice">
              人数が足りないため、今日は他の当番と重ねてよい設定で抽選します。
            </p>
          )}
          {!options.enough && (
            <p className="error">
              候補者が足りません。不在・対象・直近回避の設定を確認してください。
            </p>
          )}
          <ul className="probability-list">
            {options.rows.map((r) => (
              <li key={r.member.id} className={r.reasons.length ? "excluded" : ""}>
                <div className="person">
                  <Avatar member={r.member} />
                  <div>
                    <strong>{r.member.name}</strong>
                    <small>{r.reasons.join(" / ") || `この当番 ${r.count}回`}</small>
                  </div>
                </div>
                <strong className="percentage">
                  {r.probability.toFixed(1)}
                  <small>%</small>
                </strong>
                {!r.reasons.length && (
                  <div className="probability-bar">
                    <i style={{ width: `${r.probability}%`, background: r.member.color }} />
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="hint">
            直近回避は日数ではなく、同じ当番の実施回数です。不在・休止の除外は人数不足でも解除しません。
          </p>
          <Link href="/settings">公平性の設定を見る →</Link>
        </section>
      </div>
    </>
  );
}
