import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/payment-links/route";

const SANDBOX_BASE_URL = "https://api-demo.airwallex.com";
const API_VERSION = "2026-08-21";

const validBody = {
  destination: "Lisbon, Portugal",
  startDate: "2026-10-01",
  endDate: "2026-10-07",
  amount: 1200.5,
  currency: "USD",
  travelers: 2,
};

function makeJsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/payment-links", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeRawRequest(rawBody: string): Request {
  return new Request("http://localhost/api/payment-links", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: rawBody,
  });
}

function loginResponse() {
  return new Response(JSON.stringify({ token: "test-bearer-token" }), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
}

function createLinkResponse() {
  return new Response(
    JSON.stringify({ url: "https://pay.airwallex.com/link/abc" }),
    { status: 201, headers: { "content-type": "application/json" } },
  );
}

function okResponse() {
  return new Response("{}", {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

/** Stub fetch that serves login, then create; /notify_shopper gets ok. */
function stubHappyPath() {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/v1/authentication/login")) {
      return Promise.resolve(loginResponse());
    }
    if (url.includes("/api/v1/pa/payment_links/create")) {
      return Promise.resolve(createLinkResponse());
    }
    if (url.includes("/notify_shopper")) {
      return Promise.resolve(okResponse());
    }
    return Promise.reject(new Error(`unexpected fetch to ${url}`));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function callsTo(fetchMock: ReturnType<typeof vi.fn>, path: string) {
  return fetchMock.mock.calls.filter(([url]) => String(url).includes(path));
}

describe("POST /api/payment-links", () => {
  beforeEach(() => {
    process.env.AIRWALLEX_SANDBOX_CLIENT_ID = "test-client-id";
    process.env.AIRWALLEX_SANDBOX_API_KEY = "test-api-key";
    delete process.env.AIRWALLEX_BASE_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("authenticates first, then creates the link, and returns the standard envelope", async () => {
    const fetchMock = stubHappyPath();

    const response = await POST(makeJsonRequest(validBody));
    expect(response.status).toBe(201);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.error).toBeNull();
    expect(json.data.url).toBe("https://pay.airwallex.com/link/abc");

    const loginCalls = callsTo(fetchMock, "/api/v1/authentication/login");
    const createCalls = callsTo(fetchMock, "/api/v1/pa/payment_links/create");
    expect(loginCalls).toHaveLength(1);
    expect(createCalls).toHaveLength(1);

    // Auth happens before create
    const loginIndex = fetchMock.mock.calls.findIndex(([url]) =>
      String(url).includes("/authentication/login"),
    );
    const createIndex = fetchMock.mock.calls.findIndex(([url]) =>
      String(url).includes("/payment_links/create"),
    );
    expect(loginIndex).toBeLessThan(createIndex);

    // Login hits the sandbox default base URL with client credentials and API version
    const [loginUrl, loginInit] = loginCalls[0];
    expect(String(loginUrl)).toBe(
      `${SANDBOX_BASE_URL}/api/v1/authentication/login`,
    );
    expect(loginInit.method).toBe("POST");
    expect(loginInit.headers["x-client-id"]).toBe("test-client-id");
    expect(loginInit.headers["x-api-key"]).toBe("test-api-key");
    expect(loginInit.headers["x-api-version"]).toBe(API_VERSION);

    // Create uses the bearer token from login, the API version header,
    // and the exact pinned payload fields (email must never be present)
    const [createUrl, createInit] = createCalls[0];
    expect(String(createUrl)).toBe(
      `${SANDBOX_BASE_URL}/api/v1/pa/payment_links/create`,
    );
    expect(createInit.method).toBe("POST");
    expect(createInit.headers.Authorization).toBe("Bearer test-bearer-token");
    expect(createInit.headers["x-api-version"]).toBe(API_VERSION);

    const createPayload = JSON.parse(createInit.body);
    expect(createPayload).toEqual({
      title: expect.any(String),
      amount: 1200.5,
      currency: "USD",
      reference: expect.any(String),
      reusable: false,
    });
  });

  it("calls /notify_shopper separately when email is provided, never in the create payload", async () => {
    const fetchMock = stubHappyPath();

    const response = await POST(
      makeJsonRequest({ ...validBody, email: "traveler@example.com" }),
    );
    expect(response.status).toBe(201);

    const createCalls = callsTo(fetchMock, "/api/v1/pa/payment_links/create");
    expect(createCalls).toHaveLength(1);
    const createPayload = JSON.parse(createCalls[0][1].body);
    expect(createPayload).not.toHaveProperty("email");

    const notifyCalls = callsTo(fetchMock, "/notify_shopper");
    expect(notifyCalls).toHaveLength(1);
    expect(notifyCalls[0][1].headers.Authorization).toBe(
      "Bearer test-bearer-token",
    );
    expect(notifyCalls[0][1].headers["x-api-version"]).toBe(API_VERSION);
  });

  it("does not call /notify_shopper when email is absent", async () => {
    const fetchMock = stubHappyPath();

    const response = await POST(makeJsonRequest(validBody));
    expect(response.status).toBe(201);
    expect(callsTo(fetchMock, "/notify_shopper")).toHaveLength(0);
  });

  it("uses the AIRWALLEX_BASE_URL override when set", async () => {
    process.env.AIRWALLEX_BASE_URL = "https://api-staging.airwallex.example";
    const fetchMock = stubHappyPath();

    const response = await POST(makeJsonRequest(validBody));
    expect(response.status).toBe(201);

    const [loginUrl] = callsTo(fetchMock, "/authentication/login")[0];
    expect(String(loginUrl)).toBe(
      "https://api-staging.airwallex.example/api/v1/authentication/login",
    );
  });

  it("returns a 400 envelope and never calls Airwallex for invalid input", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      makeJsonRequest({ ...validBody, amount: -1, currency: "US" }),
    );
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.data).toBeNull();
    expect(json.error).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a 400 envelope for malformed JSON and never calls Airwallex", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRawRequest("{not json"));
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    "AIRWALLEX_SANDBOX_CLIENT_ID",
    "AIRWALLEX_SANDBOX_API_KEY",
  ])("returns a 500 envelope when %s is missing", async (envVar) => {
    delete process.env[envVar];
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeJsonRequest(validBody));
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.data).toBeNull();
    expect(json.error).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a 502 envelope when login fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "invalid credentials" }), {
          status: 401,
        }),
      ),
    );

    const response = await POST(makeJsonRequest(validBody));
    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.data).toBeNull();
    expect(json.error).toBeDefined();
  });

  it("returns a 502 envelope when the create call fails", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/authentication/login")) {
        return Promise.resolve(loginResponse());
      }
      return Promise.resolve(
        new Response(JSON.stringify({ message: "upstream failure" }), {
          status: 500,
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeJsonRequest(validBody));
    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error).toBeDefined();
  });

  it("returns a 502 envelope when the network call throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("socket hangup")),
    );

    const response = await POST(makeJsonRequest(validBody));
    expect(response.status).toBe(502);
  });
});
