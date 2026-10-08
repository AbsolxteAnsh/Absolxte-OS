import { describe, expect, it } from "vitest";

import { SYSTEM_TOOLS } from "./tools";

describe("system toolbox", () => {
  it("contains only unique fixed target identifiers", () => {
    const targets = SYSTEM_TOOLS.map((tool) => tool.target);
    expect(new Set(targets).size).toBe(targets.length);
    expect(targets).toContain("windows-update");
    expect(targets).toContain("windows-security");
    expect(targets).toContain("startup-apps");
  });
});
