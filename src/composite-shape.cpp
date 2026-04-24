#include "composite-shape.hpp"

#include "extruded-shape.hpp"
#include "helical-sweep.hpp"
#include "importer-utils.hpp"
#include "revolved-tool.hpp"

#include <BRepAlgoAPI_Cut.hxx>
#include <BRepAlgoAPI_Fuse.hxx>
#include <BRepBuilderAPI_Transform.hxx>
#include <BRepCheck_Analyzer.hxx>
#include <BRep_Tool.hxx>
#include <Standard_Failure.hxx>
#include <TopAbs.hxx>
#include <TopAbs_ShapeEnum.hxx>
#include <TopExp.hxx>
#include <TopExp_Explorer.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopoDS_Shape.hxx>
#include <gp_Trsf.hxx>

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <exception>
#include <map>
#include <string>
#include <unordered_map>
#include <vector>

using emscripten::val;

namespace {

constexpr unsigned kTransformMatrixLength = 16;

struct ParsedCompositeOperand {
    std::string family;
    val spec = val::undefined();
    std::array<double, 16> transform = {
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0
    };
    bool hasTransform = false;
};

struct ParsedCompositeStep {
    std::string op;
    ParsedCompositeOperand operand;
};

struct ParsedCompositeSpec {
    int version = 1;
    std::string units = "mm";
    ParsedCompositeOperand seed;
    std::vector<ParsedCompositeStep> steps;
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

bool IsSupportedUnits(const std::string& units)
{
    return units == "mm" || units == "inch";
}

bool IsSupportedOperandFamily(const std::string& family)
{
    return family == "revolved" || family == "extruded" || family == "helical-sweep";
}

bool IsSupportedStepOp(const std::string& op)
{
    return op == "fuse" || op == "cut";
}

bool TryGetOwnProperty(const val& jsObject, const char* key, val& out)
{
    if (!IsObject(jsObject) || !jsObject.hasOwnProperty(key)) {
        return false;
    }
    out = jsObject[key];
    return true;
}

OcctCompositeShapeDiagnostic MakeDiagnostic(
    const std::string& code,
    const std::string& message,
    const std::string& path = std::string(),
    int segmentIndex = -1)
{
    OcctCompositeShapeDiagnostic diagnostic;
    diagnostic.code = code;
    diagnostic.message = message;
    if (!path.empty()) {
        diagnostic.path = path;
        diagnostic.hasPath = true;
    }
    if (segmentIndex >= 0) {
        diagnostic.segmentIndex = segmentIndex;
        diagnostic.hasSegmentIndex = true;
    }
    return diagnostic;
}

void AddDiagnostic(
    OcctCompositeShapeValidationResult& result,
    const std::string& code,
    const std::string& message,
    const std::string& path = std::string(),
    int segmentIndex = -1)
{
    result.diagnostics.push_back(MakeDiagnostic(code, message, path, segmentIndex));
}

void AddDiagnostic(
    OcctCompositeShapeBuildResult& result,
    const std::string& code,
    const std::string& message,
    const std::string& path = std::string(),
    int segmentIndex = -1)
{
    result.diagnostics.push_back(MakeDiagnostic(code, message, path, segmentIndex));
}

std::string JoinPath(const std::string& prefix, const std::string& suffix)
{
    if (prefix.empty()) {
        return suffix;
    }
    if (suffix.empty()) {
        return prefix;
    }
    return prefix + "." + suffix;
}

std::array<double, 16> ParseMatrix4(const val& jsValue)
{
    std::array<double, 16> matrix = {
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0
    };
    if (!IsObject(jsValue) || !jsValue.hasOwnProperty("length")) {
        return matrix;
    }
    if (jsValue["length"].as<unsigned>() < kTransformMatrixLength) {
        return matrix;
    }

    for (unsigned index = 0; index < kTransformMatrixLength; ++index) {
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

bool IsValidTransform(const val& jsValue)
{
    if (!IsObject(jsValue) || !jsValue.hasOwnProperty("length")) {
        return false;
    }
    const val jsLength = jsValue["length"];
    if (!IsNumber(jsLength) || jsLength.as<unsigned>() != kTransformMatrixLength) {
        return false;
    }

    for (unsigned index = 0; index < kTransformMatrixLength; ++index) {
        const val jsComponent = jsValue[index];
        if (!IsNumber(jsComponent)) {
            return false;
        }
        if (!std::isfinite(jsComponent.as<double>())) {
            return false;
        }
    }
    return true;
}

void ParseVersion(const val& jsSpec, OcctCompositeShapeValidationResult& result)
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
        AddDiagnostic(result, "unsupported-version", "Only generated composite shape spec version 1 is supported.", "version");
    }
}

bool ParseUnits(const val& jsSpec, OcctCompositeShapeValidationResult& result, std::string& units)
{
    val jsUnits = val::undefined();
    if (!TryGetOwnProperty(jsSpec, "units", jsUnits)) {
        AddDiagnostic(result, "missing-field", "Spec.units is required.", "units");
        return false;
    }
    if (!IsString(jsUnits)) {
        AddDiagnostic(result, "invalid-type", "Spec.units must be a string.", "units");
        return false;
    }

    units = jsUnits.as<std::string>();
    if (!IsSupportedUnits(units)) {
        AddDiagnostic(result, "unsupported-unit", "Supported units are mm and inch.", "units");
        return false;
    }
    return true;
}

template <typename DiagnosticT>
void AppendNestedDiagnostics(
    std::vector<OcctCompositeShapeDiagnostic>& target,
    const std::vector<DiagnosticT>& source,
    const std::string& pathPrefix)
{
    for (const auto& diagnostic : source) {
        OcctCompositeShapeDiagnostic merged = diagnostic;
        if (!pathPrefix.empty()) {
            const std::string suffix = diagnostic.hasPath ? diagnostic.path : std::string();
            merged.path = JoinPath(pathPrefix, suffix);
            merged.hasPath = true;
        }
        target.push_back(std::move(merged));
    }
}

void ValidateNestedFamilySpec(
    const std::string& family,
    const val& jsSpec,
    OcctCompositeShapeValidationResult& result,
    const std::string& pathPrefix)
{
    if (family == "revolved") {
        const OcctRevolvedToolValidationResult nested = ValidateRevolvedShapeSpec(jsSpec);
        if (!nested.ok) {
            AppendNestedDiagnostics(result.diagnostics, nested.diagnostics, pathPrefix);
        }
        return;
    }
    if (family == "extruded") {
        const OcctExtrudedShapeValidationResult nested = ValidateExtrudedShapeSpec(jsSpec);
        if (!nested.ok) {
            AppendNestedDiagnostics(result.diagnostics, nested.diagnostics, pathPrefix);
        }
        return;
    }
    if (family == "helical-sweep") {
        const OcctHelicalSweepValidationResult nested = ValidateHelicalSweepSpec(jsSpec);
        if (!nested.ok) {
            AppendNestedDiagnostics(result.diagnostics, nested.diagnostics, pathPrefix);
        }
    }
}

void ValidateOperand(
    const val& jsOperand,
    const std::string& pathPrefix,
    const std::string& rootUnits,
    OcctCompositeShapeValidationResult& result)
{
    if (!IsObject(jsOperand)) {
        AddDiagnostic(result, "invalid-type", "Composite operand must be an object.", pathPrefix);
        return;
    }

    std::string family;
    bool hasSupportedFamily = false;
    val jsFamily = val::undefined();
    if (!TryGetOwnProperty(jsOperand, "family", jsFamily)) {
        AddDiagnostic(result, "missing-field", "Composite operand.family is required.", JoinPath(pathPrefix, "family"));
    } else if (!IsString(jsFamily)) {
        AddDiagnostic(result, "invalid-type", "Composite operand.family must be a string.", JoinPath(pathPrefix, "family"));
    } else {
        family = jsFamily.as<std::string>();
        if (!IsSupportedOperandFamily(family)) {
            AddDiagnostic(
                result,
                "unsupported-operand-family",
                "Composite operand.family must be one of revolved, extruded, or helical-sweep.",
                JoinPath(pathPrefix, "family"));
        } else {
            hasSupportedFamily = true;
        }
    }

    val jsSpec = val::undefined();
    bool hasSpecObject = false;
    if (!TryGetOwnProperty(jsOperand, "spec", jsSpec)) {
        AddDiagnostic(result, "missing-field", "Composite operand.spec is required.", JoinPath(pathPrefix, "spec"));
    } else if (!IsObject(jsSpec)) {
        AddDiagnostic(result, "invalid-type", "Composite operand.spec must be an object.", JoinPath(pathPrefix, "spec"));
    } else {
        hasSpecObject = true;
    }

    if (hasSpecObject && hasSupportedFamily) {
        val jsUnits = val::undefined();
        if (TryGetOwnProperty(jsSpec, "units", jsUnits)) {
            if (!IsString(jsUnits)) {
                AddDiagnostic(result, "invalid-type", "Nested operand units must be a string.", JoinPath(pathPrefix, "spec.units"));
            } else if (jsUnits.as<std::string>() != rootUnits) {
                AddDiagnostic(
                    result,
                    "operand-unit-mismatch",
                    "Nested operand units must match CompositeShapeSpec.units.",
                    JoinPath(pathPrefix, "spec.units"));
            }
        }
        ValidateNestedFamilySpec(family, jsSpec, result, JoinPath(pathPrefix, "spec"));
    }

    val jsTransform = val::undefined();
    if (TryGetOwnProperty(jsOperand, "transform", jsTransform) && !IsValidTransform(jsTransform)) {
        AddDiagnostic(
            result,
            "invalid-transform",
            "Composite operand.transform must be a finite 4x4 matrix (16 numbers).",
            JoinPath(pathPrefix, "transform"));
    }
}

void ValidateSeed(const val& jsSpec, const std::string& rootUnits, OcctCompositeShapeValidationResult& result)
{
    val jsSeed = val::undefined();
    if (!TryGetOwnProperty(jsSpec, "seed", jsSeed)) {
        AddDiagnostic(result, "missing-field", "Spec.seed is required.", "seed");
        return;
    }
    ValidateOperand(jsSeed, "seed", rootUnits, result);
}

void ValidateSteps(const val& jsSpec, const std::string& rootUnits, OcctCompositeShapeValidationResult& result)
{
    val jsSteps = val::undefined();
    if (!TryGetOwnProperty(jsSpec, "steps", jsSteps)) {
        return;
    }
    if (!IsObject(jsSteps) || !jsSteps.hasOwnProperty("length")) {
        AddDiagnostic(result, "invalid-type", "Spec.steps must be an array of operation descriptors.", "steps");
        return;
    }

    const val jsLength = jsSteps["length"];
    if (!IsNumber(jsLength)) {
        AddDiagnostic(result, "invalid-type", "Spec.steps must be an array of operation descriptors.", "steps");
        return;
    }

    const int length = jsLength.as<int>();
    for (int index = 0; index < length; ++index) {
        const std::string stepPath = "steps[" + std::to_string(index) + "]";
        const val jsStep = jsSteps[index];
        if (!IsObject(jsStep)) {
            AddDiagnostic(result, "invalid-type", "Each steps entry must be an object.", stepPath);
            continue;
        }

        val jsOp = val::undefined();
        if (!TryGetOwnProperty(jsStep, "op", jsOp)) {
            AddDiagnostic(result, "missing-field", "steps[n].op is required.", JoinPath(stepPath, "op"));
        } else if (!IsString(jsOp)) {
            AddDiagnostic(result, "invalid-type", "steps[n].op must be a string.", JoinPath(stepPath, "op"));
        } else {
            const std::string op = jsOp.as<std::string>();
            if (!IsSupportedStepOp(op)) {
                AddDiagnostic(
                    result,
                    "unsupported-step-op",
                    "steps[n].op must be one of fuse or cut.",
                    JoinPath(stepPath, "op"));
            }
        }

        val jsOperand = val::undefined();
        if (!TryGetOwnProperty(jsStep, "operand", jsOperand)) {
            AddDiagnostic(result, "missing-field", "steps[n].operand is required.", JoinPath(stepPath, "operand"));
            continue;
        }
        ValidateOperand(jsOperand, JoinPath(stepPath, "operand"), rootUnits, result);
    }
}

bool ParseOperand(const val& jsOperand, ParsedCompositeOperand& operand)
{
    if (!IsObject(jsOperand) || !jsOperand.hasOwnProperty("family") || !jsOperand.hasOwnProperty("spec")) {
        return false;
    }
    operand.family = jsOperand["family"].as<std::string>();
    operand.spec = jsOperand["spec"];
    operand.hasTransform = false;
    if (jsOperand.hasOwnProperty("transform")) {
        operand.transform = ParseMatrix4(jsOperand["transform"]);
        operand.hasTransform = true;
    }
    return true;
}

bool ParseValidatedCompositeSpec(const val& jsSpec, ParsedCompositeSpec& spec)
{
    if (!IsObject(jsSpec) || !jsSpec.hasOwnProperty("seed")) {
        return false;
    }

    spec.version = 1;
    if (jsSpec.hasOwnProperty("version")) {
        spec.version = jsSpec["version"].as<int>();
    }
    spec.units = jsSpec["units"].as<std::string>();
    if (!ParseOperand(jsSpec["seed"], spec.seed)) {
        return false;
    }

    spec.steps.clear();
    if (!jsSpec.hasOwnProperty("steps")) {
        return true;
    }

    const val jsSteps = jsSpec["steps"];
    const int length = jsSteps["length"].as<int>();
    spec.steps.reserve(static_cast<size_t>(length));
    for (int index = 0; index < length; ++index) {
        const val jsStep = jsSteps[index];
        ParsedCompositeStep step;
        step.op = jsStep["op"].as<std::string>();
        if (!ParseOperand(jsStep["operand"], step.operand)) {
            return false;
        }
        spec.steps.push_back(std::move(step));
    }
    return true;
}

ImportParams ParseBuildParams(const val& jsOptions, const std::string& units)
{
    ImportParams params;
    params.linearUnit =
        units == "inch"
            ? ImportParams::LinearUnit::Inch
            : ImportParams::LinearUnit::Millimeter;
    params.readNames = true;
    params.readColors = false;
    params.appearanceMode = ImportParams::AppearanceMode::DefaultColor;
    params.defaultColor = OcctColor(0.82, 0.84, 0.88);
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

void PopulateGeneratedScene(
    const OcctMeshData& mesh,
    const ParsedCompositeSpec& spec,
    OcctSceneData& scene)
{
    scene.success = true;
    scene.sourceUnit = spec.units == "inch" ? "INCH" : "MM";
    scene.unitScaleToMeters = spec.units == "inch" ? 0.0254 : 0.001;

    scene.meshes.push_back(mesh);

    OcctNodeData rootNode;
    rootNode.id = "generated-composite-shape-root";
    rootNode.name = "Generated Composite Shape";
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

void FinalizeBuildFailure(OcctCompositeShapeBuildResult& result, const std::string& error)
{
    result.success = false;
    result.error = error;
    result.scene.success = false;
    result.scene.error = error;
}

OcctGeneratedCompositeShapeMetadata BuildCompositeMetadata(const ParsedCompositeSpec& spec)
{
    OcctGeneratedCompositeShapeMetadata metadata;
    metadata.version = spec.version;
    metadata.units = spec.units;
    metadata.seedFamily = spec.seed.family;
    metadata.stepCount = static_cast<int>(spec.steps.size());

    metadata.operations.reserve(spec.steps.size());
    for (size_t index = 0; index < spec.steps.size(); ++index) {
        OcctGeneratedCompositeShapeOperationDescriptor descriptor;
        descriptor.index = static_cast<int>(index);
        descriptor.op = spec.steps[index].op;
        descriptor.family = spec.steps[index].operand.family;
        descriptor.hasTransform = spec.steps[index].operand.hasTransform;
        metadata.operations.push_back(std::move(descriptor));
    }
    return metadata;
}

bool ApplyOperandTransform(
    TopoDS_Shape& shape,
    const ParsedCompositeOperand& operand,
    OcctCompositeShapeBuildResult& result,
    const std::string& path)
{
    if (!operand.hasTransform) {
        return true;
    }

    BRepBuilderAPI_Transform transformBuilder(shape, MatrixToTrsf(operand.transform), Standard_True);
    transformBuilder.Build();
    if (!transformBuilder.IsDone()) {
        AddDiagnostic(result, "build-failed", "Failed to apply operand transform.", path);
        return false;
    }

    shape = transformBuilder.Shape();
    if (shape.IsNull()) {
        AddDiagnostic(result, "build-failed", "Operand transform produced a null shape.", path);
        return false;
    }
    return true;
}

bool TryBuildOperandShape(
    const ParsedCompositeOperand& operand,
    const val& jsOptions,
    TopoDS_Shape& shape,
    OcctCompositeShapeBuildResult& result,
    const std::string& path)
{
    if (operand.family == "revolved") {
        const OcctRevolvedToolBuildResult built = BuildRevolvedShape(operand.spec, jsOptions);
        if (!built.success) {
            AppendNestedDiagnostics(result.diagnostics, built.diagnostics, JoinPath(path, "spec"));
            if (built.diagnostics.empty()) {
                AddDiagnostic(
                    result,
                    "operand-build-failed",
                    built.error.empty() ? "Failed to build revolved operand." : built.error,
                    path);
            }
            return false;
        }
        shape = built.exactShape;
    } else if (operand.family == "extruded") {
        const OcctExtrudedShapeBuildResult built = BuildExtrudedShape(operand.spec, jsOptions);
        if (!built.success) {
            AppendNestedDiagnostics(result.diagnostics, built.diagnostics, JoinPath(path, "spec"));
            if (built.diagnostics.empty()) {
                AddDiagnostic(
                    result,
                    "operand-build-failed",
                    built.error.empty() ? "Failed to build extruded operand." : built.error,
                    path);
            }
            return false;
        }
        shape = built.exactShape;
    } else if (operand.family == "helical-sweep") {
        const OcctHelicalSweepBuildResult built = BuildHelicalSweep(operand.spec, jsOptions);
        if (!built.success) {
            AppendNestedDiagnostics(result.diagnostics, built.diagnostics, JoinPath(path, "spec"));
            if (built.diagnostics.empty()) {
                AddDiagnostic(
                    result,
                    "operand-build-failed",
                    built.error.empty() ? "Failed to build helical-sweep operand." : built.error,
                    path);
            }
            return false;
        }
        shape = built.exactShape;
    } else {
        AddDiagnostic(result, "unsupported-operand-family", "Unsupported operand family during build.", JoinPath(path, "family"));
        return false;
    }

    if (shape.IsNull()) {
        AddDiagnostic(result, "operand-build-failed", "Nested operand build returned a null exact shape.", path);
        return false;
    }

    return ApplyOperandTransform(shape, operand, result, JoinPath(path, "transform"));
}

bool ApplyStepOperation(
    TopoDS_Shape& currentShape,
    const ParsedCompositeStep& step,
    int stepIndex,
    OcctCompositeShapeBuildResult& result,
    const val& jsOptions)
{
    TopoDS_Shape operandShape;
    const std::string operandPath = "steps[" + std::to_string(stepIndex) + "].operand";
    if (!TryBuildOperandShape(step.operand, jsOptions, operandShape, result, operandPath)) {
        return false;
    }

    TopoDS_Shape nextShape;
    if (step.op == "fuse") {
        BRepAlgoAPI_Fuse fuseBuilder(currentShape, operandShape);
        fuseBuilder.Build();
        if (!fuseBuilder.IsDone()) {
            AddDiagnostic(result, "build-failed", "Boolean fuse step failed.", "steps[" + std::to_string(stepIndex) + "].op");
            return false;
        }
        nextShape = fuseBuilder.Shape();
    } else {
        BRepAlgoAPI_Cut cutBuilder(currentShape, operandShape);
        cutBuilder.Build();
        if (!cutBuilder.IsDone()) {
            AddDiagnostic(result, "build-failed", "Boolean cut step failed.", "steps[" + std::to_string(stepIndex) + "].op");
            return false;
        }
        nextShape = cutBuilder.Shape();
    }

    if (nextShape.IsNull()) {
        AddDiagnostic(result, "build-failed", "Boolean operation produced a null shape.", "steps[" + std::to_string(stepIndex) + "]");
        return false;
    }

    currentShape = nextShape;
    return true;
}

} // anonymous namespace

OcctCompositeShapeValidationResult ValidateCompositeShapeSpec(const val& jsSpec)
{
    OcctCompositeShapeValidationResult result;
    if (!IsObject(jsSpec)) {
        AddDiagnostic(result, "invalid-spec", "Composite shape spec must be an object.");
        return result;
    }

    ParseVersion(jsSpec, result);

    std::string rootUnits = "mm";
    ParseUnits(jsSpec, result, rootUnits);
    ValidateSeed(jsSpec, rootUnits, result);
    ValidateSteps(jsSpec, rootUnits, result);

    result.ok = result.diagnostics.empty();
    return result;
}

OcctCompositeShapeBuildResult BuildCompositeShape(const val& jsSpec, const val& jsOptions)
{
    OcctCompositeShapeBuildResult result;
    const OcctCompositeShapeValidationResult validation = ValidateCompositeShapeSpec(jsSpec);
    if (!validation.ok) {
        result.diagnostics = validation.diagnostics;
        FinalizeBuildFailure(
            result,
            validation.diagnostics.empty()
                ? "Invalid composite shape spec."
                : validation.diagnostics.front().message);
        return result;
    }

    ParsedCompositeSpec spec;
    if (!ParseValidatedCompositeSpec(jsSpec, spec)) {
        AddDiagnostic(result, "invalid-spec", "Failed to parse validated composite shape spec.");
        FinalizeBuildFailure(result, "Failed to parse validated composite shape spec.");
        return result;
    }

    result.compositeShape = BuildCompositeMetadata(spec);
    result.hasCompositeShape = true;

    try {
        TopoDS_Shape currentShape;
        if (!TryBuildOperandShape(spec.seed, jsOptions, currentShape, result, "seed")) {
            FinalizeBuildFailure(
                result,
                result.diagnostics.empty()
                    ? "Failed to build composite seed operand."
                    : result.diagnostics.front().message);
            return result;
        }

        for (size_t stepIndex = 0; stepIndex < spec.steps.size(); ++stepIndex) {
            if (!ApplyStepOperation(currentShape, spec.steps[stepIndex], static_cast<int>(stepIndex), result, jsOptions)) {
                FinalizeBuildFailure(
                    result,
                    result.diagnostics.empty()
                        ? "Failed to apply composite operation step."
                        : result.diagnostics.front().message);
                return result;
            }
        }

        if (currentShape.IsNull()) {
            AddDiagnostic(result, "build-failed", "Composite operation pipeline produced a null shape.");
            FinalizeBuildFailure(result, "Composite operation pipeline produced a null shape.");
            return result;
        }

        ImportParams buildParams = ParseBuildParams(jsOptions, spec.units);
        if (!TriangulateShape(currentShape, buildParams)) {
            AddDiagnostic(result, "build-failed", "Failed to triangulate the generated composite shape.", "mesh");
            FinalizeBuildFailure(result, "Failed to triangulate the generated composite shape.");
            return result;
        }

        OcctMeshData mesh = ExtractMeshFromShape(currentShape);
        if (mesh.indices.empty() || mesh.faces.empty()) {
            AddDiagnostic(result, "build-failed", "Generated composite shape triangulation produced no renderable faces.", "mesh");
            FinalizeBuildFailure(result, "Generated composite shape triangulation produced no renderable faces.");
            return result;
        }

        mesh.name = "Generated Composite Shape";
        mesh.color = OcctColor(0.82, 0.84, 0.88);
        for (auto& face : mesh.faces) {
            face.color = mesh.color;
        }

        result.compositeShape.shapeValidation = BuildGeneratedShapeValidation(currentShape, mesh);
        result.compositeShape.hasShapeValidation = true;

        PopulateGeneratedScene(mesh, spec, result.scene);
        result.exactShape = currentShape;
        result.exactGeometryShapes = { currentShape };
        result.success = true;
        result.error.clear();
        return result;
    } catch (const Standard_Failure& failure) {
        const std::string message =
            failure.GetMessageString() != nullptr
                ? std::string(failure.GetMessageString())
                : std::string("OCCT threw an exception while building the generated composite shape.");
        AddDiagnostic(result, "build-failed", message);
        FinalizeBuildFailure(result, message);
        return result;
    } catch (const std::exception& exception) {
        AddDiagnostic(result, "build-failed", exception.what());
        FinalizeBuildFailure(result, exception.what());
        return result;
    } catch (...) {
        AddDiagnostic(result, "build-failed", "Unknown exception while building the generated composite shape.");
        FinalizeBuildFailure(result, "Unknown exception while building the generated composite shape.");
        return result;
    }
}
