#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <map>
#include <array>
#include <string>
#include "importer-step.hpp"

using namespace emscripten;

// ---------------------------------------------------------------------------
//  Helpers to convert C++ structures to JS val objects
// ---------------------------------------------------------------------------

namespace {

val ColorToVal(const OcctColor& c)
{
    if (!c.isValid) {
        return val::null();
    }
    val obj = val::object();
    obj.set("r", c.r);
    obj.set("g", c.g);
    obj.set("b", c.b);
    return obj;
}

val TransformToVal(const std::array<float, 16>& m)
{
    val arr = val::array();
    for (int i = 0; i < 16; ++i) {
        arr.call<void>("push", m[i]);
    }
    return arr;
}

val MeshToVal(const OcctMeshData& mesh)
{
    val obj = val::object();
    obj.set("name", mesh.name);
    obj.set("color", ColorToVal(mesh.color));

    // positions
    {
        val positions = val::global("Float32Array").new_(mesh.positions.size());
        val memView = val(typed_memory_view(mesh.positions.size(), mesh.positions.data()));
        positions.call<void>("set", memView);
        obj.set("positions", positions);
    }
    // normals
    {
        val normals = val::global("Float32Array").new_(mesh.normals.size());
        val memView = val(typed_memory_view(mesh.normals.size(), mesh.normals.data()));
        normals.call<void>("set", memView);
        obj.set("normals", normals);
    }
    // indices
    {
        val indices = val::global("Uint32Array").new_(mesh.indices.size());
        val memView = val(typed_memory_view(mesh.indices.size(), mesh.indices.data()));
        indices.call<void>("set", memView);
        obj.set("indices", indices);
    }

    // face ranges
    val faceRanges = val::array();
    for (const auto& fr : mesh.faceRanges) {
        val frObj = val::object();
        frObj.set("first", fr.first);
        frObj.set("last",  fr.last);
        frObj.set("color", ColorToVal(fr.color));
        faceRanges.call<void>("push", frObj);
    }
    obj.set("faceRanges", faceRanges);

    return obj;
}

// ---------------------------------------------------------------------------
//  Build a tree-form node hierarchy for the JS side.
// ---------------------------------------------------------------------------
val NodeToTreeVal(const OcctSceneData& scene, int nodeIdx)
{
    const OcctNodeData& node = scene.nodes[nodeIdx];

    val obj = val::object();
    obj.set("id",         node.id);
    obj.set("name",       node.name);
    obj.set("isAssembly", node.isAssembly);
    obj.set("transform",  TransformToVal(node.transform));
    obj.set("meshIndex",  node.meshIndex);

    val children = val::array();
    for (int childIdx : node.childIndices) {
        children.call<void>("push", NodeToTreeVal(scene, childIdx));
    }
    obj.set("children", children);

    return obj;
}

// ---------------------------------------------------------------------------
//  Gather unique materials from all meshes.
// ---------------------------------------------------------------------------
struct MaterialKey {
    int ri, gi, bi;
    bool operator<(const MaterialKey& o) const {
        if (ri != o.ri) return ri < o.ri;
        if (gi != o.gi) return gi < o.gi;
        return bi < o.bi;
    }
};

MaterialKey ColorToKey(const OcctColor& c) {
    return {
        static_cast<int>(c.r * 255.0 + 0.5),
        static_cast<int>(c.g * 255.0 + 0.5),
        static_cast<int>(c.b * 255.0 + 0.5)
    };
}

} // anonymous namespace

// ===========================================================================
//  ReadStepFile  –  main entry point from JavaScript
// ===========================================================================

val ReadStepFile(const val& content, const val& jsParams)
{
    // ---- Extract binary data from Uint8Array ----
    unsigned int length = content["length"].as<unsigned int>();
    std::vector<uint8_t> buffer(length);
    val memoryView = val(typed_memory_view(length, buffer.data()));
    memoryView.call<void>("set", content);

    // ---- Parse import parameters ----
    ImportParams params;
    if (jsParams.typeOf().as<std::string>() == "object" && !jsParams.isNull()) {
        if (jsParams.hasOwnProperty("linearDeflection")) {
            params.linearDeflection = jsParams["linearDeflection"].as<double>();
        }
        if (jsParams.hasOwnProperty("angularDeflection")) {
            params.angularDeflection = jsParams["angularDeflection"].as<double>();
        }
        if (jsParams.hasOwnProperty("readNames")) {
            params.readNames = jsParams["readNames"].as<bool>();
        }
        if (jsParams.hasOwnProperty("readColors")) {
            params.readColors = jsParams["readColors"].as<bool>();
        }
    }

    // ---- Import ----
    OcctSceneData scene = ImportStepFromMemory(
        buffer.data(), buffer.size(), "input.stp", params);

    // ---- Build result object ----
    val result = val::object();
    result.set("sourceFormat", std::string("step"));

    if (!scene.success) {
        result.set("success", false);
        result.set("error", scene.error);
        return result;
    }
    result.set("success", true);

    // Unit info
    if (!scene.sourceUnit.empty()) {
        result.set("sourceUnit", scene.sourceUnit);
    }
    if (scene.unitScaleToMeters > 0.0) {
        result.set("unitScaleToMeters", scene.unitScaleToMeters);
    }

    // rootNodes (tree form)
    val rootNodes = val::array();
    for (int idx : scene.rootNodeIndices) {
        rootNodes.call<void>("push", NodeToTreeVal(scene, idx));
    }
    result.set("rootNodes", rootNodes);

    // geometries
    val geometries = val::array();
    for (const auto& mesh : scene.meshes) {
        geometries.call<void>("push", MeshToVal(mesh));
    }
    result.set("geometries", geometries);

    // materials (deduplicated from face-range colors)
    std::map<MaterialKey, int> matMap;
    val materials = val::array();

    auto getOrCreateMaterial = [&](const OcctColor& c) -> int {
        if (!c.isValid) return -1;
        MaterialKey key = ColorToKey(c);
        auto it = matMap.find(key);
        if (it != matMap.end()) return it->second;
        int idx = static_cast<int>(matMap.size());
        matMap[key] = idx;
        val matObj = val::object();
        matObj.set("r", c.r);
        matObj.set("g", c.g);
        matObj.set("b", c.b);
        materials.call<void>("push", matObj);
        return idx;
    };

    // Walk geometries to map face ranges to material indices
    for (size_t gi = 0; gi < scene.meshes.size(); ++gi) {
        const auto& mesh = scene.meshes[gi];
        getOrCreateMaterial(mesh.color);
        for (const auto& fr : mesh.faceRanges) {
            getOrCreateMaterial(fr.color);
        }
    }
    result.set("materials", materials);

    // warnings (empty for now)
    result.set("warnings", val::array());

    // stats
    {
        val stats = val::object();
        stats.set("rootCount",    static_cast<int>(scene.rootNodeIndices.size()));
        stats.set("nodeCount",    static_cast<int>(scene.nodes.size()));

        int partCount = 0;
        int reusedCount = 0;
        uint32_t totalTriangles = 0;
        std::map<int, int> meshRefCount;

        for (const auto& node : scene.nodes) {
            if (node.meshIndex >= 0) {
                ++partCount;
                meshRefCount[node.meshIndex]++;
            }
        }
        for (const auto& [mi, count] : meshRefCount) {
            if (count > 1) {
                reusedCount += count - 1;
            }
        }
        for (const auto& mesh : scene.meshes) {
            totalTriangles += static_cast<uint32_t>(mesh.indices.size() / 3);
        }

        stats.set("partCount",          partCount);
        stats.set("geometryCount",      static_cast<int>(scene.meshes.size()));
        stats.set("materialCount",      static_cast<int>(matMap.size()));
        stats.set("triangleCount",      totalTriangles);
        stats.set("reusedInstanceCount", reusedCount);
        result.set("stats", stats);
    }

    return result;
}

// ===========================================================================
//  Embind registration
// ===========================================================================

EMSCRIPTEN_BINDINGS(occtjs) {
    function("ReadStepFile", &ReadStepFile);
}
