---
name: Node 22 runtime checks
description: pnpm engine warnings may disagree with the Node version used by the running app.
---

When Node.js 22 is installed, pnpm may still print an engine warning that says its current runtime is Node 24, while shell commands and the running API process use Node 22.

**Why:** The package manager's reported runtime differed from the executable used by the app.

**How to apply:** If a task requires an exact Node version, verify the launched app process before changing toolchain settings based only on pnpm's warning.
