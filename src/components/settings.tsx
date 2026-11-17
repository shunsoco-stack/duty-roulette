"use client";
import { useState } from "react";
import { useApp } from "./app-provider";
import { PageHeading } from "./ui";
import { MemberSettings } from "./settings-members";
import { DutySettings } from "./settings-duties";
import { AbsenceSettings } from "./settings-absences";
import { BackupSettings } from "./settings-backup";
export function Settings() {
  const { state, update, notify } = useApp();
  const [tab, setTab] = useState("members");
  if (!state) return null;
  const tabs = [
    { id: "members", label: "メンバー" },
    { id: "duties", label: "当番" },
    { id: "absence", label: "期間の不在" },
    { id: "fairness", label: "公平性・チーム" },
    { id: "backup", label: "バックアップ" },
  ];
  return (
    <>
      <PageHeading eyebrow="MAKE IT YOUR TEAM" title="チームの設定">
        メンバーも当番も、チームに合わせて。変更はこのブラウザに保存されます。
      </PageHeading>
      <div className="settings-tabs" role="tablist" aria-label="設定カテゴリ">
        {tabs.map((t) => (
          <button
            role="tab"
            aria-selected={tab === t.id}
            aria-controls="settings-content"
            key={t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id="settings-content" role="tabpanel" aria-label={tabs.find((t) => t.id === tab)?.label}>
        {tab === "members" && <MemberSettings />}
        {tab === "duties" && <DutySettings />}
        {tab === "absence" && <AbsenceSettings />}
        {tab === "backup" && <BackupSettings />}
        {tab === "fairness" && (
          <form
            className="panel settings-form"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const team = String(data.get("team")).trim();
              if (!team) {
                notify("チーム名を入力してください。");
                return;
              }
              update({
                ...state,
                team,
                meeting: String(data.get("meeting")),
                period: Number(data.get("period")),
                noOverlap: data.has("noOverlap"),
                businessDays: data.getAll("days").map(Number),
              });
              notify("チームと公平性の設定を保存しました。");
            }}
          >
            <h2>チームと公平性</h2>
            <label>
              チーム名
              <input name="team" required maxLength={100} defaultValue={state.team} />
            </label>
            <label>
              朝会の時刻
              <input type="time" name="meeting" required defaultValue={state.meeting} />
            </label>
            <label>
              担当回数を参照する期間（日）
              <input
                type="number"
                name="period"
                required
                min={1}
                max={365}
                defaultValue={state.period}
              />
            </label>
            <fieldset>
              <legend>チームの営業日</legend>
              <div className="weekday-options">
                {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                  <label key={n}>
                    <input
                      type="checkbox"
                      name="days"
                      value={n}
                      defaultChecked={state.businessDays.includes(n)}
                    />
                    {"日月火水木金土"[n]}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="checkbox-label">
              <input type="checkbox" name="noOverlap" defaultChecked={state.noOverlap} />
              同じ日に同じ人へ当番を重ねない
            </label>
            <p className="hint">
              候補が人数に満たない場合のみ、同日の重複を許可します。不在・休止・対象外・直近担当は除外を維持します。
            </p>
            <p className="hint">チームの休業日：{state.holidays.join("、") || "なし"}</p>
            <p className="hint">
              毎年の休業日：
              {state.annualHolidays
                ?.map((r) => `${r.start.replace("-", "月")}日〜${r.end.replace("-", "月")}日`)
                .join("、") || "なし"}
              （年をまたいで自動適用）
            </p>
            <button className="primary" type="submit">
              設定を保存
            </button>
          </form>
        )}
      </div>
    </>
  );
}
