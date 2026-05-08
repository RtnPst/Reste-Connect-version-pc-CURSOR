/**
 * Calendar date YYYY-MM-DD in Europe/Paris (editorial / daily_questions.active_date).
 */
export function parisCalendarDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(d)
    .slice(0, 10);
}
