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

function reasonCodes(result) {
  return new Set((result.reasons ?? []).map((reason) => reason.code));
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

function assertMatrix16(value, label) {
  assert(Array.isArray(value), `${label}: matrix should be an array`);
  assert.equal(value.length, 16, `${label}: matrix should contain 16 values`);
  for (const entry of value) {
    assert(typeof entry === "number" && Number.isFinite(entry), `${label}: matrix values should be finite numbers`);
  }
}

function assertSelectableOccurrence(item, label) {
  assert.equal(item.kind, "occurrence", `${label}: kind should be occurrence`);
  assert(typeof item.occurrenceRef === "string" && item.occurrenceRef.length > 0, `${label}: occurrenceRef should be non-empty`);
  assert(typeof item.partRef === "string" && item.partRef.length > 0, `${label}: partRef should be non-empty`);
  assert(typeof item.nodeId === "string" && item.nodeId.length > 0, `${label}: nodeId should be non-empty`);
  assert(Array.isArray(item.displayPath) && item.displayPath.length > 0, `${label}: displayPath should be non-empty`);
  assertMatrix16(item.localTransform, `${label}: localTransform`);
  assertMatrix16(item.occurrenceTransform, `${label}: occurrenceTransform`);
}

function assertSelectableMetadata(result, label) {
  assert(Array.isArray(result.selectableOccurrences), `${label}: selectableOccurrences should be an array`);
  const flatNodes = flattenTree(result.productTree);
  assert(flatNodes.length > 0, `${label}: flattened product tree should not be empty`);

  for (const node of flatNodes) {
    assert(Array.isArray(node.displayPath), `${label}: node ${node.id} should expose displayPath`);
    assertMatrix16(node.transform, `${label}: node ${node.id} transform`);
    assertMatrix16(node.occurrenceTransform, `${label}: node ${node.id} occurrenceTransform`);
    assert(typeof node.selectable === "boolean", `${label}: node ${node.id} selectable should be boolean`);
    if (node.isAssembly || (node.children ?? []).length > 0 || !node.hasShape) {
      assert.equal(node.selectable, false, `${label}: grouping or shape-less node ${node.id} must not be selectable`);
    }
  }

  for (const item of result.selectableOccurrences) {
    assertSelectableOccurrence(item, `${label}: selectable ${item.occurrenceRef}`);
    const node = flatNodes.find((candidate) => candidate.id === item.nodeId);
    assert(node, `${label}: selectable ${item.occurrenceRef} should map to a product tree node`);
    assert.equal(node.selectable, true, `${label}: selectable node ${node.id} should be marked selectable`);
    assert.equal(node.occurrenceRef, item.occurrenceRef, `${label}: selectable occurrenceRef should match node`);
  }
}

function assertNoViewerGeometryFields(result, label) {
  for (const key of ["rootNodes", "geometries", "materials", "stats", "triangleCount", "geometryCount", "meshCount"]) {
    assert(!hasOwn(result, key), `${label}: inspection result must not expose ${key}`);
  }
}

function assertUnitMetadata(result, label) {
  const hasSourceUnit = hasOwn(result, "sourceUnit");
  const hasUnitScale = hasOwn(result, "unitScaleToMeters");
  assert.equal(hasSourceUnit, hasUnitScale, `${label}: unit metadata should appear as a pair`);
  if (hasSourceUnit) {
    assert(typeof result.sourceUnit === "string" && result.sourceUnit.length > 0, `${label}: sourceUnit should be non-empty`);
    assert(typeof result.unitScaleToMeters === "number" && result.unitScaleToMeters > 0, `${label}: unitScaleToMeters should be positive`);
  }
}

function assertOkInspection(result, label) {
  assert.equal(result.status, "ok", `${label}: inspection should succeed`);
  assert.equal(result.sourceFormat, "step", `${label}: source format should be step`);
  assert(Array.isArray(result.productTree), `${label}: productTree should be an array`);
  assert(Array.isArray(result.reasons), `${label}: reasons should be an array`);
  assert(Array.isArray(result.warnings), `${label}: warnings should be an array`);
  assertNoViewerGeometryFields(result, label);
  assertUnitMetadata(result, label);
}

async function main() {
  const factory = loadOcctFactory();
  const m = await factory();

  assert.equal(typeof m.InspectStepProduct, "function", "InspectStepProduct must exist");

  const inspected = m.InspectStepProduct(loadFixture("simple_part.step"), {});

  assertOkInspection(inspected, "simple_part.step");
  assert.equal(inspected.classification, "single_part", "simple_part.step should classify as single_part");
  assert.equal(inspected.rootCount, 1, "simple_part.step should have one root");
  assert.equal(inspected.uniquePartCount, 1, "simple_part.step should have one unique part");
  assert.equal(inspected.partOccurrenceCount, 1, "simple_part.step should have one part occurrence");
  assert.equal(inspected.assemblyPresent, false, "simple_part.step should not expose assembly structure");
  assert(inspected.productTree.length > 0, "simple_part.step should expose productTree");
  assert(reasonCodes(inspected).has("single_free_shape_no_assembly"), "simple_part.step should explain single-part classification");
  assertSelectableMetadata(inspected, "simple_part.step");
  assert.equal(inspected.selectableOccurrences.length, 1, "simple_part.step should expose one selectable occurrence");

  const assembly = m.InspectStepProduct(loadFixture("assembly.step"), {});
  assertOkInspection(assembly, "assembly.step");
  assert.equal(assembly.classification, "assembly", "assembly.step should classify as assembly");
  assert.equal(assembly.assemblyPresent, true, "assembly.step should report assembly presence");
  assert(assembly.uniquePartCount > 1, "assembly.step should expose multiple unique parts");
  assert(assembly.partOccurrenceCount > assembly.uniquePartCount, "assembly.step should expose repeated part occurrences");
  assert(assembly.productTree.some((node) => node.isAssembly && node.children.length > 0), "assembly.step should expose assembly children");
  assert(
    reasonCodes(assembly).has("assembly_label_present") || reasonCodes(assembly).has("repeated_part_occurrence"),
    "assembly.step should explain assembly classification"
  );
  assertSelectableMetadata(assembly, "assembly.step");
  assert(assembly.selectableOccurrences.length > 0, "assembly.step should expose selectable leaf occurrences");
  const partRefCounts = new Map();
  for (const item of assembly.selectableOccurrences) {
    partRefCounts.set(item.partRef, (partRefCounts.get(item.partRef) ?? 0) + 1);
  }
  assert([...partRefCounts.values()].some((count) => count > 1), "assembly.step should expose repeated selectable occurrences by partRef");
  assert.equal(
    new Set(assembly.selectableOccurrences.map((item) => item.occurrenceRef)).size,
    assembly.selectableOccurrences.length,
    "assembly.step selectable occurrences should have distinct occurrenceRef values"
  );

  const multiPart = m.InspectStepProduct(loadFixture("two_free_shapes.step"), {});
  assertOkInspection(multiPart, "two_free_shapes.step");
  assert.equal(multiPart.classification, "multi_part", "two_free_shapes.step should classify as multi_part");
  assert.equal(multiPart.assemblyPresent, false, "two_free_shapes.step should not report assembly presence");
  assert(multiPart.rootCount > 1, "two_free_shapes.step should expose multiple roots");
  assert.equal(multiPart.uniquePartCount, 2, "two_free_shapes.step should expose two unique parts");
  assert.equal(multiPart.partOccurrenceCount, 2, "two_free_shapes.step should expose two part occurrences");
  assert(reasonCodes(multiPart).has("multiple_free_shapes"), "two_free_shapes.step should explain multi-part classification");
  assert(multiPart.classification !== "single_part", "two_free_shapes.step must not pass as single_part");
  assertSelectableMetadata(multiPart, "two_free_shapes.step");
  assert.equal(multiPart.selectableOccurrences.length, 2, "two_free_shapes.step should expose two selectable occurrences");

  const invalid = m.InspectStepProduct(new Uint8Array([0, 1, 2, 3]), {});
  assert.equal(invalid.status, "error", "invalid STEP bytes should return status=error");
  assert.equal(invalid.error?.code, "read_failed", "invalid STEP should expose read_failed");
  assert(typeof invalid.error?.code === "string" && invalid.error.code.length > 0, "invalid STEP should expose error.code");
  assert(typeof invalid.error?.message === "string" && invalid.error.message.length > 0, "invalid STEP should expose error.message");
  assertNoViewerGeometryFields(invalid, "invalid STEP");

  console.log("PASS test_step_product_inspection");
}

main().catch((error) => {
  console.error("FAIL:", error.message ?? error);
  process.exit(1);
});
