# Fai1thful OS PC Manager Parity Design

## Product Goal

Prepare Fai1thful OS for public GitHub development and add safe, truthful Windows maintenance workflows comparable to Microsoft PC Manager without exposing arbitrary process execution, path deletion, or registry mutation to the webview.

## Safety Model

- Run without elevation by default.
- Represent elevation requirements as structured errors and offer an explicit UAC-backed restart.
- Split every destructive workflow into scan, review, confirm, and execute phases.
- Issue opaque operation tokens from Rust for cleanup and uninstall plans. Execute only a still-valid server-side plan.
- Canonicalize every filesystem path and reject protected roots, symlinks escaping a scanned root, frontend-provided cleanup roots, and paths outside allowlisted cleanup categories.
- Never delete Downloads, Documents, Desktop, user-selected files, browser profiles, cookies, saved sessions, or arbitrary registry keys automatically.
- Use the registered Windows uninstaller first. Leftovers are opt-in, individually selected, and restricted to app-specific paths discovered from trusted install metadata.
- Exclude system, protected, service-host, and Fai1thful OS processes from memory trimming and process termination.

## Native Architecture

- `telemetry`: persistent sampler state computes byte deltas over elapsed monotonic time and survives adapter changes or counter resets.
- `maintenance`: memory working-set trimming and cleanup scan/execute services.
- `apps`: registry inventory, running-app correlation, icon extraction/cache, registered uninstall launch, and reviewed leftover planning.
- `launcher`: validated executable and shortcut selection, persistence, and launching.
- `startup`: read-only-first startup inventory with reversible registry enable/disable for supported user entries.
- `windows`: elevation state/relaunch and fixed Windows Security, Update, Storage Sense, Default Apps, and Taskbar settings targets.

The frontend consumes only typed wrappers in `src/lib/tauri.ts`. Feature modules own their data loading and presentation. Unsupported capabilities remain visible explanatory states without enabled controls.

## User Experience

- Overview adds a truthful Boost action with before/after memory results.
- Storage becomes a scan-first cleaner with category selection, size/file counts, progress, and explicit deletion confirmation.
- Apps shows extracted icons, install metadata, running state, Close, Uninstall, and reviewed leftovers.
- Launcher supports Add App through a native picker, custom names, reorder/removal, and safe launching.
- Network uses stable rates and clearly shows adapter transitions/unavailable state.
- Settings adds green, cyan, amber, pink, and high-contrast accents.
- Permissions explain why elevation is needed before invoking Windows UAC.

## GitHub Publication

- Dedicated `main` repository at `https://github.com/Fai1th/Fai1thful-OS.git`.
- MIT license, generated-file exclusions, contributor/security documentation, CI for frontend and Rust checks, and release workflow for signed-or-unsigned build artifacts with checksums.
- Commit by independently verifiable feature slice. Never commit build caches, local settings, or release executables to source history.

## Verification

- Unit tests cover network delta normalization, path validation, cleanup planning, byte totals, protected process filtering, installed-app parsing, uninstall command parsing, launcher path validation, persistence migrations, and structured errors.
- Release gate runs frontend tests/build, Rust fmt/test/check, NSIS packaging, responsive-window launch check, and post-build generated-cache cleanup.
