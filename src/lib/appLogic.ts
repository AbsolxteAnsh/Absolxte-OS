import type { CommandEntry, ProcessInfo } from "../types/system";

export function filterProcesses(processes: ProcessInfo[], query: string): ProcessInfo[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return processes;
  }

  return processes.filter((process) =>
    [process.name, process.path ?? "", process.status].some((value) =>
      value.toLowerCase().includes(normalized)
    )
  );
}

export function searchCommands(entries: CommandEntry[], query: string): CommandEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return entries;
  }

  return entries
    .map((entry) => {
      const label = entry.label.toLowerCase();
      const keywords = entry.keywords.map((keyword) => keyword.toLowerCase());
      const score = label === normalized ? 0 : label.startsWith(normalized) ? 1 : keywords.includes(normalized) ? 2 : 3;
      return { entry, score };
    })
    .filter(({ entry }) =>
      [entry.label, ...entry.keywords].some((value) => value.toLowerCase().includes(normalized))
    )
    .sort((left, right) => left.score - right.score || left.entry.label.localeCompare(right.entry.label))
    .map(({ entry }) => entry);
}
