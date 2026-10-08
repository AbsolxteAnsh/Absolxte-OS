# Truthful Telemetry and Native Controls Design

## Objective

Fai1thful OS will report CPU and network activity only when Windows has supplied a valid sampled value, ask for genuine permission before privileged changes, replace shortcut-only system cards with embedded controls where Windows exposes a supported interface, and clearly identify settings that Windows reserves for its own user interface.

This release also adds a built-in Windows driver updater, richer data-driven metric motion, independently scrollable app inventories, exact 720p brand assets, and responsive layout verification with no overlapping controls or text.

## Product Rules

- Never substitute zero for missing, warming, stale, invalid, or inaccessible telemetry.
- Never animate fabricated values or placeholder histories.
- Never report a Windows setting change as successful until a native read-back matches the requested value.
- Never run the main application elevated by default.
- Never expose arbitrary PowerShell, command-line, registry, update, or privileged execution to the frontend.
- Every privileged action requires an in-app review followed by a genuine Windows UAC prompt.
- Every Windows-controlled setting must be visibly labeled rather than presented as editable.
- Permission denial, UAC cancellation, policy restrictions, unsupported Windows versions, and native API failures remain visible states.

## Telemetry Architecture

### Persistent Sampling

`TelemetryState` will own one mutex-protected `TelemetrySampler`. The sampler retains the `sysinfo::System` CPU state and Windows network-interface counters across commands. A request will refresh the existing sampler rather than constructing a new `System` object.

CPU usage requires two measurements separated by a valid sampling interval. The first request, a request made too soon, or a failed refresh returns no percentage and a `warmingUp` or `unavailable` status. Once ready, the sampler reports the average Windows CPU usage and retains processor metadata.

Network sampling uses Windows interface counters for operational, non-loopback interfaces. It keeps previous counters per stable interface identifier, rejects counter resets and impossible elapsed intervals, calculates each valid interface delta over monotonic elapsed time, and aggregates valid connected interfaces. Adapter names are returned as a list so the UI does not imply that a VPN, virtual adapter, or physical interface is the sole source of all traffic.

### Telemetry Contract

CPU and network rate fields become nullable. Each sampled section includes:

- `status`: `warmingUp`, `ready`, `stale`, or `unavailable`.
- `sampledAt`: the Windows sample timestamp when a real value exists.
- `source`: a fixed backend-owned description of the native source.
- `message`: an optional concise reason for a non-ready state.

A measured zero remains `ready` with value `0`. An absent value is rendered as `Warming up`, `Stale`, or `Unavailable`; it is never rendered as `0%` or `0 B/s`.

Snapshots with invalid floating-point values, percentages outside `0..=100`, counters that move backward, or timestamps older than the stale threshold are rejected at the backend boundary.

## Permissions

The application runs with the current user's standard token. A native permission-status command reports whether the current process is elevated and which action categories require elevation.

Every action is assigned one capability state:

- `editable`: supported for the current user without elevation.
- `administratorRequired`: supported, but requires explicit elevation.
- `windowsControlled`: Windows requires its own user-driven interface or exposes no supported write mechanism.
- `unavailable`: unsupported by this Windows version, device, edition, or policy.

Selecting an administrator-required action opens an in-app review dialog containing the setting, current value, requested value, likely system effect, and possible restart requirement. Only the review confirmation may invoke the fixed elevated helper. Windows then displays UAC. The UI distinguishes approval, cancellation, access denial, partial completion, reboot required, and policy blocking.

The frontend supplies only backend-issued IDs and validated enum values. It never supplies executable paths, scripts, registry paths, arbitrary arguments, or update query strings.

## Driver Updater

### Scan

The driver page uses Windows Update Agent to search online with the fixed criteria `IsInstalled=0 and IsHidden=0 and Type='Driver'`. Results contain a backend-issued plan ID, Windows Update identity and revision, title, driver manufacturer, model, class, version/date when available, download size when available, EULA state, reboot behavior, and selection eligibility.

The scan is read-only and does not request elevation unless Windows policy itself denies the search. Results expire and cannot be installed after expiration. A new scan invalidates the previous plan.

### Installation

The user selects individual driver updates, reviews the exact list, and confirms the elevation request. A small fixed-purpose elevated helper receives only an opaque plan reference and update identities. It reopens Windows Update Agent, repeats the fixed driver-only query, matches each identity and revision, rejects anything not in the reviewed plan, handles required EULAs explicitly, downloads selected updates, and installs only the matched collection.

The helper returns per-update results through an application-owned result file with restrictive permissions. The main process validates the result schema, plan nonce, and update identities before rendering progress or completion. The helper cannot execute arbitrary commands or install non-driver updates.

The UI reports searching, review-ready, awaiting-UAC, downloading, installing, completed, failed, cancelled, and reboot-required states. It never claims a driver is current merely because no result was returned; scan failures remain failures.

## Embedded Windows Controls

The existing Windows toolbox becomes a set of in-app management panels. Each panel reads native state first and renders its capability badge prominently.

### Directly Editable

- Documented per-user taskbar settings supported by the current Windows build, including alignment, Task View visibility, widgets visibility, show-desktop corner, button grouping, and flashing where available.
- Fai1thful OS application preferences, including refresh rate, density, theme, and motion.
- Existing installed-app review, uninstall flow, storage-cleanup selections, memory boost, launcher entries, and process/app actions.

Every write validates its enum or boolean value, snapshots the prior value, writes through a narrow native service, reads the value back, and returns both requested and observed values.

### Administrator-Required

- Installation of selected Windows Update driver results.
- Network-adapter enable or disable actions when implemented for an adapter supported by Windows networking APIs.
- Machine-wide settings only when a documented Windows interface and deterministic read-back exist.

No privileged toggle appears unless the backend reports that the operation is supported on the current machine.

### Windows-Controlled or Read-Only

- Default application associations, which modern Windows requires the user to choose through Windows UI.
- Security controls protected by Windows Security, organizational policy, or tamper protection.
- Disk partitioning, formatting, and destructive volume operations.
- Settings whose only known write path is undocumented, opaque, or version-fragile.

These panels show truthful local state and a prominent `Windows controlled` badge. A secondary `Open Windows control` command may launch the fixed Microsoft destination, but it is never represented as an in-app edit.

### Startup, Storage, Network, Security, and Disks

- Startup presents discovered startup entries, their source, and supported state. Editing is enabled only for sources with a documented and reversible mechanism.
- Storage presents volume usage and the existing scan-first cleaner. Storage Sense policy is editable only when a supported setting and read-back are available; otherwise it is Windows controlled.
- Network presents adapter identity, operational state, addresses, link speed, and sampled throughput. Actions are capability-gated.
- Security presents read-only Windows protection and health state unless a documented user-level setting is available.
- Disks present read-only volume facts. Destructive disk management remains Windows controlled.

## Data Visualization

Metric visuals are driven only by accepted telemetry samples. The shared live-metric component provides:

- Animated numeric interpolation between the previous and current valid sample.
- A rolling sparkline generated from valid history only.
- A current-sample marker and subtle status pulse while new ready data arrives.
- Stable chart dimensions so changing labels and values cannot resize cards.
- No graph when fewer than two valid points exist.
- A clearly different warming, stale, or unavailable presentation.

`full` motion uses smooth interpolation and path transitions. `reduced` shortens interpolation and removes repeating effects. `off` changes values immediately and disables all animation. The operating-system reduced-motion preference remains authoritative.

## Layout and Scrolling

The Apps page receives its own scroll region below the sticky mode, status, and search controls. The list uses `scrollbar-gutter: stable`, keyboard-reachable rows, and a height derived from the available page stage. The page stage remains scrollable as a fallback.

All grid children receive `min-width: 0`. Long executable paths, update titles, adapter names, and status messages wrap or truncate with accessible titles. Button labels may wrap but may not overlap icons or adjacent controls. Responsive grid tracks are explicit at desktop, narrow desktop, and minimum-window breakpoints.

The duplicated and conflicting layout rules in `global.css` will be consolidated while preserving token ownership in `tokens.css`. Verification targets are `1280x820`, `1024x768`, and the configured minimum `960x640`, plus a narrow browser-only diagnostic viewport for wrapping behavior.

## Brand Assets

The display logo is exported as an exact `1280x720` PNG. The square application master is exported as an exact `720x720` PNG, and Windows `.ico` and standard Tauri sizes are regenerated from that master. Raster exports preserve the supplied black, white, and restrained violet appearance without stretching or cropping the wordmark.

Any in-app brand image uses the 1280x720 source and responsive CSS sizing. Native shell and taskbar icons use the square master-derived icon set.

## Error Handling

Native commands return structured application errors with a stable category, user-safe message, optional Windows error code, and whether retry or elevation is appropriate. Raw scripts, registry contents, command lines, and sensitive paths are not exposed in user-facing messages.

Long operations are mutually exclusive per feature. Closing or navigating away does not convert an unfinished operation into success. Driver installation survives UI polling interruptions through its validated result state. Stale plans and duplicate requests are rejected.

## Testing

Rust tests cover:

- CPU warm-up, valid interval, stale interval, invalid percentage rejection, and persistent sampler behavior.
- Network aggregation, excluded interfaces, counter reset, elapsed-time normalization, measured zero, and stale samples.
- Permission classification and structured access-denied conversion.
- Driver-only query planning, update identity validation, plan expiry, result validation, EULA handling, cancellation, partial failure, and reboot state.
- Settings capability discovery, value validation, prior-value capture, and read-back mismatch.

Frontend tests cover:

- Non-ready telemetry never formatting as zero.
- History excluding invalid and non-ready samples.
- Metric animation inputs containing only real data.
- Permission and capability badges.
- UAC review flow and cancellation handling.
- Driver selection and per-update result rendering.
- Apps-list scrolling classes and long-label wrapping behavior.

Release verification includes TypeScript compilation, Vitest, Rust tests, Cargo check, production Vite build, NSIS packaging, exact image-dimension checks, and screenshot inspection at every target viewport. The packaged application is launched unelevated and checked for a responsive window. Privileged test actions require explicit interactive approval and are never automated without consent.

## Release and Repository

The work is split into small commits for telemetry correctness, permissions, driver updating, native controls, visualization/layout, assets, and release packaging. Build caches are removed after verification while final portable and installer artifacts are retained under the ignored `outputs` directory. The final branch is pushed to the GitHub `main` branch only after all required verification passes.
