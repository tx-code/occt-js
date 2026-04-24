#pragma once

#include <string>
#include <vector>
#include <array>
#include <cstdint>
#include <TopoDS_Shape.hxx>

// ---------------------------------------------------------------------------
//  Core data structures for the import pipeline
// ---------------------------------------------------------------------------

struct OcctColor {
    double r = 0.0;
    double g = 0.0;
    double b = 0.0;
    double opacity = 1.0;
    bool isValid = false;
    bool hasOpacity = false;

    OcctColor() = default;
    OcctColor(double r_, double g_, double b_)
        : r(r_), g(g_), b(b_), isValid(true) {}
};

struct OcctFaceTopoData {
    int              id = 0;
    std::string      name;
    uint32_t         firstIndex = 0;
    uint32_t         indexCount = 0;
    std::vector<int> edgeIndices;
    OcctColor        color;
};

struct OcctEdgeTopoData {
    int              id = 0;
    std::string      name;
    std::vector<float> points;
    std::vector<int> ownerFaceIds;
    bool             isFreeEdge = false;
    OcctColor        color;
};

struct OcctVertexTopoData {
    int   id = 0;
    float position[3] = {0, 0, 0};
};

struct OcctMeshData {
    std::string            name;
    OcctColor              color;
    std::vector<float>     positions;
    std::vector<float>     normals;
    std::vector<uint32_t>  indices;

    std::vector<OcctFaceTopoData>   faces;
    std::vector<OcctEdgeTopoData>   edges;
    std::vector<OcctVertexTopoData> vertices;
    std::vector<int>                triangleToFaceMap;
};

struct OcctNodeData {
    std::string            id;
    std::string            name;
    bool                   isAssembly = false;
    std::array<float, 16>  transform;      // column-major 4x4 matrix
    std::vector<int>       meshIndices;     // indices into meshes array (may have multiple solids)
    std::vector<int>       childIndices;
};

struct OcctSceneData {
    bool                       success = false;
    std::string                error;
    std::vector<OcctNodeData>  nodes;
    std::vector<OcctMeshData>  meshes;
    std::vector<int>           rootNodeIndices;

    // Unit info read from STEP header
    std::string                sourceUnit;          // e.g. "MM", "M", "INCH"
    double                     unitScaleToMeters = 0.0; // 0 = unknown
};

struct OcctExactImportData {
    OcctSceneData scene;
    TopoDS_Shape exactShape;
    std::vector<TopoDS_Shape> exactGeometryShapes;
};

struct OcctLifecycleResult {
    bool ok = false;
    std::string code;
    std::string message;
};

struct OcctExactModelDiagnosticsEntry {
    int exactModelId = 0;
    int refCount = 0;
    std::string sourceFormat;
    std::string sourceUnit;
    double unitScaleToMeters = 0.0;
    int exactGeometryCount = 0;
};

struct OcctExactModelDiagnostics {
    int liveExactModelCount = 0;
    int releasedHandleCount = 0;
    std::vector<OcctExactModelDiagnosticsEntry> liveExactModels;
};

struct OcctExactGeometryTypeResult {
    bool ok = false;
    std::string code;
    std::string message;
    std::string family;
};

struct OcctExactRadiusResult {
    bool ok = false;
    std::string code;
    std::string message;
    std::string family;
    double radius = 0.0;
    double diameter = 0.0;
    std::array<double, 3> localCenter = { 0.0, 0.0, 0.0 };
    std::array<double, 3> localAnchorPoint = { 0.0, 0.0, 0.0 };
    std::array<double, 3> localAxisDirection = { 0.0, 0.0, 0.0 };
};

struct OcctExactCenterResult {
    bool ok = false;
    std::string code;
    std::string message;
    std::string family;
    std::array<double, 3> localCenter = { 0.0, 0.0, 0.0 };
    std::array<double, 3> localAxisDirection = { 0.0, 0.0, 0.0 };
};

struct OcctExactEdgeLengthResult {
    bool ok = false;
    std::string code;
    std::string message;
    double value = 0.0;
    std::array<double, 3> localStartPoint = { 0.0, 0.0, 0.0 };
    std::array<double, 3> localEndPoint = { 0.0, 0.0, 0.0 };
};

struct OcctExactFaceAreaResult {
    bool ok = false;
    std::string code;
    std::string message;
    double value = 0.0;
    std::array<double, 3> localCentroid = { 0.0, 0.0, 0.0 };
};

struct OcctExactFaceNormalResult {
    bool ok = false;
    std::string code;
    std::string message;
    std::array<double, 3> localPoint = { 0.0, 0.0, 0.0 };
    std::array<double, 3> localNormal = { 0.0, 0.0, 0.0 };
};

struct OcctExactDistanceResult {
    bool ok = false;
    std::string code;
    std::string message;
    double value = 0.0;
    std::array<double, 3> pointA = { 0.0, 0.0, 0.0 };
    std::array<double, 3> pointB = { 0.0, 0.0, 0.0 };
    std::array<double, 3> workingPlaneOrigin = { 0.0, 0.0, 0.0 };
    std::array<double, 3> workingPlaneNormal = { 0.0, 0.0, 0.0 };
};

struct OcctExactAngleResult {
    bool ok = false;
    std::string code;
    std::string message;
    double value = 0.0;
    std::array<double, 3> origin = { 0.0, 0.0, 0.0 };
    std::array<double, 3> directionA = { 0.0, 0.0, 0.0 };
    std::array<double, 3> directionB = { 0.0, 0.0, 0.0 };
    std::array<double, 3> pointA = { 0.0, 0.0, 0.0 };
    std::array<double, 3> pointB = { 0.0, 0.0, 0.0 };
    std::array<double, 3> workingPlaneOrigin = { 0.0, 0.0, 0.0 };
    std::array<double, 3> workingPlaneNormal = { 0.0, 0.0, 0.0 };
};

struct OcctExactThicknessResult {
    bool ok = false;
    std::string code;
    std::string message;
    double value = 0.0;
    std::array<double, 3> pointA = { 0.0, 0.0, 0.0 };
    std::array<double, 3> pointB = { 0.0, 0.0, 0.0 };
    std::array<double, 3> workingPlaneOrigin = { 0.0, 0.0, 0.0 };
    std::array<double, 3> workingPlaneNormal = { 0.0, 0.0, 0.0 };
};

struct OcctExactPlacementAnchor {
    std::string role;
    std::array<double, 3> point = { 0.0, 0.0, 0.0 };
};

struct OcctExactPlacementFrame {
    std::array<double, 3> origin = { 0.0, 0.0, 0.0 };
    std::array<double, 3> normal = { 0.0, 0.0, 0.0 };
    std::array<double, 3> xDir = { 0.0, 0.0, 0.0 };
    std::array<double, 3> yDir = { 0.0, 0.0, 0.0 };
};

struct OcctExactPlacementResult {
    bool ok = false;
    std::string code;
    std::string message;
    std::string kind;
    double value = 0.0;
    bool hasValue = false;
    OcctExactPlacementFrame frame;
    std::vector<OcctExactPlacementAnchor> anchors;
    std::array<double, 3> directionA = { 0.0, 0.0, 0.0 };
    bool hasDirectionA = false;
    std::array<double, 3> directionB = { 0.0, 0.0, 0.0 };
    bool hasDirectionB = false;
    std::array<double, 3> axisDirection = { 0.0, 0.0, 0.0 };
    bool hasAxisDirection = false;
};

struct OcctExactRelationResult {
    bool ok = false;
    std::string code;
    std::string message;
    std::string kind;
    OcctExactPlacementFrame frame;
    bool hasFrame = false;
    std::vector<OcctExactPlacementAnchor> anchors;
    std::array<double, 3> directionA = { 0.0, 0.0, 0.0 };
    bool hasDirectionA = false;
    std::array<double, 3> directionB = { 0.0, 0.0, 0.0 };
    bool hasDirectionB = false;
    std::array<double, 3> center = { 0.0, 0.0, 0.0 };
    bool hasCenter = false;
    std::array<double, 3> axisDirection = { 0.0, 0.0, 0.0 };
    bool hasAxisDirection = false;
    std::array<double, 3> tangentPoint = { 0.0, 0.0, 0.0 };
    bool hasTangentPoint = false;
};

struct OcctExactHoleResult {
    bool ok = false;
    std::string code;
    std::string message;
    std::string kind;
    std::string profile;
    double radius = 0.0;
    double diameter = 0.0;
    OcctExactPlacementFrame frame;
    bool hasFrame = false;
    std::vector<OcctExactPlacementAnchor> anchors;
    std::array<double, 3> axisDirection = { 0.0, 0.0, 0.0 };
    bool hasAxisDirection = false;
    double depth = 0.0;
    bool hasDepth = false;
    bool isThrough = false;
    bool hasIsThrough = false;
};

struct OcctExactChamferResult {
    bool ok = false;
    std::string code;
    std::string message;
    std::string kind;
    std::string profile;
    std::string variant;
    double distanceA = 0.0;
    double distanceB = 0.0;
    double supportAngle = 0.0;
    OcctExactPlacementFrame frame;
    bool hasFrame = false;
    std::vector<OcctExactPlacementAnchor> anchors;
    std::array<double, 3> edgeDirection = { 0.0, 0.0, 0.0 };
    bool hasEdgeDirection = false;
    std::array<double, 3> supportNormalA = { 0.0, 0.0, 0.0 };
    bool hasSupportNormalA = false;
    std::array<double, 3> supportNormalB = { 0.0, 0.0, 0.0 };
    bool hasSupportNormalB = false;
};

struct OcctExactCompoundHoleResult {
    bool ok = false;
    std::string code;
    std::string message;
    std::string kind;
    std::string family;
    double holeDiameter = 0.0;
    double holeDepth = 0.0;
    bool hasHoleDepth = false;
    bool isThrough = false;
    bool hasIsThrough = false;
    OcctExactPlacementFrame frame;
    bool hasFrame = false;
    std::vector<OcctExactPlacementAnchor> anchors;
    std::array<double, 3> axisDirection = { 0.0, 0.0, 0.0 };
    bool hasAxisDirection = false;
    double counterboreDiameter = 0.0;
    bool hasCounterboreDiameter = false;
    double counterboreDepth = 0.0;
    bool hasCounterboreDepth = false;
    double countersinkDiameter = 0.0;
    bool hasCountersinkDiameter = false;
    double countersinkAngle = 0.0;
    bool hasCountersinkAngle = false;
};

struct OcctProfile2DDiagnostic {
    std::string code;
    std::string message;
    std::string severity = "error";
    std::string path;
    bool hasPath = false;
    int segmentIndex = -1;
    bool hasSegmentIndex = false;
};

struct OcctProfile2DSegment {
    std::string kind;
    std::string id;
    bool hasId = false;
    std::string tag;
    bool hasTag = false;
    std::array<double, 2> start = { 0.0, 0.0 };
    bool hasStart = false;
    std::array<double, 2> end = { 0.0, 0.0 };
    bool hasEnd = false;
    std::array<double, 2> center = { 0.0, 0.0 };
    bool hasCenter = false;
    std::array<double, 2> through = { 0.0, 0.0 };
    bool hasThrough = false;
};

struct OcctProfile2DSpec {
    int version = 1;
    std::array<double, 2> start = { 0.0, 0.0 };
    bool hasStart = false;
    std::vector<OcctProfile2DSegment> segments;
};

struct OcctProfile2DValidationResult {
    bool ok = false;
    std::vector<OcctProfile2DDiagnostic> diagnostics;
    OcctProfile2DSpec spec;
    bool hasSpec = false;
};

using OcctRevolvedToolDiagnostic = OcctProfile2DDiagnostic;
using OcctRevolvedToolSegment = OcctProfile2DSegment;

struct OcctRevolvedToolProfile {
    std::string plane = "XZ";
    std::array<double, 2> start = { 0.0, 0.0 };
    bool hasStart = false;
    std::vector<OcctProfile2DSegment> segments;
    std::string closure;
    bool hasClosure = false;
};

struct OcctRevolvedToolSpec {
    int version = 1;
    std::string units;
    OcctRevolvedToolProfile profile;
    double angleDeg = 360.0;
};

struct OcctRevolvedToolValidationResult {
    bool ok = false;
    std::vector<OcctRevolvedToolDiagnostic> diagnostics;
    OcctRevolvedToolSpec spec;
    bool hasSpec = false;
};

struct OcctGeneratedShapeSegmentDescriptor {
    int index = 0;
    std::string kind;
    std::string id;
    bool hasId = false;
    std::string tag;
    bool hasTag = false;
};

using OcctGeneratedToolSegmentDescriptor = OcctGeneratedShapeSegmentDescriptor;

struct OcctGeneratedShapeFaceBinding {
    int geometryIndex = 0;
    int faceId = 0;
    std::string systemRole;
    int segmentIndex = -1;
    bool hasSegmentIndex = false;
    std::string segmentId;
    bool hasSegmentId = false;
    std::string segmentTag;
    bool hasSegmentTag = false;
};

using OcctGeneratedToolFaceBinding = OcctGeneratedShapeFaceBinding;

struct OcctGeneratedShapeExactShapeValidation {
    bool isValid = false;
    bool isClosed = false;
    bool isSolid = false;
    std::string shapeType;
    int solidCount = 0;
    int shellCount = 0;
    int faceCount = 0;
    int edgeCount = 0;
    int vertexCount = 0;
};

using OcctGeneratedToolExactShapeValidation = OcctGeneratedShapeExactShapeValidation;

struct OcctGeneratedShapeMeshValidation {
    bool isWatertight = false;
    bool isManifold = false;
    int weldedVertexCount = 0;
    int boundaryEdgeCount = 0;
    int nonManifoldEdgeCount = 0;
};

using OcctGeneratedToolMeshValidation = OcctGeneratedShapeMeshValidation;

struct OcctGeneratedShapeShapeValidation {
    OcctGeneratedShapeExactShapeValidation exact;
    OcctGeneratedShapeMeshValidation mesh;
};

using OcctGeneratedToolShapeValidation = OcctGeneratedShapeShapeValidation;

struct OcctGeneratedRevolvedShapeMetadata {
    int version = 1;
    std::string units;
    std::string plane = "XZ";
    std::string closure;
    double angleDeg = 360.0;
    int segmentCount = 0;
    bool hasStableFaceBindings = false;
    bool hasShapeValidation = false;
    std::vector<OcctGeneratedShapeSegmentDescriptor> segments;
    std::vector<OcctGeneratedShapeFaceBinding> faceBindings;
    OcctGeneratedShapeShapeValidation shapeValidation;
};

using OcctGeneratedToolMetadata = OcctGeneratedRevolvedShapeMetadata;

struct OcctGeneratedExtrudedShapeMetadata {
    int version = 1;
    std::string units;
    double depth = 0.0;
    int segmentCount = 0;
    bool hasStableFaceBindings = false;
    bool hasShapeValidation = false;
    std::vector<OcctGeneratedShapeSegmentDescriptor> segments;
    std::vector<OcctGeneratedShapeFaceBinding> faceBindings;
    OcctGeneratedShapeShapeValidation shapeValidation;
};

struct OcctRevolvedToolBuildResult {
    bool success = false;
    std::string error;
    std::vector<OcctRevolvedToolDiagnostic> diagnostics;
    OcctSceneData scene;
    TopoDS_Shape exactShape;
    std::vector<TopoDS_Shape> exactGeometryShapes;
    OcctGeneratedRevolvedShapeMetadata revolvedShape;
    bool hasRevolvedShape = false;
};

using OcctExtrudedShapeDiagnostic = OcctProfile2DDiagnostic;
using OcctExtrudedShapeSegment = OcctProfile2DSegment;

struct OcctExtrudedShapeSpec {
    int version = 1;
    std::string units;
    OcctProfile2DSpec profile;
    double depth = 0.0;
};

struct OcctExtrudedShapeValidationResult {
    bool ok = false;
    std::vector<OcctExtrudedShapeDiagnostic> diagnostics;
    OcctExtrudedShapeSpec spec;
    bool hasSpec = false;
};

struct OcctExtrudedShapeBuildResult {
    bool success = false;
    std::string error;
    std::vector<OcctExtrudedShapeDiagnostic> diagnostics;
    OcctSceneData scene;
    TopoDS_Shape exactShape;
    std::vector<TopoDS_Shape> exactGeometryShapes;
    OcctGeneratedExtrudedShapeMetadata extrudedShape;
    bool hasExtrudedShape = false;
};

using OcctHelicalSweepDiagnostic = OcctProfile2DDiagnostic;

struct OcctHelicalSweepPath {
    double radius = 0.0;
    double pitch = 0.0;
    double turns = 0.0;
    std::string handedness = "right";
};

struct OcctHelicalSweepSection {
    std::string kind = "circle";
    double radius = 0.0;
    int segments = 24;
    std::vector<std::array<double, 2>> points;
};

struct OcctHelicalSweepSpec {
    int version = 1;
    std::string units;
    OcctHelicalSweepPath helix;
    OcctHelicalSweepSection section;
};

struct OcctHelicalSweepValidationResult {
    bool ok = false;
    std::vector<OcctHelicalSweepDiagnostic> diagnostics;
    OcctHelicalSweepSpec spec;
    bool hasSpec = false;
};

struct OcctGeneratedHelicalSweepMetadata {
    int version = 1;
    std::string units;
    double helixRadius = 0.0;
    double pitch = 0.0;
    double turns = 0.0;
    double height = 0.0;
    std::string handedness = "right";
    std::string sectionKind = "circle";
    double sectionRadius = 0.0;
    int sectionSegments = 24;
    int sectionPointCount = 0;
    bool hasStableFaceBindings = false;
    bool hasShapeValidation = false;
    std::vector<OcctGeneratedShapeFaceBinding> faceBindings;
    OcctGeneratedShapeShapeValidation shapeValidation;
};

struct OcctHelicalSweepBuildResult {
    bool success = false;
    std::string error;
    std::vector<OcctHelicalSweepDiagnostic> diagnostics;
    OcctSceneData scene;
    TopoDS_Shape exactShape;
    std::vector<TopoDS_Shape> exactGeometryShapes;
    OcctGeneratedHelicalSweepMetadata helicalSweep;
    bool hasHelicalSweep = false;
};

using OcctCompositeShapeDiagnostic = OcctProfile2DDiagnostic;

struct OcctCompositeShapeValidationResult {
    bool ok = false;
    std::vector<OcctCompositeShapeDiagnostic> diagnostics;
};

struct OcctGeneratedCompositeShapeOperationDescriptor {
    int index = 0;
    std::string op;
    std::string family;
    bool hasTransform = false;
};

struct OcctGeneratedCompositeShapeMetadata {
    int version = 1;
    std::string units;
    std::string seedFamily;
    int stepCount = 0;
    bool hasShapeValidation = false;
    std::vector<OcctGeneratedCompositeShapeOperationDescriptor> operations;
    OcctGeneratedShapeShapeValidation shapeValidation;
};

struct OcctCompositeShapeBuildResult {
    bool success = false;
    std::string error;
    std::vector<OcctCompositeShapeDiagnostic> diagnostics;
    OcctSceneData scene;
    TopoDS_Shape exactShape;
    std::vector<TopoDS_Shape> exactGeometryShapes;
    OcctGeneratedCompositeShapeMetadata compositeShape;
    bool hasCompositeShape = false;
};

struct ImportParams {
    static constexpr double kCadGhostedOpacity = 0.35;

    enum class LinearUnit {
        Millimeter,
        Centimeter,
        Meter,
        Inch,
        Foot
    };

    enum class RootMode {
        OneShape,
        MultipleShapes
    };

    enum class LinearDeflectionType {
        BoundingBoxRatio,
        AbsoluteValue
    };

    enum class AppearanceMode {
        LegacyReadColors,
        SourceColors,
        DefaultColor
    };

    RootMode rootMode = RootMode::OneShape;
    LinearUnit linearUnit = LinearUnit::Millimeter;
    LinearDeflectionType linearDeflectionType = LinearDeflectionType::BoundingBoxRatio;
    AppearanceMode appearanceMode = AppearanceMode::LegacyReadColors;
    double linearDeflection = 0.001;
    double angularDeflection = 0.5;
    bool readNames = true;
    bool readColors = true;
    OcctColor defaultColor = OcctColor(0.9, 0.91, 0.93);
    double defaultOpacity = 1.0;
    bool hasDefaultOpacity = false;

    bool HasExplicitAppearanceMode() const
    {
        return appearanceMode != AppearanceMode::LegacyReadColors;
    }

    bool ShouldReadSourceColors() const
    {
        if (appearanceMode == AppearanceMode::SourceColors) {
            return true;
        }
        if (appearanceMode == AppearanceMode::DefaultColor) {
            return false;
        }
        return readColors;
    }

    bool ShouldUseDefaultColor() const
    {
        return appearanceMode == AppearanceMode::DefaultColor;
    }

    OcctColor ResolveDefaultColor() const
    {
        OcctColor resolved = defaultColor;
        if (resolved.isValid && hasDefaultOpacity) {
            resolved.opacity = defaultOpacity;
            resolved.hasOpacity = true;
        }
        return resolved;
    }

    OcctColor ResolveImportedColor(const OcctColor& importedColor) const
    {
        return ShouldUseDefaultColor() ? ResolveDefaultColor() : importedColor;
    }

    OcctColor ResolveFallbackColor() const
    {
        return ShouldUseDefaultColor() ? ResolveDefaultColor() : OcctColor();
    }
};
