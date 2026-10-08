export const REFRESH_RATES = [500, 1000, 2000, 5000] as const;
export const DENSITIES = ["comfortable", "compact"] as const;
export const ACCENTS = ["violet", "blue", "indigo", "cyan", "teal", "emerald", "amber", "rose", "red", "monochrome"] as const;
export const MOTION_MODES = ["full", "reduced", "off"] as const;

export type RefreshRate = (typeof REFRESH_RATES)[number];
export type Density = (typeof DENSITIES)[number];
export type Accent = (typeof ACCENTS)[number];
export type MotionMode = (typeof MOTION_MODES)[number];

export type AppSettings = {
  refreshMs: RefreshRate;
  density: Density;
  accent: Accent;
  motion: MotionMode;
};

export const DEFAULT_SETTINGS: AppSettings = {
  refreshMs: 1000,
  density: "comfortable",
  accent: "violet",
  motion: "full",
};

const STORAGE_KEY = "absolxte.settings.v1";

function includes<T extends string | number>(values: readonly T[], value: unknown): value is T {
  return values.some((candidate) => candidate === value);
}

export function parseStoredSettings(value: string | null): AppSettings {
  if (!value) return { ...DEFAULT_SETTINGS };

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...DEFAULT_SETTINGS };
    }

    const candidate = parsed as Record<string, unknown>;
    const refreshMs = candidate.refreshMs ?? DEFAULT_SETTINGS.refreshMs;
    const density = candidate.density ?? DEFAULT_SETTINGS.density;
    const accent = candidate.accent ?? DEFAULT_SETTINGS.accent;
    const motion = candidate.motion ?? DEFAULT_SETTINGS.motion;

    if (
      !includes(REFRESH_RATES, refreshMs) ||
      !includes(DENSITIES, density) ||
      !includes(ACCENTS, accent) ||
      !includes(MOTION_MODES, motion)
    ) {
      return { ...DEFAULT_SETTINGS };
    }

    return { refreshMs, density, accent, motion };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function loadSettings(): AppSettings {
  return parseStoredSettings(localStorage.getItem(STORAGE_KEY));
}

export function settingsAttributes(settings: AppSettings) {
  return {
    accent: settings.accent,
    density: settings.density,
    motion: settings.motion,
  } as const;
}

export function applySettings(settings: AppSettings): void {
  const attributes = settingsAttributes(settings);
  document.documentElement.dataset.accent = attributes.accent;
  document.documentElement.dataset.density = attributes.density;
  document.documentElement.dataset.motion = attributes.motion;
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
