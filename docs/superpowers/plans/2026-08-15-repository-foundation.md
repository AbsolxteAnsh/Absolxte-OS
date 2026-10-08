# Repository Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a clean, reproducible baseline repository with documentation and CI.

**Architecture:** Source history excludes generated binaries and caches. GitHub Actions runs the same frontend and Rust gates used locally.

**Tech Stack:** Git, GitHub Actions, npm, Vitest, TypeScript, Rust, Tauri 2.

## Global Constraints

- Do not commit `node_modules`, `dist`, Cargo targets, local settings, logs, or release executables.
- Keep the project rooted at this folder, not the parent home-directory repository.
- Commit and push only after verification.

---

### Task 1: Public Repository Baseline

**Files:**
- Create: `.gitignore`
- Create: `LICENSE`
- Modify: `README.md`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: reproducible contributor commands and a CI gate for later feature commits.

- [ ] Add generated-file exclusions and public project documents.
- [ ] Configure CI to run `npm ci`, `npm test`, `npm run build`, `cargo fmt --check`, `cargo test`, and `cargo check` on Windows.
- [ ] Run `git status --short --ignored` and confirm secrets, caches, and binaries are excluded.
- [ ] Run the current frontend and Rust gates.
- [ ] Commit with `chore: establish public repository baseline` and push `main`.
