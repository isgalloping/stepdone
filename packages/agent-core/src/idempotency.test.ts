import { describe, it, expect } from "vitest";
import { buildIdempotencyKey } from "./idempotency";

describe("buildIdempotencyKey", () => {
  it("joins parts", () => {
    expect(buildIdempotencyKey("p1", "s1", "CREATE_PLAN", 1)).toBe(
      "p1:s1:CREATE_PLAN:1",
    );
  });
});
