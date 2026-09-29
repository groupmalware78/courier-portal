import { z } from "zod";

const asString = (v: unknown) => (typeof v === "string" ? v : "");

export const locationSchema = z.object({
  name: z.preprocess(asString, z.string().trim().min(1, "Name is required").max(150)),
  address: z.preprocess(asString, z.string().trim().min(1, "Address is required").max(250)),
  contactNumber: z.preprocess(asString, z.string().trim().min(1, "Contact number is required").max(30)),
  hoursMonFri: z.preprocess(asString, z.string().trim().min(1, "Mon–Fri hours are required").max(100)),
  hoursSat: z.preprocess(asString, z.string().trim().min(1, "Saturday hours are required").max(100)),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});
