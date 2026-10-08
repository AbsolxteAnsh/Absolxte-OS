# Absolxte OS

absolxte OS is a local-first Windows control center built with Tauri, Rust,
React, TypeScript, and Vite. It is not an operating system replacement.

The project favors truthful native behavior over decorative dashboard controls.
Unavailable Windows data is shown as unavailable, and sensitive operations are
validated in Rust before execution.

## Current Features

- Live CPU, memory, disk, elapsed-rate network, and uptime telemetry
- Safe memory boost using least-privilege Windows working-set trimming
- Scan-first storage cleanup for allowlisted temporary files, thumbnail caches,
  and crash dumps with explicit selection and confirmation
- Running-app inventory with native executable icons and safeguarded close actions
- Windows-registered installed-app inventory with reviewed, shell-free uninstall
  launching and UAC only after Windows reports elevation is required
- Persistent custom application launchers created through a native `.exe` picker
- Fixed Windows health toolbox for Update, Security, Startup Apps, Storage Sense,
  Installed Apps, defaults, taskbar, network, and Disk Management
- Ten persisted accent themes, density and motion controls
- Native draggable title bar with working minimize, maximize/restore, and close
- Local profiles, Ctrl+K command center, portable executable, and NSIS installer

Unsupported sensors and unfinished integrations display Unavailable or an
explicit explanation. The app never substitutes mock telemetry.

## Requirements

- Windows 10 or Windows 11
- Node.js and npm for development
- Rust stable MSVC toolchain for native builds
- Microsoft WebView2 runtime

## Development

    npm install
    npm run tauri:dev

## Testing And Building

    npm test
    npm run build
    cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
    cargo test --manifest-path src-tauri/Cargo.toml
    cargo check --manifest-path src-tauri/Cargo.toml
    npm run tauri:build -- --bundles nsis

## Architecture

See [Architecture](docs/ARCHITECTURE.md), the
[implementation plan](docs/IMPLEMENTATION_PLAN.md), and the
[QA checklist](docs/QA_CHECKLIST.md).

## Privacy And Safety

absolxte OS includes no analytics, tracking, account requirement, or cloud
synchronization. Network diagnostics run only when invoked. Native commands
validate identifiers and expose only fixed, least-privilege actions.

Storage cleanup uses scan, review, confirm, and execute phases. Uninstall actions
use Windows-registered commands, validated executable paths, and explicit UAC
consent. Please report security concerns according to
[SECURITY.md](SECURITY.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. By
participating, you agree to follow the safety constraints in
[AGENTS.md](AGENTS.md).

## License

absolxte OS is licensed under the [MIT License](LICENSE).
