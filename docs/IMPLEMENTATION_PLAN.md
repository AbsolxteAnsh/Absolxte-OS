# Fai1thful OS Implementation Plan

## Functional Native Slice

Status: Built and packaged as version 0.1.0.

Implemented and verified:

- Tauri, Rust, React, TypeScript, and Vite foundation
- Branded application shell, custom title bar, collapsible sidebar, and all navigation pages
- Consolidated CPU, memory, disk, network, and uptime snapshots
- Rolling performance history capped at 60 samples
- Native process inventory, search, details, and protected-process-aware termination
- Mounted-volume storage overview
- User-invoked TCP latency diagnostics
- Native operating system and hardware summary
- Fixed, validated Windows shortcuts for Terminal, Explorer, Task Manager, and Settings
- Locally persisted profiles that execute only explicitly selected fixed actions
- Functional launcher, Ctrl+K command center, and locally persisted appearance/monitoring settings
- Deterministic eclipse application icon, portable executable, and NSIS installer
- Honest unsupported states for GPU sensors, installed-app enumeration, startup management, storage scanning, and advanced developer diagnostics

Validation:

- npm test passes.
- npm run build passes without TypeScript or CSS warnings.
- cargo check passes.
- npm run tauri:build -- --bundles nsis produces a Windows executable and installer.
- The packaged executable launches with a responsive Fai1thful OS window.

## Next Phases

1. Split the page collection into feature-owned modules and add shared component tests.
2. Add Windows GPU telemetry with explicit hardware support detection.
3. Add reliable installed-app and reversible startup-item enumeration.
4. Add cancellable storage analysis and conservative cleanup previews.
5. Add versioned native persistence and window position/maximized-state restoration.
6. Expand profile actions with validated user-selected executables and per-action results.
7. Add saved launcher entries, project folders, Git summaries, and local port diagnostics.
8. Add onboarding, splash initialization, About/licenses, local diagnostics, and a full accessibility pass.
9. Expand Rust and frontend tests, then complete the manual QA checklist.

No unimplemented capability should be represented by an enabled control.
