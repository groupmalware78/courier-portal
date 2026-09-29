const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// "Aug 28, 2026 09:10 am" — used everywhere a date/time is shown to a user,
// instead of the locale-dependent (and inconsistently-formatted) toLocaleString().
export function formatDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;

  const month = MONTHS[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const meridiem = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  const hoursStr = String(hours).padStart(2, "0");

  return `${month} ${day}, ${year} ${hoursStr}:${minutes} ${meridiem}`;
}
