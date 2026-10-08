import { describe, expect, it } from "vitest";

import { isWindowDragTarget } from "./windowInteraction";

function targetWithClosest(match: boolean) {
  return {
    closest: (_selector: string) => (match ? { tagName: "BUTTON" } : null),
  };
}

describe("isWindowDragTarget", () => {
  it("allows the primary button on unused title bar space", () => {
    expect(
      isWindowDragTarget({ button: 0, target: targetWithClosest(false) }),
    ).toBe(true);
  });

  it("blocks controls and their descendants from starting a drag", () => {
    expect(
      isWindowDragTarget({ button: 0, target: targetWithClosest(true) }),
    ).toBe(false);
  });

  it("blocks secondary mouse buttons", () => {
    expect(
      isWindowDragTarget({ button: 2, target: targetWithClosest(false) }),
    ).toBe(false);
  });
});
