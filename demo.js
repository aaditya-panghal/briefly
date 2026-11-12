import { MONTHS, addDays } from "./sorter.js";

/** Sample mailbox with dates relative to today, so the demo never goes stale. */
export function demoMails() {
  const day = n => addDays(new Date(), n);
  const fmt = d => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const mail = (id, from, subject, body) => ({ id: `demo${id}`, from, subject, body, sent: day(-1) });
  return [
    mail(1, "Physics Dept", "Lab file submission", `Kindly submit the Physics lab file to your TA by ${fmt(day(2))}. Without it you cannot sit the viva.`),
    mail(2, "Placement Cell", "Infosys drive: registration", "Registration for the Infosys drive closes tomorrow. Register on the portal."),
    mail(3, "Examination Cell", "UPH013 MST schedule", `UPH013 MST is on ${fmt(day(6))} in the main auditorium. Carry your ID card.`),
    mail(4, "Accounts Office", "Fee payment reminder", `The last date for fee payment was ${fmt(day(-3))}. Please pay at the earliest to avoid a fine.`),
    mail(5, "GDG Thapar", "Flutter workshop", `Flutter workshop on ${fmt(day(4))} at 5 pm in LT-101. Bring your laptop.`),
    mail(6, "Hackathon Team", "Final submission", `Final PDF submission is due ${fmt(day(12))}. Teams must upload via the portal.`),
    mail(7, "Hostel Office", "Mess feedback", "Please fill the hostel mess feedback form."),
    mail(8, "Library", "New journals", "The library has added new engineering journals on the second floor."),
    mail(9, "Aman", "Happy birthday!!", "Happy birthday Aman!! 🎂🎉"),
    mail(10, "Campus Eats", "50% off pizzas", "50% off on pizzas this weekend. Unsubscribe anytime."),
  ];
}
