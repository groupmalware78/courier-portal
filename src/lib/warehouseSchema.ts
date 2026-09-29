import { z } from "zod";
import { PHONE_FORMAT_REGEX } from "./phoneFormat";

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const optionalTrimmed = (max: number) =>
  z.preprocess(asString, z.string().trim().max(max).optional());

export const warehouseSchema = z.object({
  warehouseName: optionalTrimmed(150),
  warehouseAddressLine1: optionalTrimmed(150),
  warehouseAddressLine2: optionalTrimmed(150),
  warehouseCity: optionalTrimmed(100),
  warehouseState: optionalTrimmed(100),
  warehouseZip: optionalTrimmed(20),
  warehouseCountry: optionalTrimmed(100),
  warehousePhone: z.preprocess(
    asString,
    z
      .string()
      .trim()
      .max(30)
      .optional()
      .refine((v) => !v || PHONE_FORMAT_REGEX.test(v), {
        message: "Enter a phone number in the format +1 (000) 000-0000",
      })
  ),
});
