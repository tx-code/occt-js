export type OcctFormat = "step" | "iges" | "brep";

export interface OcctJSColor {
    r: number;
    g: number;
    b: number;
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

export interface OcctJSReadParams {
    rootMode?: "one-shape" | "multiple-shapes";
    linearUnit?: "millimeter" | "centimeter" | "meter" | "inch" | "foot";
    linearDeflectionType?: "bounding_box_ratio" | "absolute_value";
    linearDeflection?: number;
    angularDeflection?: number;
    readNames?: boolean;
    readColors?: boolean;
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
    AnalyzeOptimalOrientation(format: OcctFormat, content: Uint8Array, params?: OcctJSOrientationParams): OcctJSOrientationResult;
}

declare function OcctJS(options?: {
    locateFile?: (filename: string, scriptDirectory?: string) => string;
    wasmBinary?: ArrayBuffer | Uint8Array;
}): Promise<OcctJSModule>;

export default OcctJS;
