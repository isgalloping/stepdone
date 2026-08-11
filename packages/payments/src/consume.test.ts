import { describe, expect, it } from "vitest";
import { consumeEntitlement } from "./consume";

describe("consumeEntitlement", () => {
  it("throws ENTITLEMENT_REQUIRED when remaining is 0", async () => {
    // Use a thin fake: export internal helper assertCanConsume for pure logic,
    // OR integration-style with prisma mocked.
    // Prefer extracting:
    // export function nextRemaining(remaining: number): number
    await expect(async () => {
      const { assertHasRemaining } = await import("./consume");
      assertHasRemaining(0);
    }).rejects.toThrow(/ENTITLEMENT_REQUIRED/);
  });

  it("decrements remaining by 1", async () => {
    const { applyConsumeDelta } = await import("./consume");
    expect(applyConsumeDelta(2)).toBe(1);
  });
});
