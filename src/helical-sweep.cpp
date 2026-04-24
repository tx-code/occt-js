#include "helical-sweep.hpp"

#include "importer-utils.hpp"

#include <BRepAdaptor_Surface.hxx>
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <BRepBuilderAPI_MakeWire.hxx>
#include <BRepCheck_Analyzer.hxx>
#include <BRepOffsetAPI_ThruSections.hxx>
#include <BRep_Tool.hxx>
#include <GeomAbs_SurfaceType.hxx>
#include <Standard_Failure.hxx>
#include <TopAbs.hxx>
#include <TopAbs_ShapeEnum.hxx>
#include <TopExp.hxx>
#include <TopExp_Explorer.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopoDS.hxx>
#include <TopoDS_Face.hxx>
#include <TopoDS_Shape.hxx>
#include <TopoDS_Wire.hxx>
#include <gp_Ax2.hxx>
#include <gp_Circ.hxx>
#include <gp_Dir.hxx>
#include <gp_Pln.hxx>
#include <gp_Pnt.hxx>

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <map>
#include <string>
#include <unordered_map>
#include <vector>

using emscripten::val;

namespace {

constexpr double kPointTolerance = 1e-9;
constexpr double kPi = 3.14159265358979323846;

struct HelicalFaceDescriptor {
    int faceId = 0;
    bool isPlanar = false;
    double z = 0.0;
};

bool IsObject(const val& jsValue)
{
    return jsValue.typeOf().as<std::string>() == "object" && !jsValue.isNull();
}

bool IsNumber(const val& jsValue)
{
    return jsValue.typeOf().as<std::string>() == "number";
}

bool IsString(const val& jsValue)
{
    return jsValue.typeOf().as<std::string>() == "string";
}

bool TryGetOwnProperty(const val& jsObject, const char* key, val& out)
{
    if (!IsObject(jsObject) || !jsObject.hasOwnProperty(key)) {
        return false;
    }
    out = jsObject[key];
    return true;
}

OcctHelicalSweepDiagnostic MakeDiagnostic(
    const std::string& code,
    const std::string& message,
    const std::string& path = std::string())
{
    OcctHelicalSweepDiagnostic diagnostic;
    diagnostic.code = code;
    diagnostic.message = message;
    if (!path.empty()) {
        diagnostic.path = path;
        diagnostic.hasPath = true;
    }
    return diagnostic;
}

double SquaredDistance2D(const std::array<double, 2>& a, const std::array<double, 2>& b)
{
    const double dx = a[0] - b[0];
    const double dy = a[1] - b[1];
    return dx * dx + dy * dy;
}

bool TryParsePoint2(const val& jsValue, std::array<double, 2>& point)
{
    if (!IsObject(jsValue)) {
        return false;
    }

    if (!jsValue.hasOwnProperty("length")) {
        return false;
    }

    const val jsLength = jsValue["length"];
    if (!IsNumber(jsLength) || jsLength.as<int>() < 2) {
        return false;
    }

    const val jsX = jsValue[0];
    const val jsY = jsValue[1];
    if (!IsNumber(jsX) || !IsNumber(jsY)) {
        return false;
    }

    const double x = jsX.as<double>();
    const double y = jsY.as<double>();
    if (!std::isfinite(x) || !std::isfinite(y)) {
        return false;
    }

    point = { x, y };
    return true;
}

void AddDiagnostic(
    OcctHelicalSweepValidationResult& result,
    const std::string& code,
    const std::string& message,
    const std::string& path = std::string())
{
    result.diagnostics.push_back(MakeDiagnostic(code, message, path));
}

void AddDiagnostic(
    OcctHelicalSweepBuildResult& result,
    const std::string& code,
    const std::string& message,
    const std::string& path = std::string())
{
    result.diagnostics.push_back(MakeDiagnostic(code, message, path));
}

void ParseVersion(const val& jsSpec, OcctHelicalSweepValidationResult& result)
{
    val jsVersion = val::undefined();
    if (!TryGetOwnProperty(jsSpec, "version", jsVersion)) {
        return;
    }

    if (!IsNumber(jsVersion)) {
        AddDiagnostic(result, "invalid-type", "Spec.version must be the number 1.", "version");
        return;
    }

    const double version = jsVersion.as<double>();
    if (!std::isfinite(version) || std::floor(version) != version || static_cast<int>(version) != 1) {
        AddDiagnostic(result, "unsupported-version", "Only generated helical sweep spec version 1 is supported.", "version");
        return;
    }

    result.spec.version = static_cast<int>(version);
}

void ParseUnits(const val& jsSpec, OcctHelicalSweepValidationResult& result)
{
    val jsUnits = val::undefined();
    if (!TryGetOwnProperty(jsSpec, "units", jsUnits)) {
        AddDiagnostic(result, "missing-field", "Spec.units is required.", "units");
        return;
    }
    if (!IsString(jsUnits)) {
        AddDiagnostic(result, "invalid-type", "Spec.units must be a string.", "units");
        return;
    }

    result.spec.units = jsUnits.as<std::string>();
    if (result.spec.units != "mm" && result.spec.units != "inch") {
        AddDiagnostic(result, "unsupported-unit", "Supported units are mm and inch.", "units");
    }
}

void ParseHelix(const val& jsSpec, OcctHelicalSweepValidationResult& result)
{
    val jsHelix = val::undefined();
    if (!TryGetOwnProperty(jsSpec, "helix", jsHelix)) {
        AddDiagnostic(result, "missing-field", "Spec.helix is required.", "helix");
        return;
    }
    if (!IsObject(jsHelix)) {
        AddDiagnostic(result, "invalid-type", "Spec.helix must be an object.", "helix");
        return;
    }

    val jsRadius = val::undefined();
    if (!TryGetOwnProperty(jsHelix, "radius", jsRadius)) {
        AddDiagnostic(result, "missing-field", "Spec.helix.radius is required.", "helix.radius");
    } else if (!IsNumber(jsRadius)) {
        AddDiagnostic(result, "invalid-type", "Spec.helix.radius must be a number.", "helix.radius");
    } else {
        result.spec.helix.radius = jsRadius.as<double>();
        if (!std::isfinite(result.spec.helix.radius) || result.spec.helix.radius <= 0.0) {
            AddDiagnostic(result, "invalid-helix-radius", "Spec.helix.radius must be a finite positive number.", "helix.radius");
        }
    }

    val jsPitch = val::undefined();
    if (!TryGetOwnProperty(jsHelix, "pitch", jsPitch)) {
        AddDiagnostic(result, "missing-field", "Spec.helix.pitch is required.", "helix.pitch");
    } else if (!IsNumber(jsPitch)) {
        AddDiagnostic(result, "invalid-type", "Spec.helix.pitch must be a number.", "helix.pitch");
    } else {
        result.spec.helix.pitch = jsPitch.as<double>();
        if (!std::isfinite(result.spec.helix.pitch) || result.spec.helix.pitch <= 0.0) {
            AddDiagnostic(result, "invalid-helix-pitch", "Spec.helix.pitch must be a finite positive number.", "helix.pitch");
        }
    }

    val jsTurns = val::undefined();
    if (!TryGetOwnProperty(jsHelix, "turns", jsTurns)) {
        AddDiagnostic(result, "missing-field", "Spec.helix.turns is required.", "helix.turns");
    } else if (!IsNumber(jsTurns)) {
        AddDiagnostic(result, "invalid-type", "Spec.helix.turns must be a number.", "helix.turns");
    } else {
        result.spec.helix.turns = jsTurns.as<double>();
        if (!std::isfinite(result.spec.helix.turns) || result.spec.helix.turns <= 0.0) {
            AddDiagnostic(result, "invalid-helix-turns", "Spec.helix.turns must be a finite positive number.", "helix.turns");
        }
    }

    val jsHandedness = val::undefined();
    if (!TryGetOwnProperty(jsHelix, "handedness", jsHandedness)) {
        return;
    }
    if (!IsString(jsHandedness)) {
        AddDiagnostic(result, "invalid-type", "Spec.helix.handedness must be a string.", "helix.handedness");
        return;
    }
    result.spec.helix.handedness = jsHandedness.as<std::string>();
    if (result.spec.helix.handedness != "right" && result.spec.helix.handedness != "left") {
        AddDiagnostic(result, "invalid-handedness", "Supported handedness values are right and left.", "helix.handedness");
    }
}

void ParseSection(const val& jsSpec, OcctHelicalSweepValidationResult& result)
{
    val jsSection = val::undefined();
    if (!TryGetOwnProperty(jsSpec, "section", jsSection)) {
        AddDiagnostic(result, "missing-field", "Spec.section is required.", "section");
        return;
    }
    if (!IsObject(jsSection)) {
        AddDiagnostic(result, "invalid-type", "Spec.section must be an object.", "section");
        return;
    }

    val jsKind = val::undefined();
    if (!TryGetOwnProperty(jsSection, "kind", jsKind)) {
        AddDiagnostic(result, "missing-field", "Spec.section.kind is required.", "section.kind");
    } else if (!IsString(jsKind)) {
        AddDiagnostic(result, "invalid-type", "Spec.section.kind must be a string.", "section.kind");
    } else {
        result.spec.section.kind = jsKind.as<std::string>();
        if (result.spec.section.kind != "circle" && result.spec.section.kind != "polyline") {
            AddDiagnostic(result, "unsupported-section-kind", "Supported section.kind values are circle and polyline.", "section.kind");
        }
    }

    if (result.spec.section.kind == "polyline") {
        val jsPoints = val::undefined();
        if (!TryGetOwnProperty(jsSection, "points", jsPoints)) {
            AddDiagnostic(result, "missing-field", "Spec.section.points is required for section.kind=\"polyline\".", "section.points");
        } else if (!IsObject(jsPoints) || !jsPoints.hasOwnProperty("length")) {
            AddDiagnostic(result, "invalid-type", "Spec.section.points must be an array of [x, y] points.", "section.points");
        } else {
            const val jsLength = jsPoints["length"];
            if (!IsNumber(jsLength) || jsLength.as<int>() < 3) {
                AddDiagnostic(result, "invalid-section-points", "Spec.section.points must contain at least three points.", "section.points");
            } else {
                const int length = jsLength.as<int>();
                std::vector<std::array<double, 2>> points;
                points.reserve(static_cast<size_t>(length));
                for (int index = 0; index < length; ++index) {
                    std::array<double, 2> point = { 0.0, 0.0 };
                    if (!TryParsePoint2(jsPoints[index], point)) {
                        AddDiagnostic(
                            result,
                            "invalid-section-points",
                            "Each section.points entry must be a finite [x, y] tuple.",
                            "section.points[" + std::to_string(index) + "]");
                        continue;
                    }
                    points.push_back(point);
                }

                if (result.diagnostics.empty()) {
                    if (points.size() >= 2
                        && SquaredDistance2D(points.front(), points.back()) <= (kPointTolerance * kPointTolerance)) {
                        points.pop_back();
                    }

                    if (points.size() < 3) {
                        AddDiagnostic(result, "invalid-section-points", "Spec.section.points must contain at least three non-degenerate points.", "section.points");
                    } else {
                        bool hasDegenerateEdge = false;
                        for (size_t index = 0; index < points.size(); ++index) {
                            const size_t next = (index + 1) % points.size();
                            if (SquaredDistance2D(points[index], points[next]) <= (kPointTolerance * kPointTolerance)) {
                                hasDegenerateEdge = true;
                                break;
                            }
                        }
                        if (hasDegenerateEdge) {
                            AddDiagnostic(result, "invalid-section-points", "Spec.section.points cannot contain duplicate adjacent points.", "section.points");
                        } else {
                            double area2 = 0.0;
                            for (size_t index = 0; index < points.size(); ++index) {
                                const size_t next = (index + 1) % points.size();
                                area2 += points[index][0] * points[next][1] - points[next][0] * points[index][1];
                            }
                            if (std::abs(area2) <= kPointTolerance) {
                                AddDiagnostic(result, "invalid-section-points", "Spec.section.points must define a non-zero closed area.", "section.points");
                            } else {
                                result.spec.section.points = std::move(points);
                                result.spec.section.segments = static_cast<int>(result.spec.section.points.size());
                            }
                        }
                    }
                }
            }
        }
        return;
    }

    val jsRadius = val::undefined();
    if (!TryGetOwnProperty(jsSection, "radius", jsRadius)) {
        AddDiagnostic(result, "missing-field", "Spec.section.radius is required.", "section.radius");
    } else if (!IsNumber(jsRadius)) {
        AddDiagnostic(result, "invalid-type", "Spec.section.radius must be a number.", "section.radius");
    } else {
        result.spec.section.radius = jsRadius.as<double>();
        if (!std::isfinite(result.spec.section.radius) || result.spec.section.radius <= 0.0) {
            AddDiagnostic(result, "invalid-section-radius", "Spec.section.radius must be a finite positive number.", "section.radius");
        }
    }

    val jsSegments = val::undefined();
    if (!TryGetOwnProperty(jsSection, "segments", jsSegments)) {
        return;
    }

    if (!IsNumber(jsSegments)) {
        AddDiagnostic(result, "invalid-type", "Spec.section.segments must be a number.", "section.segments");
        return;
    }

    const double segments = jsSegments.as<double>();
    if (!std::isfinite(segments) || std::floor(segments) != segments) {
        AddDiagnostic(result, "invalid-section-segments", "Spec.section.segments must be an integer between 3 and 256.", "section.segments");
        return;
    }

    result.spec.section.segments = static_cast<int>(segments);
    if (result.spec.section.segments < 3 || result.spec.section.segments > 256) {
        AddDiagnostic(result, "invalid-section-segments", "Spec.section.segments must be an integer between 3 and 256.", "section.segments");
    }
}

OcctColor MakeSemanticColor(double r, double g, double b)
{
    OcctColor color;
    color.r = r;
    color.g = g;
    color.b = b;
    color.isValid = true;
    color.opacity = 1.0;
    color.hasOpacity = true;
    return color;
}

OcctColor NeutralSweepColor()
{
    return MakeSemanticColor(0.80, 0.80, 0.82);
}

OcctColor ResolveHelicalFaceColor(const std::string& role)
{
    if (role == "start_cap") {
        return MakeSemanticColor(0.26, 0.63, 0.88);
    }
    if (role == "end_cap") {
        return MakeSemanticColor(0.22, 0.77, 0.52);
    }
    return MakeSemanticColor(0.84, 0.66, 0.24);
}

ImportParams ParseBuildParams(const val& jsOptions, const OcctHelicalSweepSpec& spec)
{
    ImportParams params;
    params.linearUnit =
        spec.units == "inch"
            ? ImportParams::LinearUnit::Inch
            : ImportParams::LinearUnit::Millimeter;
    params.readNames = true;
    params.readColors = false;
    params.appearanceMode = ImportParams::AppearanceMode::DefaultColor;
    params.defaultColor = NeutralSweepColor();
    params.defaultOpacity = 1.0;
    params.hasDefaultOpacity = true;

    if (!IsObject(jsOptions)) {
        return params;
    }

    val jsLinearDeflectionType = val::undefined();
    if (TryGetOwnProperty(jsOptions, "linearDeflectionType", jsLinearDeflectionType) && IsString(jsLinearDeflectionType)) {
        const std::string linearDeflectionType = jsLinearDeflectionType.as<std::string>();
        if (linearDeflectionType == "absolute_value") {
            params.linearDeflectionType = ImportParams::LinearDeflectionType::AbsoluteValue;
        } else if (linearDeflectionType == "bounding_box_ratio") {
            params.linearDeflectionType = ImportParams::LinearDeflectionType::BoundingBoxRatio;
        }
    }

    val jsLinearDeflection = val::undefined();
    if (TryGetOwnProperty(jsOptions, "linearDeflection", jsLinearDeflection) && IsNumber(jsLinearDeflection)) {
        const double linearDeflection = jsLinearDeflection.as<double>();
        if (std::isfinite(linearDeflection) && linearDeflection > 0.0) {
            params.linearDeflection = linearDeflection;
        }
    }

    val jsAngularDeflection = val::undefined();
    if (TryGetOwnProperty(jsOptions, "angularDeflection", jsAngularDeflection) && IsNumber(jsAngularDeflection)) {
        const double angularDeflection = jsAngularDeflection.as<double>();
        if (std::isfinite(angularDeflection) && angularDeflection > 0.0) {
            params.angularDeflection = angularDeflection;
        }
    }

    return params;
}

std::string ShapeTypeToString(const TopAbs_ShapeEnum shapeType)
{
    switch (shapeType) {
        case TopAbs_COMPOUND:
            return "compound";
        case TopAbs_COMPSOLID:
            return "compsolid";
        case TopAbs_SOLID:
            return "solid";
        case TopAbs_SHELL:
            return "shell";
        case TopAbs_FACE:
            return "face";
        case TopAbs_WIRE:
            return "wire";
        case TopAbs_EDGE:
            return "edge";
        case TopAbs_VERTEX:
            return "vertex";
        case TopAbs_SHAPE:
            return "shape";
        default:
            return "unknown";
    }
}

OcctGeneratedShapeMeshValidation AnalyzeGeneratedShapeMesh(const OcctMeshData& mesh)
{
    constexpr double kMeshWeldTolerance = 1e-6;

    OcctGeneratedShapeMeshValidation validation;
    const size_t vertexCount = mesh.positions.size() / 3;
    std::vector<int> weldedVertexIds(vertexCount, -1);
    std::unordered_map<std::string, int> weldedIdsByKey;
    weldedIdsByKey.reserve(vertexCount);

    for (size_t vertexIndex = 0; vertexIndex < vertexCount; ++vertexIndex) {
        const size_t offset = vertexIndex * 3;
        const long long qx = std::llround(static_cast<double>(mesh.positions[offset]) / kMeshWeldTolerance);
        const long long qy = std::llround(static_cast<double>(mesh.positions[offset + 1]) / kMeshWeldTolerance);
        const long long qz = std::llround(static_cast<double>(mesh.positions[offset + 2]) / kMeshWeldTolerance);
        const std::string key = std::to_string(qx) + ":" + std::to_string(qy) + ":" + std::to_string(qz);

        auto [iterator, inserted] = weldedIdsByKey.emplace(key, static_cast<int>(weldedIdsByKey.size()));
        weldedVertexIds[vertexIndex] = iterator->second;
        if (inserted) {
            validation.weldedVertexCount += 1;
        }
    }

    std::unordered_map<std::string, int> edgeUseCounts;
    edgeUseCounts.reserve(mesh.indices.size());
    for (size_t indexOffset = 0; (indexOffset + 2) < mesh.indices.size(); indexOffset += 3) {
        const int triangle[3] = {
            weldedVertexIds[mesh.indices[indexOffset]],
            weldedVertexIds[mesh.indices[indexOffset + 1]],
            weldedVertexIds[mesh.indices[indexOffset + 2]]
        };

        if (triangle[0] == triangle[1]
            || triangle[1] == triangle[2]
            || triangle[2] == triangle[0]) {
            continue;
        }

        for (int edgeIndex = 0; edgeIndex < 3; ++edgeIndex) {
            const int left = triangle[edgeIndex];
            const int right = triangle[(edgeIndex + 1) % 3];
            const int minIndex = std::min(left, right);
            const int maxIndex = std::max(left, right);
            const std::string edgeKey = std::to_string(minIndex) + ":" + std::to_string(maxIndex);
            edgeUseCounts[edgeKey] += 1;
        }
    }

    for (const auto& [edgeKey, count] : edgeUseCounts) {
        (void)edgeKey;
        if (count == 1) {
            validation.boundaryEdgeCount += 1;
        } else if (count > 2) {
            validation.nonManifoldEdgeCount += 1;
        }
    }

    validation.isManifold = validation.nonManifoldEdgeCount == 0;
    validation.isWatertight = validation.boundaryEdgeCount == 0 && validation.isManifold;
    return validation;
}

OcctGeneratedShapeShapeValidation BuildGeneratedShapeValidation(
    const TopoDS_Shape& shape,
    const OcctMeshData& mesh)
{
    OcctGeneratedShapeShapeValidation validation;
    validation.exact.shapeType = ShapeTypeToString(shape.ShapeType());
    validation.exact.isValid = BRepCheck_Analyzer(shape).IsValid();

    TopTools_IndexedMapOfShape solidMap;
    TopTools_IndexedMapOfShape shellMap;
    TopTools_IndexedMapOfShape faceMap;
    TopTools_IndexedMapOfShape edgeMap;
    TopTools_IndexedMapOfShape vertexMap;
    TopExp::MapShapes(shape, TopAbs_SOLID, solidMap);
    TopExp::MapShapes(shape, TopAbs_SHELL, shellMap);
    TopExp::MapShapes(shape, TopAbs_FACE, faceMap);
    TopExp::MapShapes(shape, TopAbs_EDGE, edgeMap);
    TopExp::MapShapes(shape, TopAbs_VERTEX, vertexMap);

    validation.exact.solidCount = solidMap.Extent();
    validation.exact.shellCount = shellMap.Extent();
    validation.exact.faceCount = faceMap.Extent();
    validation.exact.edgeCount = edgeMap.Extent();
    validation.exact.vertexCount = vertexMap.Extent();
    validation.exact.isSolid = validation.exact.solidCount > 0;

    bool hasClosableTopology = false;
    bool allClosed = true;
    for (TopExp_Explorer explorer(shape, TopAbs_SOLID); explorer.More(); explorer.Next()) {
        hasClosableTopology = true;
        bool solidHasShell = false;
        for (TopExp_Explorer shellExplorer(explorer.Current(), TopAbs_SHELL); shellExplorer.More(); shellExplorer.Next()) {
            solidHasShell = true;
            if (!BRep_Tool::IsClosed(shellExplorer.Current())) {
                allClosed = false;
            }
        }
        if (!solidHasShell) {
            allClosed = false;
        }
    }
    for (TopExp_Explorer explorer(shape, TopAbs_SHELL, TopAbs_SOLID); explorer.More(); explorer.Next()) {
        hasClosableTopology = true;
        if (!BRep_Tool::IsClosed(explorer.Current())) {
            allClosed = false;
        }
    }
    validation.exact.isClosed = hasClosableTopology && allClosed;
    validation.mesh = AnalyzeGeneratedShapeMesh(mesh);
    return validation;
}

std::vector<OcctGeneratedShapeFaceBinding> BuildHelicalFaceBindings(const TopoDS_Shape& shape)
{
    TopTools_IndexedMapOfShape faceMap;
    TopExp::MapShapes(shape, TopAbs_FACE, faceMap);

    std::vector<HelicalFaceDescriptor> descriptors;
    descriptors.reserve(static_cast<size_t>(faceMap.Extent()));

    bool hasPlanar = false;
    double minZ = 0.0;
    double maxZ = 0.0;

    for (int faceIndex = 1; faceIndex <= faceMap.Extent(); ++faceIndex) {
        HelicalFaceDescriptor descriptor;
        descriptor.faceId = faceIndex;

        const TopoDS_Face face = TopoDS::Face(faceMap(faceIndex));
        BRepAdaptor_Surface surface(face, Standard_True);
        if (surface.GetType() == GeomAbs_Plane) {
            const gp_Pln plane = surface.Plane();
            descriptor.isPlanar = true;
            descriptor.z = plane.Location().Z();
            if (!hasPlanar) {
                minZ = descriptor.z;
                maxZ = descriptor.z;
                hasPlanar = true;
            } else {
                minZ = std::min(minZ, descriptor.z);
                maxZ = std::max(maxZ, descriptor.z);
            }
        }

        descriptors.push_back(descriptor);
    }

    int startCapFaceId = 0;
    int endCapFaceId = 0;
    if (hasPlanar) {
        for (const auto& descriptor : descriptors) {
            if (!descriptor.isPlanar) {
                continue;
            }
            if (std::abs(descriptor.z - minZ) <= 1e-6 && startCapFaceId == 0) {
                startCapFaceId = descriptor.faceId;
            }
            if (std::abs(descriptor.z - maxZ) <= 1e-6 && endCapFaceId == 0) {
                endCapFaceId = descriptor.faceId;
            }
        }
        if (startCapFaceId == 0 && !descriptors.empty()) {
            startCapFaceId = descriptors.front().faceId;
        }
        if (endCapFaceId == 0) {
            endCapFaceId = startCapFaceId;
        }
    }

    std::vector<OcctGeneratedShapeFaceBinding> bindings;
    bindings.reserve(descriptors.size());

    for (const auto& descriptor : descriptors) {
        OcctGeneratedShapeFaceBinding binding;
        binding.geometryIndex = 0;
        binding.faceId = descriptor.faceId;
        if (!descriptor.isPlanar) {
            binding.systemRole = "sweep";
        } else if (descriptor.faceId == startCapFaceId) {
            binding.systemRole = "start_cap";
        } else if (descriptor.faceId == endCapFaceId) {
            binding.systemRole = "end_cap";
        } else {
            const double startDistance = std::abs(descriptor.z - minZ);
            const double endDistance = std::abs(descriptor.z - maxZ);
            binding.systemRole = startDistance <= endDistance ? "start_cap" : "end_cap";
        }
        bindings.push_back(binding);
    }

    return bindings;
}

void ApplyHelicalFaceColors(
    OcctMeshData& mesh,
    const std::vector<OcctGeneratedShapeFaceBinding>& faceBindings)
{
    std::vector<bool> assigned(mesh.faces.size(), false);
    for (const auto& binding : faceBindings) {
        if (binding.faceId <= 0 || binding.faceId > static_cast<int>(mesh.faces.size())) {
            continue;
        }

        const size_t faceIndex = static_cast<size_t>(binding.faceId - 1);
        if (assigned[faceIndex]) {
            continue;
        }

        mesh.faces[faceIndex].color = ResolveHelicalFaceColor(binding.systemRole);
        assigned[faceIndex] = mesh.faces[faceIndex].color.isValid;
    }

    for (size_t faceIndex = 0; faceIndex < mesh.faces.size(); ++faceIndex) {
        if (!assigned[faceIndex]) {
            mesh.faces[faceIndex].color = NeutralSweepColor();
        }
    }
}

OcctGeneratedHelicalSweepMetadata BuildHelicalSweepMetadata(const OcctHelicalSweepSpec& spec)
{
    OcctGeneratedHelicalSweepMetadata metadata;
    metadata.version = spec.version;
    metadata.units = spec.units;
    metadata.helixRadius = spec.helix.radius;
    metadata.pitch = spec.helix.pitch;
    metadata.turns = spec.helix.turns;
    metadata.height = spec.helix.pitch * spec.helix.turns;
    metadata.handedness = spec.helix.handedness;
    metadata.sectionKind = spec.section.kind;
    metadata.sectionRadius = spec.section.radius;
    metadata.sectionSegments = spec.section.segments;
    metadata.sectionPointCount = static_cast<int>(spec.section.points.size());
    return metadata;
}

void PopulateGeneratedScene(
    const OcctMeshData& mesh,
    const OcctHelicalSweepSpec& spec,
    OcctSceneData& scene)
{
    scene.success = true;
    scene.sourceUnit = spec.units == "inch" ? "INCH" : "MM";
    scene.unitScaleToMeters = spec.units == "inch" ? 0.0254 : 0.001;

    scene.meshes.push_back(mesh);

    OcctNodeData rootNode;
    rootNode.id = "generated-helical-sweep-root";
    rootNode.name = "Generated Helical Sweep";
    rootNode.isAssembly = false;
    rootNode.transform = {
        1.0f, 0.0f, 0.0f, 0.0f,
        0.0f, 1.0f, 0.0f, 0.0f,
        0.0f, 0.0f, 1.0f, 0.0f,
        0.0f, 0.0f, 0.0f, 1.0f
    };
    rootNode.meshIndices.push_back(0);

    scene.nodes.push_back(rootNode);
    scene.rootNodeIndices.push_back(0);
}

void FinalizeBuildFailure(OcctHelicalSweepBuildResult& result, const std::string& error)
{
    result.success = false;
    result.error = error;
    result.scene.success = false;
    result.scene.error = error;
}

bool TryBuildSectionWireAtStation(
    const OcctHelicalSweepSpec& spec,
    double theta,
    double centerZ,
    TopoDS_Wire& sectionWire,
    std::string& error)
{
    const double radialX = std::cos(theta);
    const double radialY = std::sin(theta);
    const double centerX = spec.helix.radius * radialX;
    const double centerY = spec.helix.radius * radialY;

    if (spec.section.kind == "circle") {
        const gp_Dir tangential(-radialY, radialX, 0.0);
        const gp_Dir radial(radialX, radialY, 0.0);
        const gp_Ax2 circleAxis(gp_Pnt(centerX, centerY, centerZ), tangential, radial);
        const gp_Circ circle(circleAxis, spec.section.radius);

        BRepBuilderAPI_MakeEdge edgeBuilder(circle);
        if (!edgeBuilder.IsDone()) {
            error = "Failed to build a circular section edge for the helical sweep.";
            return false;
        }

        BRepBuilderAPI_MakeWire wireBuilder(edgeBuilder.Edge());
        if (!wireBuilder.IsDone()) {
            error = "Failed to build a circular section wire for the helical sweep.";
            return false;
        }

        sectionWire = wireBuilder.Wire();
        if (sectionWire.IsNull()) {
            error = "Generated a null circular section wire for the helical sweep.";
            return false;
        }
        return true;
    }

    if (spec.section.kind == "polyline") {
        if (spec.section.points.size() < 3) {
            error = "Polyline section must contain at least three points.";
            return false;
        }

        BRepBuilderAPI_MakeWire wireBuilder;
        for (size_t index = 0; index < spec.section.points.size(); ++index) {
            const size_t next = (index + 1) % spec.section.points.size();
            const std::array<double, 2>& p0 = spec.section.points[index];
            const std::array<double, 2>& p1 = spec.section.points[next];
            const gp_Pnt startPoint(
                centerX + radialX * p0[0],
                centerY + radialY * p0[0],
                centerZ + p0[1]);
            const gp_Pnt endPoint(
                centerX + radialX * p1[0],
                centerY + radialY * p1[0],
                centerZ + p1[1]);

            BRepBuilderAPI_MakeEdge edgeBuilder(startPoint, endPoint);
            if (!edgeBuilder.IsDone()) {
                error = "Failed to build a polyline section edge for the helical sweep.";
                return false;
            }
            wireBuilder.Add(edgeBuilder.Edge());
        }

        if (!wireBuilder.IsDone()) {
            error = "Failed to build a polyline section wire for the helical sweep.";
            return false;
        }

        sectionWire = wireBuilder.Wire();
        if (sectionWire.IsNull()) {
            error = "Generated a null polyline section wire for the helical sweep.";
            return false;
        }
        return true;
    }

    error = "Unsupported section kind for helical sweep build.";
    return false;
}

} // anonymous namespace

OcctHelicalSweepValidationResult ValidateHelicalSweepSpec(const val& jsSpec)
{
    OcctHelicalSweepValidationResult result;
    if (!IsObject(jsSpec)) {
        AddDiagnostic(result, "invalid-spec", "Helical sweep spec must be an object.");
        return result;
    }

    ParseVersion(jsSpec, result);
    ParseUnits(jsSpec, result);
    ParseHelix(jsSpec, result);
    ParseSection(jsSpec, result);

    result.ok = result.diagnostics.empty();
    result.hasSpec = result.ok;
    return result;
}

OcctHelicalSweepBuildResult BuildHelicalSweep(const val& jsSpec, const val& jsOptions)
{
    OcctHelicalSweepBuildResult result;
    const OcctHelicalSweepValidationResult validation = ValidateHelicalSweepSpec(jsSpec);
    if (!validation.ok) {
        result.diagnostics = validation.diagnostics;
        FinalizeBuildFailure(
            result,
            validation.diagnostics.empty()
                ? "Invalid helical sweep spec."
                : validation.diagnostics.front().message);
        return result;
    }

    const OcctHelicalSweepSpec& spec = validation.spec;
    result.helicalSweep = BuildHelicalSweepMetadata(spec);
    result.hasHelicalSweep = true;

    try {
        const int stationCount = std::max(
            16,
            static_cast<int>(std::ceil(spec.helix.turns * 24.0)) + 1);

        BRepOffsetAPI_ThruSections loft(Standard_True);
        loft.CheckCompatibility(Standard_False);

        for (int stationIndex = 0; stationIndex < stationCount; ++stationIndex) {
            const double station = stationCount > 1
                ? static_cast<double>(stationIndex) / static_cast<double>(stationCount - 1)
                : 0.0;
            const double turnAngle = station * spec.helix.turns * 2.0 * kPi;
            const double theta = spec.helix.handedness == "left" ? -turnAngle : turnAngle;
            const double centerZ = spec.helix.pitch * turnAngle / (2.0 * kPi);

            TopoDS_Wire sectionWire;
            std::string sectionError;
            if (!TryBuildSectionWireAtStation(spec, theta, centerZ, sectionWire, sectionError)) {
                AddDiagnostic(result, "build-failed", sectionError, "section");
                FinalizeBuildFailure(result, sectionError);
                return result;
            }

            loft.AddWire(sectionWire);
        }

        loft.Build();
        if (!loft.IsDone()) {
            AddDiagnostic(result, "build-failed", "OCCT failed to loft circular sections into a helical sweep.", "helix");
            FinalizeBuildFailure(result, "OCCT failed to loft circular sections into a helical sweep.");
            return result;
        }

        TopoDS_Shape helicalShape = loft.Shape();
        if (helicalShape.IsNull()) {
            AddDiagnostic(result, "build-failed", "OCCT produced a null generated helical sweep shape.", "helix");
            FinalizeBuildFailure(result, "OCCT produced a null generated helical sweep shape.");
            return result;
        }

        ImportParams buildParams = ParseBuildParams(jsOptions, spec);
        if (!TriangulateShape(helicalShape, buildParams)) {
            AddDiagnostic(result, "build-failed", "Failed to triangulate the generated helical sweep.", "mesh");
            FinalizeBuildFailure(result, "Failed to triangulate the generated helical sweep.");
            return result;
        }

        OcctMeshData mesh = ExtractMeshFromShape(helicalShape);
        if (mesh.indices.empty() || mesh.faces.empty()) {
            AddDiagnostic(result, "build-failed", "Generated helical sweep triangulation produced no renderable faces.", "mesh");
            FinalizeBuildFailure(result, "Generated helical sweep triangulation produced no renderable faces.");
            return result;
        }

        const std::vector<OcctGeneratedShapeFaceBinding> faceBindings = BuildHelicalFaceBindings(helicalShape);

        mesh.name = "Generated Helical Sweep";
        mesh.color = NeutralSweepColor();
        ApplyHelicalFaceColors(mesh, faceBindings);
        result.helicalSweep.shapeValidation = BuildGeneratedShapeValidation(helicalShape, mesh);
        result.helicalSweep.hasShapeValidation = true;
        result.helicalSweep.faceBindings = faceBindings;
        result.helicalSweep.hasStableFaceBindings = !faceBindings.empty();

        PopulateGeneratedScene(mesh, spec, result.scene);
        result.exactShape = helicalShape;
        result.exactGeometryShapes = { helicalShape };
        result.success = true;
        result.error.clear();
        return result;
    } catch (const Standard_Failure& failure) {
        const std::string message =
            failure.GetMessageString() != nullptr
                ? std::string(failure.GetMessageString())
                : std::string("OCCT threw an exception while building the generated helical sweep.");
        AddDiagnostic(result, "build-failed", message, "helix");
        FinalizeBuildFailure(result, message);
        return result;
    } catch (...) {
        AddDiagnostic(result, "build-failed", "Unknown exception while building the generated helical sweep.", "helix");
        FinalizeBuildFailure(result, "Unknown exception while building the generated helical sweep.");
        return result;
    }
}
