const ROLE_ORDER = Object.freeze({
  profile: 0,
  closure: 10,
  axis: 20,
  start_cap: 30,
  end_cap: 40,
  degenerated: 50,
});

const TAG_ORDER = Object.freeze({
  tip: 0,
  cutting: 1,
  corner: 2,
  neck: 3,
  shank: 4,
});

const ROLE_LABEL = Object.freeze({
  profile: "Profile",
  closure: "Closure",
  axis: "Axis",
  start_cap: "Start Cap",
  end_cap: "End Cap",
  degenerated: "Degenerated",
});

function normalizeColor(color) {
  if (!Array.isArray(color) && !ArrayBuffer.isView(color)) {
    return null;
  }
  const values = Array.from(color);
  if (values.length < 3) {
    return null;
  }
  const normalized = values.slice(0, 4).map((value, index) => {
    if (!Number.isFinite(Number(value))) {
      return index === 3 ? 1 : 0;
    }
    const numeric = Number(value);
    return Math.max(0, Math.min(1, numeric));
  });
  if (normalized.length < 4) {
    normalized.push(1);
  }
  return normalized;
}

function colorKey(color) {
  return color
    .slice(0, 4)
    .map((component) => Math.round(component * 255))
    .join(",");
}

function titleCaseToken(value) {
  return String(value ?? "")
    .trim()
    .split(/[_\-\s]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveFace(model, binding) {
  const geometry = typeof binding?.geometryId === "string"
    ? model?.geometries?.find((entry) => entry?.id === binding.geometryId)
    : Number.isInteger(binding?.geometryIndex)
      ? model?.geometries?.[binding.geometryIndex]
      : null;
  if (!geometry) {
    return { geometry: null, face: null };
  }

  const face = (geometry.faces ?? []).find((entry) => entry?.id === binding.faceId) ?? null;
  return { geometry, face };
}

function resolveLegendEntry(binding, color) {
  const role = typeof binding?.systemRole === "string" ? binding.systemRole : "profile";
  const tag = typeof binding?.segmentTag === "string" ? binding.segmentTag : "";
  const segmentId = typeof binding?.segmentId === "string" ? binding.segmentId : "";
  const segmentIndex = Number.isInteger(binding?.segmentIndex) ? binding.segmentIndex : null;
  const detailParts = [];

  if (role === "profile") {
    const label = tag
      ? titleCaseToken(tag)
      : segmentId
        ? titleCaseToken(segmentId)
        : segmentIndex !== null
          ? `Segment ${segmentIndex + 1}`
          : "Profile";

    detailParts.push("Profile surface");
    if (segmentId && (!tag || segmentId.toLowerCase() !== tag.toLowerCase())) {
      detailParts.push(`id ${segmentId}`);
    }
    if (segmentIndex !== null) {
      detailParts.push(`segment ${segmentIndex + 1}`);
    }

    return {
      key: `${role}|${tag}|${segmentId}|${segmentIndex ?? ""}|${colorKey(color)}`,
      label,
      detail: detailParts.join(" · "),
      order: ROLE_ORDER.profile + ((typeof TAG_ORDER[tag] === "number" ? TAG_ORDER[tag] : 9) / 100),
    };
  }

  return {
    key: `${role}|${tag}|${segmentId}|${segmentIndex ?? ""}|${colorKey(color)}`,
    label: ROLE_LABEL[role] ?? titleCaseToken(role),
    detail: detailParts.join(" · "),
    order: ROLE_ORDER[role] ?? 99,
  };
}

function compareLegendEntries(a, b) {
  if (a.order !== b.order) {
    return a.order - b.order;
  }
  return a.label.localeCompare(b.label);
}

function formatAngle(angleDeg) {
  if (!Number.isFinite(Number(angleDeg))) {
    return null;
  }
  const numeric = Number(angleDeg);
  return Number.isInteger(numeric) ? `${numeric}\u00b0` : `${numeric.toFixed(1)}\u00b0`;
}

export function buildGeneratedToolLegend(model) {
  const metadata = model?.generatedTool;
  if (!metadata || !Array.isArray(metadata.faceBindings) || metadata.faceBindings.length === 0) {
    return null;
  }

  const entries = new Map();
  for (const binding of metadata.faceBindings) {
    const { geometry, face } = resolveFace(model, binding);
    const color = normalizeColor(face?.color ?? geometry?.color);
    if (!color) {
      continue;
    }

    const descriptor = resolveLegendEntry(binding, color);
    if (!entries.has(descriptor.key)) {
      entries.set(descriptor.key, {
        ...descriptor,
        color,
        faceCount: 0,
        faceRefs: [],
      });
    }

    const entry = entries.get(descriptor.key);
    entry.faceCount += 1;
    const geometryId = geometry?.id ?? binding?.geometryId;
    const faceKey = `${geometryId ?? ""}|${binding.faceId}`;
    if (!entry.faceRefs.some((faceRef) => `${faceRef.geometryId ?? ""}|${faceRef.faceId}` === faceKey)) {
      entry.faceRefs.push({
        geometryId,
        faceId: binding.faceId,
      });
    }
  }

  const resolvedEntries = Array.from(entries.values()).sort(compareLegendEntries);
  if (resolvedEntries.length === 0) {
    return null;
  }

  return {
    units: typeof metadata.units === "string" ? metadata.units : null,
    angleLabel: formatAngle(metadata.angleDeg),
    closure: typeof metadata.closure === "string" ? titleCaseToken(metadata.closure) : null,
    entries: resolvedEntries,
  };
}

export function resolveGeneratedToolLegendActiveKeys(legend, selectedDetail) {
  if (!legend || !Array.isArray(legend.entries) || !selectedDetail || !Array.isArray(selectedDetail.items)) {
    return new Set();
  }

  const selectedFaceRefs = new Set(
    selectedDetail.items
      .filter((item) => item?.mode === "face" && typeof item?.geometryId === "string" && Number.isFinite(item?.faceId))
      .map((item) => `${item.geometryId}|${item.faceId}`),
  );

  if (selectedFaceRefs.size === 0) {
    return new Set();
  }

  const activeKeys = new Set();
  for (const entry of legend.entries) {
    if ((entry.faceRefs ?? []).some((faceRef) => selectedFaceRefs.has(`${faceRef.geometryId}|${faceRef.faceId}`))) {
      activeKeys.add(entry.key);
    }
  }
  return activeKeys;
}
