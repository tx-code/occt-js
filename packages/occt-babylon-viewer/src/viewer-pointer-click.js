const DEFAULT_DRAG_THRESHOLD_PX = 5;

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function resolvePosition(eventLike) {
  if (!eventLike || typeof eventLike !== "object") {
    return null;
  }

  const event = eventLike;
  if (!isFiniteNumber(event.clientX) || !isFiniteNumber(event.clientY)) {
    return null;
  }

  return {
    x: event.clientX,
    y: event.clientY,
  };
}

function isPrimaryButton(eventLike) {
  if (!eventLike || typeof eventLike !== "object") {
    return true;
  }

  const event = eventLike;
  if (!isFiniteNumber(event.button)) {
    return true;
  }
  return event.button === 0;
}

function resolveThresholdPx(value) {
  if (isFiniteNumber(value) && value >= 0) {
    return value;
  }
  return DEFAULT_DRAG_THRESHOLD_PX;
}

export function createPointerClickTracker(options = {}) {
  const thresholdPx = resolveThresholdPx(options.dragThresholdPx);
  let pointerDownPosition = null;

  return {
    getThresholdPx() {
      return thresholdPx;
    },
    reset() {
      pointerDownPosition = null;
    },
    onPointerDown(eventLike) {
      if (!isPrimaryButton(eventLike)) {
        pointerDownPosition = null;
        return false;
      }

      pointerDownPosition = resolvePosition(eventLike);
      return true;
    },
    consumePointerUp(eventLike) {
      if (!isPrimaryButton(eventLike)) {
        pointerDownPosition = null;
        return {
          tracked: false,
          click: false,
          distancePx: null,
        };
      }

      if (!pointerDownPosition) {
        return {
          tracked: false,
          click: false,
          distancePx: null,
        };
      }

      const pointerUpPosition = resolvePosition(eventLike);
      const pointerDown = pointerDownPosition;
      pointerDownPosition = null;

      if (!pointerUpPosition) {
        return {
          tracked: true,
          click: true,
          distancePx: null,
        };
      }

      const deltaX = pointerUpPosition.x - pointerDown.x;
      const deltaY = pointerUpPosition.y - pointerDown.y;
      const distancePx = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      return {
        tracked: true,
        click: distancePx <= thresholdPx,
        distancePx,
      };
    },
  };
}

