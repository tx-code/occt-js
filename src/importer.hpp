#pragma once

#include <string>
#include <vector>
#include <array>
#include <cstdint>

// ---------------------------------------------------------------------------
//  Core data structures for the import pipeline
// ---------------------------------------------------------------------------

struct OcctColor {
    double r = 0.0;
    double g = 0.0;
    double b = 0.0;
    bool isValid = false;

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

    RootMode rootMode = RootMode::OneShape;
    LinearUnit linearUnit = LinearUnit::Millimeter;
    LinearDeflectionType linearDeflectionType = LinearDeflectionType::BoundingBoxRatio;
    double linearDeflection = 0.001;
    double angularDeflection = 0.5;
    bool readNames = true;
    bool readColors = true;
};
