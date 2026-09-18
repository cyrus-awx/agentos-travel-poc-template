# AgentOS travel booking PoC (Agentic commerce)

This repo is a **template** for an AI-assisted travel booking flow that creates an Airwallex **payment link** and sends the traveller to the Airwallex checkout.

It demonstrates the core “quote → payment link → checkout” path you can wire into an AI assistant (Claude / Cursor / ChatGPT connector / Gemini connector).

## About

This template is designed to help teams prove out an agentic-commerce flow for travel and bookings. It is intentionally scoped to the smallest working demo: quote creation, payment-link generation, and checkout handoff.

## Use this repo as a template

1. Click **Use this template** on GitHub to create your own repo.
2. Copy the repo locally.
3. Set the environment variables in `.env.example` and run it.

> Note: this template is intentionally small. It does not implement the full booking engine, availability, or itinerary management.

## What it does

1. Collects a trip quote request (destination, dates, travellers, amount, currency).
2. Calls a server route that creates an Airwallex payment link.
3. Optionally sends the hosted link via the “notify shopper” call when you provide an email.
4. Redirects the browser to the returned checkout URL.

## Live demo

Not included in this template. Deploy it (see below) if you want a clickable demo.

## Quickstart

### 1) Create sandbox credentials

Create sandbox API credentials in Airwallex sandbox:
https://demo.airwallex.com/signup/sandbox

Fill in `.env.example` (or copy it to `.env`).

### 2) Install + run locally

```bash
npm install
npm run dev
```

Then open:

- http://localhost:3000

### 3) Run tests

```bash
npm test
npm run test:all
```

## Environment variables

Copy `.env.example` to `.env`.

Required:

- `AIRWALLEX_SANDBOX_CLIENT_ID`
- `AIRWALLEX_SANDBOX_API_KEY`

Optional:

- `AIRWALLEX_BASE_URL` (override for the Airwallex API base URL; defaults to `https://api-demo.airwallex.com`)

## Key implementation

### Trip input validation

- `src/lib/trip-input.ts` defines `tripInputSchema` (Zod).

### Building the payment-link payload

- `src/lib/payment-link-payload.ts` defines `buildPaymentLinkPayload()`.

### Creating the payment link

- `src/app/api/payment-links/route.ts`
  - parses JSON
  - validates input
  - logs into Airwallex sandbox
  - calls `POST /api/v1/pa/payment_links/create`
  - optionally calls `/notify_shopper`
  - returns `{ success, data, error }`

## How an AI assistant uses this flow

This template is a **web demo**, not an MCP client implementation.

To make it “agentic”:

- Your AI assistant collects the trip details.
- It then calls a tool that triggers payment-link creation.

If you want the MCP-native version of this flow, point your MCP-capable AI client at the hosted Airwallex AgentOS MCP server and call the `create_payment_link` tool.

Tool name:
- `create_payment_link`

Sandbox MCP endpoint (documented in the internal AgentOS MCP repo):
- `https://mcp.sandbox.airwallex.com/developer`

## Why this repo is safe to copy

- No credentials are shipped in the template.
- The server route validates all input before calling Airwallex.
- The “notify shopper” flow is separate from link creation.

## License

MIT
