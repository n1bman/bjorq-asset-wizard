import { describe, it, expect } from "vitest";
import { healthRoutes } from "./health.js";

describe("healthRoutes", () => {
  it("is a function", () => {
    expect(typeof healthRoutes).toBe("function");
  });
});
