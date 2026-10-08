# Window Controls, Theme, And Functional Polish Design

## Scope

This pass makes the custom Fai1thful OS window behave like a normal Windows desktop application, makes the existing appearance and monitoring settings visibly effective, and audits every enabled control for real behavior. It does not add new product areas such as startup management or storage cleanup.

## Native Window Behavior

Window operations will be exposed as narrow Rust Tauri commands:

- minimize the current window
- toggle maximize and restore
- close the current window
- start a native drag operation
- query whether the window is maximized

The title bar will start dragging only from unused title-bar space. Buttons, inputs, command-center controls, and navigation remain interactive. Double-clicking unused title-bar space toggles maximize and restore. The maximize button changes its accessible label and icon when the window is maximized.

All native failures return the existing structured application error instead of disappearing silently.

## UI Structure

The title bar will move into a focused component instead of adding more responsibility to the large application shell. Window command wrappers remain in `src/lib/tauri.ts`.

Spacing will follow a consistent rhythm:

- 24px page-section spacing
- 16px card and grid spacing
- 20px standard panel padding
- 40px command and window-control height
- equal-height grid children where items are peers
- responsive four, two, and one-column grid behavior

The layout will preserve compact dashboard typography, restrained borders, and a black/charcoal base. Violet and alternate accents remain interaction colors, not page surfaces.

## Theme And Settings Behavior

Appearance settings will map to document-level data attributes and central CSS tokens.

- Violet: default Fai1thful identity
- Blue: cool high-contrast interaction accent
- Red: controlled red interaction accent without turning panels red
- Monochrome: neutral white/gray interaction accent

Density changes spacing and control heights without shrinking readable text. Comfortable is the default; compact reduces page, panel, row, and grid spacing consistently.

Motion has three states:

- Full: standard 120-220ms transitions
- Reduced: opacity and color transitions only
- Off: transitions and decorative motion disabled

The operating system reduced-motion preference is an upper bound: the application never forces full motion when Windows requests reduced motion.

Monitoring refresh settings must immediately recreate the telemetry interval at the selected 500ms, 1s, 2s, or 5s cadence.

Settings and profiles remain local. Stored values will be parsed and validated so malformed or obsolete local data falls back to safe defaults rather than breaking startup.

## Functional Audit

Every enabled control must lead to an observable result:

- window controls invoke native commands
- sidebar navigation changes page content
- sidebar collapse changes shell width
- Ctrl+K opens, filters, keyboard-navigates, and executes commands
- quick controls invoke validated native targets or configured profiles
- process refresh performs a fresh process query without reloading the application
- process termination keeps confirmation and Rust-side protected-process checks
- latency test performs only the explicit endpoint test
- profile creation, action selection, activation, and persistence work
- launcher buttons invoke validated native targets
- developer shortcuts invoke validated native targets
- appearance, density, motion, and refresh controls update behavior and persist
- dismiss buttons remove their notices

Unavailable capabilities remain explanatory text or empty states, with no enabled decorative controls.

## Error Handling

Frontend wrappers return typed success or failure results. Title-bar errors surface as concise status notices when the window remains available. Close does not need a success notice because the window exits. Native commands operate only on the invoking application window and accept no arbitrary path, command, or privileged input.

## Testing And Verification

Automated frontend tests will cover:

- settings parsing and fallback behavior
- theme and density attribute mapping
- process refresh state behavior
- command search and process filtering regressions
- profile persistence and action planning

Rust tests will cover input validation and protected-process rejection where the behavior does not require a live window. Native window controls will be verified in the packaged Tauri application because their behavior requires an actual Windows window.

The final verification matrix includes:

- all frontend tests
- TypeScript and Vite production build
- warning-free Cargo tests and compile check
- NSIS release build
- launch packaged executable
- drag window to a new position
- minimize and restore
- maximize and restore by button
- maximize and restore by title-bar double-click
- close and relaunch
- visit every tab
- exercise every enabled control
- test all four accents
- test both densities
- test all motion modes
- test every refresh interval
- resize at desktop and minimum supported dimensions

If desktop automation is unavailable, process and window-handle checks will still be recorded, and the unavailable visual checks will be reported explicitly rather than inferred.

## Definition Of Done

The pass is complete only when the native installer rebuilds, the packaged window responds to all four window behaviors, settings visibly affect the interface and survive relaunch, every enabled control has an observable real result, and no automated verification command reports a failure or warning.
