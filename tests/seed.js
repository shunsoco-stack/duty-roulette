const test = require("node:test");
const assert = require("node:assert/strict");
const { createSeed } = require("../src/lib/seed.ts");
const {
  japanNow,
  isDutyDay,
  addDays,
  dateRange,
  isBusinessDay,
  nextDay,
  weekday,
} = require("../src/lib/dates.ts");
const { summarize } = require("../src/lib/history.ts");
const { candidates } = require("../src/lib/fairness.ts");
const { validateState } = require("../src/lib/validation.ts");
const cases = [
  "2026-11-18T00:15:00+09:00",
  "2026-11-18T04:20:00+09:00",
  "2026-11-18T08:45:00+09:00",
  "2026-11-18T09:30:00+09:00",
  "2026-11-18T09:30:01+09:00",
  "2026-11-18T10:00:00+09:00",
  "2026-11-18T23:59:00+09:00",
  "2026-11-21T12:00:00+09:00",
  "2026-11-22T12:00:00+09:00",
  "2026-11-23T00:01:00+09:00",
  "2026-12-01T00:00:00+09:00",
  "2026-12-31T10:00:00+09:00",
  "2027-01-01T00:01:00+09:00",
  "2026-12-30T10:00:00+09:00",
  "2027-01-01T10:00:00+09:00",
  "2027-01-04T10:00:00+09:00",
  "2028-01-04T10:00:00+09:00",
  "2027-01-15T10:00:00+09:00",
  "2026-01-24T10:00:00+09:00",
  "2026-01-26T10:00:00+09:00",
  "2026-01-29T10:00:00+09:00",
];
for (const timestamp of cases) {
  const now = new Date(timestamp);
  test(`シード日時・朝会境界・曜日: ${timestamp}`, () => {
    const s = createSeed(now);
    const local = japanNow(now);
    assert.equal(validateState(s, now), true);
    for (const record of [...s.history, ...s.audit])
      assert.ok(new Date(`${record.date}T${record.time}:00+09:00`) < now);
    const today = s.history.filter((h) => h.date === local.date);
    if (
      now <= new Date(`${local.date}T${s.meeting}:00+09:00`) ||
      !s.duties.some((d) => isDutyDay(local.date, d, s))
    )
      assert.equal(today.length, 0);
    else assert.equal(today.length, 2);
    assert.ok(s.absences.some((a) => a.start > local.date));
  });
  test(`シード自然さ・直近回避・偏り: ${timestamp}`, () => {
    const s = createSeed(now);
    assert.ok(new Set(s.history.map((h) => h.time)).size > 5);
    const totals = s.members
      .filter((m) => m.active)
      .map((m) => s.history.filter((h) => h.memberIds.includes(m.id)).length);
    const difference = Math.max(...totals) - Math.min(...totals);
    assert.ok(difference >= 3 && difference <= 8, `担当回数差 ${difference}: ${totals}`);
    for (const duty of s.duties) {
      const records = s.history.filter((h) => h.dutyId === duty.id);
      for (let i = 0; i < records.length; i++) {
        const recent = records.slice(Math.max(0, i - duty.avoid), i).flatMap((h) => h.memberIds);
        assert.ok(records[i].memberIds.every((id) => !recent.includes(id)));
        const before = { ...s, history: s.history.filter((h) => h.date < records[i].date) };
        const eligible = candidates(before, duty, records[i].date)
          .rows.filter((r) => !r.reasons.length)
          .map((r) => r.member.id);
        assert.ok(records[i].memberIds.every((id) => eligible.includes(id)));
      }
      const sequence = records.map((h) => h.memberIds.join(","));
      for (let period = 1; period <= Math.min(6, Math.floor(sequence.length / 3)); period++)
        assert.ok(
          !sequence.every((value, i) => i < period || value === sequence[i - period]),
          `${duty.id} 周期${period}`,
        );
    }
  });
  test(`途中加入の担当率と集計対象: ${timestamp}`, () => {
    const s = createSeed(now);
    const { date } = japanNow(now);
    const rows = summarize(s, addDays(date, -59), date).filter((r) => r.member.active);
    const newcomer = rows.find((r) => r.member.id === "m5");
    assert.equal(newcomer.member.since, addDays(date, -21));
    assert.equal(
      newcomer.total,
      Math.min(...rows.map((r) => r.total)),
      JSON.stringify(rows.map((r) => r.total)),
    );
    const average = rows.filter((r) => r !== newcomer).reduce((sum, r) => sum + r.rate, 0) / 5;
    assert.ok(newcomer.rate >= average * 0.65 && newcomer.rate <= average * 1.35);
    for (const h of s.history)
      for (const id of h.memberIds) assert.ok(h.date >= s.members.find((m) => m.id === id).since);
    for (const d of s.duties) {
      const row = candidates(s, d, addDays(newcomer.member.since, -1)).rows.find(
        (r) => r.member.id === "m5",
      );
      assert.ok(row.reasons.includes("参加前"));
      assert.equal(row.probability, 0);
    }
    const before = summarize(s, addDays(date, -59), addDays(newcomer.member.since, -1)).find(
      (r) => r.member.id === "m5",
    );
    assert.equal(before.total, 0);
    assert.equal(before.eligibleDays, 0);
  });
  test(`メモと不在の自然さ: ${timestamp}`, () => {
    const s = createSeed(now);
    assert.ok(s.audit.length >= 8 && s.audit.length <= 10);
    assert.ok(new Set(s.audit.map((a) => a.reason)).size >= 8);
    for (const a of s.audit) {
      assert.ok(s.audit.filter((b) => b.reason === a.reason).length < 3);
      assert.notDeepEqual(a.from, a.to);
      assert.ok(
        s.history.some((h) => h.date === a.date && h.dutyId === a.dutyId && h.note === a.reason),
      );
    }
    const days = s.members
      .filter((m) => m.active)
      .map(
        (m) =>
          new Set(
            s.absences
              .filter((a) => a.memberId === m.id && a.end < japanNow(now).date)
              .flatMap((a) => dateRange(a.start, a.end)),
          ).size,
      );
    assert.equal(days[1], 5);
    assert.equal(days[3], 2);
    assert.ok(new Set(days).size >= 3);
  });
  test(`当番別のばらつきと新メンバーの抽選確率: ${timestamp}`, () => {
    const s = createSeed(now);
    const date = japanNow(now).date;
    const rows = summarize(s, addDays(date, -59), date).filter((r) => r.member.active);
    assert.ok(
      s.duties.some((d) => {
        const counts = rows.map((r) => r.counts[d.id]);
        return Math.max(...counts) - Math.min(...counts) >= 2;
      }),
    );
    // Inspect the next five business days: recent avoidance may exclude anyone today.
    let higher = false;
    let day = date;
    for (let i = 0; i < 5; i++, day = nextDay(day, s)) {
      for (const duty of s.duties.filter((d) => isDutyDay(day, d, s))) {
        const options = candidates(s, duty, day);
        const eligible = options.rows.filter((r) => !r.reasons.length);
        const newcomer = eligible.find((r) => r.member.id === "m5");
        if (
          options.enough &&
          newcomer &&
          newcomer.probability > (duty.count * 100) / eligible.length
        )
          higher = true;
      }
    }
    assert.ok(higher);
  });
}
for (const year of [2026, 2027, 2028, 2029, 2030]) {
  test(`毎年の年末年始と次の営業日: ${year}`, () => {
    const s = createSeed(new Date(`${year}-12-30T10:00:00+09:00`));
    for (const day of dateRange(`${year}-12-29`, `${year + 1}-01-03`)) {
      assert.equal(isBusinessDay(day, s), false);
      assert.ok(s.duties.every((d) => !isDutyDay(day, d, s)));
    }
    let next = `${year + 1}-01-04`;
    assert.equal(isBusinessDay(next, s), ![0, 6].includes(weekday(next)));
    while ([0, 6].includes(weekday(next))) next = addDays(next, 1);
    assert.equal(nextDay(`${year}-12-30`, s), next);
  });
}
test("同じ日時から同じシードを生成する純粋関数", () =>
  assert.deepEqual(createSeed(new Date(cases[0])), createSeed(new Date(cases[0]))));
