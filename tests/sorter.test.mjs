import test from "node:test";
import assert from "node:assert/strict";
import { classify, extractDate, daysUntil, dueLabel, triage, summarise, countByCategory } from "../sorter.js";

const SENT = new Date(2026, 10, 10); // Tuesday 10 Nov 2026
const ymd = d => d && `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

test("classify assigns the right category", () => {
  const cases = [
    ["Happy birthday Aman!! 🎂🎉", "noise"],
    ["50% off on pizzas. Unsubscribe anytime.", "noise"],
    ["Kindly submit the lab file by 14 Nov", "deadline"],
    ["Please fill the form", "action"],
    ["Workshop this Saturday at 5 pm", "event"],
    ["The library has new journals on the second floor", "fyi"],
  ];
  for (const [text, want] of cases) assert.equal(classify(text, SENT).category, want, text);
});

test("extractDate reads day-first dates and relative words", () => {
  assert.equal(ymd(extractDate("by 14 Nov", SENT)), "2026-11-14");
  assert.equal(ymd(extractDate("on 14/11", SENT)), "2026-11-14");
  assert.equal(ymd(extractDate("closes tomorrow", SENT)), "2026-11-11");
  assert.equal(ymd(extractDate("see you friday", SENT)), "2026-11-13");
});

test("extractDate ignores look-alike words", () => {
  for (const text of ["this month", "thus we begin", "3 marks question", "24/7 helpline", "friends and family"])
    assert.equal(extractDate(text, SENT), null, text);
});

test("a past date without a year rolls to next year", () => {
  assert.equal(ymd(extractDate("by 1 Jan", SENT)), "2027-1-1");
});

test("dueLabel and daysUntil", () => {
  assert.equal(daysUntil(new Date(2026, 10, 14), SENT), 4);
  assert.deepEqual([-1, 0, 1, 5].map(dueLabel), ["Overdue", "Today", "Tomorrow", "In 5 days"]);
});

test("summarise buckets items and drops past events", () => {
  const mail = (id, subject, body) => ({ id, subject, body, sent: SENT });
  const sorted = triage([
    mail(1, "Fee", "Last date was 7 Nov. Please pay."),
    mail(2, "Exam", "MST is on 20 Nov"),
    mail(3, "Form", "Please fill the form"),
    mail(4, "Workshop", "Workshop was held on 1 Nov in LT-101"),
  ], SENT);
  const g = summarise(sorted);
  assert.equal(g.overdue.length, 1);
  assert.equal(g.later.length, 1);
  assert.equal(g.undated.length, 1);
  assert.equal(g.overdue.length + g.today.length + g.week.length + g.later.length, 2);
  assert.equal(countByCategory(sorted).event, 2);
});
