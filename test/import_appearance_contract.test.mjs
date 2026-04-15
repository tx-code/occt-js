import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const factory = loadOcctFactory();
const BUILT_IN_DEFAULT_CAD_COLOR = { r: 0.9, g: 0.91, b: 0.93 };
const CUSTOM_DEFAULT_CAD_COLOR = { r: 0.2, g: 0.4, b: 0.6 };

async function loadFixture(name) {
  return new Uint8Array(await readFile(new URL(`./${name}`, import.meta.url)));
}

async function createModule() {
  return factory();
}

function roundColor(color) {
  return {
    r: Number(color.r.toFixed(6)),
    g: Number(color.g.toFixed(6)),
    b: Number(color.b.toFixed(6)),
  };
}

function colorToKey(color) {
  const rounded = roundColor(color);
  return JSON.stringify([rounded.r, rounded.g, rounded.b]);
}

function collectAppearanceColors(result) {
  const colors = new Set();

  for (const material of result.materials ?? []) {
    colors.add(colorToKey(material));
  }

  for (const geometry of result.geometries ?? []) {
    if (geometry.color) {
      colors.add(colorToKey(geometry.color));
    }
    for (const face of geometry.faces ?? []) {
      if (face.color) {
        colors.add(colorToKey(face.color));
      }
    }
    for (const edge of geometry.edges ?? []) {
      if (edge.color) {
        colors.add(colorToKey(edge.color));
      }
    }
  }

  return [...colors].sort();
}

function appearanceSignature(result) {
  return {
    materialCount: result.materials?.length ?? 0,
    appearanceColors: collectAppearanceColors(result),
    geometryColorPresence: (result.geometries ?? []).map((geometry) => ({
      color: geometry.color ? colorToKey(geometry.color) : null,
      faceColors: (geometry.faces ?? []).map((face) => face.color ? colorToKey(face.color) : null),
    })),
  };
}

function assertUsesBuiltInDefaultCadColor(result, label) {
  assert.equal(result?.success, true, `${label}: import should succeed`);
  assert.deepEqual(
    collectAppearanceColors(result),
    [colorToKey(BUILT_IN_DEFAULT_CAD_COLOR)],
    `${label}: appearance colors should collapse to the built-in CAD color`,
  );
  assert.equal(result.materials?.length, 1, `${label}: materials should collapse to one default-color material`);
}

function assertUsesCustomDefaultColor(result, color, label) {
  assert.equal(result?.success, true, `${label}: import should succeed`);
  assert.deepEqual(
    collectAppearanceColors(result),
    [colorToKey(color)],
    `${label}: appearance colors should collapse to the caller-provided default color`,
  );
  assert.equal(result.materials?.length, 1, `${label}: materials should collapse to one default-color material`);
}

function assertLegacyColorless(result, label) {
  assert.equal(result?.success, true, `${label}: import should succeed`);
  assert.deepEqual(
    collectAppearanceColors(result),
    [],
    `${label}: legacy readColors=false should stay colorless when colorMode is omitted`,
  );
  assert.equal(result.materials?.length, 0, `${label}: legacy readColors=false should not synthesize a default material`);
}

function assertExactAppearanceContract(result, label) {
  assert.equal(result?.success, true, `${label}: exact open should succeed`);
  assert.equal(typeof result?.exactModelId, "number", `${label}: exactModelId should be numeric`);
  assert.ok(Array.isArray(result?.exactGeometryBindings), `${label}: exactGeometryBindings should be present`);
  assert.equal(
    result.exactGeometryBindings.length,
    result.geometries?.length ?? 0,
    `${label}: exactGeometryBindings should stay aligned with geometries`,
  );
}

test("colorMode default forces the built-in CAD color on colored STEP imports", async () => {
  const module = await createModule();
  const bytes = await loadFixture("ANC101_colored.stp");

  const result = module.ReadFile("step", bytes, { colorMode: "default" });

  assertUsesBuiltInDefaultCadColor(result, "ReadFile(step, colorMode=default)");
});

test("colorMode source preserves imported source colors on colored STEP imports", async () => {
  const module = await createModule();
  const bytes = await loadFixture("ANC101_colored.stp");

  const result = module.ReadFile("step", bytes, { colorMode: "source" });

  assert.equal(result?.success, true);
  const colors = collectAppearanceColors(result);
  assert.ok(colors.length >= 2, "source colors should retain multiple imported colors");
  assert.notDeepEqual(colors, [colorToKey(BUILT_IN_DEFAULT_CAD_COLOR)]);
});

test("colorMode default assigns the built-in CAD color to colorless IGES and BREP imports", async () => {
  const module = await createModule();
  const igesBytes = await loadFixture("bearing.igs");
  const brepBytes = await loadFixture("ANC101_isolated_components.brep");

  const igesResult = module.ReadFile("iges", igesBytes, { colorMode: "default" });
  const brepResult = module.ReadFile("brep", brepBytes, { colorMode: "default" });

  assertUsesBuiltInDefaultCadColor(igesResult, "ReadFile(iges, colorMode=default)");
  assertUsesBuiltInDefaultCadColor(brepResult, "ReadFile(brep, colorMode=default)");
});

test("ReadFile and format-specific entry points stay in parity for appearance-mode output", async () => {
  const module = await createModule();
  const stepBytes = await loadFixture("ANC101_colored.stp");
  const igesBytes = await loadFixture("bearing.igs");
  const brepBytes = await loadFixture("ANC101_isolated_components.brep");

  const params = { colorMode: "default" };

  assert.deepEqual(
    appearanceSignature(module.ReadStepFile(stepBytes, params)),
    appearanceSignature(module.ReadFile("step", stepBytes, params)),
    "STEP appearance output should match between direct and generic entrypoints",
  );
  assert.deepEqual(
    appearanceSignature(module.ReadIgesFile(igesBytes, params)),
    appearanceSignature(module.ReadFile("iges", igesBytes, params)),
    "IGES appearance output should match between direct and generic entrypoints",
  );
  assert.deepEqual(
    appearanceSignature(module.ReadBrepFile(brepBytes, params)),
    appearanceSignature(module.ReadFile("brep", brepBytes, params)),
    "BREP appearance output should match between direct and generic entrypoints",
  );
});

test("legacy readColors false stays colorless when colorMode is omitted", async () => {
  const module = await createModule();
  const bytes = await loadFixture("ANC101_colored.stp");

  const result = module.ReadFile("step", bytes, { readColors: false });

  assertLegacyColorless(result, "ReadFile(step, readColors=false)");
});

test("explicit colorMode takes precedence over legacy readColors", async () => {
  const module = await createModule();
  const bytes = await loadFixture("ANC101_colored.stp");

  const explicitSource = module.ReadFile("step", bytes, {
    readColors: false,
    colorMode: "source",
  });
  const explicitDefault = module.ReadFile("step", bytes, {
    readColors: true,
    colorMode: "default",
  });

  assert.equal(explicitSource?.success, true);
  assert.ok(
    collectAppearanceColors(explicitSource).length >= 2,
    "explicit source mode should win over legacy readColors=false",
  );
  assert.notDeepEqual(
    collectAppearanceColors(explicitSource),
    [colorToKey(BUILT_IN_DEFAULT_CAD_COLOR)],
  );
  assertUsesBuiltInDefaultCadColor(
    explicitDefault,
    "ReadFile(step, readColors=true, colorMode=default)",
  );
});

test("OpenExact appearance mode keeps exact bindings while matching root colors", async () => {
  const module = await createModule();
  const fixtures = [
    ["step", "ANC101_colored.stp", "OpenExactStepModel"],
    ["iges", "bearing.igs", "OpenExactIgesModel"],
    ["brep", "ANC101_isolated_components.brep", "OpenExactBrepModel"],
  ];

  for (const [format, fixture, directMethod] of fixtures) {
    const bytes = await loadFixture(fixture);
    const params = { colorMode: "default" };

    const readResult = module.ReadFile(format, bytes, params);
    const directExact = module[directMethod](bytes, params);
    const genericExact = module.OpenExactModel(format, bytes, params);

    assertUsesBuiltInDefaultCadColor(readResult, `ReadFile(${format}, colorMode=default)`);
    assertExactAppearanceContract(directExact, `${directMethod}(${fixture})`);
    assertExactAppearanceContract(genericExact, `OpenExactModel(${format}, ${fixture})`);
    assert.deepEqual(
      appearanceSignature(directExact),
      appearanceSignature(readResult),
      `${format}: direct exact open should match the read-lane appearance payload`,
    );
    assert.deepEqual(
      appearanceSignature(genericExact),
      appearanceSignature(readResult),
      `${format}: generic exact open should match the read-lane appearance payload`,
    );

    assert.deepEqual(module.ReleaseExactModel(directExact.exactModelId), { ok: true });
    assert.deepEqual(module.ReleaseExactModel(genericExact.exactModelId), { ok: true });
  }
});

test("defaultColor overrides the built-in CAD color for stateless imports", async () => {
  const module = await createModule();
  const bytes = await loadFixture("ANC101_colored.stp");

  const result = module.ReadFile("step", bytes, {
    colorMode: "default",
    defaultColor: CUSTOM_DEFAULT_CAD_COLOR,
  });

  assertUsesCustomDefaultColor(result, CUSTOM_DEFAULT_CAD_COLOR, "ReadFile(step, custom defaultColor)");
});

test("defaultColor is ignored unless colorMode default is selected", async () => {
  const module = await createModule();
  const bytes = await loadFixture("ANC101_colored.stp");

  const explicitSource = module.ReadFile("step", bytes, {
    colorMode: "source",
    defaultColor: CUSTOM_DEFAULT_CAD_COLOR,
  });
  const legacyColorless = module.ReadFile("step", bytes, {
    readColors: false,
    defaultColor: CUSTOM_DEFAULT_CAD_COLOR,
  });

  assert.equal(explicitSource?.success, true);
  assert.ok(
    collectAppearanceColors(explicitSource).length >= 2,
    "explicit source mode should ignore defaultColor and preserve imported colors",
  );
  assert.notDeepEqual(
    collectAppearanceColors(explicitSource),
    [colorToKey(CUSTOM_DEFAULT_CAD_COLOR)],
  );
  assertLegacyColorless(
    legacyColorless,
    "ReadFile(step, readColors=false, defaultColor without colorMode)",
  );
});

test("OpenExact uses the same custom defaultColor appearance payload as ReadFile", async () => {
  const module = await createModule();
  const bytes = await loadFixture("ANC101_colored.stp");
  const params = {
    colorMode: "default",
    defaultColor: CUSTOM_DEFAULT_CAD_COLOR,
  };

  const readResult = module.ReadFile("step", bytes, params);
  const directExact = module.OpenExactStepModel(bytes, params);
  const genericExact = module.OpenExactModel("step", bytes, params);

  assertUsesCustomDefaultColor(readResult, CUSTOM_DEFAULT_CAD_COLOR, "ReadFile(step, custom defaultColor)");
  assertExactAppearanceContract(directExact, "OpenExactStepModel(custom defaultColor)");
  assertExactAppearanceContract(genericExact, "OpenExactModel(step, custom defaultColor)");
  assert.deepEqual(
    appearanceSignature(directExact),
    appearanceSignature(readResult),
    "direct exact open should match the read-lane custom defaultColor payload",
  );
  assert.deepEqual(
    appearanceSignature(genericExact),
    appearanceSignature(readResult),
    "generic exact open should match the read-lane custom defaultColor payload",
  );

  assert.deepEqual(module.ReleaseExactModel(directExact.exactModelId), { ok: true });
  assert.deepEqual(module.ReleaseExactModel(genericExact.exactModelId), { ok: true });
});

test("custom defaultColor parity holds across colored and colorless fixtures", async () => {
  const module = await createModule();
  const fixtures = [
    ["step", "ANC101_colored.stp"],
    ["iges", "bearing.igs"],
    ["brep", "ANC101_isolated_components.brep"],
  ];

  for (const [format, fixture] of fixtures) {
    const bytes = await loadFixture(fixture);
    const result = module.ReadFile(format, bytes, {
      colorMode: "default",
      defaultColor: CUSTOM_DEFAULT_CAD_COLOR,
    });

    assertUsesCustomDefaultColor(result, CUSTOM_DEFAULT_CAD_COLOR, `ReadFile(${format}, ${fixture}, custom defaultColor)`);
  }
});
