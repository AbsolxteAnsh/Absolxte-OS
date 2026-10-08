import type { InstalledApp, RunningApp } from "../../types/system";

function normalizedQuery(query: string): string {
  return query.trim().toLocaleLowerCase();
}

export function filterInstalledApps(apps: InstalledApp[], query: string): InstalledApp[] {
  const value = normalizedQuery(query);
  if (!value) return apps;

  return apps.filter((app) =>
    [app.name, app.publisher, app.version, app.installLocation]
      .filter((field): field is string => Boolean(field))
      .some((field) => field.toLocaleLowerCase().includes(value)),
  );
}

export function filterRunningApps(apps: RunningApp[], query: string): RunningApp[] {
  const value = normalizedQuery(query);
  if (!value) return apps;

  return apps.filter((app) =>
    [app.name, app.path].some((field) => field.toLocaleLowerCase().includes(value)),
  );
}

export function runningAppInitial(name: string): string {
  return name.trim().charAt(0).toLocaleUpperCase() || "?";
}
