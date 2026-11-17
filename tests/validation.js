const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture, NOW } = require("./helpers");
const { createShare, shareText, encodeShare, decodeShare } = require("../src/lib/share.ts");
const { encodeBackup, decodeBackup, backupFilename } = require("../src/lib/backup.ts");
const { restoreState } = require("../src/lib/storage.ts");
const { validateState } = require("../src/lib/validation.ts");
const { csv, historyCsv, countsCsv, csvFilename } = require("../src/lib/csv.ts");
const date = "2026-11-18";
for (const rule of [
  null,
  {},
  [{ start: "12-29", end: "01-32" }],
  [{ start: "2-01", end: "02-03" }],
]) {
  test(`不正な毎年の休業規則を拒否: ${JSON.stringify(rule)}`, () => {
    assert.equal(validateState({ ...fixture(), annualHolidays: rule }, NOW), false);
  });
}
test("毎年の休業規則がない既存の保存データも読み込める", () => {
  const s = fixture();
  delete s.annualHolidays;
  assert.equal(validateState(s, NOW), true);
});
test("共有テキストに日本語日付と未決定", () => {
  const text = shareText(createShare(fixture(), date));
  assert.ok(text.includes("【11月18日（水）の当番】"));
  assert.ok(text.includes("🎤 朝会の司会：未決定"));
});
test("共有データに履歴を含めない", () =>
  assert.deepEqual(Object.keys(createShare(fixture(), date)).sort(), [
    "date",
    "duties",
    "team",
    "version",
  ]));
test("共有リンクの日本語が往復できる", () => {
  const data = createShare(fixture(), date);
  assert.deepEqual(decodeShare(encodeShare(data)), data);
});
test("共有リンクの特殊文字が往復できる", () => {
  const data = createShare(fixture(), date);
  data.team = "% & + # うみねこ";
  assert.deepEqual(decodeShare(encodeShare(data)), data);
});
test("共有リンクは休業日に空の当番", () =>
  assert.equal(createShare(fixture(), "2026-11-21").duties.length, 0));
test("共有の壊れたJSONを拒否", () => assert.throws(() => decodeShare("bad")));
test("共有の不正エンコードを拒否", () => assert.throws(() => decodeShare("%QQ")));
test("共有の古いバージョンを拒否", () =>
  assert.throws(() => decodeShare(encodeShare({ ...createShare(fixture(), date), version: 0 }))));
test("共有の不正な日付を拒否", () =>
  assert.throws(() =>
    decodeShare(encodeShare({ ...createShare(fixture(), date), date: "2026-02-30" })),
  ));
test("共有の不正な当番を拒否", () =>
  assert.throws(() =>
    decodeShare(encodeShare({ ...createShare(fixture(), date), duties: [null] })),
  ));
test("共有の長すぎる入力を拒否", () => assert.throws(() => decodeShare("a".repeat(30001))));
test("バックアップが往復できる", () => {
  const s = fixture();
  assert.deepEqual(decodeBackup(encodeBackup(s), NOW), s);
});
test("バックアップの名前に日付", () =>
  assert.equal(backupFilename(date), "当番ルーレット_バックアップ_2026-11-18.json"));
test("バックアップの壊れたJSONを拒否", () => assert.throws(() => decodeBackup("{", NOW)));
test("保存データなしは通知なしでシード生成", () =>
  assert.equal(restoreState(null, NOW).recovered, false));
test("壊れた保存データは復旧通知あり", () => assert.equal(restoreState("{", NOW).recovered, true));
test("正常な保存データは保持", () => {
  const s = fixture();
  s.team = "変更済み";
  assert.equal(restoreState(JSON.stringify(s), NOW).state.team, "変更済み");
});
const invalidCases = [
  [
    "旧バージョン",
    (s) => {
      s.version = 0;
    },
  ],
  [
    "チームなし",
    (s) => {
      s.team = "";
    },
  ],
  [
    "時刻不正",
    (s) => {
      s.meeting = "25:00";
    },
  ],
  [
    "期間不正",
    (s) => {
      s.period = -1;
    },
  ],
  [
    "曜日不正",
    (s) => {
      s.businessDays = [8];
    },
  ],
  [
    "色不正",
    (s) => {
      s.members[0].color = "red";
    },
  ],
  [
    "重複メンバーID",
    (s) => {
      s.members[1].id = s.members[0].id;
    },
  ],
  [
    "当番人数不正",
    (s) => {
      s.duties[0].count = 3;
    },
  ],
  [
    "アイコン不正",
    (s) => {
      s.duties[0].icon = "abc";
    },
  ],
  [
    "対象参照不正",
    (s) => {
      s.duties[0].memberIds = ["missing"];
    },
  ],
  [
    "不在期間逆転",
    (s) => {
      s.absences = [{ id: "a", memberId: "m0", start: date, end: "2026-11-17", reason: "休み" }];
    },
  ],
  [
    "未来の決定",
    (s) => {
      s.history = [
        {
          id: "h",
          date: "2026-11-19",
          time: "09:30",
          dutyId: "morning",
          memberIds: ["m0"],
          method: "roulette",
          note: "",
        },
      ];
    },
  ],
  [
    "未来の監査",
    (s) => {
      s.audit = [
        {
          id: "a",
          date: "2026-11-19",
          time: "09:30",
          dutyId: "morning",
          from: ["m0"],
          to: ["m1"],
          kind: "redraw",
          reason: "理由",
        },
      ];
    },
  ],
];
for (const [label, mutate] of invalidCases)
  test(`保存・バックアップ検証: ${label}`, () => {
    const s = fixture();
    mutate(s);
    assert.equal(validateState(s, NOW), false);
    assert.throws(() => decodeBackup(JSON.stringify(s), NOW));
    assert.equal(restoreState(JSON.stringify(s), NOW).recovered, true);
  });
test("CSVにBOMがある", () => assert.equal(csv([["名前"]]).charCodeAt(0), 0xfeff));
test("CSVは引用符とカンマをエスケープ", () => assert.ok(csv([['a,"b']]).includes('"a,""b"')));
test("CSVの数式セルを無効化", () => assert.ok(csv([["=1+1"]]).includes("'=1+1")));
test("履歴CSVに日本語ヘッダー", () =>
  assert.ok(historyCsv(fixture(), date, date).includes("担当者")));
test("回数CSVに対象日あたり", () =>
  assert.ok(countsCsv(fixture(), date, date).includes("対象日あたり")));
test("履歴CSVファイル名に期間", () =>
  assert.equal(csvFilename("history", "2026-10-01", date), "当番履歴_2026-10-01_2026-11-18.csv"));
test("回数CSVファイル名に期間", () =>
  assert.equal(csvFilename("counts", "2026-10-01", date), "担当回数_2026-10-01_2026-11-18.csv"));
