# Window Controls, Theme, And Functional Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the custom Windows shell draggable and fully operable, make every existing setting visibly functional, normalize spacing, audit enabled controls, rebuild the installer, launch it, and remove disposable build clutter.

**Architecture:** Native window behavior lives in narrow Rust Tauri commands and typed frontend wrappers. A focused `TitleBar` component owns drag and window-control interaction, while settings parsing/application moves into a testable feature module. CSS data attributes drive accent, density, and motion without spreading theme conditionals through React.

**Tech Stack:** Tauri 2, Rust 1.97, React 18, TypeScript 5.6, Vite 6, Vitest 2, CSS custom properties, Windows 10/11.

## Global Constraints

- Every enabled control must produce a real observable result.
- Unsupported features remain explanatory unavailable states with no decorative enabled controls.
- Window operations act only on the invoking Fai1thful OS window.
- Purple and alternate accents remain interaction colors, not page surfaces.
- Density changes spacing and control dimensions, not readable font size.
- Windows reduced-motion preference is an upper bound.
- Cleanup may remove only generated caches and stale build outputs inside this workspace.
- Preserve source, documentation, `node_modules`, final installer, and portable executable.

---

### Task 1: Testable Settings Model

**Files:**
- Create: `src/features/settings/settings.ts`
- Create: `src/features/settings/settings.test.ts`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Produces: `AppSettings`, `DEFAULT_SETTINGS`, `parseStoredSettings(value: string | null): AppSettings`, `applySettings(settings: AppSettings): void`, and `saveSettings(settings: AppSettings): void`.
- Consumes: browser `localStorage` and `document.documentElement.dataset` only inside save/apply functions.

- [ ] **Step 1: Write failing parser and attribute tests**

```ts
expect(parseStoredSettings('{"accent":"blue","refreshMs":2000}')).toEqual({
  refreshMs: 2000,
  density: "comfortable",
  accent: "blue",
  motion: "full"
});
expect(parseStoredSettings('{"refreshMs":13,"accent":"pink"}')).toEqual(DEFAULT_SETTINGS);
expect(settingsAttributes({ ...DEFAULT_SETTINGS, density: "compact" })).toEqual({
  accent: "violet",
  density: "compact",
  motion: "full"
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because the settings module is missing**

Run: `npm test -- --run src/features/settings/settings.test.ts`

- [ ] **Step 3: Implement strict enum and refresh-interval normalization**

```ts
export const REFRESH_RATES = [500, 1000, 2000, 5000] as const;
export function parseStoredSettings(value: string | null): AppSettings {
  if (!value) return DEFAULT_SETTINGS;
  try {
    const candidate = JSON.parse(value) as Partial<AppSettings>;
    if (!REFRESH_RATES.includes(candidate.refreshMs as RefreshRate)) return DEFAULT_SETTINGS;
    if (!ACCENTS.includes(candidate.accent as Accent)) return DEFAULT_SETTINGS;
    if (!DENSITIES.includes(candidate.density as Density)) return DEFAULT_SETTINGS;
    if (!MOTION_MODES.includes(candidate.motion as MotionMode)) return DEFAULT_SETTINGS;
    return candidate as AppSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
```

- [ ] **Step 4: Replace inline settings definitions and persistence in `App.tsx` with the feature module**

- [ ] **Step 5: Run focused and full frontend tests**

Run: `npm test -- --run src/features/settings/settings.test.ts`
Run: `npm test`

### Task 2: Native Window Command Surface

**Files:**
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/lib/tauri.ts`

**Interfaces:**
- Produces Rust commands: `minimize_window`, `toggle_maximize_window`, `close_window`, `start_window_drag`, `is_window_maximized`.
- Produces TypeScript wrappers with the same behavior returning `CommandResult<boolean>`.

- [ ] **Step 1: Use the current packaged app to reproduce the unreliable frontend-only controls and retain the behavior as the failing integration case**

- [ ] **Step 2: Add narrow Rust commands receiving `tauri::WebviewWindow`**

```rust
#[tauri::command]
pub fn toggle_maximize_window(window: tauri::WebviewWindow) -> AppResult<bool> {
    let maximized = window.is_maximized().map_err(window_error)?;
    if maximized { window.unmaximize() } else { window.maximize() }
        .map_err(window_error)?;
    Ok(!maximized)
}
```

- [ ] **Step 3: Register all commands in `tauri::generate_handler!` and replace frontend `getCurrentWindow()` calls with `invoke` wrappers**

- [ ] **Step 4: Run warning-free native checks**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Run: `cargo check --manifest-path src-tauri/Cargo.toml --message-format short`

### Task 3: Focused Title Bar Component

**Files:**
- Create: `src/app/TitleBar.tsx`
- Create: `src/app/windowInteraction.ts`
- Create: `src/app/windowInteraction.test.ts`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: native window wrappers and the active page label.
- Produces: `TitleBar` with drag, double-click maximize, minimize, maximize/restore, close, and command-center callbacks.

- [ ] **Step 1: Write failing drag-target tests**

```ts
expect(isWindowDragTarget({ button: 0, target: bareTitlebarElement })).toBe(true);
expect(isWindowDragTarget({ button: 0, target: buttonChildElement })).toBe(false);
expect(isWindowDragTarget({ button: 2, target: bareTitlebarElement })).toBe(false);
```

- [ ] **Step 2: Run the focused test and confirm the helper is missing**

Run: `npm test -- --run src/app/windowInteraction.test.ts`

- [ ] **Step 3: Implement the drag-target guard using `closest("button, input, select, textarea, a, [data-no-drag]")`**

- [ ] **Step 4: Implement `TitleBar`, synchronize maximize state after toggle, and prevent control clicks from starting drag**

- [ ] **Step 5: Replace the inline title bar in `App.tsx` and run tests/build**

Run: `npm test`
Run: `npm run build`

### Task 4: Functional Refresh And Control Audit

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/lib/tauri.ts`

**Interfaces:**
- Produces: `refreshProcesses(): Promise<void>` shared by polling and the visible Refresh button.
- Preserves: confirmation before termination and backend protected-process validation.

- [ ] **Step 1: Extract process loading into a stable callback and pass it to the Processes page**

- [ ] **Step 2: Replace `window.location.reload()` with `refreshProcesses()` and show a disabled/busy state during the query**

- [ ] **Step 3: Audit all enabled buttons in `App.tsx`; remove or disable any control without an observable state change or native invocation**

- [ ] **Step 4: Run frontend tests and TypeScript build**

Run: `npm test`
Run: `npm run build`

### Task 5: Theme, Density, Motion, And Spacing Polish

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `data-accent`, `data-density`, and `data-motion` attributes on the root element.
- Produces: four accent token sets, two density layouts, and three motion modes.

- [ ] **Step 1: Add complete token overrides for violet, blue, red, and monochrome accents**

```css
:root[data-accent="blue"] {
  --accent: #2563eb;
  --accent-bright: #3b82f6;
  --accent-highlight: #60a5fa;
  --accent-muted: rgba(59, 130, 246, 0.14);
  --border-active: rgba(96, 165, 250, 0.34);
}
```

- [ ] **Step 2: Add density variables and route page, panel, grid, row, and control dimensions through them**

- [ ] **Step 3: Add full, reduced, and off motion selectors plus the operating-system reduced-motion override**

- [ ] **Step 4: Normalize title bar, page, grid, panel, form, table, and responsive spacing**

- [ ] **Step 5: Run the production build and reject all CSS parser warnings**

Run: `npm run build`

### Task 6: Release, Launch, Functional Verification, And Cleanup

**Files:**
- Modify: `docs/QA_CHECKLIST.md`
- Replace: `outputs/Fai1thful OS Portable.exe`
- Replace: `outputs/Fai1thful OS Setup 0.1.0.exe`

**Interfaces:**
- Produces: updated portable executable and NSIS installer.

- [ ] **Step 1: Run the full automated verification gate**

Run: `npm test`
Run: `npm run build`
Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Run: `cargo check --manifest-path src-tauri/Cargo.toml --message-format short`

- [ ] **Step 2: Build the NSIS release and copy both artifacts to `outputs`**

Run: `npm run tauri:build -- --bundles nsis`

- [ ] **Step 3: Launch the packaged executable and verify a responsive `Fai1thful OS` window handle**

- [ ] **Step 4: Exercise window drag, minimize/restore, maximize/restore, close/relaunch, every tab, every enabled control, every appearance option, every density, every motion mode, and every refresh interval**

- [ ] **Step 5: Resolve and verify exact cleanup targets inside the workspace, then remove `node_modules/.vite`, `src-tauri/target/debug`, Cargo incremental directories, stale `dist` contents superseded by the final build, and obsolete output binaries**

- [ ] **Step 6: Recheck artifact hashes and report any visual checks blocked by desktop automation explicitly**
