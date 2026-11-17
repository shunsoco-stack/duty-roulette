const test = require("node:test");
const assert = require("node:assert/strict");
const { NOW, fixture } = require("./helpers");
const dates = require("../src/lib/dates.ts");
const { absenceOn, toggleAbsence } = require("../src/lib/absence.ts");
const { candidates } = require("../src/lib/fairness.ts");
const { draw, confirmDraw, recordRedraw, replaceAssignment } = require("../src/lib/draw.ts");
const { filterHistory, summarize, imbalance } = require("../src/lib/history.ts");
const { seededRandom } = require("../src/lib/seed.ts");
const date = "2026-11-18";
test("日本時間の0時で日付が切り替わる", () =>
  assert.deepEqual(dates.japanNow(new Date("2026-11-17T15:00:00Z")), { date, time: "00:00" }));
test("日本時間の23:59を維持する", () =>
  assert.equal(dates.japanNow(new Date("2026-11-18T14:59:00Z")).time, "23:59"));
test("うるう年の日付を認識する", () => assert.equal(dates.validDate("2028-02-29"), true));
test("存在しない日付を拒否する", () => assert.equal(dates.validDate("2026-02-29"), false));
test("日付以外の入力を拒否する", () => assert.equal(dates.validDate(null), false));
test("24:00を拒否する", () => assert.equal(dates.validTime("24:00"), false));
test("年末の翌日は翌年になる", () => assert.equal(dates.addDays("2026-12-31", 1), "2027-01-01"));
test("月初の前日は前月になる", () => assert.equal(dates.addDays("2026-03-01", -1), "2026-02-28"));
test("日本語の日付と曜日", () => assert.equal(dates.dateLabel(date), "11月18日（水）"));
test("土曜日は既定で営業日ではない", () =>
  assert.equal(dates.isBusinessDay("2026-11-21", fixture()), false));
test("営業日の変更を反映する", () => {
  const s = fixture();
  s.businessDays = [6];
  assert.equal(dates.isBusinessDay("2026-11-21", s), true);
});
test("チーム休業日は当番がない", () => {
  const s = fixture();
  s.holidays = [date];
  assert.equal(dates.isDutyDay(date, s.duties[0], s), false);
});
test("月木の当番は水曜日に実施しない", () => {
  const s = fixture();
  assert.equal(dates.isDutyDay(date, s.duties[2], s), false);
});
test("次の実施日は木曜日", () => {
  const s = fixture();
  assert.equal(dates.nextDay(date, s, s.duties[2]), "2026-11-19");
});
test("金曜から次の営業日は月曜", () =>
  assert.equal(dates.nextDay("2026-11-20", fixture()), "2026-11-23"));
test("曜日がなければ次の日はない", () => {
  const s = fixture();
  s.businessDays = [];
  assert.equal(dates.nextDay(date, s), null);
});
test("期間は両端を含む", () => assert.equal(dates.dateRange(date, "2026-11-20").length, 3));
test("逆転した期間は空", () => assert.deepEqual(dates.dateRange("2026-11-20", date), []));
test("不在を当日に追加できる", () => {
  const s = toggleAbsence(fixture(), "m0", date, "在宅");
  assert.equal(absenceOn(s.absences, "m0", date).reason, "在宅");
});
test("当日の不在を解除できる", () => {
  const s = toggleAbsence(toggleAbsence(fixture(), "m0", date, "休み"), "m0", date, "");
  assert.equal(s.absences.length, 0);
});
test("期間中の1日だけ解除し前後を保持", () => {
  const s = fixture();
  s.absences = [
    { id: "a", memberId: "m0", start: "2026-11-17", end: "2026-11-19", reason: "出張" },
  ];
  const next = toggleAbsence(s, "m0", date, "");
  assert.equal(next.absences.length, 2);
  assert.ok(absenceOn(next.absences, "m0", "2026-11-19"));
  assert.equal(absenceOn(next.absences, "m0", date), undefined);
});
test("期間の開始日を含む", () =>
  assert.ok(absenceOn([{ memberId: "m0", start: date, end: "2026-11-20" }], "m0", date)));
test("別のメンバーを不在扱いにしない", () =>
  assert.equal(absenceOn([{ memberId: "m0", start: date, end: date }], "m1", date), undefined));
test("休止中のメンバーは除外", () => {
  const s = fixture();
  assert.ok(candidates(s, s.duties[0], date).rows[6].reasons.includes("休止"));
});
test("不在の理由を表示", () => {
  const s = toggleAbsence(fixture(), "m0", date, "出張");
  assert.ok(candidates(s, s.duties[0], date).rows[0].reasons.includes("不在：出張"));
});
test("対象の選択を反映", () => {
  const s = fixture();
  s.duties[0].memberIds = ["m1"];
  assert.ok(candidates(s, s.duties[0], date).rows[0].reasons.includes("対象外"));
});
test("参加前のメンバーを除外", () => {
  const s = fixture();
  s.members[0].since = "2026-11-19";
  assert.ok(candidates(s, s.duties[0], date).rows[0].reasons.includes("参加前"));
});
test("直近担当を回数で除外", () => {
  const s = fixture();
  s.duties[0].avoid = 1;
  s.history = [{ date: "2026-10-01", dutyId: "morning", memberIds: ["m0"] }];
  assert.ok(candidates(s, s.duties[0], date).rows[0].reasons.includes("直近担当"));
});
test("同日に別の当番があれば除外", () => {
  const s = fixture();
  s.history = [{ date, dutyId: "notes", memberIds: ["m0"] }];
  assert.ok(candidates(s, s.duties[0], date).rows[0].reasons.includes("今日ほかの当番あり"));
});
test("同日重複回避をオフにできる", () => {
  const s = fixture();
  s.noOverlap = false;
  s.history = [{ date, dutyId: "notes", memberIds: ["m0"] }];
  assert.equal(candidates(s, s.duties[0], date).rows[0].reasons.length, 0);
});
test("人数不足なら同日重複のみ緩和", () => {
  const s = fixture();
  s.history = [{ date, dutyId: "notes", memberIds: s.members.slice(0, 6).map((m) => m.id) }];
  const c = candidates(s, s.duties[0], date);
  assert.equal(c.overlapRelaxed, true);
  assert.equal(c.enough, true);
  assert.ok(c.rows[6].reasons.includes("休止"));
});
test("不在は人数不足でも除外", () => {
  let s = fixture();
  s.members.forEach((m) => {
    m.active = m.id === "m0";
  });
  s = toggleAbsence(s, "m0", date, "不在");
  assert.equal(candidates(s, s.duties[0], date).enough, false);
});
test("担当回数が同じなら等確率", () => {
  const s = fixture();
  const c = candidates(s, s.duties[0], date);
  assert.ok(Math.abs(c.rows[0].probability - 100 / 6) < 1e-9);
});
test("少ない人の重みが大きい", () => {
  const s = fixture();
  s.history = [{ date: "2026-11-17", dutyId: "morning", memberIds: ["m0"] }];
  const c = candidates(s, s.duties[0], date);
  assert.equal(c.rows[0].weight, 0.5);
  assert.equal(c.rows[1].weight, 1);
});
test("期間より古い履歴を重みに含めない", () => {
  const s = fixture();
  s.period = 2;
  s.history = [{ date: "2026-11-15", dutyId: "morning", memberIds: ["m0"] }];
  assert.equal(candidates(s, s.duties[0], date).rows[0].count, 0);
});
test("1人当番の確率の合計は100", () => {
  const s = fixture();
  assert.ok(
    Math.abs(candidates(s, s.duties[0], date).rows.reduce((a, r) => a + r.probability, 0) - 100) <
      1e-9,
  );
});
test("2人当番の包含確率の合計は200", () => {
  const s = fixture();
  assert.ok(
    Math.abs(candidates(s, s.duties[4], date).rows.reduce((a, r) => a + r.probability, 0) - 200) <
      1e-9,
  );
});
test("固定乱数0で先頭を選ぶ", () => {
  const s = fixture();
  assert.deepEqual(
    draw(candidates(s, s.duties[0], date).rows, 1, () => 0),
    ["m0"],
  );
});
test("固定乱数の上限付近で末尾を選ぶ", () => {
  const s = fixture();
  assert.deepEqual(
    draw(candidates(s, s.duties[0], date).rows, 1, () => 0.9999),
    ["m5"],
  );
});
test("2人当番は重複なし", () => {
  const s = fixture();
  assert.deepEqual(
    draw(candidates(s, s.duties[4], date).rows, 2, () => 0),
    ["m0", "m1"],
  );
});
test("不正な乱数を拒否", () => {
  const s = fixture();
  assert.throws(() => draw(candidates(s, s.duties[0], date).rows, 1, () => 1));
});
test("候補者なしの抽選を拒否", () => assert.throws(() => draw([], 1, () => 0)));
test("3000回で少ない担当者が多く当選する", () => {
  const s = fixture();
  s.history = [
    { date: "2026-11-17", dutyId: "morning", memberIds: ["m0"] },
    { date: "2026-11-16", dutyId: "morning", memberIds: ["m0"] },
  ];
  const rows = candidates(s, s.duties[0], date).rows;
  const random = seededRandom(15);
  const counts = {};
  for (let i = 0; i < 3000; i++) {
    const id = draw(rows, 1, random)[0];
    counts[id] = (counts[id] ?? 0) + 1;
  }
  assert.ok(counts.m1 > counts.m0 * 2);
});
test("確定するまで履歴に追加されない", () => {
  const s = fixture();
  draw(candidates(s, s.duties[0], date).rows, 1, () => 0);
  assert.equal(s.history.length, 0);
});
test("確定結果を記録", () => {
  const s = confirmDraw(fixture(), "morning", ["m0"], NOW);
  assert.equal(s.history[0].method, "roulette");
  assert.equal(s.history[0].time, "10:15");
});
test("二重確定を拒否", () => {
  const s = confirmDraw(fixture(), "morning", ["m0"], NOW);
  assert.throws(() => confirmDraw(s, "morning", ["m1"], NOW));
});
test("実施日以外の確定を拒否", () =>
  assert.throws(() => confirmDraw(fixture(), "garbage", ["m0"], NOW)));
test("回し直しには理由が必須", () =>
  assert.throws(() => recordRedraw(fixture(), "morning", ["m0"], ["m1"], " ", NOW)));
test("回し直しの前後と理由を保存", () => {
  const s = recordRedraw(fixture(), "morning", ["m0"], ["m1"], "来客対応", NOW);
  assert.deepEqual(s.audit[0].from, ["m0"]);
  assert.deepEqual(s.audit[0].to, ["m1"]);
  assert.equal(s.audit[0].reason, "来客対応");
});
test("回し直した後の確定方法", () => {
  const s = confirmDraw(
    recordRedraw(fixture(), "morning", ["m0"], ["m1"], "来客対応", NOW),
    "morning",
    ["m1"],
    NOW,
  );
  assert.equal(s.history[0].method, "redraw");
});
test("交代先と理由を記録", () => {
  const s = confirmDraw(fixture(), "morning", ["m0"], NOW);
  const next = replaceAssignment(s, s.history[0].id, "m0", "m1", "外出", NOW);
  assert.deepEqual(next.history[0].memberIds, ["m1"]);
  assert.equal(next.audit[0].reason, "外出");
  assert.equal(next.history[0].method, "replacement");
});
test("休止中の人への交代を拒否", () => {
  const s = confirmDraw(fixture(), "morning", ["m0"], NOW);
  assert.throws(() => replaceAssignment(s, s.history[0].id, "m0", "m6", "外出", NOW));
});
test("期間・当番・メンバーで履歴を絞る", () => {
  const s = confirmDraw(fixture(), "morning", ["m0"], NOW);
  assert.equal(filterHistory(s.history, date, date, "morning", "m0").length, 1);
  assert.equal(filterHistory(s.history, date, date, "morning", "m1").length, 0);
});
test("メンバー当番別の回数", () => {
  const s = confirmDraw(fixture(), "morning", ["m0"], NOW);
  assert.equal(summarize(s, date, date)[0].counts.morning, 1);
});
test("不在日を対象日数から除く", () => {
  const s = toggleAbsence(fixture(), "m0", date, "休み");
  assert.equal(summarize(s, date, date)[0].eligibleDays, 0);
});
test("休止中は対象日数0", () => assert.equal(summarize(fixture(), date, date)[6].eligibleDays, 0));
test("対象日あたりの回数", () => {
  const s = confirmDraw(fixture(), "morning", ["m0"], NOW);
  assert.equal(summarize(s, "2026-11-17", date)[0].rate, 0.5);
});
test("偏りは差と標準偏差で計算", () => {
  const s = imbalance([1, 3]);
  assert.equal(s.difference, 2);
  assert.equal(s.average, 2);
  assert.equal(s.deviation, 1);
});
test("空の集計はゼロ", () =>
  assert.deepEqual(imbalance([]), { difference: 0, deviation: 0, average: 0 }));
