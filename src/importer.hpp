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

struct OcctFaceData {
    std::vector<float>    positions;   // flat [x,y,z, ...]
    std::vector<float>    normals;     // flat [nx,ny,nz, ...]
    std::vector<uint32_t> indices;     // flat triangle indices
    OcctColor             color;
};

struct OcctMeshData {
    std::string            name;
    OcctColor              color;
    std::vector<float>     positions;   // flat [x,y,z, ...]
    std::vector<float>     normals;     // flat [nx,ny,nz, ...]
    std::vector<uint32_t>  indices;     // flat triangle indices

    // Per-face ranges for sub-material support
    struct FaceRange {
        uint32_t first;   // first triangle index
        uint32_t last;    // last triangle index (inclusive)
        OcctColor color;
    };
    std::vector<FaceRange> faceRanges;
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
    double linearDeflection  = 0.1;
    double angularDeflection = 0.5;
    bool   readNames         = true;
    bool   readColors        = true;
};
