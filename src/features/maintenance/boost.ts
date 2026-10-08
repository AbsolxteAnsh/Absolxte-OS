import type { BoostResult } from "../../types/system";

function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export function describeBoostResult(result: BoostResult): string {
  if (result.releasedBytes > 0) {
    return `${formatMegabytes(result.releasedBytes)} MB released across ${result.processesTrimmed} processes.`;
  }

  return `${result.processesTrimmed} processes trimmed; Windows reported no measurable release yet.`;
}
