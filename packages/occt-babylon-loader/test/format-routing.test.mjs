import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { inferOcctFormatFromFileName } from "../src/format-routing.js";

describe("inferOcctFormatFromFileName", () => {
  it("maps STEP extensions", () => {
    assert.equal(inferOcctFormatFromFileName("part.step"), "step");
    assert.equal(inferOcctFormatFromFileName("part.STP"), "step");
  });

  it("maps IGES extensions", () => {
    assert.equal(inferOcctFormatFromFileName("part.iges"), "iges");
    assert.equal(inferOcctFormatFromFileName("part.igs"), "iges");
  });

  it("maps BREP extensions", () => {
    assert.equal(inferOcctFormatFromFileName("part.brep"), "brep");
    assert.equal(inferOcctFormatFromFileName("part.brp"), "brep");
  });

  it("returns null when extension is unknown", () => {
    assert.equal(inferOcctFormatFromFileName("part.obj"), null);
    assert.equal(inferOcctFormatFromFileName("part"), null);
  });
});
