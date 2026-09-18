import { describe, expect, it } from "vitest";
import { buildPaymentLinkPayload } from "@/lib/payment-link-payload";

const baseTrip = {
  destination: "Lisbon, Portugal",
  startDate: "2026-10-01",
  endDate: "2026-10-07",
  amount: 1200.5,
  currency: "USD",
  travelers: 2,
};

describe("buildPaymentLinkPayload", () => {
  it("includes title, amount, currency, reusable:false, and a generated reference", () => {
    const payload = buildPaymentLinkPayload(baseTrip);
    expect(typeof payload.title).toBe("string");
    expect(payload.title.length).toBeGreaterThan(0);
    expect(payload.amount).toBe(1200.5);
    expect(payload.currency).toBe("USD");
    expect(payload.reusable).toBe(false);
    expect(typeof payload.reference).toBe("string");
    expect(payload.reference.length).toBeGreaterThan(0);
  });

  it("never includes the shopper email in the create payload", () => {
    const payload = buildPaymentLinkPayload({
      ...baseTrip,
      email: "traveler@example.com",
    });
    expect(payload).not.toHaveProperty("email");
  });

  it("omits the description key entirely when absent", () => {
    const payload = buildPaymentLinkPayload(baseTrip);
    expect(payload).not.toHaveProperty("description");
  });

  it("includes description when provided", () => {
    const payload = buildPaymentLinkPayload({
      ...baseTrip,
      description: "Lisbon trip",
    });
    expect(payload.description).toBe("Lisbon trip");
  });
});
