# Demo script — book & pay inside an AI assistant

This script walks through the agentic-commerce flow for a travel merchant. It assumes the merchant is an OTA that wants travellers to book and pay inside Claude, ChatGPT, Gemini, or a custom assistant, with funds settling to the merchant's Airwallex account.

## Setup (one time, ~5 minutes)

1. Create an Airwallex **sandbox** account: https://demo.airwallex.com/signup/sandbox
2. Point your MCP-capable client at the AgentOS sandbox server using the `.mcp.json` in this repo:
   - Claude Code: `claude mcp add-json airwallex-agentos-sandbox '{"type":"url","url":"https://mcp.sandbox.airwallex.com/developer"}'`
   - Cursor: add the same entry in Cursor's MCP settings
3. Connect once. The client opens a browser for OAuth against your sandbox account. After that, `create_payment_link` (and the other AgentOS tools) are available to the assistant.

## Demo prompts

Paste these in order.

**1. Shape the trip:**

> I'm a traveller. I want a 6-night trip to Lisbon in October for 2 people, total around 1200 USD.

The assistant should confirm the details and propose a price.

**2. Create the payment:**

> Create a payment link so I can pay.

The assistant should call `create_payment_link` with something like:

```json
{
  "title": "Lisbon 6-night trip for 2",
  "amount": 1200,
  "currency": "USD",
  "description": "6 nights in Lisbon, October, 2 travellers",
  "reference": "TRIP-LISBON-OCT"
}
```

**3. Pay:**

Click the returned checkout URL and pay on the Airwallex-hosted page (use sandbox test cards). The money lands in the merchant's sandbox Airwallex account.

## Variations worth showing

- **Email delivery:** "Email the payment link to me" — the assistant passes the traveller-supplied email as `shopper_email`. Never invent an email.
- **Flexible pricing:** "Let me choose the amount and currency" — use `default_currency` + `supported_currencies` instead of `amount` + `currency`.
- **Multi-currency:** quote in EUR or GBP to show native FX settling into the merchant's account.

## What to say about scope

- The final payment step is an **Airwallex-hosted checkout** opened from the chat — one tap, not card fields rendered as chat UI.
- This path is live today via AgentOS (MCP) and works with any MCP-capable client.
- **Native** checkout inside ChatGPT or Gemini's own UI runs on ACP (OpenAI) / AP2 (Google) and is program-gated. Confirm Airwallex's processor certification status before promising that variant.

## Cleanup

Sandbox payment links are test data. Nothing settles for real. Revoke the OAuth grant from your Airwallex sandbox account when you're done.
