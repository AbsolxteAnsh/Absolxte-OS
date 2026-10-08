# Fai1thful OS Architecture

## Current Project State

This workspace began as a fresh project folder with no existing application source. Phase 1 therefore creates a new Tauri, Rust, React, TypeScript, and Vite foundation.

Rust/Cargo were not available on PATH during initial inspection. The scaffold is prepared for Tauri, but native build validation requires the Rust toolchain to be installed or exposed on PATH.

## Goals

Fai1thful OS is a local-first Windows control center. It must provide real system functionality, truthful unavailable states, strong safety boundaries, and a cohesive visual identity based on the supplied logo.

## Frontend

The frontend is a React application organized around product features.

```text
src/
  app/
  components/
    layout/
    primitives/
    data-display/
    feedback/
  features/
    overview/
    performance/
    processes/
    apps/
    startup/
    storage/
    network/
    profiles/
    launcher/
    system/
    developer/
    settings/
    command-center/
  hooks/
  lib/
  styles/
  types/
```

Frontend responsibilities:

- Render the application shell.
- Manage transient UI state.
- Call typed Tauri wrappers.
- Display loading, unavailable, and error states truthfully.
- Keep design tokens centralized.

## Backend

The backend is a Tauri Rust application with narrow commands and feature services.

```text
src-tauri/src/
  commands/
  services/
  models/
  platform/
  persistence/
  validation/
  errors/
```

Backend responsibilities:

- Gather system data using safe native APIs and maintained crates.
- Validate all inputs from the frontend.
- Perform process, storage, launcher, and profile actions only through explicit commands.
- Return structured results and structured errors.
- Avoid privileged or destructive behavior unless the user explicitly approves.

## Command Boundary

The frontend must not receive generic privileged execution capabilities. Tauri commands should be narrow and task-specific.

Initial commands:

- `get_system_snapshot`
- `get_processes`
- `get_app_status`
- `get_settings`
- `save_settings`

Later phases will add storage scanning, process termination safeguards, startup management, profiles, launcher entries, and command center actions.

## Data Flow

1. React pages request data through typed wrappers in `src/lib/tauri.ts`.
2. Tauri commands call Rust services.
3. Services query Windows/system APIs or local configuration.
4. Commands return serializable models.
5. UI renders real data, unavailable states, or structured errors.

## Persistence

Persistent data will use a versioned local configuration file. Migrations must be explicit.

Persisted data will include settings, profiles, favorites, launcher entries, developer projects, saved commands, window state, and onboarding completion.

## Safety

All sensitive operations require explicit user action and confirmation. Critical process termination, cleanup, startup mutation, and command execution will use reusable confirmation flows.

## Performance

Telemetry should be batched into snapshots. The frontend should avoid excessive IPC calls and unbounded history arrays. Long-running scans must be cancellable.
