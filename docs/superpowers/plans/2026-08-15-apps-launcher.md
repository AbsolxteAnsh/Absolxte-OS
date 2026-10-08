# Apps, Uninstall, And Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native installed-app experience with icons, close/uninstall actions, and persistent custom launcher buttons.

**Architecture:** Rust reads Windows uninstall registry views and extracts icons. Registered uninstall commands are parsed and launched server-side; React never submits command lines. Launcher entries originate from a native executable picker and are validated again on every launch.

**Tech Stack:** Rust Windows APIs/registry, Tauri dialog, React, local versioned persistence.

## Global Constraints

- Permit launcher files only when selected by the user and ending in `.exe` or `.lnk`.
- Never expose arbitrary shell execution.
- Close uses validated PIDs and existing protected-process rules.
- Leftover removal is individually selected and path constrained.

---

### Task 1: Installed App Inventory And Icons

**Files:** create focused app models/services and `src/features/apps/AppsPage.tsx`; modify command registries and TS wrappers.

- [ ] Write failing tests for registry field normalization, duplicate merging, and display-icon parsing.
- [ ] Enumerate HKCU/HKLM 32-bit and 64-bit uninstall entries.
- [ ] Correlate running processes by canonical executable path and return cached PNG icon data when available.
- [ ] Add searchable app rows with icon, publisher, version, size, running state, and Close.
- [ ] Verify and commit `feat: add native app inventory and controls`.

### Task 2: Safe Deep Uninstall

- [ ] Write failing tests for MSI and quoted executable uninstall parsing plus unsafe command rejection.
- [ ] Launch only the registry-recorded uninstaller after confirmation.
- [ ] Scan trusted install locations for leftovers after completion and show individual unchecked selections.
- [ ] Require a Rust plan token for leftover deletion.
- [ ] Verify and commit `feat: add reviewed deep uninstall`.

### Task 3: Custom Launcher

- [ ] Write failing tests for launcher persistence migration and executable/shortcut validation.
- [ ] Add native file picker and metadata/icon extraction.
- [ ] Add create, rename, remove, and launch controls with versioned persistence.
- [ ] Revalidate every path and reject missing/non-file targets before launch.
- [ ] Verify and commit `feat: add custom app launcher`.
