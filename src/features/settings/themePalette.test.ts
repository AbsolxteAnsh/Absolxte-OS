import { describe, expect, it } from "vitest";

import { ACCENTS, parseStoredSettings } from "./settings";

describe("theme palette", () => {
  it("offers a broad set of persisted accent colors", () => {
    expect(ACCENTS).toEqual([
      "violet",
      "blue",
      "indigo",
      "cyan",
      "teal",
      "emerald",
      "amber",
      "rose",
      "red",
      "monochrome",
    ]);
    expect(parseStoredSettings('{"accent":"emerald"}').accent).toBe("emerald");
  });
});
