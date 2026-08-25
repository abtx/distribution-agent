import { describe, expect, it } from "vitest";
import { currentDiscoverySlot, londonParts } from "@/lib/discovery/schedule";

describe("discovery schedule", () => {
  it("accepts the 08:00 and 20:00 London slots", () => {
    expect(currentDiscoverySlot(new Date("2026-01-10T08:00:00Z"))).toBe(
      "2026-01-10T08:00",
    );
    expect(currentDiscoverySlot(new Date("2026-01-10T20:00:00Z"))).toBe(
      "2026-01-10T20:00",
    );
  });

  it("skips a missed run when the Mac wakes later", () => {
    expect(currentDiscoverySlot(new Date("2026-01-10T08:01:00Z"))).toBeNull();
    expect(currentDiscoverySlot(new Date("2026-01-10T21:00:00Z"))).toBeNull();
    expect(currentDiscoverySlot(new Date("2026-01-11T07:59:00Z"))).toBeNull();
  });

  it("uses Europe/London daylight saving time", () => {
    expect(londonParts(new Date("2026-08-10T07:00:00Z"))).toMatchObject({
      hour: 8,
      minute: 0,
    });
    expect(currentDiscoverySlot(new Date("2026-08-10T07:00:00Z"))).toBe(
      "2026-08-10T08:00",
    );
  });
});
