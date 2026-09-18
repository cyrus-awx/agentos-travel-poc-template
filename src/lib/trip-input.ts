import { z } from "zod"

const dateStringSchema = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "invalid date",
  })

export const tripInputSchema = z
  .object({
    destination: z
      .string()
      .min(1, { message: "destination required" })
      .transform((s) => s.trim())
      .refine((s) => s.length > 0, {
        message: "destination required",
      }),

    startDate: dateStringSchema,
    endDate: dateStringSchema,

    amount: z.number().positive(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/, { message: "currency must be 3 uppercase letters" }),

    travelers: z.number().int().min(1).max(9),

    email: z.string().email().optional(),
    description: z.string().optional(),
  })
  .refine(
    (v) => {
      const start = Date.parse(v.startDate)
      const end = Date.parse(v.endDate)
      return end >= start
    },
    {
      message: "endDate must be on or after startDate",
      path: ["endDate"],
    },
  )

export type TripInput = z.infer<typeof tripInputSchema>
