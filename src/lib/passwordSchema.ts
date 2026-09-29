import { z } from "zod";

// Anything but "*" counts toward the special-character requirement — "*"
// itself is still allowed in the password, it just doesn't satisfy it.
const SPECIAL_CHAR = /[!@#$%^&()_+={}\[\]:;"'<>,.?/\\|~-]/;

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200)
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/[0-9]/, "Password must include at least one number")
  .regex(SPECIAL_CHAR, "Password must include at least one special character (excluding *)");

export const PASSWORD_REQUIREMENTS_HINT =
  "At least 8 characters, with an uppercase letter, a number, and a special character (not *)";

// HTML `pattern` attribute equivalent, for native browser validation on
// password `<input>`s — kept in sync with the regexes above by hand.
export const PASSWORD_PATTERN = "^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\\s*]).{8,}$";
