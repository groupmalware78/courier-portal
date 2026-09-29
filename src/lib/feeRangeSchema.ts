import { z } from "zod";

export const feeRangeSchema = z
  .object({
    basis: z.enum(["WEIGHT", "VALUE"]),
    label: z.string().trim().min(1, "Label is required").max(100),
    min: z.coerce.number().min(0, "Minimum must be 0 or more"),
    max: z.coerce.number().positive("Maximum must be greater than 0").optional().nullable(),
    fee: z.coerce.number().min(0, "Fee must be 0 or more"),
    sortOrder: z.coerce.number().int().optional(),
  })
  .refine((data) => data.max == null || data.max > data.min, {
    message: "Maximum must be greater than minimum",
    path: ["max"],
  });
