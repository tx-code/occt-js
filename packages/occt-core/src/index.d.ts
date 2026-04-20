import type {
  OcctFormat,
  OcctJSGeneratedToolFaceBinding,
  OcctJSGeneratedToolMetadata,
  OcctJSGeneratedToolSegmentDescriptor,
  OcctJSImportAppearancePreset,
  OcctJSImportColorMode,
  OcctJSColor,
  OcctJSExactChamferResult,
  OcctJSExactElementKind,
  OcctJSExactRevolvedToolOpenResult,
  OcctJSExactGeometryFamily,
  OcctJSExactHoleResult,
  OcctJSExactModelDiagnostics,
  OcctJSExactOpenResult,
  OcctJSExactPairwiseFailure,
  OcctJSExactPlacementAnchor,
  OcctJSExactPlacementFrame,
  OcctJSExactQueryFailure,
  OcctJSExactRelationKind,
  OcctJSLifecycleResult,
  OcctJSModule,
  OcctJSOrientationResult,
  OcctJSRevolvedToolBuildOptions,
  OcctJSRevolvedToolBuildResult,
  OcctJSRevolvedToolSpec,
  OcctJSRevolvedToolValidationResult,
} from "@tx-code/occt-js";

export type OcctPoint3 = [number, number, number];
export type OcctGeneratedToolSourceFormat = "generated-revolved-tool";
export type OcctNormalizedSourceFormat = OcctFormat | OcctGeneratedToolSourceFormat;

export type OcctMatrix4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number
];

export type OcctBinaryInput = Uint8Array | ArrayBuffer | ArrayBufferView | string;

export type OcctWasmBinaryLike = ArrayBuffer | ArrayBufferView;

export type OcctImportColorInput =
  | OcctJSColor
  | readonly [number, number, number]
  | readonly [number, number, number, number]
  | ArrayLike<number>;

export interface OcctImportParams {
  rootMode?: "one-shape" | "multiple-shapes";
  linearUnit?: "millimeter" | "centimeter" | "meter" | "inch" | "foot";
  linearDeflectionType?: "bounding_box_ratio" | "absolute_value";
  linearDeflection?: number;
  angularDeflection?: number;
  readNames?: boolean;
  readColors?: boolean;
  appearancePreset?: OcctJSImportAppearancePreset;
  colorMode?: OcctJSImportColorMode;
  defaultColor?: OcctImportColorInput;
  defaultOpacity?: number;
}

export interface OcctImportModelOptions {
  format?: OcctFormat | string;
  fileName?: string;
  importParams?: OcctImportParams;
}

export interface OcctCoreClientOptions {
  factory?: (overrides?: { wasmBinary?: Uint8Array }) => Promise<OcctJSModule> | OcctJSModule;
  factoryGlobalName?: string;
  wasmBinary?: OcctWasmBinaryLike;
  wasmBinaryLoader?: () => Promise<OcctWasmBinaryLike> | OcctWasmBinaryLike;
}

export interface OcctNormalizedWarning {
  code: string;
  message: string;
  nodeId?: string;
}

export interface OcctNormalizedMaterial {
  id: string;
  baseColor: number[];
}

export interface OcctNormalizedFace {
  id: number;
  name?: string;
  firstIndex: number;
  indexCount: number;
  edgeIndices: number[];
  color: number[] | null;
}

export interface OcctNormalizedEdge {
  id: number;
  name?: string;
  points: number[];
  ownerFaceIds: number[];
  isFreeEdge: boolean;
  color: number[] | null;
}

export interface OcctNormalizedVertex {
  id: number;
  position: number[];
}

export interface OcctNormalizedGeometry {
  id: string;
  geometryId?: string;
  name?: string;
  positions: number[];
  normals?: number[];
  indices: number[];
  faces: OcctNormalizedFace[];
  edges: OcctNormalizedEdge[];
  vertices: OcctNormalizedVertex[];
  triangleToFaceMap: number[];
  color: number[] | null;
  materialId?: string;
}

export interface OcctNormalizedNode {
  id: string;
  nodeId?: string;
  name?: string;
  kind: "assembly" | "part";
  transform: OcctMatrix4;
  geometryIds: string[];
  materialIds: string[];
  children: OcctNormalizedNode[];
}

export interface OcctNormalizedStats {
  rootCount: number;
  nodeCount: number;
  partCount: number;
  geometryCount: number;
  materialCount: number;
  triangleCount: number;
  reusedInstanceCount: number;
}

export interface OcctNormalizedGeneratedToolFaceBinding extends OcctJSGeneratedToolFaceBinding {
  geometryId?: string;
}

export interface OcctNormalizedGeneratedToolMetadata extends Omit<OcctJSGeneratedToolMetadata, "segments" | "faceBindings"> {
  segments: OcctJSGeneratedToolSegmentDescriptor[];
  faceBindings?: OcctNormalizedGeneratedToolFaceBinding[];
}

export interface OcctNormalizedResult {
  sourceFormat: OcctNormalizedSourceFormat;
  sourceFileName?: string;
  sourceUnit?: string;
  unitScaleToMeters?: number;
  rootNodes: OcctNormalizedNode[];
  geometries: OcctNormalizedGeometry[];
  materials: OcctNormalizedMaterial[];
  warnings: OcctNormalizedWarning[];
  stats: OcctNormalizedStats;
  generatedTool?: OcctNormalizedGeneratedToolMetadata;
}

export interface OcctNormalizedExactGeometryBinding {
  geometryId: string;
  exactShapeHandle: number;
}

export interface OcctNormalizedExactOpenResult extends OcctNormalizedResult {
  exactModelId: number;
  exactGeometryBindings: OcctNormalizedExactGeometryBinding[];
}

export interface OcctManagedExactModel {
  exactModelId: number;
  exactModel: OcctJSExactOpenResult;
  dispose(): Promise<OcctJSLifecycleResult>;
}

export interface OcctNormalizeResultOptions {
  sourceFormat?: OcctNormalizedSourceFormat | string;
  sourceFileName?: string;
  importParams?: OcctImportParams;
}

export interface OcctExactRef {
  exactModelId: number;
  exactShapeHandle: number;
  nodeId?: string;
  geometryId?: string;
  kind: OcctJSExactElementKind;
  elementId: number;
  transform?: OcctMatrix4;
}

export interface OcctResolveExactRefOptions {
  nodeId: string;
  geometryId: string;
  kind: OcctJSExactElementKind;
  elementId: number;
}

export interface OcctResolvedExactRef extends OcctExactRef {
  ok: true;
  nodeId: string;
  geometryId: string;
  transform: OcctMatrix4;
}

export interface OcctResolveExactRefFailure {
  ok: false;
  code: string;
  message: string;
}

export interface OcctExactGeometryTypeSuccess {
  ok: true;
  family: OcctJSExactGeometryFamily;
  ref: OcctExactRef;
}

export type OcctExactGeometryTypeResult = OcctExactGeometryTypeSuccess | OcctJSExactQueryFailure;

export interface OcctExactRadiusSuccess {
  ok: true;
  family: "circle" | "cylinder" | "sphere";
  radius: number;
  diameter: number;
  center: OcctPoint3;
  anchorPoint: OcctPoint3;
  axisDirection: OcctPoint3;
  ref: OcctExactRef;
}

export type OcctExactRadiusResult = OcctExactRadiusSuccess | OcctJSExactQueryFailure;

export interface OcctExactCenterSuccess {
  ok: true;
  family: "circle" | "cylinder" | "sphere" | "cone" | "torus";
  center: OcctPoint3;
  axisDirection: OcctPoint3;
  ref: OcctExactRef;
}

export type OcctExactCenterResult = OcctExactCenterSuccess | OcctJSExactQueryFailure;

export interface OcctExactEdgeLengthSuccess {
  ok: true;
  value: number;
  startPoint: OcctPoint3;
  endPoint: OcctPoint3;
  ref: OcctExactRef;
}

export type OcctExactEdgeLengthResult = OcctExactEdgeLengthSuccess | OcctJSExactQueryFailure;

export interface OcctExactFaceAreaSuccess {
  ok: true;
  value: number;
  centroid: OcctPoint3;
  ref: OcctExactRef;
}

export type OcctExactFaceAreaResult = OcctExactFaceAreaSuccess | OcctJSExactQueryFailure;

export interface OcctExactFaceNormalSuccess {
  ok: true;
  point: OcctPoint3;
  normal: OcctPoint3;
  ref: OcctExactRef;
}

export type OcctExactFaceNormalResult = OcctExactFaceNormalSuccess | OcctJSExactQueryFailure;

export interface OcctExactDistanceSuccess {
  ok: true;
  value: number;
  pointA: OcctPoint3;
  pointB: OcctPoint3;
  workingPlaneOrigin: OcctPoint3;
  workingPlaneNormal: OcctPoint3;
  refA: OcctExactRef;
  refB: OcctExactRef;
}

export type OcctExactDistanceResult = OcctExactDistanceSuccess | OcctJSExactPairwiseFailure;

export interface OcctExactAngleSuccess {
  ok: true;
  value: number;
  origin: OcctPoint3;
  directionA: OcctPoint3;
  directionB: OcctPoint3;
  pointA: OcctPoint3;
  pointB: OcctPoint3;
  workingPlaneOrigin: OcctPoint3;
  workingPlaneNormal: OcctPoint3;
  refA: OcctExactRef;
  refB: OcctExactRef;
}

export type OcctExactAngleResult = OcctExactAngleSuccess | OcctJSExactPairwiseFailure;

export interface OcctExactThicknessSuccess {
  ok: true;
  value: number;
  pointA: OcctPoint3;
  pointB: OcctPoint3;
  workingPlaneOrigin: OcctPoint3;
  workingPlaneNormal: OcctPoint3;
  refA: OcctExactRef;
  refB: OcctExactRef;
}

export type OcctExactThicknessResult = OcctExactThicknessSuccess | OcctJSExactPairwiseFailure;

export interface OcctExactRelationSuccess {
  ok: true;
  kind: OcctJSExactRelationKind;
  frame?: OcctJSExactPlacementFrame;
  anchors?: OcctJSExactPlacementAnchor[];
  directionA?: OcctPoint3;
  directionB?: OcctPoint3;
  center?: OcctPoint3;
  axisDirection?: OcctPoint3;
  tangentPoint?: OcctPoint3;
  refA: OcctExactRef;
  refB: OcctExactRef;
}

export type OcctExactRelationResult = OcctExactRelationSuccess | OcctJSExactPairwiseFailure;

export interface OcctExactPairPlacementSuccess {
  ok: true;
  kind: "distance" | "angle" | "thickness";
  value?: number;
  frame: OcctJSExactPlacementFrame;
  anchors: OcctJSExactPlacementAnchor[];
  directionA?: OcctPoint3;
  directionB?: OcctPoint3;
  axisDirection?: OcctPoint3;
  refA: OcctExactRef;
  refB: OcctExactRef;
}

export type OcctExactPairPlacementResult = OcctExactPairPlacementSuccess | OcctJSExactPairwiseFailure;

export interface OcctExactSinglePlacementSuccess {
  ok: true;
  kind: "radius" | "diameter";
  value?: number;
  frame: OcctJSExactPlacementFrame;
  anchors: OcctJSExactPlacementAnchor[];
  axisDirection?: OcctPoint3;
  ref: OcctExactRef;
}

export type OcctExactSinglePlacementResult = OcctExactSinglePlacementSuccess | OcctJSExactQueryFailure;

export interface OcctExactHoleSuccess {
  ok: true;
  kind: "hole";
  profile: "cylindrical";
  radius: number;
  diameter: number;
  frame?: OcctJSExactPlacementFrame;
  anchors?: OcctJSExactPlacementAnchor[];
  axisDirection?: OcctPoint3;
  depth?: number;
  isThrough?: boolean;
  centerPoint?: OcctPoint3;
  entryPoint?: OcctPoint3;
  exitPoint?: OcctPoint3;
  bottomPoint?: OcctPoint3;
  ref: OcctExactRef;
}

export type OcctExactHoleDescriptionResult = OcctExactHoleSuccess | OcctJSExactQueryFailure;

export interface OcctExactChamferSuccess {
  ok: true;
  kind: "chamfer";
  profile: "planar";
  variant: "equal-distance" | "two-distance";
  distanceA: number;
  distanceB: number;
  supportAngle: number;
  frame?: OcctJSExactPlacementFrame;
  anchors?: OcctJSExactPlacementAnchor[];
  edgeDirection?: OcctPoint3;
  supportNormalA?: OcctPoint3;
  supportNormalB?: OcctPoint3;
  ref: OcctExactRef;
}

export type OcctExactChamferDescriptionResult = OcctExactChamferSuccess | OcctJSExactQueryFailure;

export interface OcctExactMidpointPlacementSuccess {
  ok: true;
  kind: "midpoint";
  value?: number;
  point: OcctPoint3;
  frame: OcctJSExactPlacementFrame;
  anchors: OcctJSExactPlacementAnchor[];
  refA: OcctExactRef;
  refB: OcctExactRef;
}

export type OcctExactMidpointPlacementResult = OcctExactMidpointPlacementSuccess | OcctJSExactPairwiseFailure;

export interface OcctExactEqualDistanceOptions {
  tolerance?: number;
}

export interface OcctExactEqualDistanceSuccess {
  ok: true;
  kind: "equal-distance";
  equal: boolean;
  distanceA: number;
  distanceB: number;
  delta: number;
  tolerance: number;
  refA: OcctExactRef;
  refB: OcctExactRef;
  refC: OcctExactRef;
  refD: OcctExactRef;
}

export type OcctExactEqualDistanceResult = OcctExactEqualDistanceSuccess | OcctJSExactPairwiseFailure;

export interface OcctExactSymmetryPlacementSuccess {
  ok: true;
  kind: "symmetry";
  variant: "midplane";
  value?: number;
  frame: OcctJSExactPlacementFrame;
  anchors: OcctJSExactPlacementAnchor[];
  planeNormal: OcctPoint3;
  refA: OcctExactRef;
  refB: OcctExactRef;
}

export type OcctExactSymmetryPlacementResult = OcctExactSymmetryPlacementSuccess | OcctJSExactPairwiseFailure;

export interface OcctAutoOrientationOptions {
  bytes?: Uint8Array;
  format?: OcctFormat;
  mode?: "manufacturing";
  model?: OcctNormalizedResult;
  occt?: Pick<OcctJSModule, "AnalyzeOptimalOrientation"> | null;
}

export declare class OcctCoreClient {
  constructor(options?: OcctCoreClientOptions);
  getSupportedFormats(): Promise<OcctFormat[]>;
  importModel(content: OcctBinaryInput, options?: OcctImportModelOptions): Promise<OcctNormalizedResult>;
  openExactModel(content: OcctBinaryInput, options?: OcctImportModelOptions): Promise<OcctJSExactOpenResult>;
  openExactStep(content: OcctBinaryInput, options?: Omit<OcctImportModelOptions, "format">): Promise<OcctJSExactOpenResult>;
  openExactIges(content: OcctBinaryInput, options?: Omit<OcctImportModelOptions, "format">): Promise<OcctJSExactOpenResult>;
  openExactBrep(content: OcctBinaryInput, options?: Omit<OcctImportModelOptions, "format">): Promise<OcctJSExactOpenResult>;
  openManagedExactModel(content: OcctBinaryInput, options?: OcctImportModelOptions): Promise<OcctManagedExactModel>;
  openManagedExactStep(content: OcctBinaryInput, options?: Omit<OcctImportModelOptions, "format">): Promise<OcctManagedExactModel>;
  openManagedExactIges(content: OcctBinaryInput, options?: Omit<OcctImportModelOptions, "format">): Promise<OcctManagedExactModel>;
  openManagedExactBrep(content: OcctBinaryInput, options?: Omit<OcctImportModelOptions, "format">): Promise<OcctManagedExactModel>;
  validateRevolvedToolSpec(spec: OcctJSRevolvedToolSpec): Promise<OcctJSRevolvedToolValidationResult>;
  buildRevolvedTool(spec: OcctJSRevolvedToolSpec, options?: OcctJSRevolvedToolBuildOptions): Promise<OcctJSRevolvedToolBuildResult>;
  openExactRevolvedTool(spec: OcctJSRevolvedToolSpec, options?: OcctJSRevolvedToolBuildOptions): Promise<OcctJSExactRevolvedToolOpenResult>;
  retainExactModel(exactModelId: number): Promise<OcctJSLifecycleResult>;
  releaseExactModel(exactModelId: number): Promise<OcctJSLifecycleResult>;
  getExactModelDiagnostics(): Promise<OcctJSExactModelDiagnostics>;
  getExactGeometryType(ref: OcctExactRef): Promise<OcctExactGeometryTypeResult>;
  measureExactDistance(refA: OcctExactRef, refB: OcctExactRef): Promise<OcctExactDistanceResult>;
  measureExactAngle(refA: OcctExactRef, refB: OcctExactRef): Promise<OcctExactAngleResult>;
  measureExactThickness(refA: OcctExactRef, refB: OcctExactRef): Promise<OcctExactThicknessResult>;
  classifyExactRelation(refA: OcctExactRef, refB: OcctExactRef): Promise<OcctExactRelationResult>;
  suggestExactDistancePlacement(refA: OcctExactRef, refB: OcctExactRef): Promise<OcctExactPairPlacementResult>;
  suggestExactAnglePlacement(refA: OcctExactRef, refB: OcctExactRef): Promise<OcctExactPairPlacementResult>;
  suggestExactThicknessPlacement(refA: OcctExactRef, refB: OcctExactRef): Promise<OcctExactPairPlacementResult>;
  suggestExactRadiusPlacement(ref: OcctExactRef): Promise<OcctExactSinglePlacementResult>;
  suggestExactDiameterPlacement(ref: OcctExactRef): Promise<OcctExactSinglePlacementResult>;
  describeExactHole(ref: OcctExactRef): Promise<OcctExactHoleDescriptionResult>;
  describeExactChamfer(ref: OcctExactRef): Promise<OcctExactChamferDescriptionResult>;
  suggestExactMidpointPlacement(refA: OcctExactRef, refB: OcctExactRef): Promise<OcctExactMidpointPlacementResult>;
  describeExactEqualDistance(refA: OcctExactRef, refB: OcctExactRef, refC: OcctExactRef, refD: OcctExactRef, options?: OcctExactEqualDistanceOptions): Promise<OcctExactEqualDistanceResult>;
  suggestExactSymmetryPlacement(refA: OcctExactRef, refB: OcctExactRef): Promise<OcctExactSymmetryPlacementResult>;
  measureExactRadius(ref: OcctExactRef): Promise<OcctExactRadiusResult>;
  measureExactCenter(ref: OcctExactRef): Promise<OcctExactCenterResult>;
  measureExactEdgeLength(ref: OcctExactRef): Promise<OcctExactEdgeLengthResult>;
  measureExactFaceArea(ref: OcctExactRef): Promise<OcctExactFaceAreaResult>;
  evaluateExactFaceNormal(ref: OcctExactRef, point: OcctPoint3 | ArrayLike<number>): Promise<OcctExactFaceNormalResult>;
  readStep(content: OcctBinaryInput, options?: Omit<OcctImportModelOptions, "format">): Promise<OcctNormalizedResult>;
  readIges(content: OcctBinaryInput, options?: Omit<OcctImportModelOptions, "format">): Promise<OcctNormalizedResult>;
  readBrep(content: OcctBinaryInput, options?: Omit<OcctImportModelOptions, "format">): Promise<OcctNormalizedResult>;
}

export declare function createOcctCore(options?: OcctCoreClientOptions): OcctCoreClient;

export declare function normalizeExactOpenResult(rawResult: unknown, options?: OcctNormalizeResultOptions): OcctNormalizedExactOpenResult;

export declare function resolveExactElementRef(exactModel: OcctNormalizedExactOpenResult, options: OcctResolveExactRefOptions): OcctResolvedExactRef | OcctResolveExactRefFailure;

export declare function resolveExactFaceRef(exactModel: OcctNormalizedExactOpenResult, options: Omit<OcctResolveExactRefOptions, "kind">): OcctResolvedExactRef | OcctResolveExactRefFailure;

export declare function resolveExactEdgeRef(exactModel: OcctNormalizedExactOpenResult, options: Omit<OcctResolveExactRefOptions, "kind">): OcctResolvedExactRef | OcctResolveExactRefFailure;

export declare function resolveExactVertexRef(exactModel: OcctNormalizedExactOpenResult, options: Omit<OcctResolveExactRefOptions, "kind">): OcctResolvedExactRef | OcctResolveExactRefFailure;

export declare function normalizeOcctFormat(format: string): OcctFormat;

export declare function getReadMethodName(format: string): "ReadStepFile" | "ReadIgesFile" | "ReadBrepFile";

export declare function listSupportedFormats(): OcctFormat[];

export declare function normalizeOcctResult(rawResult: unknown, options?: OcctNormalizeResultOptions): OcctNormalizedResult;

export declare function applyOrientationToModel(model: OcctNormalizedResult, orientation?: OcctJSOrientationResult | null): OcctNormalizedResult;

export declare function resolveAutoOrientedModel(options?: OcctAutoOrientationOptions): Promise<OcctNormalizedResult | undefined>;

export type {
  OcctFormat,
  OcctJSImportAppearancePreset,
  OcctJSImportColorMode,
  OcctJSColor,
  OcctJSExactChamferResult,
  OcctJSExactElementKind,
  OcctJSExactGeometryFamily,
  OcctJSExactHoleResult,
  OcctJSExactModelDiagnostics,
  OcctJSExactOpenResult,
  OcctJSExactPairwiseFailure,
  OcctJSExactPlacementAnchor,
  OcctJSExactPlacementFrame,
  OcctJSExactQueryFailure,
  OcctJSExactRelationKind,
  OcctJSLifecycleResult,
  OcctJSModule,
  OcctJSOrientationResult,
};
