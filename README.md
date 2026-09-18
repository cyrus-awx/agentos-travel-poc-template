# AgentOS agentic-commerce PoC — book & pay inside an AI assistant

A minimal template demonstrating how a merchant (for example, an online travel agency) lets travellers **book and pay directly inside an AI assistant** — Claude, ChatGPT, Gemini, Cursor, or a custom assistant — using **Airwallex AgentOS** (a hosted MCP server).

There is no web app here on purpose. The AI assistant is the UI. The assistant calls the AgentOS `create_payment_link` tool, the traveller gets a payment link in the conversation, and pays on the Airwallex-hosted checkout. Funds settle to the merchant's Airwallex account with native FX.

```
Traveller: "I want a 6-night trip to Lisbon in October for 2 people, around $1,200"
    │
    ▼
AI assistant (connected to the merchant's Airwallex account via AgentOS)
    │  calls create_payment_link(title, amount, currency, ...)
    ▼
Airwallex AgentOS MCP server
    │  creates the hosted checkout
    ▼
Traveller taps the link in the chat and pays on the Airwallex checkout
    │
    ▼
Money lands in the merchant's Airwallex account
```

## What's in this repo

- `.mcp.json` — MCP client config snippet for Claude Code / Cursor pointing at the AgentOS sandbox server.
- `docs/demo-script.md` — a step-by-step demo script: connect the client, then paste prompts that drive the booking-to-payment flow.
- `scripts/create-payment-link.mjs` — a tiny headless MCP client that authenticates and calls `create_payment_link`, for demos without installing Claude Desktop.

## What it deliberately does not include

- No booking engine, inventory, or itinerary management.
- No merchant-side web backend. The payment tool call happens in the AI client, not in your server.
- No native in-chat card fields. The last payment step is the Airwallex-hosted checkout, opened from the conversation.

For native checkout embedded inside ChatGPT or Gemini's own UI (ACP / AP2), that is a separate, program-gated path — see the notes in `docs/demo-script.md`.

## Quickstart

### 1. Get sandbox credentials

Create a free Airwallex sandbox account: <https://demo.airwallex.com/signup/sandbox>

### 2. Connect your AI client to AgentOS

Use the config in `.mcp.json` as a starting point. The sandbox AgentOS endpoint is:

```
https://mcp.sandbox.airwallex.com/developer
```

On first connection the client opens a browser for OAuth against your Airwallex sandbox account. After that, the tools are available in the conversation.

### 3. Run the demo

Follow `docs/demo-script.md`. Short version — paste this into the assistant:

> I'm a traveller. I'd like to book a 6-night trip to Lisbon in October for 2 people, total around 1200 USD. Create a payment link so I can pay.

The assistant should call `create_payment_link` with `title`, `amount`, `currency`, and return a checkout URL in the chat.

### 4. Headless demo (optional)

For a scripted run without an interactive assistant:

```bash
npm install
node scripts/create-payment-link.mjs
```

The script connects to the sandbox AgentOS server with OAuth and calls `create_payment_link` with a sample trip.

## The tool

`create_payment_link` accepts (among others):

- `title` (required) — checkout page title
- `amount` + `currency` — fixed pricing, major currency units (e.g. `1200.50`, `USD`)
- `default_currency` + `supported_currencies` — flexible pricing instead
- `description`, `reference`, `reusable`, `expires_at`, `metadata`
- `shopper_email` — emails the link to the traveller (omit unless the traveller gave their email; never invent one)

The tool returns the upstream Payment Links response as JSON, including the checkout `url`.

## Use this repo as a template

Click **Use this template** on GitHub, clone your copy, and adapt `docs/demo-script.md` and the sample trip in the script to your own product.

## License

MIT
