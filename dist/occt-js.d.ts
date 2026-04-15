export type OcctFormat = "step" | "iges" | "brep";
export type OcctJSExactElementKind = "face" | "edge" | "vertex";
export type OcctJSExactGeometryFamily = "line" | "circle" | "plane" | "cylinder" | "sphere" | "cone" | "torus" | "other";
export type OcctJSImportColorMode = "source" | "default";
export type OcctJSImportAppearancePreset = "cad-solid" | "cad-ghosted";

export interface OcctJSColor {
    r: number;
    g: number;
    b: number;
    opacity?: number;
}

export interface OcctJSFace {
    id: number;
    name: string;
    firstIndex: number;
    indexCount: number;
    edgeIndices: number[];
    color: OcctJSColor | null;
}

export interface OcctJSEdge {
    id: number;
    name: string;
    points: Float32Array;
    ownerFaceIds: number[];
    isFreeEdge: boolean;
    color: OcctJSColor | null;
}

export interface OcctJSVertex {
    id: number;
    position: [number, number, number];
}

export interface OcctJSGeometry {
    name: string;
    color: OcctJSColor | null;
    positions: Float32Array;
    normals: Float32Array;
    indices: Uint32Array;
    faces: OcctJSFace[];
    edges: OcctJSEdge[];
    vertices: OcctJSVertex[];
    triangleToFaceMap: Int32Array;
}

export interface OcctJSMaterial {
    r: number;
    g: number;
    b: number;
    opacity?: number;
}

export interface OcctJSNode {
    id: string;
    name: string;
    isAssembly: boolean;
    transform: number[];
    meshes: number[];
    children: OcctJSNode[];
}

export interface OcctJSStats {
    rootCount: number;
    nodeCount: number;
    partCount: number;
    geometryCount: number;
    materialCount: number;
    triangleCount: number;
    reusedInstanceCount: number;
}

export interface OcctJSResult {
    success: boolean;
    error?: string;
    sourceFormat: string;
    sourceUnit?: string;
    unitScaleToMeters?: number;
    rootNodes?: OcctJSNode[];
    geometries?: OcctJSGeometry[];
    materials?: OcctJSMaterial[];
    warnings?: unknown[];
    stats?: OcctJSStats;
}

export interface OcctJSExactOpenResult extends OcctJSResult {
    exactModelId?: number;
    exactGeometryBindings?: OcctJSExactGeometryBinding[];
}

export interface OcctJSExactGeometryBinding {
    exactShapeHandle: number;
}

export interface OcctJSLifecycleSuccess {
    ok: true;
}

export interface OcctJSLifecycleFailure {
    ok: false;
    code: string;
    message: string;
}

export type OcctJSLifecycleResult = OcctJSLifecycleSuccess | OcctJSLifecycleFailure;

export interface OcctJSExactQueryFailure {
    ok: false;
    code: string;
    message: string;
}

export type OcctJSExactPairwiseFailureCode =
    | "invalid-handle"
    | "released-handle"
    | "invalid-id"
    | "unsupported-geometry"
    | "parallel-geometry"
    | "coincident-geometry"
    | "insufficient-precision"
    | "internal-error";

export interface OcctJSExactPairwiseFailure {
    ok: false;
    code: OcctJSExactPairwiseFailureCode;
    message: string;
}

export interface OcctJSExactGeometryTypeSuccess {
    ok: true;
    family: OcctJSExactGeometryFamily;
}

export type OcctJSExactGeometryTypeResult = OcctJSExactGeometryTypeSuccess | OcctJSExactQueryFailure;

export interface OcctJSExactRadiusSuccess {
    ok: true;
    family: "circle" | "cylinder" | "sphere";
    radius: number;
    diameter: number;
    localCenter: [number, number, number];
    localAnchorPoint: [number, number, number];
    localAxisDirection: [number, number, number];
}

export type OcctJSExactRadiusResult = OcctJSExactRadiusSuccess | OcctJSExactQueryFailure;

export interface OcctJSExactCenterSuccess {
    ok: true;
    family: "circle" | "cylinder" | "sphere" | "cone" | "torus";
    localCenter: [number, number, number];
    localAxisDirection: [number, number, number];
}

export type OcctJSExactCenterResult = OcctJSExactCenterSuccess | OcctJSExactQueryFailure;

export interface OcctJSExactEdgeLengthSuccess {
    ok: true;
    value: number;
    localStartPoint: [number, number, number];
    localEndPoint: [number, number, number];
}

export type OcctJSExactEdgeLengthResult = OcctJSExactEdgeLengthSuccess | OcctJSExactQueryFailure;

export interface OcctJSExactFaceAreaSuccess {
    ok: true;
    value: number;
    localCentroid: [number, number, number];
}

export type OcctJSExactFaceAreaResult = OcctJSExactFaceAreaSuccess | OcctJSExactQueryFailure;

export interface OcctJSExactFaceNormalSuccess {
    ok: true;
    localPoint: [number, number, number];
    localNormal: [number, number, number];
}

export type OcctJSExactFaceNormalResult = OcctJSExactFaceNormalSuccess | OcctJSExactQueryFailure;

export type OcctJSMatrix4 = [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number
];

export interface OcctJSExactDistanceSuccess {
    ok: true;
    value: number;
    pointA: [number, number, number];
    pointB: [number, number, number];
    workingPlaneOrigin: [number, number, number];
    workingPlaneNormal: [number, number, number];
}

export type OcctJSExactDistanceResult = OcctJSExactDistanceSuccess | OcctJSExactPairwiseFailure;

export interface OcctJSExactAngleSuccess {
    ok: true;
    value: number;
    origin: [number, number, number];
    directionA: [number, number, number];
    directionB: [number, number, number];
    pointA: [number, number, number];
    pointB: [number, number, number];
    workingPlaneOrigin: [number, number, number];
    workingPlaneNormal: [number, number, number];
}

export type OcctJSExactAngleResult = OcctJSExactAngleSuccess | OcctJSExactPairwiseFailure;

export interface OcctJSExactThicknessSuccess {
    ok: true;
    value: number;
    pointA: [number, number, number];
    pointB: [number, number, number];
    workingPlaneOrigin: [number, number, number];
    workingPlaneNormal: [number, number, number];
}

export type OcctJSExactThicknessResult = OcctJSExactThicknessSuccess | OcctJSExactPairwiseFailure;

export interface OcctJSReadParams {
    rootMode?: "one-shape" | "multiple-shapes";
    linearUnit?: "millimeter" | "centimeter" | "meter" | "inch" | "foot";
    linearDeflectionType?: "bounding_box_ratio" | "absolute_value";
    linearDeflection?: number;
    angularDeflection?: number;
    readNames?: boolean;
    // Legacy toggle. This is legacy-only when colorMode is omitted.
    readColors?: boolean;
    // Named default-appearance bundle. Presets resolve before explicit
    // defaultColor/defaultOpacity overrides and are ignored by colorMode="source".
    appearancePreset?: OcctJSImportAppearancePreset;
    // Explicit appearance contract. When provided, this overrides readColors.
    // "default" uses the built-in CAD base color [0.9, 0.91, 0.93].
    colorMode?: OcctJSImportColorMode;
    // Optional RGB override for default appearance mode.
    // This only applies when colorMode is set to "default".
    defaultColor?: OcctJSColor;
    // Optional opacity override for default appearance mode.
    // This only applies when colorMode is set to "default".
    defaultOpacity?: number;
}

export interface OcctJSOrientationPresetAxis {
    origin?: [number, number, number];
    direction?: [number, number, number];
}

export interface OcctJSOrientationParams {
    linearUnit?: "millimeter" | "centimeter" | "meter" | "inch" | "foot";
    mode?: "manufacturing";
    presetAxis?: OcctJSOrientationPresetAxis;
}

export interface OcctJSOrientationFrame {
    origin: [number, number, number];
    xDir: [number, number, number];
    yDir: [number, number, number];
    zDir: [number, number, number];
}

export interface OcctJSOrientationBbox {
    dx: number;
    dy: number;
    dz: number;
}

export interface OcctJSOrientationStage1 {
    baseFaceId?: number;
    usedCylinderSupport: boolean;
    detectedAxis: [number, number, number];
}

export interface OcctJSOrientationStage2 {
    rotationAroundZDeg: number;
}

export interface OcctJSOrientationResult {
    success: boolean;
    error?: string;
    transform?: number[];
    localFrame?: OcctJSOrientationFrame;
    bbox?: OcctJSOrientationBbox;
    strategy?: string;
    stage1?: OcctJSOrientationStage1;
    stage2?: OcctJSOrientationStage2;
    confidence?: number;
    sourceUnit?: string;
    unitScaleToMeters?: number;
}

export interface OcctJSModule {
    ReadFile(format: string, content: Uint8Array, params?: OcctJSReadParams): OcctJSResult;
    ReadStepFile(content: Uint8Array, params?: OcctJSReadParams): OcctJSResult;
    ReadIgesFile(content: Uint8Array, params?: OcctJSReadParams): OcctJSResult;
    ReadBrepFile(content: Uint8Array, params?: OcctJSReadParams): OcctJSResult;
    OpenExactModel(format: string, content: Uint8Array, params?: OcctJSReadParams): OcctJSExactOpenResult;
    OpenExactStepModel(content: Uint8Array, params?: OcctJSReadParams): OcctJSExactOpenResult;
    OpenExactIgesModel(content: Uint8Array, params?: OcctJSReadParams): OcctJSExactOpenResult;
    OpenExactBrepModel(content: Uint8Array, params?: OcctJSReadParams): OcctJSExactOpenResult;
    RetainExactModel(exactModelId: number): OcctJSLifecycleResult;
    ReleaseExactModel(exactModelId: number): OcctJSLifecycleResult;
    GetExactGeometryType(exactModelId: number, exactShapeHandle: number, kind: OcctJSExactElementKind, elementId: number): OcctJSExactGeometryTypeResult;
    MeasureExactRadius(exactModelId: number, exactShapeHandle: number, kind: OcctJSExactElementKind, elementId: number): OcctJSExactRadiusResult;
    MeasureExactCenter(exactModelId: number, exactShapeHandle: number, kind: OcctJSExactElementKind, elementId: number): OcctJSExactCenterResult;
    MeasureExactEdgeLength(exactModelId: number, exactShapeHandle: number, kind: OcctJSExactElementKind, elementId: number): OcctJSExactEdgeLengthResult;
    MeasureExactFaceArea(exactModelId: number, exactShapeHandle: number, kind: OcctJSExactElementKind, elementId: number): OcctJSExactFaceAreaResult;
    EvaluateExactFaceNormal(exactModelId: number, exactShapeHandle: number, kind: OcctJSExactElementKind, elementId: number, localQueryPoint: [number, number, number]): OcctJSExactFaceNormalResult;
    MeasureExactDistance(exactModelId: number, exactShapeHandleA: number, kindA: OcctJSExactElementKind, elementIdA: number, exactShapeHandleB: number, kindB: OcctJSExactElementKind, elementIdB: number, transformA: OcctJSMatrix4, transformB: OcctJSMatrix4): OcctJSExactDistanceResult;
    MeasureExactAngle(exactModelId: number, exactShapeHandleA: number, kindA: OcctJSExactElementKind, elementIdA: number, exactShapeHandleB: number, kindB: OcctJSExactElementKind, elementIdB: number, transformA: OcctJSMatrix4, transformB: OcctJSMatrix4): OcctJSExactAngleResult;
    MeasureExactThickness(exactModelId: number, exactShapeHandleA: number, kindA: OcctJSExactElementKind, elementIdA: number, exactShapeHandleB: number, kindB: OcctJSExactElementKind, elementIdB: number, transformA: OcctJSMatrix4, transformB: OcctJSMatrix4): OcctJSExactThicknessResult;
    AnalyzeOptimalOrientation(format: OcctFormat, content: Uint8Array, params?: OcctJSOrientationParams): OcctJSOrientationResult;
}

declare function OcctJS(options?: {
    locateFile?: (filename: string, scriptDirectory?: string) => string;
    wasmBinary?: ArrayBuffer | Uint8Array;
}): Promise<OcctJSModule>;

export default OcctJS;
