/** Pure sorting logic: no DOM and no network, so it can be unit-tested in Node. */

export const CATEGORIES = [
  ["deadline", "Deadlines"], ["action", "Needs action"], ["event", "Events"], ["fyi", "Good to know"], ["noise", "Noise"],
];
export const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const MS_PER_DAY = 864e5;
const MONTH_NAMES = "january|february|march|april|may|june|july|august|september|october|november|december";
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Compiled once. Whole-word matching stops "month" being read as Monday or "3 marks" as March.
const RE = {
  noise: /\b(happy birthday|hbd|congrats|congratulations|good (morning|night|evening)|lol|haha+|unsubscribe|newsletter|giveaway|discount|\d+% off)\b/i,
  emojiOnly: /^[\p{Extended_Pictographic}\s\u200d\ufe0f]+$/u,
  deadline: /\b(deadline|due|last date|submit|submission|closes?|closing|register|registration)\b/i,
  action: /\b(please|kindly|must|required|mandatory|fill|bring|reply|confirm|carry|report to|upload)\b/i,
  event: /\b(seminar|workshop|hackathon|meeting|session|exam|mst|lecture|class|venue|fest|orientation|interview)\b/i,
  dayMonth: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(${MONTH_NAMES}|${MONTHS.join("|")}|sept)\\b`),
  numeric: /\b(?!24\/7\b)(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/, // day-first, as used in India
  weekday: new RegExp(`\\b(${WEEKDAYS.join("|")})\\b`),
  today: /\b(today|tonight)\b/,
  tomorrow: /\btomorrow\b/,
};

export const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const daysUntil = (date, now = new Date()) => Math.round((date - startOfDay(now)) / MS_PER_DAY);

export function dueLabel(days) {
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

/** First date mentioned in `text`, or null. Relative words ("tomorrow") resolve against `sent`. */
export function extractDate(text, sent = new Date()) {
  const base = startOfDay(sent);
  const t = text.toLowerCase();
  // A date without a year that is far in the past must mean next year.
  const roll = d => ((base - d) / MS_PER_DAY > 180 ? new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()) : d);
  let m;
  if ((m = t.match(RE.dayMonth))) return roll(new Date(base.getFullYear(), MONTHS.indexOf(m[2].slice(0, 3)), +m[1]));
  if ((m = t.match(RE.numeric)) && +m[2] >= 1 && +m[2] <= 12 && +m[1] <= 31) {
    const year = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : base.getFullYear();
    const date = new Date(year, +m[2] - 1, +m[1]);
    return m[3] ? date : roll(date);
  }
  if (RE.today.test(t)) return base;
  if (RE.tomorrow.test(t)) return addDays(base, 1);
  if ((m = t.match(RE.weekday))) return addDays(base, (WEEKDAYS.indexOf(m[1]) - base.getDay() + 7) % 7);
  return null;
}

/** Returns { category, date, reason }. The reason is shown to the user so sorting is explainable. */
export function classify(text, sent = new Date()) {
  const date = extractDate(text, sent);
  const words = text.split(/\s+/).filter(Boolean).length;
  const hasDeadlineWord = RE.deadline.test(text);
  const strong = hasDeadlineWord || RE.action.test(text);

  if (RE.emojiOnly.test(text) || (!strong && !date && (RE.noise.test(text) || words < 4)))
    return { category: "noise", date: null, reason: "Greeting, promo or too short to need you" };
  if (hasDeadlineWord && date) return { category: "deadline", date, reason: "Deadline wording and a date" };
  if (strong) return { category: "action", date, reason: "Asks you to do something" };
  if (RE.event.test(text) || date) return { category: "event", date, reason: "Event wording or a date" };
  return { category: "fyi", date: null, reason: "No action or date found" };
}

/** Adds category, reason and days-left to each mail. Input order is preserved. */
export function triage(mails, now = new Date()) {
  return mails.map(mail => {
    const { category, date, reason } = classify(`${mail.subject}\n${mail.body}`, mail.sent);
    return { ...mail, category, reason, days: date ? daysUntil(date, now) : null };
  });
}

export function countByCategory(mails) {
  const counts = { deadline: 0, action: 0, event: 0, fyi: 0, noise: 0 };
  for (const m of mails) counts[m.category]++;
  return counts;
}

/** Buckets dated items into the "due and upcoming" groups. Past events are dropped. */
export function summarise(mails) {
  const groups = { overdue: [], today: [], week: [], later: [], undated: [] };
  for (const m of mails) {
    if (!["deadline", "action", "event"].includes(m.category)) continue;
    if (m.days === null) { if (m.category === "action") groups.undated.push(m); }
    else if (m.days < 0) { if (m.category !== "event") groups.overdue.push(m); }
    else if (m.days === 0) groups.today.push(m);
    else if (m.days <= 7) groups.week.push(m);
    else groups.later.push(m);
  }
  for (const key of ["overdue", "today", "week", "later"]) groups[key].sort((a, b) => a.days - b.days);
  return groups;
}
