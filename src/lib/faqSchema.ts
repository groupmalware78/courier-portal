import { z } from "zod";

const asString = (v: unknown) => (typeof v === "string" ? v : "");

export const faqSchema = z.object({
  question: z.preprocess(asString, z.string().trim().min(1, "Question is required").max(300)),
  subheader: z.preprocess(asString, z.string().trim().max(300).optional()),
  answer: z.preprocess(asString, z.string().trim().min(1, "Answer is required").max(2000)),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});
