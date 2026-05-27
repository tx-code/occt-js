import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadOcctFactory } from "./load_occt_factory.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert.equal = function(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} (got ${actual}, expected ${expected})`);
  }
};

function hasOwn(value, key) {
  return !!value && Object.prototype.hasOwnProperty.call(value, key);
}

function loadFixture(name) {
  return new Uint8Array(readFileSync(resolve("test", name)));
}

function flattenTree(nodes) {
  const flat = [];
  const visit = (node) => {
    flat.push(node);
    for (const child of node.children ?? []) {
      visit(child);
    }
  };
  for (const node of nodes ?? []) {
    visit(node);
  }
  return flat;
}

function assertNoViewerGeometryFields(result, label) {
  for (const key of ["rootNodes", "geometries", "materials", "stats", "triangleCount", "geometryCount", "meshCount"]) {
    assert(!hasOwn(result, key), `${label}: strict rejection must not expose ${key}`);
  }
}

function assertStrictRejection(result, expectedCode, label) {
  assert.equal(result.success, false, `${label} should be rejected by strict import`);
  assert.equal(result.sourceFormat, "step", `${label} rejection should keep sourceFormat=step`);
  assert.equal(result.rejection?.code, expectedCode, `${label} should expose ${expectedCode}`);
  assert(typeof result.error === "string" && result.error.length > 0, `${label} should expose an error message`);
  assert(typeof result.rejection?.message === "string" && result.rejection.message.length > 0, `${label} should expose a rejection message`);
  assertNoViewerGeometryFields(result, label);
}

function assertMatrixClose(actual, expected, label) {
  assert(Array.isArray(actual), `${label}: actual matrix should be an array`);
  assert(Array.isArray(expected), `${label}: expected matrix should be an array`);
  assert.equal(actual.length, 16, `${label}: actual matrix should have 16 entries`);
  assert.equal(expected.length, 16, `${label}: expected matrix should have 16 entries`);
  for (let index = 0; index < 16; index += 1) {
    const diff = Math.abs(Number(actual[index]) - Number(expected[index]));
    assert(diff <= 1e-6, `${label}: matrix entry ${index} differs by ${diff}`);
  }
}

function assertMatrixHasPlacement(matrix, label) {
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  assert(
    matrix.some((value, index) => Math.abs(Number(value) - identity[index]) > 1e-6),
    `${label}: fixture occurrence should exercise non-identity placement`,
  );
}

async function main() {
  const factory = loadOcctFactory();
  const m = await factory();

  assert.equal(typeof m.ReadStepPartFile, "function", "ReadStepPartFile must exist");

  const singlePart = m.ReadStepPartFile(loadFixture("simple_part.step"), {});
  assert.equal(singlePart.success, true, "simple_part.step should import as a strict part");
  assert(Array.isArray(singlePart.rootNodes), "simple_part.step should expose viewer roots");
  assert(Array.isArray(singlePart.geometries), "simple_part.step should expose geometries");
  assert.equal(singlePart.inspection?.status, "ok", "strict success should include inspection status");
  assert.equal(singlePart.inspection?.classification, "single_part", "strict success should include single_part inspection");

  const assembly = m.ReadStepPartFile(loadFixture("assembly.step"), {});
  assertStrictRejection(assembly, "assembly_not_allowed", "assembly.step");
  assert.equal(assembly.inspection?.classification, "assembly", "assembly rejection should include inspection result");
  assert.equal(assembly.rejection?.classification, "assembly", "assembly rejection should summarize classification");

  const multiPart = m.ReadStepPartFile(loadFixture("two_free_shapes.step"), {});
  assertStrictRejection(multiPart, "multi_part_not_allowed", "two_free_shapes.step");
  assert.equal(multiPart.inspection?.classification, "multi_part", "multi-part rejection should include inspection result");
  assert.equal(multiPart.rejection?.classification, "multi_part", "multi-part rejection should summarize classification");

  const syntheticRootAttempt = m.ReadStepPartFile(loadFixture("two_free_shapes.step"), { rootMode: "one-shape" });
  assertStrictRejection(syntheticRootAttempt, "multi_part_not_allowed", "two_free_shapes.step rootMode=one-shape");
  assert.equal(
    syntheticRootAttempt.inspection?.classification,
    "multi_part",
    "synthetic viewer root must not make a multi-part STEP importable"
  );

  const invalid = m.ReadStepPartFile(new Uint8Array([0, 1, 2, 3]), {});
  assertStrictRejection(invalid, "inspection_failed", "invalid STEP bytes");
  assert.equal(invalid.inspection?.status, "error", "invalid bytes rejection should include failed inspection");
  assert.equal(invalid.inspection?.error?.code, "read_failed", "invalid bytes rejection should preserve read_failed");
  assert.equal(invalid.rejection?.inspectionErrorCode, "read_failed", "invalid bytes rejection should summarize read_failed");

  const inspectedAssembly = m.InspectStepProduct(loadFixture("assembly.step"), {});
  assert.equal(inspectedAssembly.status, "ok", "assembly inspection should succeed before selected import");
  const selectedLeaf = inspectedAssembly.selectableOccurrences?.[0];
  assert(selectedLeaf, "assembly inspection should expose a selectable leaf occurrence");
  assertMatrixHasPlacement(selectedLeaf.occurrenceTransform, "selected assembly occurrence");

  const selected = m.ReadStepPartFile(loadFixture("assembly.step"), {
    selection: { kind: "occurrence", occurrenceRef: selectedLeaf.occurrenceRef },
  });
  assert.equal(selected.success, true, "selected occurrence import should succeed");
  assert.equal(selected.inspection?.status, "ok", "selected occurrence import should include inspection");
  assert.equal(selected.selectedOccurrence?.kind, "occurrence", "selected occurrence metadata should identify occurrence kind");
  assert.equal(
    selected.selectedOccurrence?.occurrenceRef,
    selectedLeaf.occurrenceRef,
    "selected occurrence metadata should preserve requested occurrenceRef"
  );
  assert.equal(selected.rootNodes.length, 1, "selected occurrence import should expose exactly one root");
  assert.equal(selected.rootNodes[0].isAssembly, false, "selected occurrence root should be a part");
  assert.equal(selected.rootNodes[0].children.length, 0, "selected occurrence root should not expose assembly children");
  assertMatrixClose(
    selected.rootNodes[0].transform,
    selectedLeaf.occurrenceTransform,
    "selected root transform should own the inspected occurrence placement",
  );
  assertMatrixClose(
    selected.selectedOccurrence?.occurrenceTransform,
    selectedLeaf.occurrenceTransform,
    "selected metadata should preserve the inspected occurrence placement",
  );

  const staleSelection = m.ReadStepPartFile(loadFixture("assembly.step"), {
    selection: { kind: "occurrence", occurrenceRef: "occurrence:stale" },
  });
  assertStrictRejection(staleSelection, "selection_not_found", "stale selected occurrence import");
  assert.equal(staleSelection.inspection?.classification, "assembly", "stale selection rejection should include inspection");

  const assemblyNode = flattenTree(inspectedAssembly.productTree).find((node) => node.isAssembly && node.occurrenceRef);
  assert(assemblyNode, "assembly inspection should expose a grouping occurrence for rejection coverage");
  const groupingSelection = m.ReadStepPartFile(loadFixture("assembly.step"), {
    selection: { kind: "occurrence", occurrenceRef: assemblyNode.occurrenceRef },
  });
  assertStrictRejection(groupingSelection, "selection_not_leaf_occurrence", "grouping selected occurrence import");

  const partSelection = m.ReadStepPartFile(loadFixture("assembly.step"), {
    selection: { kind: "part", partRef: selectedLeaf.partRef },
  });
  assert.equal(partSelection.success, true, "part-definition selected import should resolve to an importable part");
  assert.equal(
    partSelection.selectedOccurrence?.partRef,
    selectedLeaf.partRef,
    "part-definition selected import should preserve the requested partRef"
  );
  assert.equal(partSelection.rootNodes.length, 1, "part-definition selected import should expose exactly one root");
  assert.equal(partSelection.rootNodes[0].isAssembly, false, "part-definition selected import root should be a part");
  assert.equal(
    partSelection.rootNodes[0].children.length,
    0,
    "part-definition selected import root should not expose assembly children"
  );

  const unsupportedSelection = m.ReadStepPartFile(loadFixture("assembly.step"), {
    selection: { kind: "display-row", occurrenceRef: selectedLeaf.occurrenceRef },
  });
  assertStrictRejection(unsupportedSelection, "selection_not_supported", "unsupported selection kind");

  console.log("PASS test_step_strict_part_import");
}

main().catch((error) => {
  console.error("FAIL:", error.message ?? error);
  process.exit(1);
});
