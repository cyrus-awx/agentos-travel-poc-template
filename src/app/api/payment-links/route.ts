import { tripInputSchema, type TripInput } from "@/lib/trip-input"
import { buildPaymentLinkPayload } from "@/lib/payment-link-payload"

const DEFAULT_AIRWALLEX_BASE_URL = "https://api-demo.airwallex.com"
const API_VERSION = "2026-08-21"

function jsonResponse(
  body: unknown,
  init: { status: number },
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status,
    headers: { "content-type": "application/json" },
  })
}

function envelopeSuccess(data: unknown) {
  return { success: true, data, error: null }
}

function envelopeError(errorMessage: string) {
  return { success: false, data: null, error: errorMessage }
}

async function loginSandBox(airwallexBaseUrl: string, trip: TripInput) {
  const clientId = process.env.AIRWALLEX_SANDBOX_CLIENT_ID
  const apiKey = process.env.AIRWALLEX_SANDBOX_API_KEY

  if (!clientId || !apiKey) {
    throw new Error("missing sandbox credentials")
  }

  const resp = await fetch(
    `${airwallexBaseUrl}/api/v1/authentication/login`,
    {
      method: "POST",
      headers: {
        "x-client-id": clientId,
        "x-api-key": apiKey,
        "x-api-version": API_VERSION,
      },
      // The upstream API accepts client credentials via headers.
      body: JSON.stringify({}),
    },
  )

  if (!resp.ok) {
    throw new Error(`login failed (${resp.status})`)
  }

  const json = (await resp.json()) as { token?: string }
  if (!json.token) {
    throw new Error("login did not return a token")
  }

  return json.token
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return jsonResponse(
      envelopeError("malformed JSON"),
      { status: 400 },
    )
  }

  const parsed = tripInputSchema.safeParse(body)
  if (!parsed.success) {
    return jsonResponse(envelopeError("invalid input"), { status: 400 })
  }

  const airwallexBaseUrl =
    process.env.AIRWALLEX_BASE_URL ?? DEFAULT_AIRWALLEX_BASE_URL

  const trip = parsed.data

  try {
    const bearerToken = await loginSandBox(airwallexBaseUrl, trip)

    const payload = buildPaymentLinkPayload(trip)

    const createResp = await fetch(
      `${airwallexBaseUrl}/api/v1/pa/payment_links/create`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          "x-api-version": API_VERSION,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    )

    if (!createResp.ok) {
      throw new Error(`create failed (${createResp.status})`)
    }

    const createJson = (await createResp.json()) as Record<string, unknown>

    if (trip.email) {
      const paymentLinkId =
        typeof createJson.id === "string" ? (createJson.id as string) : ""

      await fetch(
        `${airwallexBaseUrl}/api/v1/pa/payment_links/${paymentLinkId}/notify_shopper`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            "x-api-version": API_VERSION,
            "content-type": "application/json",
          },
          body: JSON.stringify({ shopper_email: trip.email }),
        },
      )
    }

    return jsonResponse(envelopeSuccess(createJson), { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unexpected error"

    if (message === "missing sandbox credentials") {
      return jsonResponse(envelopeError("server misconfigured"), {
        status: 500,
      })
    }

    return jsonResponse(envelopeError(message), { status: 502 })
  }
}
