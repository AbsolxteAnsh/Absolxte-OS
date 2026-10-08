# Absolxte OS Agent Guide

## Product Philosophy

Build a real Windows control center, not a mock dashboard. Every control must either work truthfully or be clearly marked unavailable.

The visual source of truth is the supplied Absolxte OS logo: black base, white text, restrained violet accents, subtle eclipse motif, premium minimal futurism.

## Architecture Rules

- Keep React presentation, feature state, Tauri command wrappers, Rust commands, Rust services, models, persistence, validation, and errors separate.
- Do not put the React app in one large `App.tsx`.
- Do not put the Rust backend in one large `main.rs` or `lib.rs`.
- Organize by feature when behavior belongs to one product area.
- Prefer narrow interfaces and explicit models.

## TypeScript Rules

- Use strong types.
- Avoid `any`.
- Keep Tauri invocation wrappers in `src/lib/tauri.ts`.
- Treat unavailable native data as a first-class state.

## Rust Safety Rules

- Avoid `.unwrap()` in production paths.
- Validate every frontend-provided path, PID, command, ID, and setting.
- Return structured errors.
- Never expose arbitrary privileged execution to the frontend.
- Prefer least privilege.

## Styling Rules

- Use `src/styles/tokens.css` for colors, spacing, radius, and shadows.
- Purple is an accent, not a surface.
- Avoid RGB gaming, cyberpunk clutter, heavy glow, and thick neon borders.
- Use the eclipse motif sparingly.

## Testing Requirements

Prioritize tests for settings persistence, migrations, profile action planning, storage calculations, byte formatting, telemetry normalization, process filtering, command search, startup entry parsing, path validation, and error conversion.

## Never Rules

- Never fake telemetry.
- Never silently delete user data.
- Never modify protected Windows areas without explicit approval.
- Never disable safety checks to make validation pass.
- Never replace failing real functionality with mock data.
