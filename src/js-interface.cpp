#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <map>
#include <array>
#include <string>
#include <vector>
#include <algorithm>
#include <cctype>

#include "importer-step.hpp"
#include "importer-iges.hpp"
#include "importer-brep.hpp"
#include "exact-model-store.hpp"
#include "exact-query.hpp"
#include "orientation.hpp"

using namespace emscripten;

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

    {
        val positions = val::global("Float32Array").new_(mesh.positions.size());
        val memView = val(typed_memory_view(mesh.positions.size(), mesh.positions.data()));
        positions.call<void>("set", memView);
        obj.set("positions", positions);
    }
    {
        val normals = val::global("Float32Array").new_(mesh.normals.size());
        val memView = val(typed_memory_view(mesh.normals.size(), mesh.normals.data()));
        normals.call<void>("set", memView);
        obj.set("normals", normals);
    }
    {
        val indices = val::global("Uint32Array").new_(mesh.indices.size());
        val memView = val(typed_memory_view(mesh.indices.size(), mesh.indices.data()));
        indices.call<void>("set", memView);
        obj.set("indices", indices);
    }

    // Topology: faces
    val facesArr = val::array();
    for (const auto& face : mesh.faces) {
        val fObj = val::object();
        fObj.set("id", face.id);
        fObj.set("name", face.name);
        fObj.set("firstIndex", face.firstIndex);
        fObj.set("indexCount", face.indexCount);

        val edgeIdxArr = val::array();
        for (int idx : face.edgeIndices) {
            edgeIdxArr.call<void>("push", idx);
        }
        fObj.set("edgeIndices", edgeIdxArr);
        fObj.set("color", ColorToVal(face.color));
        facesArr.call<void>("push", fObj);
    }
    obj.set("faces", facesArr);

    // Topology: edges
    val edgesArr = val::array();
    for (const auto& edge : mesh.edges) {
        val eObj = val::object();
        eObj.set("id", edge.id);
        eObj.set("name", edge.name);
        eObj.set("isFreeEdge", edge.isFreeEdge);

        {
            val points = val::global("Float32Array").new_(edge.points.size());
            if (!edge.points.empty()) {
                val memView = val(typed_memory_view(edge.points.size(), edge.points.data()));
                points.call<void>("set", memView);
            }
            eObj.set("points", points);
        }

        val ownerArr = val::array();
        for (int fid : edge.ownerFaceIds) {
            ownerArr.call<void>("push", fid);
        }
        eObj.set("ownerFaceIds", ownerArr);
        eObj.set("color", ColorToVal(edge.color));
        edgesArr.call<void>("push", eObj);
    }
    obj.set("edges", edgesArr);

    // Topology: vertices
    val verticesArr = val::array();
    for (const auto& vert : mesh.vertices) {
        val vObj = val::object();
        vObj.set("id", vert.id);
        val pos = val::array();
        pos.call<void>("push", vert.position[0]);
        pos.call<void>("push", vert.position[1]);
        pos.call<void>("push", vert.position[2]);
        vObj.set("position", pos);
        verticesArr.call<void>("push", vObj);
    }
    obj.set("vertices", verticesArr);

    // Topology: triangleToFaceMap
    {
        val triMap = val::global("Int32Array").new_(mesh.triangleToFaceMap.size());
        if (!mesh.triangleToFaceMap.empty()) {
            val memView = val(typed_memory_view(mesh.triangleToFaceMap.size(), mesh.triangleToFaceMap.data()));
            triMap.call<void>("set", memView);
        }
        obj.set("triangleToFaceMap", triMap);
    }

    return obj;
}

val NodeToTreeVal(const OcctSceneData& scene, int nodeIdx)
{
    const OcctNodeData& node = scene.nodes[nodeIdx];

    val obj = val::object();
    obj.set("id", node.id);
    obj.set("name", node.name);
    obj.set("isAssembly", node.isAssembly);
    obj.set("transform", TransformToVal(node.transform));

    val meshesArr = val::array();
    for (size_t i = 0; i < node.meshIndices.size(); ++i) {
        meshesArr.call<void>("push", node.meshIndices[i]);
    }
    obj.set("meshes", meshesArr);

    val children = val::array();
    for (int childIdx : node.childIndices) {
        children.call<void>("push", NodeToTreeVal(scene, childIdx));
    }
    obj.set("children", children);

    return obj;
}

struct MaterialKey {
    int ri, gi, bi;
    bool operator<(const MaterialKey& o) const {
        if (ri != o.ri) return ri < o.ri;
        if (gi != o.gi) return gi < o.gi;
        return bi < o.bi;
    }
};

MaterialKey ColorToKey(const OcctColor& c)
{
    return {
        static_cast<int>(c.r * 255.0 + 0.5),
        static_cast<int>(c.g * 255.0 + 0.5),
        static_cast<int>(c.b * 255.0 + 0.5)
    };
}

std::vector<uint8_t> ExtractBytes(const val& content)
{
    unsigned int length = content["length"].as<unsigned int>();
    std::vector<uint8_t> buffer(length);
    val memoryView = val(typed_memory_view(length, buffer.data()));
    memoryView.call<void>("set", content);
    return buffer;
}

ImportParams ParseImportParams(const val& jsParams)
{
    ImportParams params;
    if (jsParams.typeOf().as<std::string>() == "object" && !jsParams.isNull()) {
        if (jsParams.hasOwnProperty("rootMode")) {
            std::string rootMode = jsParams["rootMode"].as<std::string>();
            if (rootMode == "multiple-shapes") {
                params.rootMode = ImportParams::RootMode::MultipleShapes;
            } else {
                params.rootMode = ImportParams::RootMode::OneShape;
            }
        }
        if (jsParams.hasOwnProperty("linearUnit")) {
            std::string linearUnit = jsParams["linearUnit"].as<std::string>();
            if (linearUnit == "millimeter") {
                params.linearUnit = ImportParams::LinearUnit::Millimeter;
            } else if (linearUnit == "centimeter") {
                params.linearUnit = ImportParams::LinearUnit::Centimeter;
            } else if (linearUnit == "meter") {
                params.linearUnit = ImportParams::LinearUnit::Meter;
            } else if (linearUnit == "inch") {
                params.linearUnit = ImportParams::LinearUnit::Inch;
            } else if (linearUnit == "foot") {
                params.linearUnit = ImportParams::LinearUnit::Foot;
            }
        }
        if (jsParams.hasOwnProperty("linearDeflectionType")) {
            std::string linearDeflectionType = jsParams["linearDeflectionType"].as<std::string>();
            if (linearDeflectionType == "bounding_box_ratio") {
                params.linearDeflectionType = ImportParams::LinearDeflectionType::BoundingBoxRatio;
            } else if (linearDeflectionType == "absolute_value") {
                params.linearDeflectionType = ImportParams::LinearDeflectionType::AbsoluteValue;
            }
        }
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
    return params;
}

std::array<double, 3> ParseVector3(const val& jsValue, const std::array<double, 3>& fallback)
{
    std::array<double, 3> result = fallback;
    if (jsValue.typeOf().as<std::string>() != "object" || jsValue.isNull()) {
        return result;
    }
    if (jsValue["length"].as<unsigned>() < 3) {
        return result;
    }
    result[0] = jsValue[0].as<double>();
    result[1] = jsValue[1].as<double>();
    result[2] = jsValue[2].as<double>();
    return result;
}

bool TryParseVector3(const val& jsValue, std::array<double, 3>& result)
{
    if (jsValue.typeOf().as<std::string>() != "object" || jsValue.isNull()) {
        return false;
    }
    if (!jsValue.hasOwnProperty("length")) {
        return false;
    }
    if (jsValue["length"].as<unsigned>() < 3) {
        return false;
    }

    result[0] = jsValue[0].as<double>();
    result[1] = jsValue[1].as<double>();
    result[2] = jsValue[2].as<double>();
    return true;
}

std::array<double, 16> IdentityMatrix4()
{
    return {
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0
    };
}

std::array<double, 16> ParseMatrix4(const val& jsValue)
{
    std::array<double, 16> matrix = IdentityMatrix4();
    if (jsValue.typeOf().as<std::string>() != "object" || jsValue.isNull()) {
        return matrix;
    }
    if (!jsValue.hasOwnProperty("length")) {
        return matrix;
    }
    if (jsValue["length"].as<unsigned>() < 16) {
        return matrix;
    }

    for (int index = 0; index < 16; ++index) {
        matrix[index] = jsValue[index].as<double>();
    }
    return matrix;
}

gp_Trsf MatrixToTrsf(const std::array<double, 16>& matrix)
{
    gp_Trsf transform;
    transform.SetValues(
        matrix[0], matrix[4], matrix[8], matrix[12],
        matrix[1], matrix[5], matrix[9], matrix[13],
        matrix[2], matrix[6], matrix[10], matrix[14]
    );
    return transform;
}

OrientationParams ParseOrientationParams(const val& jsParams)
{
    OrientationParams params;
    if (jsParams.typeOf().as<std::string>() != "object" || jsParams.isNull()) {
        return params;
    }

    if (jsParams.hasOwnProperty("linearUnit")) {
        std::string linearUnit = jsParams["linearUnit"].as<std::string>();
        if (linearUnit == "millimeter") {
            params.linearUnit = ImportParams::LinearUnit::Millimeter;
        } else if (linearUnit == "centimeter") {
            params.linearUnit = ImportParams::LinearUnit::Centimeter;
        } else if (linearUnit == "meter") {
            params.linearUnit = ImportParams::LinearUnit::Meter;
        } else if (linearUnit == "inch") {
            params.linearUnit = ImportParams::LinearUnit::Inch;
        } else if (linearUnit == "foot") {
            params.linearUnit = ImportParams::LinearUnit::Foot;
        }
    }

    if (jsParams.hasOwnProperty("mode")) {
        params.mode = jsParams["mode"].as<std::string>();
    }

    if (jsParams.hasOwnProperty("presetAxis")) {
        val presetAxis = jsParams["presetAxis"];
        if (presetAxis.typeOf().as<std::string>() == "object" && !presetAxis.isNull()) {
            params.presetAxis.isSet = true;
            if (presetAxis.hasOwnProperty("origin")) {
                params.presetAxis.origin = ParseVector3(presetAxis["origin"], params.presetAxis.origin);
            }
            if (presetAxis.hasOwnProperty("direction")) {
                params.presetAxis.direction = ParseVector3(presetAxis["direction"], params.presetAxis.direction);
            }
        }
    }

    return params;
}

val Vector3ToVal(const std::array<double, 3>& v)
{
    val arr = val::array();
    arr.call<void>("push", v[0]);
    arr.call<void>("push", v[1]);
    arr.call<void>("push", v[2]);
    return arr;
}

val OrientationResultToVal(const OrientationResult& result)
{
    val obj = val::object();
    obj.set("success", result.success);
    if (!result.success) {
        obj.set("error", result.error);
        return obj;
    }

    obj.set("transform", TransformToVal(result.transform));

    val localFrame = val::object();
    localFrame.set("origin", Vector3ToVal(result.localFrame.origin));
    localFrame.set("xDir", Vector3ToVal(result.localFrame.xDir));
    localFrame.set("yDir", Vector3ToVal(result.localFrame.yDir));
    localFrame.set("zDir", Vector3ToVal(result.localFrame.zDir));
    obj.set("localFrame", localFrame);

    val bbox = val::object();
    bbox.set("dx", result.bbox.dx);
    bbox.set("dy", result.bbox.dy);
    bbox.set("dz", result.bbox.dz);
    obj.set("bbox", bbox);

    obj.set("strategy", result.strategy);

    val stage1 = val::object();
    if (result.stage1.hasBaseFaceId) {
        stage1.set("baseFaceId", result.stage1.baseFaceId);
    }
    stage1.set("usedCylinderSupport", result.stage1.usedCylinderSupport);
    stage1.set("detectedAxis", Vector3ToVal(result.stage1.detectedAxis));
    obj.set("stage1", stage1);

    val stage2 = val::object();
    stage2.set("rotationAroundZDeg", result.stage2.rotationAroundZDeg);
    obj.set("stage2", stage2);

    obj.set("confidence", result.confidence);

    if (!result.sourceUnit.empty()) {
        obj.set("sourceUnit", result.sourceUnit);
    }
    if (result.unitScaleToMeters > 0.0) {
        obj.set("unitScaleToMeters", result.unitScaleToMeters);
    }

    return obj;
}

val LifecycleResultToVal(const OcctLifecycleResult& result)
{
    val obj = val::object();
    obj.set("ok", result.ok);
    if (!result.code.empty()) {
        obj.set("code", result.code);
    }
    if (!result.message.empty()) {
        obj.set("message", result.message);
    }
    return obj;
}

template <typename TResult>
val ExactFailureToVal(const TResult& result)
{
    val obj = val::object();
    obj.set("ok", result.ok);
    if (!result.code.empty()) {
        obj.set("code", result.code);
    }
    if (!result.message.empty()) {
        obj.set("message", result.message);
    }
    return obj;
}

val ExactGeometryTypeResultToVal(const OcctExactGeometryTypeResult& result)
{
    if (!result.ok) {
        return ExactFailureToVal(result);
    }

    val obj = val::object();
    obj.set("ok", true);
    obj.set("family", result.family);
    return obj;
}

val ExactRadiusResultToVal(const OcctExactRadiusResult& result)
{
    if (!result.ok) {
        return ExactFailureToVal(result);
    }

    val obj = val::object();
    obj.set("ok", true);
    obj.set("family", result.family);
    obj.set("radius", result.radius);
    obj.set("diameter", result.diameter);
    obj.set("localCenter", Vector3ToVal(result.localCenter));
    obj.set("localAnchorPoint", Vector3ToVal(result.localAnchorPoint));
    obj.set("localAxisDirection", Vector3ToVal(result.localAxisDirection));
    return obj;
}

val ExactCenterResultToVal(const OcctExactCenterResult& result)
{
    if (!result.ok) {
        return ExactFailureToVal(result);
    }

    val obj = val::object();
    obj.set("ok", true);
    obj.set("family", result.family);
    obj.set("localCenter", Vector3ToVal(result.localCenter));
    obj.set("localAxisDirection", Vector3ToVal(result.localAxisDirection));
    return obj;
}

val ExactEdgeLengthResultToVal(const OcctExactEdgeLengthResult& result)
{
    if (!result.ok) {
        return ExactFailureToVal(result);
    }

    val obj = val::object();
    obj.set("ok", true);
    obj.set("value", result.value);
    obj.set("localStartPoint", Vector3ToVal(result.localStartPoint));
    obj.set("localEndPoint", Vector3ToVal(result.localEndPoint));
    return obj;
}

val ExactFaceAreaResultToVal(const OcctExactFaceAreaResult& result)
{
    if (!result.ok) {
        return ExactFailureToVal(result);
    }

    val obj = val::object();
    obj.set("ok", true);
    obj.set("value", result.value);
    obj.set("localCentroid", Vector3ToVal(result.localCentroid));
    return obj;
}

val ExactFaceNormalResultToVal(const OcctExactFaceNormalResult& result)
{
    if (!result.ok) {
        return ExactFailureToVal(result);
    }

    val obj = val::object();
    obj.set("ok", true);
    obj.set("localPoint", Vector3ToVal(result.localPoint));
    obj.set("localNormal", Vector3ToVal(result.localNormal));
    return obj;
}

val ExactDistanceResultToVal(const OcctExactDistanceResult& result)
{
    if (!result.ok) {
        return ExactFailureToVal(result);
    }

    val obj = val::object();
    obj.set("ok", true);
    obj.set("value", result.value);
    obj.set("pointA", Vector3ToVal(result.pointA));
    obj.set("pointB", Vector3ToVal(result.pointB));
    obj.set("workingPlaneOrigin", Vector3ToVal(result.workingPlaneOrigin));
    obj.set("workingPlaneNormal", Vector3ToVal(result.workingPlaneNormal));
    return obj;
}

val ExactAngleResultToVal(const OcctExactAngleResult& result)
{
    if (!result.ok) {
        return ExactFailureToVal(result);
    }

    val obj = val::object();
    obj.set("ok", true);
    obj.set("value", result.value);
    obj.set("origin", Vector3ToVal(result.origin));
    obj.set("directionA", Vector3ToVal(result.directionA));
    obj.set("directionB", Vector3ToVal(result.directionB));
    obj.set("pointA", Vector3ToVal(result.pointA));
    obj.set("pointB", Vector3ToVal(result.pointB));
    obj.set("workingPlaneOrigin", Vector3ToVal(result.workingPlaneOrigin));
    obj.set("workingPlaneNormal", Vector3ToVal(result.workingPlaneNormal));
    return obj;
}

val ExactThicknessResultToVal(const OcctExactThicknessResult& result)
{
    if (!result.ok) {
        return ExactFailureToVal(result);
    }

    val obj = val::object();
    obj.set("ok", true);
    obj.set("value", result.value);
    obj.set("pointA", Vector3ToVal(result.pointA));
    obj.set("pointB", Vector3ToVal(result.pointB));
    obj.set("workingPlaneOrigin", Vector3ToVal(result.workingPlaneOrigin));
    obj.set("workingPlaneNormal", Vector3ToVal(result.workingPlaneNormal));
    return obj;
}

val ExactGeometryBindingsToVal(size_t geometryCount)
{
    val bindings = val::array();
    for (size_t index = 0; index < geometryCount; ++index) {
        val binding = val::object();
        binding.set("exactShapeHandle", static_cast<int>(index + 1));
        bindings.call<void>("push", binding);
    }
    return bindings;
}

val BuildResult(const OcctSceneData& scene, const std::string& sourceFormat)
{
    val result = val::object();
    result.set("sourceFormat", sourceFormat);

    if (!scene.success) {
        result.set("success", false);
        result.set("error", scene.error);
        return result;
    }
    result.set("success", true);

    if (!scene.sourceUnit.empty()) {
        result.set("sourceUnit", scene.sourceUnit);
    }
    if (scene.unitScaleToMeters > 0.0) {
        result.set("unitScaleToMeters", scene.unitScaleToMeters);
    }

    val rootNodes = val::array();
    for (int idx : scene.rootNodeIndices) {
        rootNodes.call<void>("push", NodeToTreeVal(scene, idx));
    }
    result.set("rootNodes", rootNodes);

    val geometries = val::array();
    for (const auto& mesh : scene.meshes) {
        geometries.call<void>("push", MeshToVal(mesh));
    }
    result.set("geometries", geometries);

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

    for (const auto& mesh : scene.meshes) {
        getOrCreateMaterial(mesh.color);
        for (const auto& face : mesh.faces) {
            getOrCreateMaterial(face.color);
        }
    }
    result.set("materials", materials);
    result.set("warnings", val::array());

    val stats = val::object();
    stats.set("rootCount", static_cast<int>(scene.rootNodeIndices.size()));
    stats.set("nodeCount", static_cast<int>(scene.nodes.size()));

    int partCount = 0;
    int reusedCount = 0;
    uint32_t totalTriangles = 0;
    std::map<int, int> meshRefCount;

    for (const auto& node : scene.nodes) {
        if (!node.meshIndices.empty()) {
            ++partCount;
            for (int mi : node.meshIndices) {
                meshRefCount[mi]++;
            }
        }
    }
    for (const auto& kv : meshRefCount) {
        if (kv.second > 1) {
            reusedCount += kv.second - 1;
        }
    }
    for (const auto& mesh : scene.meshes) {
        totalTriangles += static_cast<uint32_t>(mesh.indices.size() / 3);
    }

    stats.set("partCount", partCount);
    stats.set("geometryCount", static_cast<int>(scene.meshes.size()));
    stats.set("materialCount", static_cast<int>(matMap.size()));
    stats.set("triangleCount", totalTriangles);
    stats.set("reusedInstanceCount", reusedCount);
    result.set("stats", stats);

    return result;
}

val ReadByFormat(const std::string& format, const val& content, const val& jsParams)
{
    std::vector<uint8_t> buffer = ExtractBytes(content);
    ImportParams params = ParseImportParams(jsParams);

    std::string normalizedFormat = format;
    std::transform(normalizedFormat.begin(), normalizedFormat.end(), normalizedFormat.begin(), [](unsigned char c) {
        return static_cast<char>(std::tolower(c));
    });

    OcctSceneData scene;
    if (normalizedFormat == "step") {
        scene = ImportStepFromMemory(buffer.data(), buffer.size(), "input.stp", params);
    } else if (normalizedFormat == "iges") {
        scene = ImportIgesFromMemory(buffer.data(), buffer.size(), "input.igs", params);
    } else if (normalizedFormat == "brep") {
        scene = ImportBrepFromMemory(buffer.data(), buffer.size(), "input.brep", params);
    } else {
        scene.success = false;
        scene.error = "Unsupported format: " + format;
        return BuildResult(scene, normalizedFormat);
    }

    return BuildResult(scene, normalizedFormat);
}

val OpenExactByFormat(const std::string& format, const val& content, const val& jsParams)
{
    std::vector<uint8_t> buffer = ExtractBytes(content);
    ImportParams params = ParseImportParams(jsParams);

    std::string normalizedFormat = format;
    std::transform(normalizedFormat.begin(), normalizedFormat.end(), normalizedFormat.begin(), [](unsigned char c) {
        return static_cast<char>(std::tolower(c));
    });

    OcctExactImportData imported;
    if (normalizedFormat == "step") {
        imported = ImportExactStepFromMemory(buffer.data(), buffer.size(), "input.stp", params);
    } else if (normalizedFormat == "iges") {
        imported = ImportExactIgesFromMemory(buffer.data(), buffer.size(), "input.igs", params);
    } else if (normalizedFormat == "brep") {
        imported = ImportExactBrepFromMemory(buffer.data(), buffer.size(), "input.brep", params);
    } else {
        imported.scene.success = false;
        imported.scene.error = "Unsupported format: " + format;
        return BuildResult(imported.scene, normalizedFormat);
    }

    if (!imported.scene.success) {
        return BuildResult(imported.scene, normalizedFormat);
    }

    if (imported.exactShape.IsNull()) {
        imported.scene.success = false;
        imported.scene.error = "Exact model import produced a null shape.";
        return BuildResult(imported.scene, normalizedFormat);
    }

    const int exactModelId = ExactModelStore::Instance().Register(
        imported.exactShape,
        imported.exactGeometryShapes,
        normalizedFormat,
        imported.scene.sourceUnit,
        imported.scene.unitScaleToMeters
    );

    if (exactModelId <= 0) {
        imported.scene.success = false;
        imported.scene.error = "Failed to register retained exact model state.";
        return BuildResult(imported.scene, normalizedFormat);
    }

    val result = BuildResult(imported.scene, normalizedFormat);
    result.set("exactModelId", exactModelId);
    result.set("exactGeometryBindings", ExactGeometryBindingsToVal(imported.exactGeometryShapes.size()));
    return result;
}

} // anonymous namespace

val ReadStepFile(const val& content, const val& jsParams)
{
    return ReadByFormat("step", content, jsParams);
}

val ReadIgesFile(const val& content, const val& jsParams)
{
    return ReadByFormat("iges", content, jsParams);
}

val ReadBrepFile(const val& content, const val& jsParams)
{
    return ReadByFormat("brep", content, jsParams);
}

val ReadFile(const std::string& format, const val& content, const val& jsParams)
{
    return ReadByFormat(format, content, jsParams);
}

val OpenExactStepModel(const val& content, const val& jsParams)
{
    return OpenExactByFormat("step", content, jsParams);
}

val OpenExactIgesModel(const val& content, const val& jsParams)
{
    return OpenExactByFormat("iges", content, jsParams);
}

val OpenExactBrepModel(const val& content, const val& jsParams)
{
    return OpenExactByFormat("brep", content, jsParams);
}

val OpenExactModel(const std::string& format, const val& content, const val& jsParams)
{
    return OpenExactByFormat(format, content, jsParams);
}

val RetainExactModel(int exactModelId)
{
    return LifecycleResultToVal(ExactModelStore::Instance().Retain(exactModelId));
}

val ReleaseExactModel(int exactModelId)
{
    return LifecycleResultToVal(ExactModelStore::Instance().Release(exactModelId));
}

val GetExactGeometryTypeBinding(int exactModelId, int exactShapeHandle, const std::string& kind, int elementId)
{
    return ExactGeometryTypeResultToVal(
        GetExactGeometryType(exactModelId, exactShapeHandle, kind, elementId)
    );
}

val MeasureExactRadiusBinding(int exactModelId, int exactShapeHandle, const std::string& kind, int elementId)
{
    return ExactRadiusResultToVal(
        MeasureExactRadius(exactModelId, exactShapeHandle, kind, elementId)
    );
}

val MeasureExactCenterBinding(int exactModelId, int exactShapeHandle, const std::string& kind, int elementId)
{
    return ExactCenterResultToVal(
        MeasureExactCenter(exactModelId, exactShapeHandle, kind, elementId)
    );
}

val MeasureExactEdgeLengthBinding(int exactModelId, int exactShapeHandle, const std::string& kind, int elementId)
{
    return ExactEdgeLengthResultToVal(
        MeasureExactEdgeLength(exactModelId, exactShapeHandle, kind, elementId)
    );
}

val MeasureExactFaceAreaBinding(int exactModelId, int exactShapeHandle, const std::string& kind, int elementId)
{
    return ExactFaceAreaResultToVal(
        MeasureExactFaceArea(exactModelId, exactShapeHandle, kind, elementId)
    );
}

val EvaluateExactFaceNormalBinding(
    int exactModelId,
    int exactShapeHandle,
    const std::string& kind,
    int elementId,
    const val& jsPoint)
{
    std::array<double, 3> localQueryPoint = { 0.0, 0.0, 0.0 };
    if (!TryParseVector3(jsPoint, localQueryPoint)) {
        OcctExactFaceNormalResult result;
        result.ok = false;
        result.code = "query-out-of-range";
        result.message = "Exact face normal requires a 3D query point.";
        return ExactFaceNormalResultToVal(result);
    }

    return ExactFaceNormalResultToVal(
        EvaluateExactFaceNormal(exactModelId, exactShapeHandle, kind, elementId, localQueryPoint)
    );
}

val MeasureExactDistanceBinding(
    int exactModelId,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const val& jsTransformA,
    const val& jsTransformB)
{
    return ExactDistanceResultToVal(
        MeasureExactDistance(
            exactModelId,
            exactShapeHandleA,
            kindA,
            elementIdA,
            exactShapeHandleB,
            kindB,
            elementIdB,
            MatrixToTrsf(ParseMatrix4(jsTransformA)),
            MatrixToTrsf(ParseMatrix4(jsTransformB))
        )
    );
}

val MeasureExactAngleBinding(
    int exactModelId,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const val& jsTransformA,
    const val& jsTransformB)
{
    return ExactAngleResultToVal(
        MeasureExactAngle(
            exactModelId,
            exactShapeHandleA,
            kindA,
            elementIdA,
            exactShapeHandleB,
            kindB,
            elementIdB,
            MatrixToTrsf(ParseMatrix4(jsTransformA)),
            MatrixToTrsf(ParseMatrix4(jsTransformB))
        )
    );
}

val MeasureExactThicknessBinding(
    int exactModelId,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const val& jsTransformA,
    const val& jsTransformB)
{
    return ExactThicknessResultToVal(
        MeasureExactThickness(
            exactModelId,
            exactShapeHandleA,
            kindA,
            elementIdA,
            exactShapeHandleB,
            kindB,
            elementIdB,
            MatrixToTrsf(ParseMatrix4(jsTransformA)),
            MatrixToTrsf(ParseMatrix4(jsTransformB))
        )
    );
}

val AnalyzeOptimalOrientation(const std::string& format, const val& content, const val& jsParams)
{
    std::vector<uint8_t> buffer = ExtractBytes(content);
    OrientationParams params = ParseOrientationParams(jsParams);
    return OrientationResultToVal(
        AnalyzeOptimalOrientationFromMemory(format, buffer.data(), buffer.size(), params)
    );
}

EMSCRIPTEN_BINDINGS(occtjs)
{
    function("ReadFile", &ReadFile);
    function("ReadStepFile", &ReadStepFile);
    function("ReadIgesFile", &ReadIgesFile);
    function("ReadBrepFile", &ReadBrepFile);
    function("OpenExactModel", &OpenExactModel);
    function("OpenExactStepModel", &OpenExactStepModel);
    function("OpenExactIgesModel", &OpenExactIgesModel);
    function("OpenExactBrepModel", &OpenExactBrepModel);
    function("RetainExactModel", &RetainExactModel);
    function("ReleaseExactModel", &ReleaseExactModel);
    function("GetExactGeometryType", &GetExactGeometryTypeBinding);
    function("MeasureExactRadius", &MeasureExactRadiusBinding);
    function("MeasureExactCenter", &MeasureExactCenterBinding);
    function("MeasureExactEdgeLength", &MeasureExactEdgeLengthBinding);
    function("MeasureExactFaceArea", &MeasureExactFaceAreaBinding);
    function("EvaluateExactFaceNormal", &EvaluateExactFaceNormalBinding);
    function("MeasureExactDistance", &MeasureExactDistanceBinding);
    function("MeasureExactAngle", &MeasureExactAngleBinding);
    function("MeasureExactThickness", &MeasureExactThicknessBinding);
    function("AnalyzeOptimalOrientation", &AnalyzeOptimalOrientation);
}
