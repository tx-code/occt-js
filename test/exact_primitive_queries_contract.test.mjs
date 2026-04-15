import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const factory = loadOcctFactory();

async function loadFixture(name) {
  return new Uint8Array(await readFile(new URL(`./${name}`, import.meta.url)));
}

async function createModule() {
  return factory();
}

function getExactRef(result, geometryIndex, kind, elementId) {
  return [
    result.exactModelId,
    result.exactGeometryBindings[geometryIndex].exactShapeHandle,
    kind,
    elementId,
  ];
}

test("exact queries classify analytic plane and line refs from retained exact geometry", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const result = module.OpenExactStepModel(stepBytes, {});

  assert.equal(result?.success, true);
  const geometry = result.geometries[0];
  assert.ok(geometry?.faces?.length > 0);
  assert.ok(geometry?.edges?.length > 0);

  const faceKinds = geometry.faces.map((face) => (
    module.GetExactGeometryType(...getExactRef(result, 0, "face", face.id))
  ));
  const edgeKinds = geometry.edges.map((edge) => (
    module.GetExactGeometryType(...getExactRef(result, 0, "edge", edge.id))
  ));

  assert.ok(faceKinds.some((entry) => entry?.ok === true && entry.family === "plane"));
  assert.ok(edgeKinds.some((entry) => entry?.ok === true && entry.family === "line"));
});

test("exact queries return radius and center for circular or cylindrical refs", async () => {
  const module = await createModule();
  const brepBytes = await loadFixture("as1_pe_203.brep");
  const result = module.OpenExactBrepModel(brepBytes, {});

  assert.equal(result?.success, true);
  const geometry = result.geometries[0];
  assert.ok(geometry?.faces?.length > 0);
  assert.ok(geometry?.edges?.length > 0);

  let queryRef = null;
  for (const edge of geometry.edges) {
    const family = module.GetExactGeometryType(...getExactRef(result, 0, "edge", edge.id));
    if (family?.ok === true && family.family === "circle") {
      queryRef = getExactRef(result, 0, "edge", edge.id);
      break;
    }
  }
  if (!queryRef) {
    for (const face of geometry.faces) {
      const family = module.GetExactGeometryType(...getExactRef(result, 0, "face", face.id));
      if (family?.ok === true && family.family === "cylinder") {
        queryRef = getExactRef(result, 0, "face", face.id);
        break;
      }
    }
  }

  assert.ok(queryRef, "as1_pe_203.brep should expose at least one circle or cylinder exact ref");

  const radius = module.MeasureExactRadius(...queryRef);
  const center = module.MeasureExactCenter(...queryRef);

  assert.equal(radius?.ok, true);
  assert.equal(typeof radius?.radius, "number");
  assert.equal(typeof radius?.diameter, "number");
  assert.ok(Array.isArray(radius?.localCenter) && radius.localCenter.length === 3);
  assert.ok(Array.isArray(radius?.localAnchorPoint) && radius.localAnchorPoint.length === 3);
  assert.equal(center?.ok, true);
  assert.ok(Array.isArray(center?.localCenter) && center.localCenter.length === 3);
  assert.ok(Array.isArray(center?.localAxisDirection) && center.localAxisDirection.length === 3);
});

test("unsupported exact primitive requests fail explicitly", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("simple_part.step");
  const result = module.OpenExactStepModel(stepBytes, {});

  assert.equal(result?.success, true);
  const geometry = result.geometries[0];
  const lineEdge = geometry.edges.find((edge) => {
    const family = module.GetExactGeometryType(...getExactRef(result, 0, "edge", edge.id));
    return family?.ok === true && family.family === "line";
  });

  assert.ok(lineEdge, "simple_part.step should expose at least one line edge");

  assert.deepEqual(
    module.MeasureExactRadius(...getExactRef(result, 0, "edge", lineEdge.id)),
    {
      ok: false,
      code: "unsupported-geometry",
      message: "Exact radius is not supported for the requested element.",
    },
  );
});
