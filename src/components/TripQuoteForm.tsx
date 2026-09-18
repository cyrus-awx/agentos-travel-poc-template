"use client"

import { useMemo, useState } from "react"
import { z } from "zod"

const formSchema = z.object({
  destination: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  travelers: z.number().int().min(1).max(9),
  currency: z.string().min(3),
  amount: z.number().positive(),
  email: z.string().email().optional(),
})

type FormState = z.input<typeof formSchema>

type CreateResponse =
  | { success: true; data: { url?: string }; error: null }
  | { success: false; data: null; error: string }

export default function TripQuoteForm() {
  const [state, setState] = useState<FormState>({
    destination: "Lisbon, Portugal",
    startDate: "2026-10-01",
    endDate: "2026-10-07",
    travelers: 2,
    currency: "USD",
    amount: 1200.5,
    email: undefined,
  })

  const [busy, setBusy] = useState(false)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const payload = useMemo(() => {
    const parsed = formSchema.safeParse(state)
    return parsed.success ? parsed.data : null
  }, [state])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    try {
      if (!payload) {
        setError("Invalid input")
        return
      }

      const resp = await fetch("/api/payment-links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = (await resp.json()) as CreateResponse
      if (!json.success) {
        setError(json.error || "Request failed")
        return
      }

      const url = json.data.url
      if (url) {
        window.location.href = url
        return
      }

      setError("No checkout URL returned")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div style={{ display: "grid", gap: 12 }}>
        <label>
          Destination
          <input
            value={state.destination}
            onChange={(e) =>
              setState((s) => ({ ...s, destination: e.target.value }))
            }
          />
        </label>

        <label>
          Start date
          <input
            type="date"
            value={state.startDate}
            onChange={(e) =>
              setState((s) => ({ ...s, startDate: e.target.value }))
            }
          />
        </label>

        <label>
          End date
          <input
            type="date"
            value={state.endDate}
            onChange={(e) =>
              setState((s) => ({ ...s, endDate: e.target.value }))
            }
          />
        </label>

        <label>
          Travelers
          <input
            type="number"
            min={1}
            max={9}
            value={state.travelers}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                travelers: Number(e.target.value),
              }))
            }
          />
        </label>

        <label>
          Currency
          <select
            value={state.currency}
            onChange={(e) =>
              setState((s) => ({ ...s, currency: e.target.value }))
            }
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </label>

        <label>
          Amount
          <input
            type="number"
            step="0.01"
            value={state.amount}
            onChange={(e) =>
              setState((s) => ({ ...s, amount: Number(e.target.value) }))
            }
          />
        </label>

        <label>
          Optional shopper email
          <input
            value={state.email ?? ""}
            onChange={(e) => {
              const v = e.target.value.trim()
              setState((s) => ({
                ...s,
                email: v ? v : undefined,
              }))
            }}
            placeholder="traveler@example.com"
          />
        </label>

        <button type="submit" disabled={busy || !payload}>
          {busy ? "Creating payment link…" : "Create payment link"}
        </button>

        {error ? <p style={{ color: "#b00020" }}>{error}</p> : null}
        {checkoutUrl ? <p>{checkoutUrl}</p> : null}
      </div>
    </form>
  )
}
