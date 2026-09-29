// Formats a phone number progressively as the user types, into
// "+1 (000) 000-0000". Meant to be used directly as an input's onChange:
// onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
export function formatPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("1")) digits = digits.slice(1);
  digits = digits.slice(0, 10);

  if (digits.length === 0) return "";
  if (digits.length < 4) return `+1 (${digits}`;
  if (digits.length < 7) return `+1 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// Normalizes a stored phone number (which may predate this format) to
// "+1 (000) 000-0000" for display. Falls back to the raw value if it
// doesn't contain a recognizable 10-digit North American number.
export function formatPhoneDisplay(value: string | null | undefined): string {
  if (!value) return "";
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return value;
  return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// A fully-formatted phone number matches exactly.
export const PHONE_FORMAT_REGEX = /^\+1 \(\d{3}\) \d{3}-\d{4}$/;
