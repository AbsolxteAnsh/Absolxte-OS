import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_SETTINGS,
  applySettings,
  parseStoredSettings,
  saveSettings,
  settingsAttributes,
} from "./settings";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseStoredSettings", () => {
  it("fills missing fields in a valid older settings payload", () => {
    expect(parseStoredSettings('{"accent":"blue","refreshMs":2000}')).toEqual({
      refreshMs: 2000,
      density: "comfortable",
      accent: "blue",
      motion: "full",
    });
  });

  it("falls back completely when a supplied value is invalid", () => {
    expect(parseStoredSettings('{"refreshMs":13,"accent":"pink"}')).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it("falls back when storage does not contain a JSON object", () => {
    expect(parseStoredSettings("[]")).toEqual(DEFAULT_SETTINGS);
    expect(parseStoredSettings("not json")).toEqual(DEFAULT_SETTINGS);
  });
});

describe("settings effects", () => {
  it("maps appearance settings to the root data attributes", () => {
    expect(
      settingsAttributes({ ...DEFAULT_SETTINGS, density: "compact" }),
    ).toEqual({
      accent: "violet",
      density: "compact",
      motion: "full",
    });
  });

  it("applies all appearance attributes to the document root", () => {
    const dataset: Record<string, string> = {};
    vi.stubGlobal("document", { documentElement: { dataset } });

    applySettings({
      ...DEFAULT_SETTINGS,
      accent: "red",
      density: "compact",
      motion: "off",
    });

    expect(dataset).toEqual({
      accent: "red",
      density: "compact",
      motion: "off",
    });
  });

  it("persists settings under the versioned storage key", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { setItem });

    saveSettings({ ...DEFAULT_SETTINGS, accent: "monochrome" });

    expect(setItem).toHaveBeenCalledWith(
      "fai1thful.settings.v1",
      '{"refreshMs":1000,"density":"comfortable","accent":"monochrome","motion":"full"}',
    );
  });
});