import { describe, expect, it } from "vitest";

import { calculateCleanupSelection } from "./cleanup";

const categories = [
  {
    id: "user-temp",
    label: "Temporary files",
    description: "Old per-user temporary files",
    fileCount: 4,
    totalBytes: 1_500,
    requiresElevation: false,
  },
  {
    id: "crash-dumps",
    label: "Crash dumps",
    description: "Application crash diagnostics",
    fileCount: 2,
    totalBytes: 2_000,
    requiresElevation: false,
  },
];

describe("calculateCleanupSelection", () => {
  it("totals only categories selected for deletion", () => {
    expect(calculateCleanupSelection(categories, new Set(["crash-dumps"]))).toEqual({
      fileCount: 2,
      totalBytes: 2_000,
    });
  });

  it("returns zero when nothing is selected", () => {
    expect(calculateCleanupSelection(categories, new Set())).toEqual({
      fileCount: 0,
      totalBytes: 0,
    });
  });
});
