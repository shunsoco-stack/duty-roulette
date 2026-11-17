export type Member = { id: string; name: string; color: string; active: boolean; since: string };
export type Duty = {
  id: string;
  name: string;
  icon: string;
  count: number;
  weekdays: number[];
  memberIds: string[];
  avoid: number;
};
export type Absence = { id: string; memberId: string; start: string; end: string; reason: string };
export type Assignment = {
  id: string;
  date: string;
  time: string;
  dutyId: string;
  memberIds: string[];
  method: "roulette" | "redraw" | "replacement";
  note: string;
};
export type Audit = {
  id: string;
  date: string;
  time: string;
  dutyId: string;
  kind: "redraw" | "replacement";
  from: string[];
  to: string[];
  reason: string;
};
export type State = {
  version: 1;
  team: string;
  meeting: string;
  businessDays: number[];
  holidays: string[];
  annualHolidays?: { start: string; end: string }[];
  period: number;
  noOverlap: boolean;
  sound: boolean;
  members: Member[];
  duties: Duty[];
  absences: Absence[];
  history: Assignment[];
  audit: Audit[];
};
export type Candidate = {
  member: Member;
  count: number;
  weight: number;
  probability: number;
  reasons: string[];
};
export type ShareData = {
  version: 1;
  date: string;
  team: string;
  duties: { name: string; icon: string; names: string[] }[];
};
