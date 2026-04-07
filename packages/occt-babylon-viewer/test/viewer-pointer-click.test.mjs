import test from "node:test";
import assert from "node:assert/strict";
import { createPointerClickTracker } from "../src/viewer-pointer-click.js";

test("createPointerClickTracker marks short primary-button movement as click", () => {
  const tracker = createPointerClickTracker({ dragThresholdPx: 5 });
  tracker.onPointerDown({ button: 0, clientX: 10, clientY: 20 });
  const result = tracker.consumePointerUp({ button: 0, clientX: 13, clientY: 24 });

  assert.equal(result.tracked, true);
  assert.equal(result.click, true);
  assert.ok(result.distancePx !== null && result.distancePx <= 5);
});

test("createPointerClickTracker marks long movement as drag", () => {
  const tracker = createPointerClickTracker({ dragThresholdPx: 5 });
  tracker.onPointerDown({ button: 0, clientX: 10, clientY: 20 });
  const result = tracker.consumePointerUp({ button: 0, clientX: 20, clientY: 30 });

  assert.equal(result.tracked, true);
  assert.equal(result.click, false);
  assert.ok(result.distancePx !== null && result.distancePx > 5);
});

test("createPointerClickTracker ignores non-primary pointer events", () => {
  const tracker = createPointerClickTracker();
  assert.equal(tracker.onPointerDown({ button: 2, clientX: 10, clientY: 20 }), false);
  const result = tracker.consumePointerUp({ button: 2, clientX: 10, clientY: 20 });

  assert.equal(result.tracked, false);
  assert.equal(result.click, false);
  assert.equal(result.distancePx, null);
});

test("createPointerClickTracker returns untracked when pointer-up has no matching pointer-down", () => {
  const tracker = createPointerClickTracker();
  const result = tracker.consumePointerUp({ button: 0, clientX: 10, clientY: 20 });

  assert.equal(result.tracked, false);
  assert.equal(result.click, false);
  assert.equal(result.distancePx, null);
});

test("createPointerClickTracker treats missing coordinates as click fallback", () => {
  const tracker = createPointerClickTracker();
  tracker.onPointerDown({ button: 0, clientX: 10, clientY: 20 });
  const result = tracker.consumePointerUp({ button: 0 });

  assert.equal(result.tracked, true);
  assert.equal(result.click, true);
  assert.equal(result.distancePx, null);
});

