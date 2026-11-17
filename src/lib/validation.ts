import { validDate, validTime } from "./dates";
import type { State } from "./types";

type ObjectValue = Record<string, unknown>;
const object = (v: unknown): v is ObjectValue => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max = 100): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const list = (v: unknown, max = 5000): v is unknown[] => Array.isArray(v) && v.length <= max;
const integer = (v: unknown, min: number, max: number) =>
  Number.isInteger(v) && Number(v) >= min && Number(v) <= max;
const unique = (v: unknown[]) => new Set(v).size === v.length;
const weekdays = (v: unknown) => list(v, 7) && unique(v) && v.every((n) => integer(n, 0, 6));
export function validEmoji(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 20 &&
    /\p{Extended_Pictographic}/u.test(value) &&
    [...new Intl.Segmenter("ja", { granularity: "grapheme" }).segment(value)].length === 1
  );
}
export function validateState(input: unknown, now: Date): input is State {
  if (
    !object(input) ||
    input.version !== 1 ||
    !text(input.team) ||
    !validTime(input.meeting) ||
    !weekdays(input.businessDays) ||
    !integer(input.period, 1, 365) ||
    typeof input.noOverlap !== "boolean" ||
    typeof input.sound !== "boolean"
  )
    return false;
  if (
    input.annualHolidays !== undefined &&
    (!list(input.annualHolidays, 30) ||
      !input.annualHolidays.every(
        (rule) =>
          object(rule) &&
          typeof rule.start === "string" &&
          typeof rule.end === "string" &&
          validDate(`2000-${rule.start}`) &&
          validDate(`2000-${rule.end}`),
      ))
  )
    return false;
  if (
    !list(input.holidays, 3660) ||
    !input.holidays.every(validDate) ||
    !list(input.members, 50) ||
    !input.members.length ||
    !list(input.duties, 30) ||
    !list(input.absences) ||
    !list(input.history, 20000) ||
    !list(input.audit, 20000)
  )
    return false;
  if (
    !input.members.every(
      (m) =>
        object(m) &&
        text(m.id) &&
        text(m.name, 40) &&
        typeof m.color === "string" &&
        /^#[\da-f]{6}$/i.test(m.color) &&
        typeof m.active === "boolean" &&
        validDate(m.since),
    )
  )
    return false;
  const memberIds = input.members.map((m) => (m as ObjectValue).id);
  if (!unique(memberIds)) return false;
  const ids = (v: unknown, max = 50) =>
    list(v, max) && unique(v) && v.every((id) => memberIds.includes(id));
  if (
    !input.duties.every(
      (d) =>
        object(d) &&
        text(d.id) &&
        text(d.name, 60) &&
        validEmoji(d.icon) &&
        integer(d.count, 1, 2) &&
        weekdays(d.weekdays) &&
        ids(d.memberIds) &&
        integer(d.avoid, 0, 10),
    )
  )
    return false;
  const dutyIds = input.duties.map((d) => (d as ObjectValue).id);
  if (!unique(dutyIds)) return false;
  if (
    !input.absences.every(
      (a) =>
        object(a) &&
        text(a.id) &&
        memberIds.includes(a.memberId) &&
        validDate(a.start) &&
        validDate(a.end) &&
        a.start <= a.end &&
        text(a.reason, 200),
    )
  )
    return false;
  const timestamp = (v: ObjectValue) =>
    validDate(v.date) &&
    validTime(v.time) &&
    new Date(`${v.date}T${v.time}:00+09:00`).getTime() <= now.getTime();
  if (
    !input.history.every(
      (h) =>
        object(h) &&
        text(h.id) &&
        dutyIds.includes(h.dutyId) &&
        timestamp(h) &&
        ids(h.memberIds, 2) &&
        (h.memberIds as unknown[]).length > 0 &&
        ["roulette", "redraw", "replacement"].includes(String(h.method)) &&
        typeof h.note === "string" &&
        h.note.length <= 2000,
    )
  )
    return false;
  const recordKeys = input.history.map(
    (h) => `${(h as ObjectValue).date}/${(h as ObjectValue).dutyId}`,
  );
  if (!unique(recordKeys)) return false;
  if (
    !input.audit.every(
      (a) =>
        object(a) &&
        text(a.id) &&
        timestamp(a) &&
        dutyIds.includes(a.dutyId) &&
        ["redraw", "replacement"].includes(String(a.kind)) &&
        ids(a.from, 2) &&
        ids(a.to, 2) &&
        (a.from as unknown[]).length > 0 &&
        (a.to as unknown[]).length > 0 &&
        text(a.reason, 200),
    )
  )
    return false;
  return [input.absences, input.history, input.audit].every((items) =>
    unique(items.map((item) => (item as ObjectValue).id)),
  );
}
