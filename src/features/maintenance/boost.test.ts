import { describe, expect, it } from "vitest";

import { describeBoostResult } from "./boost";

describe("describeBoostResult", () => {
  it("reports a measured release with the trimmed process count", () => {
    expect(
      describeBoostResult({
        beforeBytes: 8_000_000,
        afterBytes: 6_500_000,
        releasedBytes: 1_500_000,
        processesTrimmed: 4,
        processesSkipped: 10,
      }),
    ).toBe("1.4 MB released across 4 processes.");
  });

  it("does not claim a release when Windows reports no reduction", () => {
    expect(
      describeBoostResult({
        beforeBytes: 6_500_000,
        afterBytes: 6_700_000,
        releasedBytes: 0,
        processesTrimmed: 3,
        processesSkipped: 11,
      }),
    ).toBe("3 processes trimmed; Windows reported no measurable release yet.");
  });
});
