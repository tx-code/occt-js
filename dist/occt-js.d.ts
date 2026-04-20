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

export interface OcctJSExactModelDiagnosticsEntry {
    exactModelId: number;
    refCount: number;
    sourceFormat: string;
    sourceUnit: string;
    unitScaleToMeters: number;
    exactGeometryCount: number;
}

export interface OcctJSExactModelDiagnostics {
    liveExactModelCount: number;
    releasedHandleCount: number;
    liveExactModels: OcctJSExactModelDiagnosticsEntry[];
}

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

export type OcctJSExactPlacementKind = "distance" | "angle" | "radius" | "diameter" | "thickness";

export interface OcctJSExactPlacementFrame {
    origin: [number, number, number];
    normal: [number, number, number];
    xDir: [number, number, number];
    yDir: [number, number, number];
}

export interface OcctJSExactPlacementAnchor {
    role: "attach" | "center" | "anchor" | "entry" | "exit" | "bottom" | "support-a" | "support-b";
    point: [number, number, number];
}

export interface OcctJSExactPlacementSuccess {
    ok: true;
    kind: OcctJSExactPlacementKind;
    value?: number;
    frame: OcctJSExactPlacementFrame;
    anchors: OcctJSExactPlacementAnchor[];
    directionA?: [number, number, number];
    directionB?: [number, number, number];
    axisDirection?: [number, number, number];
}

export type OcctJSExactPlacementResult = OcctJSExactPlacementSuccess | OcctJSExactPairwiseFailure;

export type OcctJSExactRelationKind =
    | "parallel"
    | "perpendicular"
    | "concentric"
    | "tangent"
    | "none";

export interface OcctJSExactRelationSuccess {
    ok: true;
    kind: OcctJSExactRelationKind;
    frame?: OcctJSExactPlacementFrame;
    anchors?: OcctJSExactPlacementAnchor[];
    directionA?: [number, number, number];
    directionB?: [number, number, number];
    center?: [number, number, number];
    axisDirection?: [number, number, number];
    tangentPoint?: [number, number, number];
}

export type OcctJSExactRelationResult = OcctJSExactRelationSuccess | OcctJSExactPairwiseFailure;

export interface OcctJSExactHoleSuccess {
    ok: true;
    kind: "hole";
    profile: "cylindrical";
    radius: number;
    diameter: number;
    frame?: OcctJSExactPlacementFrame;
    anchors?: OcctJSExactPlacementAnchor[];
    axisDirection?: [number, number, number];
    depth?: number;
    isThrough?: boolean;
}

export type OcctJSExactHoleResult = OcctJSExactHoleSuccess | OcctJSExactQueryFailure;

export interface OcctJSExactChamferSuccess {
    ok: true;
    kind: "chamfer";
    profile: "planar";
    variant: "equal-distance" | "two-distance";
    distanceA: number;
    distanceB: number;
    supportAngle: number;
    frame?: OcctJSExactPlacementFrame;
    anchors?: OcctJSExactPlacementAnchor[];
    edgeDirection?: [number, number, number];
    supportNormalA?: [number, number, number];
    supportNormalB?: [number, number, number];
}

export type OcctJSExactChamferResult = OcctJSExactChamferSuccess | OcctJSExactQueryFailure;

export type OcctJSRevolvedToolUnits = "mm" | "inch";
export type OcctJSRevolvedToolPlane = "XZ";
export type OcctJSRevolvedToolClosure = "explicit" | "auto_axis";
export type OcctJSRevolvedToolSegmentKind = "line" | "arc_center" | "arc_3pt";
export type OcctJSRevolvedToolDiagnosticCode =
    | "build-failed"
    | "degenerate-segment"
    | "invalid-arc"
    | "invalid-closure"
    | "invalid-revolve-angle"
    | "invalid-spec"
    | "invalid-type"
    | "missing-field"
    | "negative-radius"
    | "non-finite-coordinate"
    | "profile-not-closed"
    | "unsupported-plane"
    | "unsupported-segment-kind"
    | "unsupported-unit"
    | "unsupported-version";

export interface OcctJSRevolvedToolSegmentBase {
    id?: string;
    tag?: string;
    end: [number, number];
}

export interface OcctJSRevolvedToolLineSegment extends OcctJSRevolvedToolSegmentBase {
    kind: "line";
}

export interface OcctJSRevolvedToolArcCenterSegment extends OcctJSRevolvedToolSegmentBase {
    kind: "arc_center";
    center: [number, number];
}

export interface OcctJSRevolvedToolArc3PointSegment extends OcctJSRevolvedToolSegmentBase {
    kind: "arc_3pt";
    through: [number, number];
}

export type OcctJSRevolvedToolSegment =
    | OcctJSRevolvedToolLineSegment
    | OcctJSRevolvedToolArcCenterSegment
    | OcctJSRevolvedToolArc3PointSegment;

export interface OcctJSRevolvedToolSpec {
    version?: 1;
    units: OcctJSRevolvedToolUnits;
    profile: {
        plane?: OcctJSRevolvedToolPlane;
        start: [number, number];
        closure: OcctJSRevolvedToolClosure;
        segments: OcctJSRevolvedToolSegment[];
    };
    revolve?: {
        angleDeg?: number;
    };
}

export interface OcctJSRevolvedToolDiagnostic {
    code: OcctJSRevolvedToolDiagnosticCode;
    message: string;
    severity: "error";
    path?: string;
    segmentIndex?: number;
}

export interface OcctJSRevolvedToolValidationResult {
    ok: boolean;
    diagnostics: OcctJSRevolvedToolDiagnostic[];
}

export interface OcctJSRevolvedToolBuildOptions {
    linearDeflectionType?: "bounding_box_ratio" | "absolute_value";
    linearDeflection?: number;
    angularDeflection?: number;
}

export interface OcctJSGeneratedToolSegmentDescriptor {
    index: number;
    kind: OcctJSRevolvedToolSegmentKind;
    id?: string;
    tag?: string;
}

export type OcctJSGeneratedToolSystemRole =
    | "profile"
    | "closure"
    | "axis"
    | "start_cap"
    | "end_cap"
    | "degenerated";

export interface OcctJSGeneratedToolFaceBinding {
    geometryIndex: number;
    faceId: number;
    systemRole: OcctJSGeneratedToolSystemRole;
    segmentIndex?: number;
    segmentId?: string;
    segmentTag?: string;
}

export interface OcctJSGeneratedToolExactShapeValidation {
    isValid: boolean;
    isClosed: boolean;
    isSolid: boolean;
    shapeType: string;
    solidCount: number;
    shellCount: number;
    faceCount: number;
    edgeCount: number;
    vertexCount: number;
}

export interface OcctJSGeneratedToolMeshValidation {
    isWatertight: boolean;
    isManifold: boolean;
    weldedVertexCount: number;
    boundaryEdgeCount: number;
    nonManifoldEdgeCount: number;
}

export interface OcctJSGeneratedToolShapeValidation {
    exact: OcctJSGeneratedToolExactShapeValidation;
    mesh: OcctJSGeneratedToolMeshValidation;
}

export interface OcctJSGeneratedToolMetadata {
    version: 1;
    units: OcctJSRevolvedToolUnits;
    plane: OcctJSRevolvedToolPlane;
    closure: OcctJSRevolvedToolClosure;
    angleDeg: number;
    segmentCount: number;
    hasStableFaceBindings: boolean;
    segments: OcctJSGeneratedToolSegmentDescriptor[];
    shapeValidation?: OcctJSGeneratedToolShapeValidation;
    faceBindings?: OcctJSGeneratedToolFaceBinding[];
}

export interface OcctJSRevolvedToolBuildFailure {
    success: false;
    error: string;
    sourceFormat: "generated-revolved-tool";
    diagnostics: OcctJSRevolvedToolDiagnostic[];
    generatedTool?: OcctJSGeneratedToolMetadata;
}

export interface OcctJSRevolvedToolBuildSuccess extends OcctJSResult {
    success: true;
    sourceFormat: "generated-revolved-tool";
    generatedTool: OcctJSGeneratedToolMetadata;
    diagnostics?: OcctJSRevolvedToolDiagnostic[];
}

export type OcctJSRevolvedToolBuildResult =
    | OcctJSRevolvedToolBuildFailure
    | OcctJSRevolvedToolBuildSuccess;

export interface OcctJSExactRevolvedToolOpenSuccess extends OcctJSExactOpenResult {
    success: true;
    sourceFormat: "generated-revolved-tool";
    exactModelId: number;
    exactGeometryBindings: OcctJSExactGeometryBinding[];
    generatedTool: OcctJSGeneratedToolMetadata;
    diagnostics?: OcctJSRevolvedToolDiagnostic[];
}

export type OcctJSExactRevolvedToolOpenResult =
    | OcctJSRevolvedToolBuildFailure
    | OcctJSExactRevolvedToolOpenSuccess;

export interface OcctJSReadParams {
    rootMode?: "one-shape" | "multiple-shapes";
    linearUnit?: "millimeter" | "centimeter" | "meter" | "inch" | "foot";
    linearDeflectionType?: "bounding_box_ratio" | "absolute_value";
    linearDeflection?: number;
    angularDeflection?: number;
    readNames?: boolean;
    // Legacy toggle. This is legacy-only when colorMode is omitted.
    readColors?: boolean;
    // Named default-appearance bundle. "cad-solid" keeps the built-in CAD base
    // color [0.9, 0.91, 0.93] opaque, while "cad-ghosted" applies the same base
    // color with the built-in ghost opacity 0.35. Presets resolve before explicit
    // defaultColor/defaultOpacity overrides and are ignored by colorMode="source".
    appearancePreset?: OcctJSImportAppearancePreset;
    // Explicit appearance contract. When provided, this overrides readColors.
    // "default" uses the built-in CAD base color [0.9, 0.91, 0.93].
    colorMode?: OcctJSImportColorMode;
    // Optional RGB override for default appearance mode.
    // This only applies when colorMode is set to "default".
    defaultColor?: OcctJSColor;
    // Optional opacity override for default appearance mode. When omitted, any
    // preset-derived opacity is preserved; otherwise the default appearance stays opaque.
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
    ValidateRevolvedToolSpec(spec: OcctJSRevolvedToolSpec): OcctJSRevolvedToolValidationResult;
    BuildRevolvedTool(spec: OcctJSRevolvedToolSpec, options?: OcctJSRevolvedToolBuildOptions): OcctJSRevolvedToolBuildResult;
    OpenExactRevolvedTool(spec: OcctJSRevolvedToolSpec, options?: OcctJSRevolvedToolBuildOptions): OcctJSExactRevolvedToolOpenResult;
    OpenExactModel(format: string, content: Uint8Array, params?: OcctJSReadParams): OcctJSExactOpenResult;
    OpenExactStepModel(content: Uint8Array, params?: OcctJSReadParams): OcctJSExactOpenResult;
    OpenExactIgesModel(content: Uint8Array, params?: OcctJSReadParams): OcctJSExactOpenResult;
    OpenExactBrepModel(content: Uint8Array, params?: OcctJSReadParams): OcctJSExactOpenResult;
    RetainExactModel(exactModelId: number): OcctJSLifecycleResult;
    ReleaseExactModel(exactModelId: number): OcctJSLifecycleResult;
    GetExactModelDiagnostics(): OcctJSExactModelDiagnostics;
    GetExactGeometryType(exactModelId: number, exactShapeHandle: number, kind: OcctJSExactElementKind, elementId: number): OcctJSExactGeometryTypeResult;
    MeasureExactRadius(exactModelId: number, exactShapeHandle: number, kind: OcctJSExactElementKind, elementId: number): OcctJSExactRadiusResult;
    MeasureExactCenter(exactModelId: number, exactShapeHandle: number, kind: OcctJSExactElementKind, elementId: number): OcctJSExactCenterResult;
    MeasureExactEdgeLength(exactModelId: number, exactShapeHandle: number, kind: OcctJSExactElementKind, elementId: number): OcctJSExactEdgeLengthResult;
    MeasureExactFaceArea(exactModelId: number, exactShapeHandle: number, kind: OcctJSExactElementKind, elementId: number): OcctJSExactFaceAreaResult;
    EvaluateExactFaceNormal(exactModelId: number, exactShapeHandle: number, kind: OcctJSExactElementKind, elementId: number, localQueryPoint: [number, number, number]): OcctJSExactFaceNormalResult;
    MeasureExactDistance(exactModelId: number, exactShapeHandleA: number, kindA: OcctJSExactElementKind, elementIdA: number, exactShapeHandleB: number, kindB: OcctJSExactElementKind, elementIdB: number, transformA: OcctJSMatrix4, transformB: OcctJSMatrix4): OcctJSExactDistanceResult;
    MeasureExactAngle(exactModelId: number, exactShapeHandleA: number, kindA: OcctJSExactElementKind, elementIdA: number, exactShapeHandleB: number, kindB: OcctJSExactElementKind, elementIdB: number, transformA: OcctJSMatrix4, transformB: OcctJSMatrix4): OcctJSExactAngleResult;
    MeasureExactThickness(exactModelId: number, exactShapeHandleA: number, kindA: OcctJSExactElementKind, elementIdA: number, exactShapeHandleB: number, kindB: OcctJSExactElementKind, elementIdB: number, transformA: OcctJSMatrix4, transformB: OcctJSMatrix4): OcctJSExactThicknessResult;
    ClassifyExactRelation(exactModelId: number, exactShapeHandleA: number, kindA: OcctJSExactElementKind, elementIdA: number, exactShapeHandleB: number, kindB: OcctJSExactElementKind, elementIdB: number, transformA: OcctJSMatrix4, transformB: OcctJSMatrix4): OcctJSExactRelationResult;
    SuggestExactDistancePlacement(exactModelId: number, exactShapeHandleA: number, kindA: OcctJSExactElementKind, elementIdA: number, exactShapeHandleB: number, kindB: OcctJSExactElementKind, elementIdB: number, transformA: OcctJSMatrix4, transformB: OcctJSMatrix4): OcctJSExactPlacementResult;
    SuggestExactAnglePlacement(exactModelId: number, exactShapeHandleA: number, kindA: OcctJSExactElementKind, elementIdA: number, exactShapeHandleB: number, kindB: OcctJSExactElementKind, elementIdB: number, transformA: OcctJSMatrix4, transformB: OcctJSMatrix4): OcctJSExactPlacementResult;
    SuggestExactThicknessPlacement(exactModelId: number, exactShapeHandleA: number, kindA: OcctJSExactElementKind, elementIdA: number, exactShapeHandleB: number, kindB: OcctJSExactElementKind, elementIdB: number, transformA: OcctJSMatrix4, transformB: OcctJSMatrix4): OcctJSExactPlacementResult;
    SuggestExactRadiusPlacement(exactModelId: number, exactShapeHandle: number, kind: OcctJSExactElementKind, elementId: number): OcctJSExactPlacementResult;
    SuggestExactDiameterPlacement(exactModelId: number, exactShapeHandle: number, kind: OcctJSExactElementKind, elementId: number): OcctJSExactPlacementResult;
    DescribeExactHole(exactModelId: number, exactShapeHandle: number, kind: OcctJSExactElementKind, elementId: number): OcctJSExactHoleResult;
    DescribeExactChamfer(exactModelId: number, exactShapeHandle: number, kind: OcctJSExactElementKind, elementId: number): OcctJSExactChamferResult;
    AnalyzeOptimalOrientation(format: OcctFormat, content: Uint8Array, params?: OcctJSOrientationParams): OcctJSOrientationResult;
}

declare function OcctJS(options?: {
    locateFile?: (filename: string, scriptDirectory?: string) => string;
    wasmBinary?: ArrayBuffer | Uint8Array;
}): Promise<OcctJSModule>;

export default OcctJS;
