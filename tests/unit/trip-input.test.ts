import { describe, expect, it } from "vitest";
import { tripInputSchema } from "@/lib/trip-input";

const validTrip = {
  destination: "Lisbon, Portugal",
  startDate: "2026-10-01",
  endDate: "2026-10-07",
  amount: 1200.5,
  currency: "USD",
  travelers: 2,
};

describe("tripInputSchema", () => {
  it("accepts a valid trip without optional email", () => {
    const result = tripInputSchema.safeParse(validTrip);
    expect(result.success).toBe(true);
  });

  it("accepts a valid trip with optional email", () => {
    const result = tripInputSchema.safeParse({
      ...validTrip,
      email: "traveler@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = tripInputSchema.safeParse({
      ...validTrip,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing or empty destination", () => {
    const { destination: _omit, ...noDestination } = validTrip;
    expect(tripInputSchema.safeParse(noDestination).success).toBe(false);
    expect(
      tripInputSchema.safeParse({ ...validTrip, destination: "" }).success,
    ).toBe(false);
    expect(
      tripInputSchema.safeParse({ ...validTrip, destination: "   " }).success,
    ).toBe(false);
  });

  it("rejects endDate before startDate", () => {
    const result = tripInputSchema.safeParse({
      ...validTrip,
      startDate: "2026-10-07",
      endDate: "2026-10-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed date string", () => {
    const result = tripInputSchema.safeParse({
      ...validTrip,
      startDate: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero and negative amounts", () => {
    expect(
      tripInputSchema.safeParse({ ...validTrip, amount: 0 }).success,
    ).toBe(false);
    expect(
      tripInputSchema.safeParse({ ...validTrip, amount: -5 }).success,
    ).toBe(false);
  });

  it("rejects currency codes that are not exactly 3 uppercase letters", () => {
    expect(
      tripInputSchema.safeParse({ ...validTrip, currency: "US" }).success,
    ).toBe(false);
    expect(
      tripInputSchema.safeParse({ ...validTrip, currency: "USDT" }).success,
    ).toBe(false);
    expect(
      tripInputSchema.safeParse({ ...validTrip, currency: "usd" }).success,
    ).toBe(false);
  });

  it("rejects traveler counts outside 1..9", () => {
    expect(
      tripInputSchema.safeParse({ ...validTrip, travelers: 0 }).success,
    ).toBe(false);
    expect(
      tripInputSchema.safeParse({ ...validTrip, travelers: 10 }).success,
    ).toBe(false);
    expect(
      tripInputSchema.safeParse({ ...validTrip, travelers: 2.5 }).success,
    ).toBe(false);
  });
});
