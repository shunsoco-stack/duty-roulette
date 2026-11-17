import type { State } from "./types";
import { addDays, isDutyDay, japanNow, weekday, dateRange, isBusinessDay } from "./dates";
import { candidates } from "./fairness";
import { absenceOn } from "./absence";
import { draw } from "./draw";

export function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
export function createSeed(now: Date): State {
  const { date } = japanNow(now);
  const random = seededRandom(Number(date.replaceAll("-", "")));
  let start = addDays(date, -31);
  const names = [
    "森 ひかり",
    "青山 湊",
    "小野 こはる",
    "橘 颯太",
    "白石 紬",
    "藤野 悠",
    "三浦 あおい",
  ];
  const colors = ["#438b80", "#587fa4", "#b77d53", "#8880b2", "#b56e87", "#6c8d52", "#859097"];
  const state: State = {
    version: 1,
    team: "うみねこデザイン室（架空）",
    meeting: "09:30",
    businessDays: [1, 2, 3, 4, 5],
    holidays: [],
    annualHolidays: [{ start: "12-29", end: "01-03" }],
    period: 60,
    noOverlap: true,
    sound: false,
    members: names.map((name, i) => ({
      id: `m${i}`,
      name,
      color: colors[i],
      active: i !== 6,
      since: i === 5 ? addDays(date, -21) : start,
    })),
    duties: [
      {
        id: "morning",
        name: "朝会の司会",
        icon: "🎤",
        count: 1,
        weekdays: [1, 2, 3, 4, 5],
        memberIds: [],
        avoid: 2,
      },
      {
        id: "notes",
        name: "議事メモ",
        icon: "📝",
        count: 1,
        weekdays: [1, 2, 3, 4, 5],
        memberIds: [],
        avoid: 1,
      },
      {
        id: "garbage",
        name: "ゴミ出し",
        icon: "🗑️",
        count: 1,
        weekdays: [1, 4],
        memberIds: [],
        avoid: 1,
      },
      {
        id: "kitchen",
        name: "給湯室の片付け",
        icon: "🫖",
        count: 1,
        weekdays: [1, 2, 3, 4, 5],
        memberIds: [],
        avoid: 1,
      },
      {
        id: "shopping",
        name: "金曜の買い出し",
        icon: "🛒",
        count: 2,
        weekdays: [5],
        memberIds: [],
        avoid: 1,
      },
    ],
    absences: [],
    history: [],
    audit: [],
  };
  let holiday = addDays(date, -23);
  while ([0, 6].includes(weekday(holiday))) holiday = addDays(holiday, -1);
  state.holidays.push(holiday);
  // Keep a week of team activity before the newcomer even across the winter closure.
  while (dateRange(start, addDays(date, -22)).filter((d) => isBusinessDay(d, state)).length < 7)
    start = addDays(start, -1);
  state.members.forEach((member) => {
    if (member.id !== "m5") member.since = start;
  });
  let trip = addDays(date, -19);
  while (weekday(trip) !== 1) trip = addDays(trip, -1);
  state.absences.push({
    id: "business-trip",
    memberId: "m1",
    start: trip,
    end: addDays(trip, 4),
    reason: "地方オフィスでの導入支援のため出張",
  });
  [12, 5].forEach((offset, i) => {
    let day = addDays(date, -offset);
    while (!isBusinessDay(day, state)) day = addDays(day, -1);
    state.absences.push({
      id: `leave-${i}`,
      memberId: "m3",
      start: day,
      end: day,
      reason: i === 0 ? "定期検査のため通院" : "家族の用事で有休",
    });
  });
  state.absences.push({
    id: "planned",
    memberId: "m1",
    start: addDays(date, 7),
    end: addDays(date, 9),
    reason: "出張",
  });
  let recordIndex = 0;
  const afterMeeting = now.getTime() > new Date(`${date}T${state.meeting}:00+09:00`).getTime();
  for (let day = start; day <= date; day = addDays(day, 1)) {
    for (const duty of state.duties) {
      if (!isDutyDay(day, duty, state)) continue;
      if (day === date && (!afterMeeting || !["morning", "notes"].includes(duty.id))) continue;
      const options = candidates(state, duty, day);
      if (!options.enough) continue;
      // Demo workload follows time on the team: missed eligible days explain the gap.
      // This only shapes sample history; the actual roulette uses unadjusted counts.
      const businessDays = dateRange(start, day).filter((d) => isBusinessDay(d, state));
      const totals = state.members.map(
        (m) =>
          state.history.filter((h) => h.memberIds.includes(m.id)).length +
          0.9 * businessDays.filter((d) => d < m.since).length +
          0.5 *
            businessDays.filter((d) => d >= m.since && absenceOn(state.absences, m.id, d)).length,
      );
      const min = Math.min(
        ...options.rows
          .filter((r) => !r.reasons.length)
          .map((r) => totals[state.members.indexOf(r.member)]),
      );
      options.rows.forEach((r) => {
        r.weight /= (1 + totals[state.members.indexOf(r.member)] - min) ** 3;
      });
      const memberIds = draw(options.rows, duty.count, random);
      const minutes = 20 + Math.floor(random() * 26);
      const decidedTime = day === date ? "09:30" : `09:${minutes.toString().padStart(2, "0")}`;
      const other = options.rows.find((r) => !r.reasons.length && !memberIds.includes(r.member.id));
      const notes = [
        "来客の準備が重なったため",
        "午前は撮影の立ち会い",
        "歯医者の予約があるので交代",
        "納品前の確認を優先するため",
        "午後から在宅に切り替え",
        "クライアント先へ直行",
        "オンライン研修の開始と重なるため",
        "機材の受け取り対応が入ったため",
      ];
      const changed =
        day < date &&
        recordIndex >= 5 + state.audit.length * 5 &&
        state.audit.length < notes.length &&
        !!other;
      const kind = changed ? (state.audit.length % 2 ? "replacement" : "redraw") : "roulette";
      const reason = changed ? notes[state.audit.length] : "";
      state.history.push({
        id: `seed-${recordIndex}`,
        date: day,
        time: decidedTime,
        dutyId: duty.id,
        memberIds,
        method: kind,
        note: reason,
      });
      if (kind !== "roulette") {
        state.audit.push({
          id: `audit-${recordIndex}`,
          date: day,
          time: decidedTime,
          dutyId: duty.id,
          kind,
          from: other ? [other.member.id, ...memberIds.slice(1)] : memberIds,
          to: memberIds,
          reason,
        });
      }
      recordIndex++;
    }
  }
  return state;
}
