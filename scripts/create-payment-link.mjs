// Headless demo: connect to the Airwallex AgentOS MCP server (sandbox) and call
// create_payment_link with a sample trip.
//
// First run prints an authorization URL — open it in a browser, log in with your
// Airwallex sandbox account, and the script completes automatically via a
// loopback callback on http://localhost:8090/callback.
//
//   npm install
//   node scripts/create-payment-link.mjs
//
// Env overrides:
//   MCP_URL       default https://mcp.sandbox.airwallex.com/developer
//   TRIP_TITLE    default "Lisbon 6-night trip for 2"
//   TRIP_AMOUNT   default 1200
//   TRIP_CURRENCY default USD
//   SHOPPER_EMAIL optional — only set to an address the traveller actually gave

import { createServer } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";

const MCP_URL =
  process.env.MCP_URL ?? "https://mcp.sandbox.airwallex.com/developer";
const CALLBACK_PORT = 8090;
const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/callback`;

// ponytail: in-memory OAuth provider (SDK demo pattern). Tokens live for the
// process only, so the browser login repeats every run. Persist
// clientInformation/tokens/codeVerifier if you want to cache across runs.
class InMemoryOAuthClientProvider {
  constructor(redirectUrl, clientMetadata, onRedirect) {
    this._redirectUrl = redirectUrl;
    this._clientMetadata = clientMetadata;
    this._onRedirect = onRedirect;
  }
  get redirectUrl() {
    return this._redirectUrl;
  }
  get clientMetadata() {
    return this._clientMetadata;
  }
  clientInformation() {
    return this._clientInformation;
  }
  saveClientInformation(info) {
    this._clientInformation = info;
  }
  tokens() {
    return this._tokens;
  }
  saveTokens(tokens) {
    this._tokens = tokens;
  }
  redirectToAuthorization(authorizationUrl) {
    this._onRedirect(authorizationUrl);
  }
  saveCodeVerifier(codeVerifier) {
    this._codeVerifier = codeVerifier;
  }
  codeVerifier() {
    if (!this._codeVerifier) throw new Error("No code verifier saved");
    return this._codeVerifier;
  }
}

function waitForOAuthCallback() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const parsedUrl = new URL(req.url || "", "http://localhost");
      const code = parsedUrl.searchParams.get("code");
      const error = parsedUrl.searchParams.get("error");
      if (code) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          "<html><body><h1>Authorization successful</h1><p>You can close this tab.</p></body></html>",
        );
        resolve(code);
        setTimeout(() => server.close(), 1000);
      } else {
        res.writeHead(400);
        res.end(`Authorization failed: ${error ?? "no code"}`);
        reject(new Error(`OAuth failed: ${error ?? "no code"}`));
      }
    });
    server.listen(CALLBACK_PORT, () => {
      console.log(`OAuth callback listening on ${CALLBACK_URL}`);
    });
  });
}

const oauthProvider = new InMemoryOAuthClientProvider(
  CALLBACK_URL,
  {
    client_name: "AgentOS Travel PoC",
    redirect_uris: [CALLBACK_URL],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "client_secret_post",
  },
  (url) => {
    console.log(`\nOpen this URL in your browser to authorize:\n  ${url}\n`);
  },
);

const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
  authProvider: oauthProvider,
});

const client = new Client(
  { name: "agentos-travel-poc", version: "0.1.0" },
  { capabilities: {} },
);

try {
  await client.connect(transport);
} catch (error) {
  if (error instanceof UnauthorizedError) {
    const code = await waitForOAuthCallback();
    await transport.finishAuth(code);
    await client.connect(
      new StreamableHTTPClientTransport(new URL(MCP_URL), {
        authProvider: oauthProvider,
      }),
    );
  } else {
    throw error;
  }
}

const args = {
  title: process.env.TRIP_TITLE ?? "Lisbon 6-night trip for 2",
  amount: Number(process.env.TRIP_AMOUNT ?? 1200),
  currency: process.env.TRIP_CURRENCY ?? "USD",
  description: "6 nights in Lisbon, October, 2 travellers",
  reference: "TRIP-LISBON-OCT",
};
// Only forward an email the traveller actually supplied. Never invent one.
if (process.env.SHOPPER_EMAIL) {
  args.shopper_email = process.env.SHOPPER_EMAIL;
}

const result = await client.callTool({
  name: "create_payment_link",
  arguments: args,
});

const text = result.content?.[0]?.text ?? "";
try {
  const link = JSON.parse(text);
  console.log(`\nPayment link created: ${link.url ?? text}\n`);
} catch {
  console.log(`\n${text}\n`);
}

await client.close();
process.exit(0);
