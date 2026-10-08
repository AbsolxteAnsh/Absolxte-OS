# Fai1thful OS QA Checklist

This checklist covers only behavior exposed by the current build. A control must
produce a visible state change or a validated Tauri command result.

## Automated Gate

- [x] Frontend unit tests pass.
- [x] TypeScript and Vite production build pass without CSS warnings.
- [x] Rust tests pass.
- [x] Rust check passes without warnings.
- [x] NSIS release build succeeds.
- [x] Portable executable and installer hashes are recorded.

## Launch And Window

- [x] Packaged app opens a responsive Fai1thful OS window.
- [ ] Empty title bar space drags the window.
- [ ] Double-clicking empty title bar space toggles maximize and restore.
- [ ] Minimize hides the window and the taskbar restores it.
- [ ] Maximize changes to Restore and returns to the previous bounds.
- [ ] Close exits the invoking Fai1thful OS window.
- [ ] Window resizing does not clip controls at the configured minimum size.

## Navigation And Command Center

- [ ] Every sidebar tab opens its matching page.
- [ ] Sidebar collapse and expand both work.
- [ ] Ctrl+K opens Command Center and Escape closes it.
- [ ] Arrow keys move the highlighted command.
- [ ] Enter and pointer clicks execute the selected page, profile, or launcher action.
- [ ] Empty command searches display an unavailable result state.

## Monitoring And Processes

- [ ] CPU, memory, disk, network, and supported GPU values come from Rust.
- [ ] Unsupported telemetry displays Unavailable rather than synthetic values.
- [ ] Each refresh-rate setting changes the telemetry timer immediately.
- [ ] Process search filters name, path, PID, and status.
- [ ] Refresh queries the native inventory without reloading the app.
- [ ] Refresh disables and shows a busy state while querying.
- [ ] Process rows open the detail panel.
- [ ] Termination requires confirmation and protected PIDs are rejected in Rust.
- [ ] A successful termination refreshes the native inventory.

## Native Actions And Profiles

- [ ] Terminal, File Explorer, Task Manager, and Settings launch through validated targets.
- [ ] Project Folder launches only the fixed current application directory target.
- [ ] Profiles persist locally.
- [ ] Custom profiles can be created and configured.
- [ ] Empty profiles report that no actions are configured.
- [ ] Configured profiles report complete or partial native action results.
- [ ] The network latency test runs only after explicit submission.

## Appearance And Persistence

- [ ] Violet, blue, red, and monochrome visibly update shared accent tokens.
- [ ] Comfortable and compact density update page, panel, grid, row, and control geometry.
- [ ] Full, reduced, and off motion modes update transitions and animation.
- [ ] Windows reduced-motion preference overrides the in-app setting.
- [ ] All settings survive close and relaunch.
- [ ] Invalid stored settings fall back to validated defaults.
- [ ] Focus indicators remain visible in every accent theme.

## Truthful Unavailable States

The current build intentionally exposes no enabled controls for these areas:

- Installed-app enumeration, favorites, and startup-entry management.
- Recursive storage scanning, cancellation, cleanup, and deletion.
- Saved developer-project management.
- GPU telemetry on systems where Windows does not expose a supported counter.

These remain explanatory states until a validated native service exists.