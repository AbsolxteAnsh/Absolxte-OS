import { describe, expect, it } from "vitest";

import type { InstalledApp, RunningApp } from "../../types/system";
import { filterInstalledApps, filterRunningApps, runningAppInitial } from "./apps";

const installedApps: InstalledApp[] = [
  {
    id: "one",
    name: "Faith Editor",
    publisher: "Fai1th",
    version: "1.2.0",
    installLocation: "C:\\Program Files\\Faith Editor",
    estimatedSizeBytes: 2048,
    iconDataUrl: null,
    uninstallAvailable: true,
    mayRequireElevation: true,
  },
  {
    id: "two",
    name: "Notes",
    publisher: "Local Tools",
    version: null,
    installLocation: null,
    estimatedSizeBytes: null,
    iconDataUrl: null,
    uninstallAvailable: true,
    mayRequireElevation: false,
  },
];

const runningApps: RunningApp[] = [
  {
    name: "faith.exe",
    pid: 42,
    memoryBytes: 1024,
    path: "C:\\Apps\\Faith\\faith.exe",
    iconDataUrl: null,
  },
];

describe("app inventory filtering", () => {
  it("matches installed apps by name, publisher, or location", () => {
    expect(filterInstalledApps(installedApps, "program files")).toEqual([installedApps[0]]);
    expect(filterInstalledApps(installedApps, "local tools")).toEqual([installedApps[1]]);
  });

  it("matches running apps by executable path", () => {
    expect(filterRunningApps(runningApps, "apps\\faith")).toEqual(runningApps);
  });

  it("creates a stable readable fallback initial", () => {
    expect(runningAppInitial("  faith.exe ")).toBe("F");
    expect(runningAppInitial("")) .toBe("?");
  });
});
