import { z } from "zod";

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const optionalTrimmed = (max: number) =>
  z.preprocess(asString, z.string().trim().max(max).optional());

export const bankingSchema = z.object({
  bankName: optionalTrimmed(150),
  bankAccountName: optionalTrimmed(150),
  bankAccountNumber: optionalTrimmed(50),
  bankRoutingNumber: optionalTrimmed(50),
  bankBranch: optionalTrimmed(150),
});
