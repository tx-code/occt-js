---
name: releasing-occt-js
description: Use when preparing or executing a new @tx-code/occt-js release from this repository, especially before bumping versions, publishing to npm, or pushing the release commit.
---

# Releasing occt-js

## Overview

This skill is the repository-specific release checklist for `occt-js`.

The release is only complete when version files are updated, verification passes, `@tx-code/occt-js` is published to npm, the published version is confirmed, and the release commit is pushed.

## When to Use

Use this skill when:

- the user asks to bump the package version
- the user asks to publish `@tx-code/occt-js` to npm
- the user asks to push the release commit
- you are finishing work that must ship as a new npm version

Do not use this skill for ordinary feature commits that are not being released.

## Release Scope

For this repository, release preparation touches these files:

- `package.json`
- `packages/occt-core/package.json`
- `packages/occt-babylon-loader/package.json`
- `demo/src/hooks/useOcct.js`

Current project rules:

- Only `@tx-code/occt-js` is published to npm.
- `@tx-code/occt-core` and `@tx-code/occt-babylon-loader` are version-bumped in-repo for consistency, but are not published unless the human explicitly asks.
- The demo must point at the new published root package version in production.

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
- `packages/occt-babylon-loader/package.json` version
- `packages/occt-babylon-loader/package.json` peer dependency on `@tx-code/occt-core`
- demo CDN version in `demo/src/hooks/useOcct.js`

After editing, verify the new version appears where expected:

```powershell
rg -n "0\.1\.[0-9]+|@tx-code/occt-js@" package.json packages demo
```

## Verification

Run all of these before committing the release:

```powershell
npm test
cd demo; npm run build
cd ..; npx playwright test
```

Required result:

- root tests pass
- demo production build succeeds
- Playwright suite passes

Notes:

- The demo loads local `dist/` in dev/test and npm CDN in production. This avoids the old failure mode where bumping the demo CDN to an unpublished version broke local verification before publish.
- `vite build` may warn that `new URL("../../../dist/", import.meta.url)` is unresolved at build time. That warning is acceptable as long as the build succeeds and tests pass.

## Commit

Stage only the intended release files and the release-related code/test changes:

```powershell
git add package.json `
  packages/occt-core/package.json `
  packages/occt-babylon-loader/package.json `
  demo/src/App.jsx `
  demo/src/components/LoadingOverlay.jsx `
  demo/src/components/SelectionPanel.jsx `
  demo/src/components/StatsPanel.jsx `
  demo/src/components/Toolbar.jsx `
  demo/src/components/ViewCube.jsx `
  demo/src/hooks/useOcct.js `
  demo/src/store/viewerStore.js `
  demo/tests/demo.spec.mjs
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

If `demo/src/hooks/useOcct.js` still points at the previous package version, the published demo will keep loading the old release.

### Treating subpackages as published artifacts

Do not attempt to publish `@tx-code/occt-core` or `@tx-code/occt-babylon-loader` unless explicitly requested. They are not currently present on npm.

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
# packages/occt-babylon-loader/package.json
# demo/src/hooks/useOcct.js

# 3. verify
npm test
cd demo; npm run build
cd ..; npx playwright test

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
