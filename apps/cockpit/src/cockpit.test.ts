import { describe, it, expect } from "vitest";

describe("Cockpit UI Helper Tests", () => {
  it("formats currency values cleanly", () => {
    const formatDollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    expect(formatDollars(10000)).toBe("$100.00");
    expect(formatDollars(4550)).toBe("$45.50");
    expect(formatDollars(0)).toBe("$0.00");
  });

  it("calculates remaining budget accurately", () => {
    const total = 100000;
    const spent = 4000;
    const reserved = 15700;
    const remaining = total - spent - reserved;
    expect(remaining).toBe(80300);
    expect((remaining / 100).toFixed(2)).toBe("803.00");
  });
});
