import test from "node:test";
import assert from "node:assert/strict";
import { createScreenSpaceVertexMarker } from "../src/viewer-vertex-markers.js";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.dataset = {};
    this.style = {};
    this.children = [];
    this.parentNode = null;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
  }

  remove() {
    if (!this.parentNode) {
      return;
    }
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }
}

function createFakeDocument() {
  const body = new FakeElement("body");
  return {
    body,
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };
}

function createMockRuntime() {
  const observers = new Set();
  const canvas = {
    isConnected: true,
    clientWidth: 800,
    clientHeight: 600,
    getBoundingClientRect() {
      return {
        left: 10,
        top: 20,
      };
    },
  };
  const projected = { x: 400, y: 300, z: 0.5 };

  const engine = {
    getRenderingCanvas() {
      return canvas;
    },
    getRenderWidth() {
      return 1600;
    },
    getRenderHeight() {
      return 1200;
    },
  };

  const scene = {
    getEngine() {
      return engine;
    },
    getTransformMatrix() {
      return {};
    },
    onBeforeRenderObservable: {
      add(observer) {
        observers.add(observer);
        return observer;
      },
      remove(observer) {
        observers.delete(observer);
      },
    },
  };

  const camera = {
    viewport: {
      toGlobal() {
        return {};
      },
    },
  };

  const BABYLON = {
    Matrix: {
      Identity() {
        return {};
      },
    },
    Vector3: {
      Project() {
        return projected;
      },
    },
  };

  return {
    scene,
    camera,
    BABYLON,
    observers,
    projected,
  };
}

test("createScreenSpaceVertexMarker renders fixed-screen marker and cleans up", () => {
  const documentRef = createFakeDocument();
  const runtime = createMockRuntime();

  const marker = createScreenSpaceVertexMarker(
    runtime.scene,
    { clone: () => ({}) },
    runtime.camera,
    runtime.BABYLON,
    {
      markerType: "select",
      coreColor: { r: 0, g: 1, b: 0 },
      ringColor: { r: 0, g: 0, b: 0 },
      documentRef,
    },
  );

  assert.ok(marker);
  assert.equal(documentRef.body.children.length, 1);
  const root = documentRef.body.children[0];
  assert.equal(root.dataset.vertexMarker, "select");
  assert.equal(root.style.left, "210px");
  assert.equal(root.style.top, "170px");
  assert.equal(root.style.display, "block");
  assert.equal(runtime.observers.size, 1);

  runtime.projected.x = 800;
  runtime.projected.y = 600;
  for (const observer of runtime.observers) {
    observer();
  }
  assert.equal(root.style.left, "410px");
  assert.equal(root.style.top, "320px");

  marker.dispose();
  assert.equal(documentRef.body.children.length, 0);
  assert.equal(runtime.observers.size, 0);
});

test("createScreenSpaceVertexMarker hides marker when projected point is clipped", () => {
  const documentRef = createFakeDocument();
  const runtime = createMockRuntime();
  runtime.projected.z = 1.2;

  const marker = createScreenSpaceVertexMarker(
    runtime.scene,
    { clone: () => ({}) },
    runtime.camera,
    runtime.BABYLON,
    {
      markerType: "hover",
      coreColor: { r: 0, g: 0.8, b: 1 },
      ringColor: { r: 0, g: 0, b: 0 },
      documentRef,
    },
  );

  assert.ok(marker);
  assert.equal(documentRef.body.children.length, 1);
  const root = documentRef.body.children[0];
  assert.equal(root.style.display, "none");
});
