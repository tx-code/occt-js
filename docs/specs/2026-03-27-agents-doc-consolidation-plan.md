# Agent Docs Consolidation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce `AGENTS.md` as the repository's primary agent instruction file and reduce `CLAUDE.md` to a compatibility pointer.

**Architecture:** Keep one substantive repo-level agent document and one thin Claude-specific shim. Move the current repository guidance out of `CLAUDE.md`, preserve the updated Wasm build notes already in the worktree, and document web/desktop boundaries in `AGENTS.md`.

**Tech Stack:** Markdown, git

---

## Chunk 1: Consolidate Agent Docs

### Task 1: Create the primary repo guidance file

**Files:**
- Create: `AGENTS.md`
- Reference: `CLAUDE.md`
- Reference: `demo/package.json`

- [ ] **Step 1: Draft `AGENTS.md` with the repo-level sections**

Include:

- project overview
- repository structure
- Wasm build and test entry points
- web vs desktop boundaries
- key implementation files and architecture notes
- release and artifact caveats

- [ ] **Step 2: Make sure build commands reflect the current worktree direction**

The guidance must preserve the current Windows Wasm notes already added to `CLAUDE.md`:

- `git submodule update --init --recursive occt`
- `tools\\setup_emscripten_win.bat`
- `npm run build:wasm:win`
- `npm test`

- [ ] **Step 3: Keep the file concise and tool-agnostic**

Do not add Claude-specific workflow instructions into `AGENTS.md`.

### Task 2: Reduce `CLAUDE.md` to a pointer

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace the long-form contents with a short compatibility shim**

Required content:

- identify `CLAUDE.md` as a Claude Code compatibility file
- direct Claude to `AGENTS.md`
- state that `AGENTS.md` is the authoritative source

- [ ] **Step 2: Ensure no substantive repo instructions remain duplicated**

`CLAUDE.md` should not keep separate build or architecture sections.

### Task 3: Verify the consolidation

**Files:**
- Test: `AGENTS.md`
- Test: `CLAUDE.md`

- [ ] **Step 1: Read both files back**

Verify:

- `AGENTS.md` contains the real guidance
- `CLAUDE.md` is only a pointer

- [ ] **Step 2: Check git diff scope**

Run:

```bash
git diff -- AGENTS.md CLAUDE.md docs/specs/2026-03-27-agents-doc-consolidation-plan.md
```

Expected:

- only the new plan file
- new `AGENTS.md`
- reduced `CLAUDE.md`
