# Optimal Orientation Analysis Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a C++/Wasm `AnalyzeOptimalOrientation()` API for single-part `STEP`/`IGES`/`BREP` inputs, modeled on the AnalysisSitus reference workflow, and return a Babylon-friendly transform plus diagnostics.

**Architecture:** Keep orientation analysis separate from the existing import API. Add a dedicated C++ orientation module that loads a single OCCT shape from in-memory bytes, runs a two-stage manufacturing-oriented orientation analysis, and marshals the result through Embind. Reuse existing readers and the existing matrix convention rather than mutating the `Read*` pipeline.

**Tech Stack:** OCCT C++17, Embind/Emscripten, root Wasm runtime tests under `test/`, Node-based verification, existing Windows Wasm build scripts.

---

## File Map

### New Files

- `E:/Coding/occt-js.worktrees/occtjs-core-next/src/orientation.hpp`
  - Defines orientation parameter/result data structures and public C++ entry points.
- `E:/Coding/occt-js.worktrees/occtjs-core-next/src/orientation.cpp`
  - Implements format dispatch, Stage 1 machining-axis detection, Stage 2 projected minimum-area-rectangle refinement, and result packaging.
- `E:/Coding/occt-js.worktrees/occtjs-core-next/test/test_optimal_orientation_api.mjs`
  - Verifies Wasm API shape, format dispatch, basic success/error handling, and output contract.
- `E:/Coding/occt-js.worktrees/occtjs-core-next/test/test_optimal_orientation_reference.mjs`
  - Verifies geometry-level invariants on realistic fixtures: orthonormal frame, sorted bbox extents, populated strategy/stage diagnostics, and preset-axis behavior.

### Modified Files

- `E:/Coding/occt-js.worktrees/occtjs-core-next/src/importer.hpp`
  - Adds shared orientation parameter/result structs if they belong in the shared public model.
- `E:/Coding/occt-js.worktrees/occtjs-core-next/src/js-interface.cpp`
  - Parses JS orientation params, marshals result objects, and exports `AnalyzeOptimalOrientation`.
- `E:/Coding/occt-js.worktrees/occtjs-core-next/CMakeLists.txt`
  - Includes the new orientation translation unit in the Wasm build.
- `E:/Coding/occt-js.worktrees/occtjs-core-next/dist/occt-js.d.ts`
  - Adds TypeScript declarations for `OcctJSOrientationParams`, `OcctJSOrientationResult`, and the new API method.
- `E:/Coding/occt-js.worktrees/occtjs-core-next/README.md`
  - Documents the new orientation-analysis API and its single-part boundary.
- `E:/Coding/occt-js.worktrees/occtjs-core-next/package.json`
  - Adds the new orientation tests to the root verification script.

### Existing Fixtures To Reuse

- `E:/Coding/occt-js.worktrees/occtjs-core-next/test/ANC101.stp`
- `E:/Coding/occt-js.worktrees/occtjs-core-next/test/ANC101_colored.stp`
- `E:/Coding/occt-js.worktrees/occtjs-core-next/test/as1_pe_203.brep`
- `E:/Coding/occt-js.worktrees/occtjs-core-next/test/as1-oc-214_inches.stp`
- `E:/Coding/occt-js.worktrees/occtjs-core-next/test/bearing.igs`
- `E:/Coding/occt-js.worktrees/occtjs-core-next/test/simple_part.step`

The first implementation should stay within existing fixtures unless a new deliberately tilted fixture is strictly necessary.

---

## Chunk 1: API Contract And Red Tests

### Task 1: Add contract-first tests for the new Wasm API

**Files:**
- Create: `E:/Coding/occt-js.worktrees/occtjs-core-next/test/test_optimal_orientation_api.mjs`
- Test helper: `E:/Coding/occt-js.worktrees/occtjs-core-next/test/load_occt_factory.mjs`

- [ ] **Step 1: Write the failing API-contract test**

Use the existing root test style:

```js
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadOcctFactory } from "./load_occt_factory.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const factory = loadOcctFactory();
  const m = await factory();

  const stepBytes = new Uint8Array(readFileSync(resolve("test", "simple_part.step")));
  const result = m.AnalyzeOptimalOrientation("step", stepBytes, { mode: "manufacturing" });

  assert(result.success, "AnalyzeOptimalOrientation(step) should succeed for simple_part.step");
  assert(Array.isArray(result.transform) && result.transform.length === 16, "orientation result should expose a 4x4 transform");
  assert(result.localFrame && Array.isArray(result.localFrame.origin), "orientation result should expose a localFrame");
  assert(result.bbox && typeof result.bbox.dx === "number", "orientation result should expose bbox dimensions");
  assert(typeof result.strategy === "string" && result.strategy.length > 0, "orientation result should expose strategy");
  assert(typeof result.confidence === "number", "orientation result should expose confidence");
}

main().catch((error) => {
  console.error("FAIL:", error.message ?? error);
  process.exit(1);
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
node test/test_optimal_orientation_api.mjs
```

Expected:

- FAIL because `m.AnalyzeOptimalOrientation` does not exist yet

- [ ] **Step 3: Extend the same test with negative-format coverage**

Add assertions like:

```js
const unsupported = m.AnalyzeOptimalOrientation("stl", stepBytes, {});
assert(!unsupported.success, "unsupported format should fail");
assert(/Unsupported format/i.test(unsupported.error), "unsupported format should explain the failure");
```

- [ ] **Step 4: Re-run the API test and confirm it still fails for the right reason**

Run:

```bash
node test/test_optimal_orientation_api.mjs
```

Expected:

- still FAIL because the API is not implemented yet

- [ ] **Step 5: Commit the red test**

```bash
git add test/test_optimal_orientation_api.mjs
git commit -m "test: add orientation api contract test"
```

### Task 2: Add invariant tests against realistic CAD fixtures

**Files:**
- Create: `E:/Coding/occt-js.worktrees/occtjs-core-next/test/test_optimal_orientation_reference.mjs`
- Reuse fixtures in `E:/Coding/occt-js.worktrees/occtjs-core-next/test/`

- [ ] **Step 1: Write the failing invariant test**

Cover:

- `STEP`, `IGES`, and `BREP` success
- `bbox.dx >= bbox.dy >= bbox.dz`
- `localFrame` basis vectors are near-unit and near-orthogonal
- `stage1.detectedAxis` exists
- `stage2.rotationAroundZDeg` exists

Skeleton:

```js
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function length(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function assertOrthonormal(frame, label) {
  assert(Math.abs(length(frame.xDir) - 1) < 1e-4, `${label}: xDir should be unit length`);
  assert(Math.abs(length(frame.yDir) - 1) < 1e-4, `${label}: yDir should be unit length`);
  assert(Math.abs(length(frame.zDir) - 1) < 1e-4, `${label}: zDir should be unit length`);
  assert(Math.abs(dot(frame.xDir, frame.yDir)) < 1e-4, `${label}: x/y should be orthogonal`);
  assert(Math.abs(dot(frame.xDir, frame.zDir)) < 1e-4, `${label}: x/z should be orthogonal`);
  assert(Math.abs(dot(frame.yDir, frame.zDir)) < 1e-4, `${label}: y/z should be orthogonal`);
}
```

- [ ] **Step 2: Run the invariant test to verify it fails**

Run:

```bash
node test/test_optimal_orientation_reference.mjs
```

Expected:

- FAIL because the orientation API is not implemented yet

- [ ] **Step 3: Add a preset-axis subcase to the same file**

Use a simple assertion:

```js
const preset = m.AnalyzeOptimalOrientation("step", stepBytes, {
  mode: "manufacturing",
  presetAxis: {
    origin: [0, 0, 0],
    direction: [1, 0, 0]
  }
});
assert(preset.success, "preset-axis analysis should succeed");
```

The first implementation should only assert success and presence of diagnostics, not a specific final matrix.

- [ ] **Step 4: Re-run the invariant test and confirm it still fails for the right reason**

Run:

```bash
node test/test_optimal_orientation_reference.mjs
```

Expected:

- still FAIL because the API is not implemented yet

- [ ] **Step 5: Commit the invariant red test**

```bash
git add test/test_optimal_orientation_reference.mjs
git commit -m "test: add orientation invariant tests"
```

---

## Chunk 2: Core C++ Orientation Module And Stage 1

### Task 3: Add shared orientation data structures and public C++ entry point

**Files:**
- Modify: `E:/Coding/occt-js.worktrees/occtjs-core-next/src/importer.hpp`
- Create: `E:/Coding/occt-js.worktrees/occtjs-core-next/src/orientation.hpp`
- Create: `E:/Coding/occt-js.worktrees/occtjs-core-next/src/orientation.cpp`
- Modify: `E:/Coding/occt-js.worktrees/occtjs-core-next/CMakeLists.txt`

- [ ] **Step 1: Define minimal orientation structs**

Add dedicated structs for:

- params
- frame
- bbox
- stage diagnostics
- result

Keep them plain and serializable:

```cpp
struct OrientationAxisInput {
    std::array<double, 3> origin {0.0, 0.0, 0.0};
    std::array<double, 3> direction {0.0, 0.0, 1.0};
    bool isSet = false;
};

struct OrientationParams {
    ImportParams::LinearUnit linearUnit = ImportParams::LinearUnit::Millimeter;
    std::string mode = "manufacturing";
    OrientationAxisInput presetAxis;
};
```

- [ ] **Step 2: Add a public analysis entry point in `orientation.hpp`**

Define a narrow public function:

```cpp
OrientationResult AnalyzeOptimalOrientationFromMemory(
    const std::string& format,
    const uint8_t* data,
    size_t size,
    const OrientationParams& params
);
```

- [ ] **Step 3: Add the new translation unit to `CMakeLists.txt`**

Extend the Wasm source list to compile `src/orientation.cpp`.

- [ ] **Step 4: Build the Wasm target to catch compile errors early**

Run:

```bash
npm run build:wasm:win
```

Expected:

- build completes
- tests still fail because logic is not implemented yet

- [ ] **Step 5: Commit the structural scaffolding**

```bash
git add src/importer.hpp src/orientation.hpp src/orientation.cpp CMakeLists.txt
git commit -m "feat: scaffold orientation analysis module"
```

### Task 4: Implement format dispatch and single-shape normalization

**Files:**
- Modify: `E:/Coding/occt-js.worktrees/occtjs-core-next/src/orientation.cpp`
- Reference existing readers:
  - `E:/Coding/occt-js.worktrees/occtjs-core-next/src/importer-step.cpp`
  - `E:/Coding/occt-js.worktrees/occtjs-core-next/src/importer-iges.cpp`
  - `E:/Coding/occt-js.worktrees/occtjs-core-next/src/importer-brep.cpp`

- [ ] **Step 1: Write the minimal failing implementation path**

Implement format normalization and error out with a temporary message:

```cpp
if (normalizedFormat != "step" && normalizedFormat != "iges" && normalizedFormat != "brep") {
    result.success = false;
    result.error = "Unsupported format: " + format;
    return result;
}

result.success = false;
result.error = "AnalyzeOptimalOrientation not implemented yet";
return result;
```

- [ ] **Step 2: Rebuild and re-run the API test**

Run:

```bash
npm run build:wasm:win
node test/test_optimal_orientation_api.mjs
```

Expected:

- unsupported-format assertion passes
- supported-format case still fails with `"not implemented yet"`

- [ ] **Step 3: Replace the placeholder with real shape-loading helpers**

Implement internal helpers that:

- read bytes using the matching OCCT reader
- normalize to a single `TopoDS_Shape`
- reject unsupported `multiple-shapes` style cases at this API boundary
- preserve unit metadata if available

Pseudo-shape:

```cpp
struct LoadedShape {
    bool success = false;
    std::string error;
    TopoDS_Shape shape;
    std::string sourceUnit;
    double unitScaleToMeters = 0.0;
};
```

- [ ] **Step 4: Rebuild and run the API test again**

Run:

```bash
npm run build:wasm:win
node test/test_optimal_orientation_api.mjs
```

Expected:

- supported formats now fail later in the pipeline, not in dispatch

- [ ] **Step 5: Commit shape loading and normalization**

```bash
git add src/orientation.cpp
git commit -m "feat: add orientation shape-loading path"
```

### Task 5: Implement AnalysisSitus-like Stage 1 machining-axis detection

**Files:**
- Modify: `E:/Coding/occt-js.worktrees/occtjs-core-next/src/orientation.cpp`
- Reference:
  - `E:/Coding/AnalysisSitus/src/asiAlgo/auxiliary/asiAlgo_OrientCnc.cpp`

- [ ] **Step 1: Write the minimal Stage 1 result structure**

Add internal state for:

- chosen base face ID
- whether cylinder support was used
- detected axis
- strategy label

- [ ] **Step 2: Implement planar and cylindrical candidate collection**

Use OCCT exact geometry to:

- collect planar faces
- compute exact face areas
- discard very small planar faces using an internal threshold similar to AnalysisSitus
- collect cylindrical axes

- [ ] **Step 3: Implement candidate ranking and fallback**

Algorithm:

- sort planar faces by area descending
- prefer the first planar candidate that has parallel cylindrical support
- otherwise keep the largest planar candidate
- otherwise fall back to the most common cylindrical axis

- [ ] **Step 4: Compute the Stage 1 transform**

Align the detected axis to `OZ`, or if `presetAxis` is set, honor it in the same spirit as the AnalysisSitus preset-axis path.

- [ ] **Step 5: Rebuild and run the invariant test**

Run:

```bash
npm run build:wasm:win
node test/test_optimal_orientation_reference.mjs
```

Expected:

- tests still fail because Stage 2/local-frame packing is not finished
- but Stage 1 diagnostics are now visible under a debugger or temporary logging

- [ ] **Step 6: Commit Stage 1**

```bash
git add src/orientation.cpp
git commit -m "feat: add orientation stage1 axis detection"
```

---

## Chunk 3: Stage 2 Refinement, Local Frame, And Result Packaging

### Task 6: Implement projected minimum-area-rectangle refinement

**Files:**
- Modify: `E:/Coding/occt-js.worktrees/occtjs-core-next/src/orientation.cpp`
- Reference:
  - `E:/Coding/AnalysisSitus/src/asiAlgo/auxiliary/asiAlgo_FindOptimalOrientation.cpp`

- [ ] **Step 1: Implement triangulation preflight**

Ensure the shape is triangulated before HLR/projection if required by the chosen OCCT code path.

- [ ] **Step 2: Implement Stage 2 projection and 2D point extraction**

Add helpers that:

- apply the Stage 1 transform
- build a projection to `XOY`
- extract edge/sample points suitable for minimum-area-rectangle calculation

- [ ] **Step 3: Implement rotating-calipers-style rectangle search**

Use either:

- OCCT utilities already available in this repository, if present
- or a small local helper in `orientation.cpp`

Do not drag Babylon or JS concerns into this layer.

- [ ] **Step 4: Apply Stage 2 around `Z` and store the angle**

Populate:

```cpp
result.stage2RotationAroundZDeg = angleDeg;
```

- [ ] **Step 5: Rebuild and rerun the invariant test**

Run:

```bash
npm run build:wasm:win
node test/test_optimal_orientation_reference.mjs
```

Expected:

- stage diagnostics are present
- bbox/local-frame assertions may still fail until the next task is done

- [ ] **Step 6: Commit Stage 2**

```bash
git add src/orientation.cpp
git commit -m "feat: add orientation stage2 refinement"
```

### Task 7: Compute local frame, bbox extents, confidence, and final result object

**Files:**
- Modify: `E:/Coding/occt-js.worktrees/occtjs-core-next/src/orientation.cpp`
- Modify: `E:/Coding/occt-js.worktrees/occtjs-core-next/src/orientation.hpp`

- [ ] **Step 1: Implement oriented bbox and local-frame extraction**

Follow the AnalysisSitus convention:

- `xDir` = longest axis
- `yDir` = medium axis
- `zDir` = shortest axis

- [ ] **Step 2: Populate final transform and diagnostics**

Return:

- 4x4 column-major transform
- frame origin and axes
- bbox dimensions
- strategy
- stage1/stage2 info
- confidence

For v1, a simple confidence model is enough:

- higher confidence if Stage 1 found planar + cylindrical support
- medium confidence for dominant planar base without cylinder support
- lower confidence for pure cylinder fallback

- [ ] **Step 3: Make the realistic invariant test pass**

Run:

```bash
node test/test_optimal_orientation_reference.mjs
```

Expected:

- PASS

- [ ] **Step 4: Re-run the API-contract test**

Run:

```bash
node test/test_optimal_orientation_api.mjs
```

Expected:

- PASS

- [ ] **Step 5: Commit final C++ result packaging**

```bash
git add src/orientation.hpp src/orientation.cpp
git commit -m "feat: return orientation diagnostics and local frame"
```

---

## Chunk 4: Embind Surface, Types, Docs, And Full Verification

### Task 8: Export the new API through Embind

**Files:**
- Modify: `E:/Coding/occt-js.worktrees/occtjs-core-next/src/js-interface.cpp`

- [ ] **Step 1: Add JS param parsing for orientation**

Introduce a dedicated parser:

```cpp
OrientationParams ParseOrientationParams(const val& jsParams);
```

It should handle:

- `linearUnit`
- `mode`
- `presetAxis.origin`
- `presetAxis.direction`

- [ ] **Step 2: Add result marshalling helpers**

Create helpers like:

```cpp
val OrientationFrameToVal(const OrientationFrame& frame);
val OrientationResultToVal(const OrientationResult& result);
```

- [ ] **Step 3: Export `AnalyzeOptimalOrientation`**

Add:

```cpp
val AnalyzeOptimalOrientation(const std::string& format, const val& content, const val& jsParams)
{
    std::vector<uint8_t> buffer = ExtractBytes(content);
    OrientationParams params = ParseOrientationParams(jsParams);
    return OrientationResultToVal(
        AnalyzeOptimalOrientationFromMemory(format, buffer.data(), buffer.size(), params)
    );
}
```

and bind it in `EMSCRIPTEN_BINDINGS(occtjs)`.

- [ ] **Step 4: Rebuild and re-run both focused tests**

Run:

```bash
npm run build:wasm:win
node test/test_optimal_orientation_api.mjs
node test/test_optimal_orientation_reference.mjs
```

Expected:

- both PASS

- [ ] **Step 5: Commit the Wasm binding**

```bash
git add src/js-interface.cpp
git commit -m "feat: expose optimal orientation api"
```

### Task 9: Update TypeScript declarations and package docs

**Files:**
- Modify: `E:/Coding/occt-js.worktrees/occtjs-core-next/dist/occt-js.d.ts`
- Modify: `E:/Coding/occt-js.worktrees/occtjs-core-next/README.md`

- [ ] **Step 1: Add TypeScript interfaces**

Add:

- `OcctJSOrientationParams`
- `OcctJSOrientationResult`
- `AnalyzeOptimalOrientation(...)` on `OcctJSModule`

- [ ] **Step 2: Document the API in `README.md`**

Add a concise section showing:

```ts
const result = m.AnalyzeOptimalOrientation("step", bytes, {
  mode: "manufacturing"
});

if (result.success) {
  // apply result.transform in the Babylon consumer
}
```

Document boundary:

- single part only
- `STEP` / `IGES` / `BREP`
- orientation is advisory, not automatically applied by import

- [ ] **Step 3: Commit types and docs**

```bash
git add dist/occt-js.d.ts README.md
git commit -m "docs: add optimal orientation api docs"
```

### Task 10: Fold the new tests into the root verification script and run full verification

**Files:**
- Modify: `E:/Coding/occt-js.worktrees/occtjs-core-next/package.json`

- [ ] **Step 1: Extend the root test script**

Add:

- `node test/test_optimal_orientation_api.mjs`
- `node test/test_optimal_orientation_reference.mjs`

Keep the ordering explicit and readable.

- [ ] **Step 2: Run the full root test suite**

Run:

```bash
npm test
```

Expected:

- all existing tests PASS
- both new orientation tests PASS

- [ ] **Step 3: Run a final Wasm rebuild from the current tree**

Run:

```bash
npm run build:wasm:win
```

Expected:

- success

- [ ] **Step 4: Commit the verification-script update**

```bash
git add package.json
git commit -m "test: cover optimal orientation api"
```

---

## Notes For Implementation

- Keep the orientation API independent from the existing `Read*` return payload.
- Do not introduce Babylon runtime objects into the root package.
- Preserve the column-major matrix convention already used by `rootNodes[].transform`.
- Avoid exposing algorithm tuning knobs in v1.
- If a fixture proves too ambiguous for stable orientation assertions, keep the test focused on invariants and diagnostics rather than a single exact matrix.
- If the implementation needs a small helper for OCCT shape loading shared across formats, add it inside the orientation module unless duplication becomes obviously worse.

## Final Verification Checklist

- [ ] `npm run build:wasm:win`
- [ ] `node test/test_optimal_orientation_api.mjs`
- [ ] `node test/test_optimal_orientation_reference.mjs`
- [ ] `npm test`
- [ ] `git status -sb` shows only intended changes before the final commit sequence
