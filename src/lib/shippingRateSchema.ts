import { z } from "zod";

export const shippingRateSchema = z
  .object({
    label: z.string().trim().min(1, "Label is required").max(100),
    minWeightLbs: z.coerce.number().min(0, "Minimum weight must be 0 or more"),
    maxWeightLbs: z.coerce.number().positive("Maximum weight must be greater than 0").optional().nullable(),
    price: z.coerce.number().positive("Price must be greater than 0"),
    sortOrder: z.coerce.number().int().optional(),
  })
  .refine((data) => data.maxWeightLbs == null || data.maxWeightLbs > data.minWeightLbs, {
    message: "Maximum weight must be greater than minimum weight",
    path: ["maxWeightLbs"],
  });
