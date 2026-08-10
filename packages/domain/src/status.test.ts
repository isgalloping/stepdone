import { describe, it, expect } from "vitest";
import { PROJECT_STATUSES, canTransitionProject } from "./status";

describe("canTransitionProject", () => {
  it("allows ACTIVE -> PAYMENT_REQUIRED", () => {
    expect(canTransitionProject("ACTIVE", "PAYMENT_REQUIRED")).toBe(true);
  });

  it("rejects COMPLETED -> ACTIVE", () => {
    expect(canTransitionProject("COMPLETED", "ACTIVE")).toBe(false);
  });

  it("exposes all project statuses", () => {
    expect(PROJECT_STATUSES).toContain("DRAFT");
    expect(PROJECT_STATUSES).toContain("PAYMENT_REQUIRED");
  });
});
