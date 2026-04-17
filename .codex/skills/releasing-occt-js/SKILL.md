---
name: releasing-occt-js
description: Use when preparing or executing a new @tx-code/occt-js release from this repository, especially before bumping versions, publishing to npm, or pushing the release commit.
---

# Releasing occt-js

## Overview

This skill is a thin release shim for `occt-js`.

Repository-wide policy lives in `AGENTS.md`. Use that file as the source of truth for release boundaries, root-vs-secondary surfaces, and conditional secondary-surface verification.

This skill only keeps the release-specific mechanics that must remain local: version bumps, the canonical root release gate, publish/token handling, publish confirmation, and push order.

## When to Use

Use this skill when:

- the user asks to bump the package version
- the user asks to publish `@tx-code/occt-js` to npm
- the user asks to push the release commit
- you are finishing work that must ship as a new npm version

Do not use this skill for ordinary feature commits that are not being released.

## Release Scope

For root package releases, always inspect and update only the files that are actually part of the release:

- `package.json`
- `packages/occt-core/package.json`

Current project rules:

- Only `@tx-code/occt-js` is published to npm.
- `@tx-code/occt-core` may be version-bumped in-repo for consistency, but is not published unless the human explicitly asks.
- Secondary-surface files are conditional release scope only when the touched-file set requires them.

## Pre-Release Checks

1. Confirm the current published version:

```powershell
npm view @tx-code/occt-js version
```

2. Inspect the worktree before changing anything:

```powershell
git status --short
```

3. Be selective when staging. This repository often has unrelated untracked files such as:

- `demo/dist/`
- screenshots
- scratch logs
- local submodule/build artifacts

Do not stage those unless the human explicitly asks.

## Version Bump

Update:

- root `package.json` version
- `packages/occt-core/package.json` version

After editing, verify the new version appears where expected:

```powershell
rg -n "0\.1\.[0-9]+|@tx-code/occt-js@" package.json packages
```

## Verification

Run the canonical root release gate before committing the release:

```powershell
npm run test:release:root
```

Required result:

- the root release gate passes

Optional separate process audit:

- Run `npm run test:planning:audit` only when you intentionally want to validate `.planning` milestone/archive consistency.
- This audit is separate from the authoritative root release gate.

## Conditional Secondary-Surface Verification

If the release also touches secondary surfaces, follow `AGENTS.md` and run the corresponding secondary-surface verification for those touched paths.

Typical triggers:

- `demo/` or `demo/tests/`
- `demo/src-tauri/`
- `packages/occt-babylon-loader/`
- `packages/occt-babylon-viewer/`
- `packages/occt-babylon-widgets/`

Notes:

- Keep the skill thin: repo policy and conditional verification rules belong in `AGENTS.md`.
- Secondary-surface verification is conditional; it is not part of the unconditional root release gate.
- The planning audit is separate process verification; it is not part of the unconditional root release gate.

## Commit

Stage only the intended release files and the release-related code/test changes:

```powershell
git add package.json `
  packages/occt-core/package.json
```

Then commit:

```powershell
git commit -m "chore: release <version>"
```

If `git` complains about `.git/index.lock`, confirm no active git process exists before retrying.

## Publish

Never store the npm token in the repository or in this skill.

Use a temporary `.npmrc` or environment variable. PowerShell example:

```powershell
Set-Content -Path '.npmrc' -Value '//registry.npmjs.org/:_authToken=<TOKEN>'
try {
  npm publish --access public
} finally {
  Remove-Item '.npmrc' -ErrorAction SilentlyContinue
}
```

Expected success signal:

```text
+ @tx-code/occt-js@<version>
```

## Post-Publish Verification

Confirm the registry shows the new version:

```powershell
npm view @tx-code/occt-js version
```

It must return the version you just published.

## Push

Push the release commit after publish succeeds:

```powershell
git push origin master
```

If the repository is no longer on `master`, push the current intended release branch instead.

## Common Mistakes

### Publishing before verification

Do not publish first and test later. The release gate is:

1. bump
2. verify
3. commit
4. publish
5. confirm npm
6. push

### Staging unrelated files

Do not accidentally commit:

- `demo/dist/`
- screenshots
- local logs
- build leftovers

### Forgetting the demo CDN bump

Only relevant when the release actually includes demo production changes; otherwise this is not part of the unconditional root release flow.

### Treating subpackages as published artifacts

Do not attempt to publish `@tx-code/occt-core` unless explicitly requested. It is not currently part of the default publish flow.

### Committing the npm token

The token must be ephemeral. Write it to a temporary `.npmrc`, publish, then remove it.

## Quick Reference

```powershell
# 1. inspect
git status --short
npm view @tx-code/occt-js version

# 2. bump files
# package.json
# packages/occt-core/package.json

# 3. verify
npm run test:release:root

# 4. commit
git add <intended files>
git commit -m "chore: release <version>"

# 5. publish
Set-Content .npmrc '//registry.npmjs.org/:_authToken=<TOKEN>'
npm publish --access public
Remove-Item .npmrc

# 6. confirm and push
npm view @tx-code/occt-js version
git push origin master
```
