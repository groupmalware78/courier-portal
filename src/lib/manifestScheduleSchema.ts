import { z } from "zod";

export const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

export const manifestScheduleSchema = z
  .object({
    manifestAutoGenerate: z.boolean(),
    manifestTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a time as HH:mm")
      .optional()
      .or(z.literal("")),
    manifestDays: z.array(z.enum(WEEKDAYS)),
  })
  .refine((data) => !data.manifestAutoGenerate || !!data.manifestTime, {
    message: "Set a time to auto-generate manifests",
    path: ["manifestTime"],
  })
  .refine((data) => !data.manifestAutoGenerate || data.manifestDays.length > 0, {
    message: "Select at least one day to auto-generate manifests",
    path: ["manifestDays"],
  });
