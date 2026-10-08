import { describe, expect, it } from "vitest";

import { normalizeLauncherName } from "./launcher";

describe("normalizeLauncherName", () => {
  it("collapses whitespace and caps display names", () => {
    expect(normalizeLauncherName("  Faith   Editor  ")).toBe("Faith Editor");
    expect(normalizeLauncherName("x".repeat(80))).toHaveLength(48);
  });
});
