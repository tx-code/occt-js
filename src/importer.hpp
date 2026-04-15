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

struct ImportParams {
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
