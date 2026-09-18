import { z } from "zod"

import { tripInputSchema, type TripInput } from "./trip-input"

const paymentLinkPayloadSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3),
  reference: z.string().min(1),
  reusable: z.boolean(),
  description: z.string().optional(),
})

function makeReference(): string {
  return `trip_${Math.random().toString(36).slice(2, 10)}`
}

export function buildPaymentLinkPayload(trip: TripInput):
  z.infer<typeof paymentLinkPayloadSchema> {
  // Clone the input so we can safely delete fields we never send.
  const { email: _email, description, destination, startDate, amount, currency } =
    trip

  const payload: {
    title: string
    amount: number
    currency: string
    reusable: boolean
    reference: string
    description?: string
  } = {
    title: `Trip to ${destination}`,
    amount,
    currency,
    reusable: false,
    reference: makeReference(),
  }

  if (description !== undefined) {
    payload.description = description
  }

  return paymentLinkPayloadSchema.parse(payload)
}

export type PaymentLinkPayload = z.infer<typeof paymentLinkPayloadSchema>

export function assertTripInput(input: unknown): TripInput {
  return tripInputSchema.parse(input)
}
