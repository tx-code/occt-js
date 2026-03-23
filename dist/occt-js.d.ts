/**
 * OCCT STEP import result.
 */
export interface OcctJSResult {
    success: boolean;
    error?: string;
    sourceFormat: "step";
    sourceUnit?: string;
    unitScaleToMeters?: number;
    rootNodes: OcctJSNode[];
    geometries: OcctJSGeometry[];
    materials: OcctJSMaterial[];
    warnings: unknown[];
    stats: OcctJSStats;
}

export interface OcctJSNode {
    id: string;
    name: string;
    isAssembly: boolean;
    transform: number[];
    meshIndex: number;
    children: OcctJSNode[];
}

export interface OcctJSGeometry {
    name: string;
    color: OcctJSColor | null;
    positions: Float32Array;
    normals: Float32Array;
    indices: Uint32Array;
    faceRanges: Array<{
        first: number;
        last: number;
        color: OcctJSColor | null;
    }>;
}

export interface OcctJSMaterial {
    r: number;
    g: number;
    b: number;
}

export interface OcctJSColor {
    r: number;
    g: number;
    b: number;
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

export interface OcctJSReadParams {
    linearDeflection?: number;
    angularDeflection?: number;
    readNames?: boolean;
    readColors?: boolean;
}

export interface OcctJSModule {
    ReadStepFile(content: Uint8Array, params?: OcctJSReadParams): OcctJSResult;
}

/**
 * Factory function to instantiate the OCCT WebAssembly module.
 */
declare function OcctJS(options?: {
    locateFile?: (filename: string) => string;
    wasmBinary?: ArrayBuffer;
}): Promise<OcctJSModule>;

export default OcctJS;
