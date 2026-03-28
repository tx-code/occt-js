# Realistic CAD Regression Fixture Selection Design

Date: 2026-03-27
Status: Approved design
Repository: `occt-js`
Target branch: `feature/occtjs-core-next`

## Purpose

This document defines how `occt-js` should adopt a small set of representative regression fixtures from an external CAD sample corpus.

The goal is not to mirror the external dataset. The goal is to bring a curated set of realistic CAD files into `occt-js/test` so that importer behavior is reproducible inside this repository without depending on local external paths.

## Why Use External Reference Fixtures

The existing in-repo fixtures are useful, but several of them are synthetic or minimal. They are good for targeted checks, but they do not fully represent the kinds of real-world CAD files downstream consumers will import.

The external sample corpus already contains realistic STEP, IGES, and BREP samples with enough variation to test:

- multiple top-level roots
- names
- colors
- unit handling
- more complex compound and isolated-part BREP structures

These are exactly the areas where `occt-js` has recently added or tightened importer behavior.

## Approach Options

### Option 1: Curated Realistic Fixture Set (Recommended)

Copy a small number of carefully chosen files into `occt-js/test`.

Pros:

- repository-local and reproducible
- realistic coverage
- each fixture has a clear testing purpose
- avoids uncontrolled repository growth

Cons:

- requires manual curation
- fixture set must be maintained intentionally

### Option 2: Bulk Mirror Of External Sample Corpus

Copy a large part of the external sample corpus into this repository.

Pros:

- maximum sample variety

Cons:

- repository becomes unnecessarily heavy
- tests become noisy and harder to reason about
- unclear which files are actually part of the supported contract

### Option 3: External Dataset Dependency

Keep files outside the repo and point tests at an external local sample corpus.

Pros:

- no file copying

Cons:

- not reproducible in clean clones or CI
- repository tests depend on local machine layout
- not acceptable for long-term regression coverage

## Selected Approach

Use Option 1.

The repository should copy a small set of representative, realistic fixtures into `test/` and treat those files as part of the importer regression suite.

## Selected Fixture Categories

The first adoption wave should focus on formats and behaviors already in scope for `occt-js`:

- `STEP` multiple roots
- `STEP` names and realistic model structure
- `STEP` colors
- `STEP` units
- `IGES` realistic solid import
- `BREP` realistic import success
- `BREP` compound splitting

## Proposed Initial Fixture Set

### STEP Multiple Roots

Source:

- external sample corpus: `cad/chassis-2roots.stp`

Purpose:

- regression coverage for `rootMode: "one-shape"`
- regression coverage for `rootMode: "multiple-shapes"`
- realistic top-level multi-root STEP behavior

### STEP Colors

Source:

- external sample corpus: `cad/ANC101_colored.stp`

Purpose:

- verify color extraction stays healthy on a realistic file
- detect regressions in per-face or per-part color propagation

### STEP Units

Source:

- external sample corpus: `cad/as1-oc-214_inches.stp`

Purpose:

- verify source-unit reporting and unit scale handling
- protect the import contract around non-millimeter source data

### STEP Names / Richer Structure

Source:

- external sample corpus: `cad/gehause_rohteil_with-names.STEP`

Purpose:

- verify naming survives import on a realistic model
- exercise importer traversal on a richer production-style file

### IGES Representative Solid

Source:

- external sample corpus: `cad/bearing.igs`

Purpose:

- realistic IGES coverage beyond the tiny in-repo cube fixture
- validate that the IGES path remains healthy on a larger solid model

### BREP Realistic Import Success

Source:

- external sample corpus: `cad/ANC101_isolated_components.brep`

Purpose:

- realistic BREP coverage beyond the older in-repo fixture set
- verify import success and triangle generation on a production-style BREP

### BREP Compound Split

Source:

- external sample corpus: `cad/nonmanifold_cells.brep`

Purpose:

- validate `BREP rootMode: "multiple-shapes"` on a file that actually exposes multiple roots
- protect compound splitting semantics against regressions

## Test Integration Rules

These fixtures should be added incrementally and each one should map to a specific regression expectation.

Rules:

- do not copy files into `test/` without attaching at least one explicit test assertion to them
- do not create giant omnibus tests that hide which fixture failed
- keep one fixture usable from multiple focused tests if the semantics are related
- preserve existing smaller fixtures for minimal fast-path coverage

## Non-Goals

This work does not mean:

- importing mesh-only formats into `occt-js`
- importing point-cloud formats into `occt-js`
- copying the entire external sample corpus into this repository

The fixture expansion remains limited to realistic regression coverage for already supported `STEP`, `IGES`, and `BREP` import behavior.

## Immediate Next Step

After this design is accepted, implementation should:

- copy the selected fixture files into `test/`
- add focused regression assertions for each selected semantic area
- keep `npm test` as the canonical verification entry point
