#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <map>
#include <array>
#include <string>
#include <vector>
#include <algorithm>
#include <cctype>
#include <cmath>

#include "importer-step.hpp"
#include "importer-iges.hpp"
#include "importer-brep.hpp"
#include "composite-shape.hpp"
#include "exact-model-store.hpp"
#include "exact-query.hpp"
#include "extruded-shape.hpp"
#include "geometry-transform.hpp"
#include "helical-sweep.hpp"
#include "orientation.hpp"
#include "profile-2d.hpp"
#include "revolved-tool.hpp"

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
    if (c.hasOpacity) {
        obj.set("opacity", c.opacity);
    }
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

std::string GeometryIdForIndex(size_t index)
{
    return "geo_" + std::to_string(index);
}

val MeshToVal(const OcctMeshData& mesh, size_t geometryIndex)
{
    val obj = val::object();
    obj.set("id", GeometryIdForIndex(geometryIndex));
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
    int ri, gi, bi, oi;
    bool hasOpacity;
    bool operator<(const MaterialKey& o) const {
        if (ri != o.ri) return ri < o.ri;
        if (gi != o.gi) return gi < o.gi;
        if (bi != o.bi) return bi < o.bi;
        if (hasOpacity != o.hasOpacity) return hasOpacity < o.hasOpacity;
        return oi < o.oi;
    }
};

MaterialKey ColorToKey(const OcctColor& c)
{
    return {
        static_cast<int>(c.r * 255.0 + 0.5),
        static_cast<int>(c.g * 255.0 + 0.5),
        static_cast<int>(c.b * 255.0 + 0.5),
        static_cast<int>(c.opacity * 255.0 + 0.5),
        c.hasOpacity
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

val BytesToUint8Array(const std::vector<uint8_t>& content)
{
    val bytes = val::global("Uint8Array").new_(content.size());
    if (!content.empty()) {
        val memView = val(typed_memory_view(content.size(), content.data()));
        bytes.call<void>("set", memView);
    }
    return bytes;
}

val GeometryTransformResultToVal(const OcctGeometryTransformResult& result)
{
    val obj = val::object();
    obj.set("success", result.success);
    obj.set("format", result.format);
    if (!result.success) {
        obj.set("error", result.error);
        return obj;
    }
    obj.set("content", BytesToUint8Array(result.content));
    return obj;
}

double ClampColorComponent(double value, double fallback)
{
    if (!std::isfinite(value)) {
        return fallback;
    }
    return std::clamp(value, 0.0, 1.0);
}

double ClampOpacity(double value, double fallback)
{
    if (!std::isfinite(value)) {
        return fallback;
    }
    return std::clamp(value, 0.0, 1.0);
}

bool TryParseDefaultColor(const val& jsValue, OcctColor& color)
{
    if (jsValue.typeOf().as<std::string>() != "object" || jsValue.isNull()) {
        return false;
    }
    if (!jsValue.hasOwnProperty("r") || !jsValue.hasOwnProperty("g") || !jsValue.hasOwnProperty("b")) {
        return false;
    }
    if (jsValue["r"].typeOf().as<std::string>() != "number"
        || jsValue["g"].typeOf().as<std::string>() != "number"
        || jsValue["b"].typeOf().as<std::string>() != "number") {
        return false;
    }

    color = OcctColor(
        ClampColorComponent(jsValue["r"].as<double>(), color.r),
        ClampColorComponent(jsValue["g"].as<double>(), color.g),
        ClampColorComponent(jsValue["b"].as<double>(), color.b)
    );
    return true;
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
        if (jsParams.hasOwnProperty("appearancePreset")) {
            std::string appearancePreset = jsParams["appearancePreset"].as<std::string>();
            if (appearancePreset == "cad-solid") {
                params.appearanceMode = ImportParams::AppearanceMode::DefaultColor;
                params.hasDefaultOpacity = false;
                params.defaultOpacity = 1.0;
            } else if (appearancePreset == "cad-ghosted") {
                params.appearanceMode = ImportParams::AppearanceMode::DefaultColor;
                params.defaultOpacity = ImportParams::kCadGhostedOpacity;
                params.hasDefaultOpacity = true;
            }
        }
        if (jsParams.hasOwnProperty("colorMode")) {
            std::string colorMode = jsParams["colorMode"].as<std::string>();
            if (colorMode == "source") {
                params.appearanceMode = ImportParams::AppearanceMode::SourceColors;
            } else if (colorMode == "default") {
                params.appearanceMode = ImportParams::AppearanceMode::DefaultColor;
            }
        }
        if (jsParams.hasOwnProperty("defaultColor")) {
            OcctColor defaultColor = params.defaultColor;
            if (TryParseDefaultColor(jsParams["defaultColor"], defaultColor)) {
                params.defaultColor = defaultColor;
            }
        }
        if (jsParams.hasOwnProperty("defaultOpacity")
            && jsParams["defaultOpacity"].typeOf().as<std::string>() == "number") {
            params.defaultOpacity = ClampOpacity(jsParams["defaultOpacity"].as<double>(), params.defaultOpacity);
            params.hasDefaultOpacity = true;
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

bool TryParseMatrix4(const val& jsValue, std::array<double, 16>& matrix, std::string& error)
{
    if (jsValue.typeOf().as<std::string>() != "object" || jsValue.isNull()) {
        error = "transform matrix must be an array-like object.";
        return false;
    }
    if (!jsValue.hasOwnProperty("length") || jsValue["length"].as<unsigned>() < 16) {
        error = "transform matrix must contain 16 numeric values.";
        return false;
    }
    for (int index = 0; index < 16; ++index) {
        if (jsValue[index].typeOf().as<std::string>() != "number") {
            error = "transform matrix must contain only numeric values.";
            return false;
        }
        matrix[index] = jsValue[index].as<double>();
        if (!std::isfinite(matrix[index])) {
            error = "transform matrix must contain only finite numeric values.";
            return false;
        }
    }
    return true;
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

bool TryParseOriginCoordinate(const std::string& value, OrientationBboxCoordinate& coordinate)
{
    if (value == "min" || value == "bottom") {
        coordinate = OrientationBboxCoordinate::Min;
        return true;
    }
    if (value == "center" || value == "middle") {
        coordinate = OrientationBboxCoordinate::Center;
        return true;
    }
    if (value == "max" || value == "top") {
        coordinate = OrientationBboxCoordinate::Max;
        return true;
    }
    return false;
}

void SetBboxOrigin(OrientationOriginInput& origin,
                   OrientationBboxCoordinate x,
                   OrientationBboxCoordinate y,
                   OrientationBboxCoordinate z)
{
    origin.isSet = true;
    origin.x = x;
    origin.y = y;
    origin.z = z;
}

OrientationOriginInput ParseOrientationOriginShortcut(const std::string& value)
{
    OrientationOriginInput origin;
    if (value == "preserve") {
        return origin;
    }
    if (value == "bbox-center-bottom") {
        SetBboxOrigin(
            origin,
            OrientationBboxCoordinate::Center,
            OrientationBboxCoordinate::Center,
            OrientationBboxCoordinate::Min
        );
        return origin;
    }
    if (value == "bbox-min-bottom" || value == "bbox-min") {
        SetBboxOrigin(
            origin,
            OrientationBboxCoordinate::Min,
            OrientationBboxCoordinate::Min,
            OrientationBboxCoordinate::Min
        );
        return origin;
    }
    if (value == "bbox-max-bottom") {
        SetBboxOrigin(
            origin,
            OrientationBboxCoordinate::Max,
            OrientationBboxCoordinate::Max,
            OrientationBboxCoordinate::Min
        );
        return origin;
    }
    if (value == "bbox-center") {
        SetBboxOrigin(
            origin,
            OrientationBboxCoordinate::Center,
            OrientationBboxCoordinate::Center,
            OrientationBboxCoordinate::Center
        );
        return origin;
    }
    if (value == "bbox-max") {
        SetBboxOrigin(
            origin,
            OrientationBboxCoordinate::Max,
            OrientationBboxCoordinate::Max,
            OrientationBboxCoordinate::Max
        );
        return origin;
    }

    origin.error = "Unsupported orientation origin: " + value;
    return origin;
}

bool ParseOrientationOriginAxis(const val& origin,
                                const char* field,
                                OrientationBboxCoordinate& coordinate,
                                std::string& error)
{
    if (!origin.hasOwnProperty(field)) {
        return true;
    }

    val axis = origin[field];
    if (axis.typeOf().as<std::string>() != "string") {
        error = std::string("Unsupported orientation origin coordinate for ") + field + ".";
        return false;
    }

    const std::string value = axis.as<std::string>();
    if (!TryParseOriginCoordinate(value, coordinate)) {
        error = std::string("Unsupported orientation origin coordinate for ") + field + ": " + value;
        return false;
    }
    return true;
}

OrientationOriginInput ParseOrientationOrigin(const val& value)
{
    const std::string type = value.typeOf().as<std::string>();
    if (type == "string") {
        return ParseOrientationOriginShortcut(value.as<std::string>());
    }

    OrientationOriginInput origin;
    if (type != "object" || value.isNull()) {
        origin.error = "Unsupported orientation origin: expected a string or bbox object.";
        return origin;
    }

    if (!value.hasOwnProperty("kind") || value["kind"].typeOf().as<std::string>() != "string") {
        origin.error = "Unsupported orientation origin: bbox object requires kind.";
        return origin;
    }
    const std::string kind = value["kind"].as<std::string>();
    if (kind != "bbox") {
        origin.error = "Unsupported orientation origin kind: " + kind;
        return origin;
    }

    origin.isSet = true;
    if (!ParseOrientationOriginAxis(value, "x", origin.x, origin.error)) {
        return origin;
    }
    if (!ParseOrientationOriginAxis(value, "y", origin.y, origin.error)) {
        return origin;
    }
    if (!ParseOrientationOriginAxis(value, "z", origin.z, origin.error)) {
        return origin;
    }
    return origin;
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

    if (jsParams.hasOwnProperty("origin")) {
        params.origin = ParseOrientationOrigin(jsParams["origin"]);
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

val ExactModelDiagnosticsToVal(const OcctExactModelDiagnostics& diagnostics)
{
    val obj = val::object();
    obj.set("liveExactModelCount", diagnostics.liveExactModelCount);
    obj.set("releasedHandleCount", diagnostics.releasedHandleCount);

    val liveExactModels = val::array();
    for (const auto& entry : diagnostics.liveExactModels) {
        val entryVal = val::object();
        entryVal.set("exactModelId", entry.exactModelId);
        entryVal.set("refCount", entry.refCount);
        entryVal.set("sourceFormat", entry.sourceFormat);
        entryVal.set("sourceUnit", entry.sourceUnit);
        entryVal.set("unitScaleToMeters", entry.unitScaleToMeters);
        entryVal.set("exactGeometryCount", entry.exactGeometryCount);
        liveExactModels.call<void>("push", entryVal);
    }
    obj.set("liveExactModels", liveExactModels);

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

val ExactPlacementAnchorToVal(const OcctExactPlacementAnchor& anchor)
{
    val obj = val::object();
    obj.set("role", anchor.role);
    obj.set("point", Vector3ToVal(anchor.point));
    return obj;
}

val ExactPlacementFrameToVal(const OcctExactPlacementFrame& frame)
{
    val obj = val::object();
    obj.set("origin", Vector3ToVal(frame.origin));
    obj.set("normal", Vector3ToVal(frame.normal));
    obj.set("xDir", Vector3ToVal(frame.xDir));
    obj.set("yDir", Vector3ToVal(frame.yDir));
    return obj;
}

val ExactPlacementResultToVal(const OcctExactPlacementResult& result)
{
    if (!result.ok) {
        return ExactFailureToVal(result);
    }

    val obj = val::object();
    obj.set("ok", true);
    obj.set("kind", result.kind);
    if (result.hasValue) {
        obj.set("value", result.value);
    }
    obj.set("frame", ExactPlacementFrameToVal(result.frame));

    val anchors = val::array();
    for (const auto& anchor : result.anchors) {
        anchors.call<void>("push", ExactPlacementAnchorToVal(anchor));
    }
    obj.set("anchors", anchors);

    if (result.hasDirectionA) {
        obj.set("directionA", Vector3ToVal(result.directionA));
    }
    if (result.hasDirectionB) {
        obj.set("directionB", Vector3ToVal(result.directionB));
    }
    if (result.hasAxisDirection) {
        obj.set("axisDirection", Vector3ToVal(result.axisDirection));
    }
    return obj;
}

val ExactRelationResultToVal(const OcctExactRelationResult& result)
{
    if (!result.ok) {
        return ExactFailureToVal(result);
    }

    val obj = val::object();
    obj.set("ok", true);
    obj.set("kind", result.kind);
    if (result.hasFrame) {
        obj.set("frame", ExactPlacementFrameToVal(result.frame));
    }
    if (!result.anchors.empty()) {
        val anchors = val::array();
        for (const auto& anchor : result.anchors) {
            anchors.call<void>("push", ExactPlacementAnchorToVal(anchor));
        }
        obj.set("anchors", anchors);
    }
    if (result.hasDirectionA) {
        obj.set("directionA", Vector3ToVal(result.directionA));
    }
    if (result.hasDirectionB) {
        obj.set("directionB", Vector3ToVal(result.directionB));
    }
    if (result.hasCenter) {
        obj.set("center", Vector3ToVal(result.center));
    }
    if (result.hasAxisDirection) {
        obj.set("axisDirection", Vector3ToVal(result.axisDirection));
    }
    if (result.hasTangentPoint) {
        obj.set("tangentPoint", Vector3ToVal(result.tangentPoint));
    }
    return obj;
}

val ExactHoleResultToVal(const OcctExactHoleResult& result)
{
    if (!result.ok) {
        return ExactFailureToVal(result);
    }

    val obj = val::object();
    obj.set("ok", true);
    obj.set("kind", result.kind);
    obj.set("profile", result.profile);
    obj.set("radius", result.radius);
    obj.set("diameter", result.diameter);
    if (result.hasFrame) {
        obj.set("frame", ExactPlacementFrameToVal(result.frame));
    }
    if (!result.anchors.empty()) {
        val anchors = val::array();
        for (const auto& anchor : result.anchors) {
            anchors.call<void>("push", ExactPlacementAnchorToVal(anchor));
        }
        obj.set("anchors", anchors);
    }
    if (result.hasAxisDirection) {
        obj.set("axisDirection", Vector3ToVal(result.axisDirection));
    }
    if (result.hasDepth) {
        obj.set("depth", result.depth);
    }
    if (result.hasIsThrough) {
        obj.set("isThrough", result.isThrough);
    }
    return obj;
}

val ExactChamferResultToVal(const OcctExactChamferResult& result)
{
    if (!result.ok) {
        return ExactFailureToVal(result);
    }

    val obj = val::object();
    obj.set("ok", true);
    obj.set("kind", result.kind);
    obj.set("profile", result.profile);
    obj.set("variant", result.variant);
    obj.set("distanceA", result.distanceA);
    obj.set("distanceB", result.distanceB);
    obj.set("supportAngle", result.supportAngle);
    if (result.hasFrame) {
        obj.set("frame", ExactPlacementFrameToVal(result.frame));
    }
    if (!result.anchors.empty()) {
        val anchors = val::array();
        for (const auto& anchor : result.anchors) {
            anchors.call<void>("push", ExactPlacementAnchorToVal(anchor));
        }
        obj.set("anchors", anchors);
    }
    if (result.hasEdgeDirection) {
        obj.set("edgeDirection", Vector3ToVal(result.edgeDirection));
    }
    if (result.hasSupportNormalA) {
        obj.set("supportNormalA", Vector3ToVal(result.supportNormalA));
    }
    if (result.hasSupportNormalB) {
        obj.set("supportNormalB", Vector3ToVal(result.supportNormalB));
    }
    return obj;
}

val ExactCompoundHoleResultToVal(const OcctExactCompoundHoleResult& result)
{
    if (!result.ok) {
        return ExactFailureToVal(result);
    }

    val obj = val::object();
    obj.set("ok", true);
    obj.set("kind", result.kind);
    obj.set("family", result.family);
    obj.set("holeDiameter", result.holeDiameter);
    if (result.hasHoleDepth) {
        obj.set("holeDepth", result.holeDepth);
    }
    if (result.hasIsThrough) {
        obj.set("isThrough", result.isThrough);
    }
    if (result.hasFrame) {
        obj.set("frame", ExactPlacementFrameToVal(result.frame));
    }
    if (!result.anchors.empty()) {
        val anchors = val::array();
        for (const auto& anchor : result.anchors) {
            anchors.call<void>("push", ExactPlacementAnchorToVal(anchor));
        }
        obj.set("anchors", anchors);
    }
    if (result.hasAxisDirection) {
        obj.set("axisDirection", Vector3ToVal(result.axisDirection));
    }
    if (result.hasCounterboreDiameter) {
        obj.set("counterboreDiameter", result.counterboreDiameter);
    }
    if (result.hasCounterboreDepth) {
        obj.set("counterboreDepth", result.counterboreDepth);
    }
    if (result.hasCountersinkDiameter) {
        obj.set("countersinkDiameter", result.countersinkDiameter);
    }
    if (result.hasCountersinkAngle) {
        obj.set("countersinkAngle", result.countersinkAngle);
    }
    return obj;
}

val Profile2DDiagnosticToVal(const OcctProfile2DDiagnostic& diagnostic)
{
    val obj = val::object();
    obj.set("code", diagnostic.code);
    obj.set("message", diagnostic.message);
    obj.set("severity", diagnostic.severity);
    if (diagnostic.hasPath) {
        obj.set("path", diagnostic.path);
    }
    if (diagnostic.hasSegmentIndex) {
        obj.set("segmentIndex", diagnostic.segmentIndex);
    }
    return obj;
}

val Profile2DValidationResultToVal(const OcctProfile2DValidationResult& result)
{
    val obj = val::object();
    obj.set("ok", result.ok);
    val diagnostics = val::array();
    for (const auto& diagnostic : result.diagnostics) {
        diagnostics.call<void>("push", Profile2DDiagnosticToVal(diagnostic));
    }
    obj.set("diagnostics", diagnostics);
    return obj;
}

val RevolvedToolDiagnosticToVal(const OcctRevolvedToolDiagnostic& diagnostic)
{
    return Profile2DDiagnosticToVal(diagnostic);
}

val RevolvedToolValidationResultToVal(const OcctRevolvedToolValidationResult& result)
{
    val obj = val::object();
    obj.set("ok", result.ok);
    val diagnostics = val::array();
    for (const auto& diagnostic : result.diagnostics) {
        diagnostics.call<void>("push", RevolvedToolDiagnosticToVal(diagnostic));
    }
    obj.set("diagnostics", diagnostics);
    return obj;
}

val ExtrudedShapeDiagnosticToVal(const OcctExtrudedShapeDiagnostic& diagnostic)
{
    return Profile2DDiagnosticToVal(diagnostic);
}

val ExtrudedShapeValidationResultToVal(const OcctExtrudedShapeValidationResult& result)
{
    val obj = val::object();
    obj.set("ok", result.ok);
    val diagnostics = val::array();
    for (const auto& diagnostic : result.diagnostics) {
        diagnostics.call<void>("push", ExtrudedShapeDiagnosticToVal(diagnostic));
    }
    obj.set("diagnostics", diagnostics);
    return obj;
}

val HelicalSweepDiagnosticToVal(const OcctHelicalSweepDiagnostic& diagnostic)
{
    return Profile2DDiagnosticToVal(diagnostic);
}

val HelicalSweepValidationResultToVal(const OcctHelicalSweepValidationResult& result)
{
    val obj = val::object();
    obj.set("ok", result.ok);
    val diagnostics = val::array();
    for (const auto& diagnostic : result.diagnostics) {
        diagnostics.call<void>("push", HelicalSweepDiagnosticToVal(diagnostic));
    }
    obj.set("diagnostics", diagnostics);
    return obj;
}

val CompositeShapeDiagnosticToVal(const OcctCompositeShapeDiagnostic& diagnostic)
{
    return Profile2DDiagnosticToVal(diagnostic);
}

val CompositeShapeValidationResultToVal(const OcctCompositeShapeValidationResult& result)
{
    val obj = val::object();
    obj.set("ok", result.ok);
    val diagnostics = val::array();
    for (const auto& diagnostic : result.diagnostics) {
        diagnostics.call<void>("push", CompositeShapeDiagnosticToVal(diagnostic));
    }
    obj.set("diagnostics", diagnostics);
    return obj;
}

val GeneratedToolSegmentDescriptorToVal(const OcctGeneratedToolSegmentDescriptor& descriptor)
{
    val obj = val::object();
    obj.set("index", descriptor.index);
    obj.set("kind", descriptor.kind);
    if (descriptor.hasId) {
        obj.set("id", descriptor.id);
    }
    if (descriptor.hasTag) {
        obj.set("tag", descriptor.tag);
    }
    return obj;
}

val GeneratedToolFaceBindingToVal(const OcctGeneratedToolFaceBinding& binding)
{
    val obj = val::object();
    obj.set("geometryIndex", binding.geometryIndex);
    obj.set("faceId", binding.faceId);
    obj.set("systemRole", binding.systemRole);
    if (binding.hasSegmentIndex) {
        obj.set("segmentIndex", binding.segmentIndex);
    }
    if (binding.hasSegmentId) {
        obj.set("segmentId", binding.segmentId);
    }
    if (binding.hasSegmentTag) {
        obj.set("segmentTag", binding.segmentTag);
    }
    return obj;
}

val GeneratedToolExactShapeValidationToVal(const OcctGeneratedToolExactShapeValidation& validation)
{
    val obj = val::object();
    obj.set("isValid", validation.isValid);
    obj.set("isClosed", validation.isClosed);
    obj.set("isSolid", validation.isSolid);
    obj.set("shapeType", validation.shapeType);
    obj.set("solidCount", validation.solidCount);
    obj.set("shellCount", validation.shellCount);
    obj.set("faceCount", validation.faceCount);
    obj.set("edgeCount", validation.edgeCount);
    obj.set("vertexCount", validation.vertexCount);
    return obj;
}

val GeneratedToolMeshValidationToVal(const OcctGeneratedToolMeshValidation& validation)
{
    val obj = val::object();
    obj.set("isWatertight", validation.isWatertight);
    obj.set("isManifold", validation.isManifold);
    obj.set("weldedVertexCount", validation.weldedVertexCount);
    obj.set("boundaryEdgeCount", validation.boundaryEdgeCount);
    obj.set("nonManifoldEdgeCount", validation.nonManifoldEdgeCount);
    return obj;
}

val GeneratedToolShapeValidationToVal(const OcctGeneratedToolShapeValidation& validation)
{
    val obj = val::object();
    obj.set("exact", GeneratedToolExactShapeValidationToVal(validation.exact));
    obj.set("mesh", GeneratedToolMeshValidationToVal(validation.mesh));
    return obj;
}

val RevolvedShapeMetadataToVal(const OcctGeneratedToolMetadata& metadata)
{
    val obj = val::object();
    obj.set("version", metadata.version);
    obj.set("units", metadata.units);
    obj.set("plane", metadata.plane);
    obj.set("closure", metadata.closure);
    obj.set("angleDeg", metadata.angleDeg);
    obj.set("segmentCount", metadata.segmentCount);
    obj.set("hasStableFaceBindings", metadata.hasStableFaceBindings);
    val segments = val::array();
    for (const auto& segment : metadata.segments) {
        segments.call<void>("push", GeneratedToolSegmentDescriptorToVal(segment));
    }
    obj.set("segments", segments);
    if (metadata.hasShapeValidation) {
        obj.set("shapeValidation", GeneratedToolShapeValidationToVal(metadata.shapeValidation));
    }
    if (!metadata.faceBindings.empty()) {
        val faceBindings = val::array();
        for (const auto& faceBinding : metadata.faceBindings) {
            faceBindings.call<void>("push", GeneratedToolFaceBindingToVal(faceBinding));
        }
        obj.set("faceBindings", faceBindings);
    }
    return obj;
}

val ExtrudedShapeMetadataToVal(const OcctGeneratedExtrudedShapeMetadata& metadata)
{
    val obj = val::object();
    obj.set("version", metadata.version);
    obj.set("units", metadata.units);
    obj.set("depth", metadata.depth);
    obj.set("segmentCount", metadata.segmentCount);
    obj.set("hasStableFaceBindings", metadata.hasStableFaceBindings);
    val segments = val::array();
    for (const auto& segment : metadata.segments) {
        segments.call<void>("push", GeneratedToolSegmentDescriptorToVal(segment));
    }
    obj.set("segments", segments);
    if (metadata.hasShapeValidation) {
        obj.set("shapeValidation", GeneratedToolShapeValidationToVal(metadata.shapeValidation));
    }
    if (!metadata.faceBindings.empty()) {
        val faceBindings = val::array();
        for (const auto& faceBinding : metadata.faceBindings) {
            faceBindings.call<void>("push", GeneratedToolFaceBindingToVal(faceBinding));
        }
        obj.set("faceBindings", faceBindings);
    }
    return obj;
}

val HelicalSweepMetadataToVal(const OcctGeneratedHelicalSweepMetadata& metadata)
{
    val obj = val::object();
    obj.set("version", metadata.version);
    obj.set("units", metadata.units);
    obj.set("helixRadius", metadata.helixRadius);
    obj.set("pitch", metadata.pitch);
    obj.set("turns", metadata.turns);
    obj.set("height", metadata.height);
    obj.set("handedness", metadata.handedness);
    obj.set("sectionKind", metadata.sectionKind);
    obj.set("sectionRadius", metadata.sectionRadius);
    obj.set("sectionSegments", metadata.sectionSegments);
    obj.set("sectionPointCount", metadata.sectionPointCount);
    obj.set("hasStableFaceBindings", metadata.hasStableFaceBindings);
    if (metadata.hasShapeValidation) {
        obj.set("shapeValidation", GeneratedToolShapeValidationToVal(metadata.shapeValidation));
    }
    if (!metadata.faceBindings.empty()) {
        val faceBindings = val::array();
        for (const auto& faceBinding : metadata.faceBindings) {
            faceBindings.call<void>("push", GeneratedToolFaceBindingToVal(faceBinding));
        }
        obj.set("faceBindings", faceBindings);
    }
    return obj;
}

val CompositeShapeMetadataToVal(const OcctGeneratedCompositeShapeMetadata& metadata)
{
    val obj = val::object();
    obj.set("version", metadata.version);
    obj.set("units", metadata.units);
    obj.set("seedFamily", metadata.seedFamily);
    obj.set("stepCount", metadata.stepCount);
    if (metadata.hasShapeValidation) {
        obj.set("shapeValidation", GeneratedToolShapeValidationToVal(metadata.shapeValidation));
    }

    if (!metadata.operations.empty()) {
        val operations = val::array();
        for (const auto& operation : metadata.operations) {
            val descriptor = val::object();
            descriptor.set("index", operation.index);
            descriptor.set("op", operation.op);
            descriptor.set("family", operation.family);
            descriptor.set("hasTransform", operation.hasTransform);
            operations.call<void>("push", descriptor);
        }
        obj.set("operations", operations);
    }

    return obj;
}

val ExactGeometryBindingsToVal(size_t geometryCount)
{
    val bindings = val::array();
    for (size_t index = 0; index < geometryCount; ++index) {
        val binding = val::object();
        binding.set("geometryId", GeometryIdForIndex(index));
        binding.set("exactShapeHandle", static_cast<int>(index + 1));
        bindings.call<void>("push", binding);
    }
    return bindings;
}

val ProductInspectionMessageToVal(const OcctProductInspectionMessage& message)
{
    val obj = val::object();
    obj.set("code", message.code);
    obj.set("message", message.message);
    if (message.hasSeverity) {
        obj.set("severity", message.severity);
    }
    if (message.hasNodeId) {
        obj.set("nodeId", message.nodeId);
    }
    return obj;
}

val StringVectorToVal(const std::vector<std::string>& values)
{
    val arr = val::array();
    for (const auto& value : values) {
        arr.call<void>("push", value);
    }
    return arr;
}

val StepSelectableOccurrenceToVal(const OcctStepSelectableOccurrence& occurrence)
{
    val obj = val::object();
    obj.set("kind", occurrence.kind);
    obj.set("occurrenceRef", occurrence.occurrenceRef);
    obj.set("partRef", occurrence.partRef);
    obj.set("nodeId", occurrence.nodeId);
    obj.set("name", occurrence.name);
    obj.set("displayPath", StringVectorToVal(occurrence.displayPath));
    obj.set("localTransform", TransformToVal(occurrence.localTransform));
    obj.set("occurrenceTransform", TransformToVal(occurrence.occurrenceTransform));
    if (!occurrence.sourceUnit.empty()) {
        obj.set("sourceUnit", occurrence.sourceUnit);
    }
    if (occurrence.unitScaleToMeters > 0.0) {
        obj.set("unitScaleToMeters", occurrence.unitScaleToMeters);
    }
    return obj;
}

val ProductInspectionNodeToTreeVal(const OcctProductInspectionResult& inspection, int nodeIndex)
{
    const OcctProductInspectionNode& node = inspection.nodes.at(static_cast<size_t>(nodeIndex));
    val obj = val::object();
    obj.set("id", node.id);
    obj.set("name", node.name);
    obj.set("kind", node.kind);
    obj.set("isAssembly", node.isAssembly);
    obj.set("isReference", node.isReference);
    obj.set("hasShape", node.hasShape);
    obj.set("selectable", node.selectable);
    obj.set("occurrenceRef", node.occurrenceRef);
    obj.set("partRef", node.partRef);
    obj.set("displayPath", StringVectorToVal(node.displayPath));

    val transform = val::array();
    for (float value : node.transform) {
        transform.call<void>("push", value);
    }
    obj.set("transform", transform);
    obj.set("occurrenceTransform", TransformToVal(node.occurrenceTransform));

    val children = val::array();
    for (int childIndex : node.childIndices) {
        children.call<void>("push", ProductInspectionNodeToTreeVal(inspection, childIndex));
    }
    obj.set("children", children);
    return obj;
}

val ProductInspectionResultToVal(const OcctProductInspectionResult& inspection)
{
    val result = val::object();
    result.set("sourceFormat", inspection.sourceFormat);

    if (!inspection.ok) {
        result.set("status", std::string("error"));
        val error = val::object();
        error.set("code", inspection.error.code);
        error.set("message", inspection.error.message);
        result.set("error", error);
        return result;
    }

    result.set("status", std::string("ok"));
    result.set("classification", inspection.classification);
    result.set("rootCount", inspection.rootCount);
    result.set("uniquePartCount", inspection.uniquePartCount);
    result.set("partOccurrenceCount", inspection.partOccurrenceCount);
    result.set("assemblyPresent", inspection.assemblyPresent);

    val selectableOccurrences = val::array();
    for (const auto& occurrence : inspection.selectableOccurrences) {
        selectableOccurrences.call<void>("push", StepSelectableOccurrenceToVal(occurrence));
    }
    result.set("selectableOccurrences", selectableOccurrences);

    val productTree = val::array();
    for (int rootIndex : inspection.rootNodeIndices) {
        productTree.call<void>("push", ProductInspectionNodeToTreeVal(inspection, rootIndex));
    }
    result.set("productTree", productTree);

    val reasons = val::array();
    for (const auto& reason : inspection.reasons) {
        reasons.call<void>("push", ProductInspectionMessageToVal(reason));
    }
    result.set("reasons", reasons);

    val warnings = val::array();
    for (const auto& warning : inspection.warnings) {
        warnings.call<void>("push", ProductInspectionMessageToVal(warning));
    }
    result.set("warnings", warnings);

    if (!inspection.sourceUnit.empty()) {
        result.set("sourceUnit", inspection.sourceUnit);
    }
    if (inspection.unitScaleToMeters > 0.0) {
        result.set("unitScaleToMeters", inspection.unitScaleToMeters);
    }

    return result;
}

struct StepPartSelectionInput {
    bool hasSelection = false;
    std::string kind;
    std::string occurrenceRef;
    std::string partRef;
    std::string rejectionCode;
    std::string rejectionMessage;
};

StepPartSelectionInput ParseStepPartSelectionInput(const val& jsParams)
{
    StepPartSelectionInput input;
    if (jsParams.typeOf().as<std::string>() != "object" || jsParams.isNull()) {
        return input;
    }
    if (!jsParams.hasOwnProperty("selection")) {
        return input;
    }

    const val selection = jsParams["selection"];
    if (selection.typeOf().as<std::string>() == "undefined" || selection.isNull()) {
        return input;
    }

    input.hasSelection = true;
    if (selection.typeOf().as<std::string>() != "object") {
        input.rejectionCode = "selection_not_supported";
        input.rejectionMessage = "STEP part selection must be an object.";
        return input;
    }
    if (!selection.hasOwnProperty("kind") || selection["kind"].typeOf().as<std::string>() != "string") {
        input.rejectionCode = "selection_not_supported";
        input.rejectionMessage = "STEP part selection requires a string kind.";
        return input;
    }

    input.kind = selection["kind"].as<std::string>();
    if (input.kind == "occurrence") {
        if (!selection.hasOwnProperty("occurrenceRef")
            || selection["occurrenceRef"].typeOf().as<std::string>() != "string")
        {
            input.rejectionCode = "selection_not_found";
            input.rejectionMessage = "STEP occurrence selection requires a non-empty occurrenceRef.";
            return input;
        }
        input.occurrenceRef = selection["occurrenceRef"].as<std::string>();
        if (input.occurrenceRef.empty()) {
            input.rejectionCode = "selection_not_found";
            input.rejectionMessage = "STEP occurrence selection requires a non-empty occurrenceRef.";
        }
        return input;
    }

    if (input.kind == "part") {
        if (selection.hasOwnProperty("partRef") && selection["partRef"].typeOf().as<std::string>() == "string") {
            input.partRef = selection["partRef"].as<std::string>();
        }
        input.rejectionCode = "selection_ambiguous";
        input.rejectionMessage = "STEP part-definition selection is ambiguous; select a concrete occurrenceRef.";
        return input;
    }

    input.rejectionCode = "selection_not_supported";
    input.rejectionMessage = "Unsupported STEP part selection kind: " + input.kind + ".";
    return input;
}

void AttachInspectionSummaryToRejection(val& rejection, const OcctProductInspectionResult& inspection)
{
    if (!inspection.ok) {
        rejection.set("inspectionErrorCode", inspection.error.code);
        return;
    }

    rejection.set("classification", inspection.classification);
    rejection.set("rootCount", inspection.rootCount);
    rejection.set("uniquePartCount", inspection.uniquePartCount);
    rejection.set("partOccurrenceCount", inspection.partOccurrenceCount);
    rejection.set("assemblyPresent", inspection.assemblyPresent);
}

val StepPartImportFailure(const std::string& code,
                          const std::string& message,
                          const OcctProductInspectionResult* inspection = nullptr)
{
    val result = val::object();
    result.set("success", false);
    result.set("sourceFormat", std::string("step"));
    result.set("error", message);

    val rejection = val::object();
    rejection.set("code", code);
    rejection.set("message", message);
    if (inspection != nullptr) {
        AttachInspectionSummaryToRejection(rejection, *inspection);
        result.set("inspection", ProductInspectionResultToVal(*inspection));
    }
    result.set("rejection", rejection);
    return result;
}

std::string StepPartRejectionCodeForClassification(const std::string& classification)
{
    if (classification == "assembly") {
        return "assembly_not_allowed";
    }
    if (classification == "multi_part") {
        return "multi_part_not_allowed";
    }
    return "ambiguous_product_structure";
}

std::string StepPartRejectionMessageForClassification(const OcctProductInspectionResult& inspection)
{
    if (inspection.classification == "assembly") {
        return "STEP file is an assembly and cannot be imported as a strict single part.";
    }
    if (inspection.classification == "multi_part") {
        return "STEP file contains multiple parts and cannot be imported as a strict single part.";
    }
    return "STEP product structure is ambiguous and cannot be imported as a strict single part.";
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
    for (size_t index = 0; index < scene.meshes.size(); ++index) {
        geometries.call<void>("push", MeshToVal(scene.meshes[index], index));
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
        if (c.hasOpacity) {
            matObj.set("opacity", c.opacity);
        }
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
    if (normalizedFormat == "stp") {
        normalizedFormat = "step";
    }

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

val InspectStepProduct(const val& content, const val& jsParams)
{
    std::vector<uint8_t> buffer = ExtractBytes(content);
    ImportParams params = ParseImportParams(jsParams);
    return ProductInspectionResultToVal(
        InspectStepProductFromMemory(buffer.data(), buffer.size(), "input.stp", params)
    );
}

val ReadStepPartFile(const val& content, const val& jsParams)
{
    std::vector<uint8_t> buffer = ExtractBytes(content);
    ImportParams params = ParseImportParams(jsParams);
    StepPartSelectionInput selection = ParseStepPartSelectionInput(jsParams);
    if (selection.hasSelection) {
        if (!selection.rejectionCode.empty()) {
            return StepPartImportFailure(selection.rejectionCode, selection.rejectionMessage);
        }

        OcctSelectedStepImportResult selected = ImportSelectedStepOccurrenceFromMemory(
            buffer.data(),
            buffer.size(),
            "input.stp",
            params,
            selection.occurrenceRef
        );

        if (!selected.success) {
            const std::string code = selected.rejectionCode.empty()
                ? "selection_import_failed"
                : selected.rejectionCode;
            const std::string message = selected.rejectionMessage.empty()
                ? "Selected STEP occurrence import failed."
                : selected.rejectionMessage;
            return StepPartImportFailure(code, message, &selected.inspection);
        }

        val result = BuildResult(selected.scene, "step");
        result.set("inspection", ProductInspectionResultToVal(selected.inspection));
        result.set("selectedOccurrence", StepSelectableOccurrenceToVal(selected.selectedOccurrence));
        return result;
    }

    OcctProductInspectionResult inspection = InspectStepProductFromMemory(
        buffer.data(),
        buffer.size(),
        "input.stp",
        params
    );

    if (!inspection.ok) {
        std::string message = "STEP product inspection failed: " + inspection.error.message;
        return StepPartImportFailure("inspection_failed", message, &inspection);
    }

    if (inspection.classification != "single_part") {
        return StepPartImportFailure(
            StepPartRejectionCodeForClassification(inspection.classification),
            StepPartRejectionMessageForClassification(inspection),
            &inspection
        );
    }

    OcctSceneData scene = ImportStepFromMemory(buffer.data(), buffer.size(), "input.stp", params);
    if (!scene.success) {
        std::string message = "Strict STEP part import failed: " + scene.error;
        return StepPartImportFailure("import_failed", message, &inspection);
    }

    val result = BuildResult(scene, "step");
    result.set("inspection", ProductInspectionResultToVal(inspection));
    return result;
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

val TransformByFormat(
    const std::string& format,
    const val& content,
    const val& jsTransform,
    const val& jsParams)
{
    std::vector<uint8_t> buffer = ExtractBytes(content);
    ImportParams params = ParseImportParams(jsParams);
    std::array<double, 16> matrix = IdentityMatrix4();
    std::string matrixError;
    std::string normalizedFormat = format;
    std::transform(normalizedFormat.begin(), normalizedFormat.end(), normalizedFormat.begin(), [](unsigned char c) {
        return static_cast<char>(std::tolower(c));
    });
    if (normalizedFormat == "stp") {
        normalizedFormat = "step";
    }

    if (!TryParseMatrix4(jsTransform, matrix, matrixError)) {
        OcctGeometryTransformResult result;
        result.success = false;
        result.format = normalizedFormat;
        result.error = matrixError;
        return GeometryTransformResultToVal(result);
    }

    if (normalizedFormat == "step") {
        return GeometryTransformResultToVal(
            TransformStepFromMemory(buffer.data(), buffer.size(), matrix, params));
    }
    if (normalizedFormat == "brep") {
        return GeometryTransformResultToVal(
            TransformBrepFromMemory(buffer.data(), buffer.size(), matrix, params));
    }

    OcctGeometryTransformResult result;
    result.success = false;
    result.format = normalizedFormat;
    result.error = "Unsupported transform export format: " + format;
    return GeometryTransformResultToVal(result);
}

val TransformStepFile(const val& content, const val& jsTransform, const val& jsParams)
{
    return TransformByFormat("step", content, jsTransform, jsParams);
}

val TransformBrepFile(const val& content, const val& jsTransform, const val& jsParams)
{
    return TransformByFormat("brep", content, jsTransform, jsParams);
}

val TransformFile(
    const std::string& format,
    const val& content,
    const val& jsTransform,
    const val& jsParams)
{
    return TransformByFormat(format, content, jsTransform, jsParams);
}

val ValidateProfile2DSpecBinding(const val& jsSpec)
{
    return Profile2DValidationResultToVal(ValidateProfile2DSpec(jsSpec));
}

val ValidateRevolvedShapeSpecBinding(const val& jsSpec)
{
    return RevolvedToolValidationResultToVal(ValidateRevolvedShapeSpec(jsSpec));
}

val ValidateExtrudedShapeSpecBinding(const val& jsSpec)
{
    return ExtrudedShapeValidationResultToVal(ValidateExtrudedShapeSpec(jsSpec));
}

val ValidateHelicalSweepSpecBinding(const val& jsSpec)
{
    return HelicalSweepValidationResultToVal(ValidateHelicalSweepSpec(jsSpec));
}

val ValidateCompositeShapeSpecBinding(const val& jsSpec)
{
    return CompositeShapeValidationResultToVal(ValidateCompositeShapeSpec(jsSpec));
}

val BuildRevolvedShapeBinding(const val& jsSpec, const val& jsOptions)
{
    const OcctRevolvedToolBuildResult buildResult = BuildRevolvedShape(jsSpec, jsOptions);
    val result = BuildResult(buildResult.scene, "generated-revolved-shape");
    if (!buildResult.diagnostics.empty()) {
        val diagnostics = val::array();
        for (const auto& diagnostic : buildResult.diagnostics) {
            diagnostics.call<void>("push", RevolvedToolDiagnosticToVal(diagnostic));
        }
        result.set("diagnostics", diagnostics);
    }
    if (buildResult.hasRevolvedShape) {
        result.set("revolvedShape", RevolvedShapeMetadataToVal(buildResult.revolvedShape));
    }
    return result;
}

val BuildExtrudedShapeBinding(const val& jsSpec, const val& jsOptions)
{
    const OcctExtrudedShapeBuildResult buildResult = BuildExtrudedShape(jsSpec, jsOptions);
    val result = BuildResult(buildResult.scene, "generated-extruded-shape");
    if (!buildResult.diagnostics.empty()) {
        val diagnostics = val::array();
        for (const auto& diagnostic : buildResult.diagnostics) {
            diagnostics.call<void>("push", ExtrudedShapeDiagnosticToVal(diagnostic));
        }
        result.set("diagnostics", diagnostics);
    }
    if (buildResult.hasExtrudedShape) {
        result.set("extrudedShape", ExtrudedShapeMetadataToVal(buildResult.extrudedShape));
    }
    return result;
}

val BuildHelicalSweepBinding(const val& jsSpec, const val& jsOptions)
{
    const OcctHelicalSweepBuildResult buildResult = BuildHelicalSweep(jsSpec, jsOptions);
    val result = BuildResult(buildResult.scene, "generated-helical-sweep");
    if (!buildResult.diagnostics.empty()) {
        val diagnostics = val::array();
        for (const auto& diagnostic : buildResult.diagnostics) {
            diagnostics.call<void>("push", HelicalSweepDiagnosticToVal(diagnostic));
        }
        result.set("diagnostics", diagnostics);
    }
    if (buildResult.hasHelicalSweep) {
        result.set("helicalSweep", HelicalSweepMetadataToVal(buildResult.helicalSweep));
    }
    return result;
}

val BuildCompositeShapeBinding(const val& jsSpec, const val& jsOptions)
{
    const OcctCompositeShapeBuildResult buildResult = BuildCompositeShape(jsSpec, jsOptions);
    val result = BuildResult(buildResult.scene, "generated-composite-shape");
    if (!buildResult.diagnostics.empty()) {
        val diagnostics = val::array();
        for (const auto& diagnostic : buildResult.diagnostics) {
            diagnostics.call<void>("push", CompositeShapeDiagnosticToVal(diagnostic));
        }
        result.set("diagnostics", diagnostics);
    }
    if (buildResult.hasCompositeShape) {
        result.set("compositeShape", CompositeShapeMetadataToVal(buildResult.compositeShape));
    }
    return result;
}

val OpenExactRevolvedShapeBinding(const val& jsSpec, const val& jsOptions)
{
    const OcctRevolvedToolBuildResult buildResult = BuildRevolvedShape(jsSpec, jsOptions);
    val result = BuildResult(buildResult.scene, "generated-revolved-shape");
    if (!buildResult.diagnostics.empty()) {
        val diagnostics = val::array();
        for (const auto& diagnostic : buildResult.diagnostics) {
            diagnostics.call<void>("push", RevolvedToolDiagnosticToVal(diagnostic));
        }
        result.set("diagnostics", diagnostics);
    }
    if (buildResult.hasRevolvedShape) {
        result.set("revolvedShape", RevolvedShapeMetadataToVal(buildResult.revolvedShape));
    }
    if (!buildResult.success) {
        return result;
    }

    const int exactModelId = ExactModelStore::Instance().Register(
        buildResult.exactShape,
        buildResult.exactGeometryShapes,
        "generated-revolved-shape",
        buildResult.scene.sourceUnit,
        buildResult.scene.unitScaleToMeters
    );

    if (exactModelId <= 0) {
        OcctSceneData scene;
        scene.success = false;
        scene.error = "Failed to register retained exact generated revolved shape state.";
        result = BuildResult(scene, "generated-revolved-shape");
        if (!buildResult.diagnostics.empty()) {
            val diagnostics = val::array();
            for (const auto& diagnostic : buildResult.diagnostics) {
                diagnostics.call<void>("push", RevolvedToolDiagnosticToVal(diagnostic));
            }
            result.set("diagnostics", diagnostics);
        }
        if (buildResult.hasRevolvedShape) {
            result.set("revolvedShape", RevolvedShapeMetadataToVal(buildResult.revolvedShape));
        }
        return result;
    }

    result.set("exactModelId", exactModelId);
    result.set("exactGeometryBindings", ExactGeometryBindingsToVal(buildResult.exactGeometryShapes.size()));
    return result;
}

val OpenExactExtrudedShapeBinding(const val& jsSpec, const val& jsOptions)
{
    const OcctExtrudedShapeBuildResult buildResult = BuildExtrudedShape(jsSpec, jsOptions);
    val result = BuildResult(buildResult.scene, "generated-extruded-shape");
    if (!buildResult.diagnostics.empty()) {
        val diagnostics = val::array();
        for (const auto& diagnostic : buildResult.diagnostics) {
            diagnostics.call<void>("push", ExtrudedShapeDiagnosticToVal(diagnostic));
        }
        result.set("diagnostics", diagnostics);
    }
    if (buildResult.hasExtrudedShape) {
        result.set("extrudedShape", ExtrudedShapeMetadataToVal(buildResult.extrudedShape));
    }
    if (!buildResult.success) {
        return result;
    }

    const int exactModelId = ExactModelStore::Instance().Register(
        buildResult.exactShape,
        buildResult.exactGeometryShapes,
        "generated-extruded-shape",
        buildResult.scene.sourceUnit,
        buildResult.scene.unitScaleToMeters
    );

    if (exactModelId <= 0) {
        OcctSceneData scene;
        scene.success = false;
        scene.error = "Failed to register retained exact generated extruded shape state.";
        result = BuildResult(scene, "generated-extruded-shape");
        if (!buildResult.diagnostics.empty()) {
            val diagnostics = val::array();
            for (const auto& diagnostic : buildResult.diagnostics) {
                diagnostics.call<void>("push", ExtrudedShapeDiagnosticToVal(diagnostic));
            }
            result.set("diagnostics", diagnostics);
        }
        if (buildResult.hasExtrudedShape) {
            result.set("extrudedShape", ExtrudedShapeMetadataToVal(buildResult.extrudedShape));
        }
        return result;
    }

    result.set("exactModelId", exactModelId);
    result.set("exactGeometryBindings", ExactGeometryBindingsToVal(buildResult.exactGeometryShapes.size()));
    return result;
}

val OpenExactHelicalSweepBinding(const val& jsSpec, const val& jsOptions)
{
    const OcctHelicalSweepBuildResult buildResult = BuildHelicalSweep(jsSpec, jsOptions);
    val result = BuildResult(buildResult.scene, "generated-helical-sweep");
    if (!buildResult.diagnostics.empty()) {
        val diagnostics = val::array();
        for (const auto& diagnostic : buildResult.diagnostics) {
            diagnostics.call<void>("push", HelicalSweepDiagnosticToVal(diagnostic));
        }
        result.set("diagnostics", diagnostics);
    }
    if (buildResult.hasHelicalSweep) {
        result.set("helicalSweep", HelicalSweepMetadataToVal(buildResult.helicalSweep));
    }
    if (!buildResult.success) {
        return result;
    }

    const int exactModelId = ExactModelStore::Instance().Register(
        buildResult.exactShape,
        buildResult.exactGeometryShapes,
        "generated-helical-sweep",
        buildResult.scene.sourceUnit,
        buildResult.scene.unitScaleToMeters
    );

    if (exactModelId <= 0) {
        OcctSceneData scene;
        scene.success = false;
        scene.error = "Failed to register retained exact generated helical sweep state.";
        result = BuildResult(scene, "generated-helical-sweep");
        if (!buildResult.diagnostics.empty()) {
            val diagnostics = val::array();
            for (const auto& diagnostic : buildResult.diagnostics) {
                diagnostics.call<void>("push", HelicalSweepDiagnosticToVal(diagnostic));
            }
            result.set("diagnostics", diagnostics);
        }
        if (buildResult.hasHelicalSweep) {
            result.set("helicalSweep", HelicalSweepMetadataToVal(buildResult.helicalSweep));
        }
        return result;
    }

    result.set("exactModelId", exactModelId);
    result.set("exactGeometryBindings", ExactGeometryBindingsToVal(buildResult.exactGeometryShapes.size()));
    return result;
}

val OpenExactCompositeShapeBinding(const val& jsSpec, const val& jsOptions)
{
    const OcctCompositeShapeBuildResult buildResult = BuildCompositeShape(jsSpec, jsOptions);
    val result = BuildResult(buildResult.scene, "generated-composite-shape");
    if (!buildResult.diagnostics.empty()) {
        val diagnostics = val::array();
        for (const auto& diagnostic : buildResult.diagnostics) {
            diagnostics.call<void>("push", CompositeShapeDiagnosticToVal(diagnostic));
        }
        result.set("diagnostics", diagnostics);
    }
    if (buildResult.hasCompositeShape) {
        result.set("compositeShape", CompositeShapeMetadataToVal(buildResult.compositeShape));
    }
    if (!buildResult.success) {
        return result;
    }

    const int exactModelId = ExactModelStore::Instance().Register(
        buildResult.exactShape,
        buildResult.exactGeometryShapes,
        "generated-composite-shape",
        buildResult.scene.sourceUnit,
        buildResult.scene.unitScaleToMeters
    );

    if (exactModelId <= 0) {
        OcctSceneData scene;
        scene.success = false;
        scene.error = "Failed to register retained exact generated composite shape state.";
        result = BuildResult(scene, "generated-composite-shape");
        if (!buildResult.diagnostics.empty()) {
            val diagnostics = val::array();
            for (const auto& diagnostic : buildResult.diagnostics) {
                diagnostics.call<void>("push", CompositeShapeDiagnosticToVal(diagnostic));
            }
            result.set("diagnostics", diagnostics);
        }
        if (buildResult.hasCompositeShape) {
            result.set("compositeShape", CompositeShapeMetadataToVal(buildResult.compositeShape));
        }
        return result;
    }

    result.set("exactModelId", exactModelId);
    result.set("exactGeometryBindings", ExactGeometryBindingsToVal(buildResult.exactGeometryShapes.size()));
    return result;
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

val GetExactModelDiagnostics()
{
    return ExactModelDiagnosticsToVal(ExactModelStore::Instance().GetDiagnostics());
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

val MeasureExactDistanceCrossModelBinding(
    int exactModelIdA,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    const val& jsTransformA,
    int exactModelIdB,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const val& jsTransformB)
{
    return ExactDistanceResultToVal(
        MeasureExactDistanceCrossModel(
            exactModelIdA,
            exactShapeHandleA,
            kindA,
            elementIdA,
            MatrixToTrsf(ParseMatrix4(jsTransformA)),
            exactModelIdB,
            exactShapeHandleB,
            kindB,
            elementIdB,
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

val MeasureExactAngleCrossModelBinding(
    int exactModelIdA,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    const val& jsTransformA,
    int exactModelIdB,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const val& jsTransformB)
{
    return ExactAngleResultToVal(
        MeasureExactAngleCrossModel(
            exactModelIdA,
            exactShapeHandleA,
            kindA,
            elementIdA,
            MatrixToTrsf(ParseMatrix4(jsTransformA)),
            exactModelIdB,
            exactShapeHandleB,
            kindB,
            elementIdB,
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

val MeasureExactThicknessCrossModelBinding(
    int exactModelIdA,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    const val& jsTransformA,
    int exactModelIdB,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const val& jsTransformB)
{
    return ExactThicknessResultToVal(
        MeasureExactThicknessCrossModel(
            exactModelIdA,
            exactShapeHandleA,
            kindA,
            elementIdA,
            MatrixToTrsf(ParseMatrix4(jsTransformA)),
            exactModelIdB,
            exactShapeHandleB,
            kindB,
            elementIdB,
            MatrixToTrsf(ParseMatrix4(jsTransformB))
        )
    );
}

val ClassifyExactRelationBinding(
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
    return ExactRelationResultToVal(
        ClassifyExactRelation(
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

val ClassifyExactRelationCrossModelBinding(
    int exactModelIdA,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    const val& jsTransformA,
    int exactModelIdB,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const val& jsTransformB)
{
    return ExactRelationResultToVal(
        ClassifyExactRelationCrossModel(
            exactModelIdA,
            exactShapeHandleA,
            kindA,
            elementIdA,
            MatrixToTrsf(ParseMatrix4(jsTransformA)),
            exactModelIdB,
            exactShapeHandleB,
            kindB,
            elementIdB,
            MatrixToTrsf(ParseMatrix4(jsTransformB))
        )
    );
}

val SuggestExactDistancePlacementBinding(
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
    return ExactPlacementResultToVal(
        SuggestExactDistancePlacement(
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

val SuggestExactDistancePlacementCrossModelBinding(
    int exactModelIdA,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    const val& jsTransformA,
    int exactModelIdB,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const val& jsTransformB)
{
    return ExactPlacementResultToVal(
        SuggestExactDistancePlacementCrossModel(
            exactModelIdA,
            exactShapeHandleA,
            kindA,
            elementIdA,
            MatrixToTrsf(ParseMatrix4(jsTransformA)),
            exactModelIdB,
            exactShapeHandleB,
            kindB,
            elementIdB,
            MatrixToTrsf(ParseMatrix4(jsTransformB))
        )
    );
}

val SuggestExactAnglePlacementBinding(
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
    return ExactPlacementResultToVal(
        SuggestExactAnglePlacement(
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

val SuggestExactAnglePlacementCrossModelBinding(
    int exactModelIdA,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    const val& jsTransformA,
    int exactModelIdB,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const val& jsTransformB)
{
    return ExactPlacementResultToVal(
        SuggestExactAnglePlacementCrossModel(
            exactModelIdA,
            exactShapeHandleA,
            kindA,
            elementIdA,
            MatrixToTrsf(ParseMatrix4(jsTransformA)),
            exactModelIdB,
            exactShapeHandleB,
            kindB,
            elementIdB,
            MatrixToTrsf(ParseMatrix4(jsTransformB))
        )
    );
}

val SuggestExactThicknessPlacementBinding(
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
    return ExactPlacementResultToVal(
        SuggestExactThicknessPlacement(
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

val SuggestExactThicknessPlacementCrossModelBinding(
    int exactModelIdA,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    const val& jsTransformA,
    int exactModelIdB,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const val& jsTransformB)
{
    return ExactPlacementResultToVal(
        SuggestExactThicknessPlacementCrossModel(
            exactModelIdA,
            exactShapeHandleA,
            kindA,
            elementIdA,
            MatrixToTrsf(ParseMatrix4(jsTransformA)),
            exactModelIdB,
            exactShapeHandleB,
            kindB,
            elementIdB,
            MatrixToTrsf(ParseMatrix4(jsTransformB))
        )
    );
}

val SuggestExactRadiusPlacementBinding(int exactModelId, int exactShapeHandle, const std::string& kind, int elementId)
{
    return ExactPlacementResultToVal(
        SuggestExactRadiusPlacement(exactModelId, exactShapeHandle, kind, elementId)
    );
}

val SuggestExactDiameterPlacementBinding(int exactModelId, int exactShapeHandle, const std::string& kind, int elementId)
{
    return ExactPlacementResultToVal(
        SuggestExactDiameterPlacement(exactModelId, exactShapeHandle, kind, elementId)
    );
}

val DescribeExactHoleBinding(int exactModelId, int exactShapeHandle, const std::string& kind, int elementId)
{
    return ExactHoleResultToVal(
        DescribeExactHole(exactModelId, exactShapeHandle, kind, elementId)
    );
}

val DescribeExactChamferBinding(int exactModelId, int exactShapeHandle, const std::string& kind, int elementId)
{
    return ExactChamferResultToVal(
        DescribeExactChamfer(exactModelId, exactShapeHandle, kind, elementId)
    );
}

val DescribeExactCompoundHoleBinding(int exactModelId, int exactShapeHandle, const std::string& kind, int elementId)
{
    return ExactCompoundHoleResultToVal(
        DescribeExactCompoundHole(exactModelId, exactShapeHandle, kind, elementId)
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
    function("InspectStepProduct", &InspectStepProduct);
    function("ReadStepPartFile", &ReadStepPartFile);
    function("ReadIgesFile", &ReadIgesFile);
    function("ReadBrepFile", &ReadBrepFile);
    function("TransformFile", &TransformFile);
    function("TransformStepFile", &TransformStepFile);
    function("TransformBrepFile", &TransformBrepFile);
    function("ValidateProfile2DSpec", &ValidateProfile2DSpecBinding);
    function("ValidateRevolvedShapeSpec", &ValidateRevolvedShapeSpecBinding);
    function("ValidateExtrudedShapeSpec", &ValidateExtrudedShapeSpecBinding);
    function("ValidateHelicalSweepSpec", &ValidateHelicalSweepSpecBinding);
    function("ValidateCompositeShapeSpec", &ValidateCompositeShapeSpecBinding);
    function("BuildRevolvedShape", &BuildRevolvedShapeBinding);
    function("BuildExtrudedShape", &BuildExtrudedShapeBinding);
    function("BuildHelicalSweep", &BuildHelicalSweepBinding);
    function("BuildCompositeShape", &BuildCompositeShapeBinding);
    function("OpenExactRevolvedShape", &OpenExactRevolvedShapeBinding);
    function("OpenExactExtrudedShape", &OpenExactExtrudedShapeBinding);
    function("OpenExactHelicalSweep", &OpenExactHelicalSweepBinding);
    function("OpenExactCompositeShape", &OpenExactCompositeShapeBinding);
    function("OpenExactModel", &OpenExactModel);
    function("OpenExactStepModel", &OpenExactStepModel);
    function("OpenExactIgesModel", &OpenExactIgesModel);
    function("OpenExactBrepModel", &OpenExactBrepModel);
    function("RetainExactModel", &RetainExactModel);
    function("ReleaseExactModel", &ReleaseExactModel);
    function("GetExactModelDiagnostics", &GetExactModelDiagnostics);
    function("GetExactGeometryType", &GetExactGeometryTypeBinding);
    function("MeasureExactRadius", &MeasureExactRadiusBinding);
    function("MeasureExactCenter", &MeasureExactCenterBinding);
    function("MeasureExactEdgeLength", &MeasureExactEdgeLengthBinding);
    function("MeasureExactFaceArea", &MeasureExactFaceAreaBinding);
    function("EvaluateExactFaceNormal", &EvaluateExactFaceNormalBinding);
    function("MeasureExactDistance", &MeasureExactDistanceBinding);
    function("MeasureExactDistanceCrossModel", &MeasureExactDistanceCrossModelBinding);
    function("MeasureExactAngle", &MeasureExactAngleBinding);
    function("MeasureExactAngleCrossModel", &MeasureExactAngleCrossModelBinding);
    function("MeasureExactThickness", &MeasureExactThicknessBinding);
    function("MeasureExactThicknessCrossModel", &MeasureExactThicknessCrossModelBinding);
    function("ClassifyExactRelation", &ClassifyExactRelationBinding);
    function("ClassifyExactRelationCrossModel", &ClassifyExactRelationCrossModelBinding);
    function("SuggestExactDistancePlacement", &SuggestExactDistancePlacementBinding);
    function("SuggestExactDistancePlacementCrossModel", &SuggestExactDistancePlacementCrossModelBinding);
    function("SuggestExactAnglePlacement", &SuggestExactAnglePlacementBinding);
    function("SuggestExactAnglePlacementCrossModel", &SuggestExactAnglePlacementCrossModelBinding);
    function("SuggestExactThicknessPlacement", &SuggestExactThicknessPlacementBinding);
    function("SuggestExactThicknessPlacementCrossModel", &SuggestExactThicknessPlacementCrossModelBinding);
    function("SuggestExactRadiusPlacement", &SuggestExactRadiusPlacementBinding);
    function("SuggestExactDiameterPlacement", &SuggestExactDiameterPlacementBinding);
    function("DescribeExactHole", &DescribeExactHoleBinding);
    function("DescribeExactChamfer", &DescribeExactChamferBinding);
    function("DescribeExactCompoundHole", &DescribeExactCompoundHoleBinding);
    function("AnalyzeOptimalOrientation", &AnalyzeOptimalOrientation);
}
