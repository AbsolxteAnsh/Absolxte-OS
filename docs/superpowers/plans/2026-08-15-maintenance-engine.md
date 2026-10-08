# Maintenance Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stable network telemetry, safe memory boost, and scan-first storage cleanup.

**Architecture:** Rust owns persistent sampling state and opaque cleanup plans. React can request scans and execute reviewed plan IDs but cannot submit deletion paths.

**Tech Stack:** Rust, sysinfo, Windows APIs, serde, Tauri state, React, Vitest.

## Global Constraints

- Never fake telemetry.
- Never accept arbitrary cleanup paths from the frontend.
- Never trim protected/system processes or the invoking app.
- Cleanup execution requires a current Rust-issued plan ID and selected allowlisted category IDs.

---

### Task 1: Network Rate Sampler

**Files:**
- Modify: `src-tauri/src/services/telemetry.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/src/services/telemetry.rs`

**Interfaces:**
- Produces: `NetworkRateSampler::sample(now, counters) -> NetworkSnapshot` with reset/adapter-change normalization.

- [ ] Write failing Rust tests for elapsed-time rate calculation, counter reset, and adapter change.
- [ ] Run `cargo test telemetry` and confirm failures.
- [ ] Implement persistent sampler state managed by Tauri.
- [ ] Run Rust tests/check and commit `fix: stabilize native network speed sampling`.

### Task 2: Memory Boost

**Files:**
- Create: `src-tauri/src/models/maintenance.rs`
- Create: `src-tauri/src/services/maintenance.rs`
- Modify: command/model/service registries and `src/lib/tauri.ts`
- Modify: overview UI module.

**Interfaces:**
- Produces: `boost_memory() -> BoostResult { before_bytes, after_bytes, released_bytes, processes_trimmed, processes_skipped }`.

- [ ] Write failing tests for protected-process filtering and saturating released-byte calculation.
- [ ] Implement eligible-process planning and Windows working-set trimming.
- [ ] Add typed command wrapper and visible Boost result UI.
- [ ] Run all tests/build and commit `feat: add safe memory boost`.

### Task 3: Storage Cleaner

**Files:**
- Extend maintenance models/service/commands.
- Create: `src/features/storage/StoragePage.tsx`
- Create tests for pure cleanup selection totals.

**Interfaces:**
- Produces: `scan_cleanup() -> CleanupPlan` and `execute_cleanup(plan_id, category_ids) -> CleanupResult`.

- [ ] Write failing path validation and cleanup total tests.
- [ ] Implement allowlisted user-temp, thumbnail-cache, crash-dump, and Recycle Bin scan categories.
- [ ] Implement opaque in-memory plans with expiry and revalidation before deletion.
- [ ] Add review/selection/confirmation UI and elevation-required state.
- [ ] Run all gates and commit `feat: add scan-first storage cleaner`.
