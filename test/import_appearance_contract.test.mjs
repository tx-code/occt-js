import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadOcctFactory } from "./load_occt_factory.mjs";

const factory = loadOcctFactory();
const BUILT_IN_DEFAULT_CAD_COLOR = { r: 0.9, g: 0.91, b: 0.93 };
const CUSTOM_DEFAULT_CAD_COLOR = { r: 0.2, g: 0.4, b: 0.6 };
const CUSTOM_DEFAULT_OPACITY = 0.35;

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

function roundOpacity(opacity) {
  return Number.isFinite(opacity)
    ? Number(opacity.toFixed(6))
    : null;
}

function appearanceToKey(color) {
  const rounded = roundColor(color);
  return JSON.stringify([rounded.r, rounded.g, rounded.b, roundOpacity(color.opacity)]);
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

function collectAppearanceEntries(result) {
  const entries = new Set();

  for (const material of result.materials ?? []) {
    entries.add(appearanceToKey(material));
  }

  for (const geometry of result.geometries ?? []) {
    if (geometry.color) {
      entries.add(appearanceToKey(geometry.color));
    }
    for (const face of geometry.faces ?? []) {
      if (face.color) {
        entries.add(appearanceToKey(face.color));
      }
    }
    for (const edge of geometry.edges ?? []) {
      if (edge.color) {
        entries.add(appearanceToKey(edge.color));
      }
    }
  }

  return [...entries].sort();
}

function collectAppearanceOpacities(result) {
  const opacities = new Set();

  const collect = (color) => {
    const opacity = roundOpacity(color?.opacity);
    if (opacity !== null) {
      opacities.add(opacity);
    }
  };

  for (const material of result.materials ?? []) {
    collect(material);
  }

  for (const geometry of result.geometries ?? []) {
    collect(geometry.color);
    for (const face of geometry.faces ?? []) {
      collect(face.color);
    }
    for (const edge of geometry.edges ?? []) {
      collect(edge.color);
    }
  }

  return [...opacities].sort((a, b) => a - b);
}

function appearanceSignature(result) {
  return {
    materialCount: result.materials?.length ?? 0,
    appearances: collectAppearanceEntries(result),
    geometryColorPresence: (result.geometries ?? []).map((geometry) => ({
      color: geometry.color ? appearanceToKey(geometry.color) : null,
      faceColors: (geometry.faces ?? []).map((face) => face.color ? appearanceToKey(face.color) : null),
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

function assertUsesDefaultOpacity(result, opacity, label) {
  assert.equal(result?.success, true, `${label}: import should succeed`);
  assert.deepEqual(
    collectAppearanceOpacities(result),
    [roundOpacity(opacity)],
    `${label}: appearance opacities should collapse to the caller-provided default opacity`,
  );
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

test("defaultOpacity sets the default-appearance material opacity for stateless imports", async () => {
  const module = await createModule();
  const bytes = await loadFixture("ANC101_colored.stp");

  const result = module.ReadFile("step", bytes, {
    colorMode: "default",
    defaultOpacity: CUSTOM_DEFAULT_OPACITY,
  });

  assertUsesBuiltInDefaultCadColor(result, "ReadFile(step, defaultOpacity)");
  assertUsesDefaultOpacity(result, CUSTOM_DEFAULT_OPACITY, "ReadFile(step, defaultOpacity)");
});

test("defaultOpacity composes with built-in and custom default colors", async () => {
  const module = await createModule();
  const fixtures = [
    ["step", "ANC101_colored.stp", undefined, BUILT_IN_DEFAULT_CAD_COLOR],
    ["iges", "bearing.igs", CUSTOM_DEFAULT_CAD_COLOR, CUSTOM_DEFAULT_CAD_COLOR],
    ["brep", "ANC101_isolated_components.brep", CUSTOM_DEFAULT_CAD_COLOR, CUSTOM_DEFAULT_CAD_COLOR],
  ];

  for (const [format, fixture, defaultColor, expectedColor] of fixtures) {
    const bytes = await loadFixture(fixture);
    const result = module.ReadFile(format, bytes, {
      colorMode: "default",
      defaultColor,
      defaultOpacity: CUSTOM_DEFAULT_OPACITY,
    });

    assertUsesCustomDefaultColor(
      result,
      expectedColor,
      `ReadFile(${format}, ${fixture}, defaultOpacity composition)`,
    );
    assertUsesDefaultOpacity(
      result,
      CUSTOM_DEFAULT_OPACITY,
      `ReadFile(${format}, ${fixture}, defaultOpacity composition)`,
    );
  }
});

test("defaultOpacity is ignored unless colorMode default is selected", async () => {
  const module = await createModule();
  const bytes = await loadFixture("ANC101_colored.stp");

  const explicitSource = module.ReadFile("step", bytes, {
    colorMode: "source",
    defaultOpacity: CUSTOM_DEFAULT_OPACITY,
  });
  const legacyColorless = module.ReadFile("step", bytes, {
    readColors: false,
    defaultOpacity: CUSTOM_DEFAULT_OPACITY,
  });

  assert.equal(explicitSource?.success, true);
  assert.ok(
    collectAppearanceColors(explicitSource).length >= 2,
    "explicit source mode should ignore defaultOpacity and preserve imported colors",
  );
  assert.deepEqual(
    collectAppearanceOpacities(explicitSource),
    [],
    "explicit source mode should not surface defaultOpacity on raw appearance payloads",
  );
  assertLegacyColorless(
    legacyColorless,
    "ReadFile(step, readColors=false, defaultOpacity without colorMode)",
  );
  assert.deepEqual(
    collectAppearanceOpacities(legacyColorless),
    [],
    "legacy no-colorMode imports should ignore defaultOpacity",
  );
});

test("OpenExact uses the same defaultOpacity appearance payload as ReadFile", async () => {
  const module = await createModule();
  const bytes = await loadFixture("ANC101_colored.stp");
  const params = {
    colorMode: "default",
    defaultOpacity: CUSTOM_DEFAULT_OPACITY,
  };

  const readResult = module.ReadFile("step", bytes, params);
  const directExact = module.OpenExactStepModel(bytes, params);
  const genericExact = module.OpenExactModel("step", bytes, params);

  assertUsesBuiltInDefaultCadColor(readResult, "ReadFile(step, defaultOpacity exact parity)");
  assertUsesDefaultOpacity(readResult, CUSTOM_DEFAULT_OPACITY, "ReadFile(step, defaultOpacity exact parity)");
  assertExactAppearanceContract(directExact, "OpenExactStepModel(defaultOpacity)");
  assertExactAppearanceContract(genericExact, "OpenExactModel(step, defaultOpacity)");
  assert.deepEqual(
    appearanceSignature(directExact),
    appearanceSignature(readResult),
    "direct exact open should match the read-lane defaultOpacity payload",
  );
  assert.deepEqual(
    appearanceSignature(genericExact),
    appearanceSignature(readResult),
    "generic exact open should match the read-lane defaultOpacity payload",
  );

  assert.deepEqual(module.ReleaseExactModel(directExact.exactModelId), { ok: true });
  assert.deepEqual(module.ReleaseExactModel(genericExact.exactModelId), { ok: true });
});

test("defaultOpacity parity holds across colored and colorless fixtures", async () => {
  const module = await createModule();
  const fixtures = [
    ["step", "ANC101_colored.stp", "OpenExactStepModel"],
    ["iges", "bearing.igs", "OpenExactIgesModel"],
    ["brep", "ANC101_isolated_components.brep", "OpenExactBrepModel"],
  ];

  for (const [format, fixture, directMethod] of fixtures) {
    const bytes = await loadFixture(fixture);
    const params = {
      colorMode: "default",
      defaultColor: CUSTOM_DEFAULT_CAD_COLOR,
      defaultOpacity: CUSTOM_DEFAULT_OPACITY,
    };

    const readResult = module.ReadFile(format, bytes, params);
    const directExact = module[directMethod](bytes, params);
    const genericExact = module.OpenExactModel(format, bytes, params);

    assertUsesCustomDefaultColor(readResult, CUSTOM_DEFAULT_CAD_COLOR, `ReadFile(${format}, ${fixture}, defaultOpacity parity)`);
    assertUsesDefaultOpacity(readResult, CUSTOM_DEFAULT_OPACITY, `ReadFile(${format}, ${fixture}, defaultOpacity parity)`);
    assert.deepEqual(
      appearanceSignature(directExact),
      appearanceSignature(readResult),
      `${format}: direct exact open should match the read-lane defaultOpacity payload`,
    );
    assert.deepEqual(
      appearanceSignature(genericExact),
      appearanceSignature(readResult),
      `${format}: generic exact open should match the read-lane defaultOpacity payload`,
    );

    assert.deepEqual(module.ReleaseExactModel(directExact.exactModelId), { ok: true });
    assert.deepEqual(module.ReleaseExactModel(genericExact.exactModelId), { ok: true });
  }
});

test("defaultOpacity compatibility keeps source and legacy lanes deterministic", async () => {
  const module = await createModule();
  const bytes = await loadFixture("ANC101_colored.stp");

  const explicitSourceRead = module.ReadFile("step", bytes, {
    colorMode: "source",
    defaultOpacity: CUSTOM_DEFAULT_OPACITY,
  });
  const explicitSourceExact = module.OpenExactStepModel(bytes, {
    colorMode: "source",
    defaultOpacity: CUSTOM_DEFAULT_OPACITY,
  });
  const legacyRead = module.ReadFile("step", bytes, {
    readColors: false,
    defaultOpacity: CUSTOM_DEFAULT_OPACITY,
  });
  const legacyExact = module.OpenExactStepModel(bytes, {
    readColors: false,
    defaultOpacity: CUSTOM_DEFAULT_OPACITY,
  });

  assert.equal(explicitSourceRead?.success, true);
  assert.ok(
    collectAppearanceColors(explicitSourceRead).length >= 2,
    "source read lane should still preserve imported colors",
  );
  assert.deepEqual(collectAppearanceOpacities(explicitSourceRead), []);
  assertExactAppearanceContract(explicitSourceExact, "OpenExactStepModel(source defaultOpacity)");
  assert.deepEqual(
    collectAppearanceOpacities(explicitSourceExact),
    [],
    "source exact lane should ignore defaultOpacity",
  );
  assert.ok(
    collectAppearanceColors(explicitSourceExact).length >= 2,
    "source exact lane should still preserve imported colors",
  );

  assertLegacyColorless(legacyRead, "ReadFile(step, legacy defaultOpacity compatibility)");
  assert.deepEqual(collectAppearanceOpacities(legacyRead), []);
  assertExactAppearanceContract(legacyExact, "OpenExactStepModel(legacy defaultOpacity compatibility)");
  assert.deepEqual(collectAppearanceColors(legacyExact), []);
  assert.deepEqual(collectAppearanceOpacities(legacyExact), []);

  assert.deepEqual(module.ReleaseExactModel(explicitSourceExact.exactModelId), { ok: true });
  assert.deepEqual(module.ReleaseExactModel(legacyExact.exactModelId), { ok: true });
});
