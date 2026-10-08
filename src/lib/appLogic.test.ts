import { describe, expect, it } from "vitest";
import { filterProcesses, searchCommands } from "./appLogic";

describe("process filtering", () => {
  it("matches process names and executable paths case-insensitively", () => {
    const result = filterProcesses(
      [
        { name: "Code.exe", pid: 12, cpuPercent: 4, memoryBytes: 1024, status: "Running", path: "C:\Apps\Microsoft VS Code\Code.exe" },
        { name: "Spotify.exe", pid: 13, cpuPercent: 1, memoryBytes: 2048, status: "Running", path: "C:\Apps\Spotify\Spotify.exe" }
      ],
      "microsoft"
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Code.exe");
  });
});

describe("command search", () => {
  it("ranks exact page and action matches before unrelated entries", () => {
    const result = searchCommands(
      [
        { id: "settings", label: "Open Settings", keywords: ["preferences"] },
        { id: "storage", label: "Open Storage", keywords: ["disk"] },
        { id: "gaming", label: "Activate Gaming Profile", keywords: ["profile", "games"] }
      ],
      "settings"
    );

    expect(result[0].id).toBe("settings");
    expect(result).toHaveLength(1);
  });
});
