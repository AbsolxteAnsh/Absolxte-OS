# Contributing To Absolxte OS

Thank you for helping build a safer Windows control center.

## Development Setup

1. Install Node.js, npm, the Rust MSVC toolchain, and Microsoft WebView2.
2. Run `npm ci`.
3. Run `npm run tauri:dev` for the desktop development build.

## Required Checks

```powershell
npm test
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml --message-format short
```

## Safety Rules

- Never expose arbitrary command execution or path deletion to the frontend.
- Validate every PID, path, setting, and identifier in Rust.
- Destructive actions must use scan, review, confirmation, and execution phases.
- Do not replace missing native behavior with mock telemetry.
- Add tests for parsers, path boundaries, action plans, and error conversion.

Keep pull requests focused and explain the Windows versions used for manual
testing. Generated installers and portable executables belong in GitHub
Releases, not source commits.
