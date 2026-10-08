# Windows Parity And Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete safe PC Manager parity surfaces, expand themes, and publish a tested Windows release.

**Architecture:** Use documented Windows settings and reversible startup interfaces. Potentially unsafe undocumented repair behavior remains an unavailable state with a direct supported Windows settings alternative.

**Tech Stack:** Rust registry APIs, Windows settings URIs, React, CSS tokens, GitHub Actions.

## Global Constraints

- Startup changes must be reversible and limited to supported user registry entries.
- Windows Security, Update, Storage Sense, Default Apps, and notification tools open documented native settings.
- No security setting changes, Defender exclusions, service disabling, or undocumented taskbar mutation.

---

### Task 1: Health, Startup, And Toolbox

- [ ] Test startup entry parsing and supported-state classification.
- [ ] Add startup inventory with reversible enable/disable where supported.
- [ ] Add local health checks and fixed Windows Security/Update/Storage/Default Apps/Notifications links.
- [ ] Add intelligent-boost thresholds as opt-in local settings without a background service.
- [ ] Verify and commit `feat: add Windows health and startup tools`.

### Task 2: Theme Expansion And Accessibility

- [ ] Extend strict setting enums/tests with green, cyan, amber, pink, and high-contrast.
- [ ] Add complete accent token sets and swatch-based theme controls.
- [ ] Verify focus contrast, compact layout, reduced/off motion, and minimum window size.
- [ ] Commit `feat: expand accessible appearance themes`.

### Task 3: Release And Publication

- [ ] Run frontend and Rust gates.
- [ ] Build NSIS and portable artifacts and record SHA-256 checksums.
- [ ] Launch the portable app and verify a responsive window.
- [ ] Push all commits to `origin/main`.
- [ ] Remove verified generated Cargo/Vite caches inside the workspace.
