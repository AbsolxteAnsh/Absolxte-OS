export function normalizeLauncherName(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 48);
}
