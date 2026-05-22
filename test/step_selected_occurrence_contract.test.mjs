import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const occtPromise = Promise.resolve(loadOcctFactory()());

async function getOcct() {
  return occtPromise;
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

function assertMatrix16(value, label) {
  assert.equal(Array.isArray(value), true, `${label} should be an array`);
  assert.equal(value.length, 16, `${label} should have 16 entries`);
  for (const [index, entry] of value.entries()) {
    assert.equal(Number.isFinite(Number(entry)), true, `${label} entry ${index} should be numeric`);
  }
}

function assertMatrixClose(actual, expected, label) {
  assertMatrix16(actual, `${label} actual matrix`);
  assertMatrix16(expected, `${label} expected matrix`);
  for (let index = 0; index < 16; index += 1) {
    const diff = Math.abs(Number(actual[index]) - Number(expected[index]));
    assert.ok(diff <= 1e-6, `${label} entry ${index} differs by ${diff}`);
  }
}

function matrixDiffers(actual, expected) {
  assertMatrix16(actual, "actual matrix");
  assertMatrix16(expected, "expected matrix");
  return actual.some((value, index) => Math.abs(Number(value) - Number(expected[index])) > 1e-6);
}

function assertNoViewerGeometryFields(result, label) {
  for (const key of ["rootNodes", "geometries", "materials", "stats", "triangleCount", "geometryCount", "meshCount"]) {
    assert.equal(Object.hasOwn(result, key), false, `${label} should not expose ${key}`);
  }
}

function assertStrictRejection(result, expectedCode, label) {
  assert.equal(result.success, false, `${label} should reject`);
  assert.equal(result.sourceFormat, "step", `${label} should keep sourceFormat=step`);
  assert.equal(result.rejection?.code, expectedCode, `${label} should expose ${expectedCode}`);
  assert.equal(typeof result.error, "string", `${label} should expose an error string`);
  assert.ok(result.error.length > 0, `${label} should expose a non-empty error`);
  assert.equal(typeof result.rejection?.message, "string", `${label} should expose a rejection message`);
  assert.ok(result.rejection.message.length > 0, `${label} should expose a non-empty rejection message`);
  assertNoViewerGeometryFields(result, label);
}

function findSelectableByRef(inspection, occurrenceRef) {
  return inspection.selectableOccurrences?.find((occurrence) => occurrence.occurrenceRef === occurrenceRef);
}

function findAccumulatedTransformOccurrence(inspection) {
  const nodesByRef = new Map(
    flattenTree(inspection.productTree)
      .filter((node) => typeof node.occurrenceRef === "string" && node.occurrenceRef.length > 0)
      .map((node) => [node.occurrenceRef, node]),
  );
  return inspection.selectableOccurrences?.find((occurrence) => {
    const node = nodesByRef.get(occurrence.occurrenceRef);
    return node && matrixDiffers(node.transform, occurrence.occurrenceTransform);
  });
}

function findRepeatedPartOccurrences(inspection) {
  const groups = new Map();
  for (const occurrence of inspection.selectableOccurrences ?? []) {
    const group = groups.get(occurrence.partRef) ?? [];
    group.push(occurrence);
    groups.set(occurrence.partRef, group);
  }
  for (const group of groups.values()) {
    const pair = group.find((candidate) =>
      group.some(
        (other) =>
          other !== candidate &&
          other.occurrenceRef !== candidate.occurrenceRef &&
          matrixDiffers(other.occurrenceTransform, candidate.occurrenceTransform),
      ),
    );
    if (pair) {
      const other = group.find(
        (candidate) =>
          candidate !== pair &&
          candidate.occurrenceRef !== pair.occurrenceRef &&
          matrixDiffers(candidate.occurrenceTransform, pair.occurrenceTransform),
      );
      return [pair, other];
    }
  }
  return [];
}

test("single-part STEP remains strict importable without selection", async () => {
  const occt = await getOcct();

  const result = occt.ReadStepPartFile(loadFixture("simple_part.step"), {});

  assert.equal(result.success, true);
  assert.equal(result.inspection?.classification, "single_part");
  assert.equal(result.inspection?.status, "ok");
  assert.equal(Array.isArray(result.rootNodes), true);
  assert.equal(Array.isArray(result.geometries), true);
  assert.ok(result.rootNodes.length >= 1);
});

test("assembly leaf occurrence imports as one selected root with inspected transform", async () => {
  const occt = await getOcct();
  const inspection = occt.InspectStepProduct(loadFixture("assembly.step"), {});
  const selected = findAccumulatedTransformOccurrence(inspection);

  assert.equal(inspection.status, "ok");
  assert.ok(selected, "assembly fixture should expose an accumulated transform occurrence");
  assert.equal(findSelectableByRef(inspection, selected.occurrenceRef), selected);

  const result = occt.ReadStepPartFile(loadFixture("assembly.step"), {
    selection: { kind: "occurrence", occurrenceRef: selected.occurrenceRef },
  });

  assert.equal(result.success, true);
  assert.equal(result.rootNodes.length, 1);
  assert.equal(result.rootNodes[0].isAssembly, false);
  assert.equal(result.rootNodes[0].children.length, 0);
  assert.equal(result.selectedOccurrence?.occurrenceRef, selected.occurrenceRef);
  assertMatrixClose(result.rootNodes[0].transform, selected.occurrenceTransform, "selected root transform");
  assertMatrixClose(
    result.selectedOccurrence?.occurrenceTransform,
    selected.occurrenceTransform,
    "selected occurrence metadata transform",
  );
});

test("repeated part definition occurrences keep distinct refs and independent selection", async () => {
  const occt = await getOcct();
  const inspection = occt.InspectStepProduct(loadFixture("assembly.step"), {});
  const [first, second] = findRepeatedPartOccurrences(inspection);

  assert.ok(first, "assembly fixture should expose repeated selectable occurrences");
  assert.ok(second, "assembly fixture should expose a second repeated selectable occurrence");
  assert.equal(first.partRef, second.partRef);
  assert.notEqual(first.occurrenceRef, second.occurrenceRef);
  assert.ok(matrixDiffers(first.occurrenceTransform, second.occurrenceTransform));

  for (const occurrence of [first, second]) {
    const result = occt.ReadStepPartFile(loadFixture("assembly.step"), {
      selection: { kind: "occurrence", occurrenceRef: occurrence.occurrenceRef },
    });

    assert.equal(result.success, true);
    assert.equal(result.rootNodes.length, 1);
    assert.equal(result.rootNodes[0].isAssembly, false);
    assert.equal(result.selectedOccurrence?.occurrenceRef, occurrence.occurrenceRef);
    assertMatrixClose(result.rootNodes[0].transform, occurrence.occurrenceTransform, "repeated occurrence root transform");
  }
});

test("selected import rejects unsafe selections without fallback geometry", async () => {
  const occt = await getOcct();
  const inspection = occt.InspectStepProduct(loadFixture("assembly.step"), {});
  const selected = inspection.selectableOccurrences?.[0];
  const groupingNode = flattenTree(inspection.productTree).find((node) => node.isAssembly && node.occurrenceRef);

  assert.ok(selected, "assembly fixture should expose selectable occurrences");
  assert.ok(groupingNode, "assembly fixture should expose grouping occurrences");

  assertStrictRejection(
    occt.ReadStepPartFile(loadFixture("assembly.step"), {
      selection: { kind: "occurrence", occurrenceRef: "occurrence:stale" },
    }),
    "selection_not_found",
    "stale occurrence ref",
  );
  assertStrictRejection(
    occt.ReadStepPartFile(loadFixture("assembly.step"), {
      selection: { kind: "occurrence", occurrenceRef: groupingNode.occurrenceRef },
    }),
    "selection_not_leaf_occurrence",
    "grouping occurrence ref",
  );
  assertStrictRejection(
    occt.ReadStepPartFile(loadFixture("assembly.step"), {
      selection: { kind: "part", partRef: selected.partRef },
    }),
    "selection_ambiguous",
    "part definition selection",
  );
  assertStrictRejection(
    occt.ReadStepPartFile(loadFixture("assembly.step"), {
      selection: { kind: "display-row", occurrenceRef: selected.occurrenceRef },
    }),
    "selection_not_supported",
    "unsupported selection kind",
  );
});

test("no-selection strict import still rejects assemblies and synthetic root fallback", async () => {
  const occt = await getOcct();

  assertStrictRejection(occt.ReadStepPartFile(loadFixture("assembly.step"), {}), "assembly_not_allowed", "assembly import");
  assertStrictRejection(
    occt.ReadStepPartFile(loadFixture("two_free_shapes.step"), {}),
    "multi_part_not_allowed",
    "multi-part import",
  );
  assertStrictRejection(
    occt.ReadStepPartFile(loadFixture("two_free_shapes.step"), { rootMode: "one-shape" }),
    "multi_part_not_allowed",
    "synthetic root import",
  );
});
