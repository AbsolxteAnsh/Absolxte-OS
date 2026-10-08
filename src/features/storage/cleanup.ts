import type { CleanupCategory } from "../../types/system";

export interface CleanupSelection {
  fileCount: number;
  totalBytes: number;
}

export function calculateCleanupSelection(
  categories: CleanupCategory[],
  selectedIds: ReadonlySet<string>,
): CleanupSelection {
  return categories.reduce<CleanupSelection>(
    (selection, category) => {
      if (!selectedIds.has(category.id)) return selection;

      return {
        fileCount: selection.fileCount + category.fileCount,
        totalBytes: selection.totalBytes + category.totalBytes,
      };
    },
    { fileCount: 0, totalBytes: 0 },
  );
}

export function formatStorageBytes(value: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = Math.max(0, value);
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
