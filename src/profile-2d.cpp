#include "profile-2d.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <string>

using emscripten::val;

namespace {

constexpr double kPointTolerance = 1e-9;

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

bool IsArrayLike(const val& jsValue)
{
    return IsObject(jsValue) && jsValue.hasOwnProperty("length") && IsNumber(jsValue["length"]);
}

std::string JoinPath(const std::string& rootPath, const std::string& field)
{
    if (rootPath.empty()) {
        return field;
    }
    if (field.empty()) {
        return rootPath;
    }
    return rootPath + "." + field;
}

std::string SegmentPath(const std::string& rootPath, int segmentIndex, const std::string& field = std::string())
{
    std::string path = JoinPath(rootPath, "segments[" + std::to_string(segmentIndex) + "]");
    if (!field.empty()) {
        path += "." + field;
    }
    return path;
}

OcctProfile2DDiagnostic MakeDiagnostic(
    const std::string& code,
    const std::string& message,
    const std::string& path = std::string(),
    int segmentIndex = -1)
{
    OcctProfile2DDiagnostic diagnostic;
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
    OcctProfile2DValidationResult& result,
    const std::string& code,
    const std::string& message,
    const std::string& path = std::string(),
    int segmentIndex = -1)
{
    result.diagnostics.push_back(MakeDiagnostic(code, message, path, segmentIndex));
}

bool TryGetOwnProperty(const val& jsObject, const char* key, val& out)
{
    if (!IsObject(jsObject) || !jsObject.hasOwnProperty(key)) {
        return false;
    }
    out = jsObject[key];
    return true;
}

bool TryParseStringProperty(
    const val& jsObject,
    const char* key,
    std::string& out,
    OcctProfile2DValidationResult& result,
    const std::string& path,
    int segmentIndex = -1)
{
    val jsValue = val::undefined();
    if (!TryGetOwnProperty(jsObject, key, jsValue)) {
        return false;
    }
    if (!IsString(jsValue)) {
        AddDiagnostic(result, "invalid-type", "Expected a string value.", path, segmentIndex);
        return false;
    }
    out = jsValue.as<std::string>();
    return true;
}

bool TryParseLocalPoint2(
    const val& jsValue,
    std::array<double, 2>& point,
    OcctProfile2DValidationResult& result,
    const std::string& path,
    int segmentIndex = -1)
{
    if (!IsArrayLike(jsValue) || jsValue["length"].as<unsigned>() < 2) {
        AddDiagnostic(result, "invalid-type", "Expected a 2D point [x, y].", path, segmentIndex);
        return false;
    }

    bool ok = true;
    for (unsigned axis = 0; axis < 2; ++axis) {
        const std::string axisPath = path + "[" + std::to_string(axis) + "]";
        val coordinate = jsValue[axis];
        if (!IsNumber(coordinate)) {
            AddDiagnostic(result, "invalid-type", "Expected a numeric coordinate.", axisPath, segmentIndex);
            ok = false;
            continue;
        }

        const double value = coordinate.as<double>();
        point[axis] = value;
        if (!std::isfinite(value)) {
            AddDiagnostic(result, "non-finite-coordinate", "Coordinates must be finite numbers.", axisPath, segmentIndex);
            ok = false;
        }
    }

    return ok;
}

double SquaredDistance(const std::array<double, 2>& left, const std::array<double, 2>& right)
{
    const double dx = left[0] - right[0];
    const double dy = left[1] - right[1];
    return dx * dx + dy * dy;
}

bool PointsCoincident(const std::array<double, 2>& left, const std::array<double, 2>& right)
{
    return SquaredDistance(left, right) <= (kPointTolerance * kPointTolerance);
}

bool ValidateArcCenterSegment(
    const std::array<double, 2>& start,
    const OcctProfile2DSegment& segment,
    OcctProfile2DValidationResult& result,
    const std::string& segmentPath,
    int segmentIndex)
{
    if (!segment.hasEnd || !segment.hasCenter) {
        return false;
    }

    if (PointsCoincident(start, segment.end)) {
        AddDiagnostic(
            result,
            "invalid-arc",
            "arc_center segments must end at a different point than they start.",
            segmentPath,
            segmentIndex);
        return false;
    }

    const double startRadiusSq = SquaredDistance(start, segment.center);
    const double endRadiusSq = SquaredDistance(segment.end, segment.center);
    if (startRadiusSq <= (kPointTolerance * kPointTolerance)
        || endRadiusSq <= (kPointTolerance * kPointTolerance)) {
        AddDiagnostic(
            result,
            "invalid-arc",
            "arc_center segments require a non-degenerate radius.",
            segmentPath,
            segmentIndex);
        return false;
    }

    const double startRadius = std::sqrt(startRadiusSq);
    const double endRadius = std::sqrt(endRadiusSq);
    const double radiusTolerance = std::max({ kPointTolerance, startRadius * 1e-6, endRadius * 1e-6 });
    if (std::abs(startRadius - endRadius) > radiusTolerance) {
        AddDiagnostic(
            result,
            "invalid-arc",
            "arc_center segments require start and end points to be equidistant from the center.",
            segmentPath,
            segmentIndex);
        return false;
    }

    return true;
}

bool ValidateArc3PointSegment(
    const std::array<double, 2>& start,
    const OcctProfile2DSegment& segment,
    OcctProfile2DValidationResult& result,
    const std::string& segmentPath,
    int segmentIndex)
{
    if (!segment.hasEnd || !segment.hasThrough) {
        return false;
    }

    if (PointsCoincident(start, segment.end)
        || PointsCoincident(start, segment.through)
        || PointsCoincident(segment.through, segment.end)) {
        AddDiagnostic(
            result,
            "invalid-arc",
            "arc_3pt segments require three distinct points.",
            segmentPath,
            segmentIndex);
        return false;
    }

    const double area2 =
        start[0] * (segment.through[1] - segment.end[1]) +
        segment.through[0] * (segment.end[1] - start[1]) +
        segment.end[0] * (start[1] - segment.through[1]);
    if (std::abs(area2) <= kPointTolerance) {
        AddDiagnostic(
            result,
            "invalid-arc",
            "arc_3pt segments require non-collinear start, through, and end points.",
            segmentPath,
            segmentIndex);
        return false;
    }

    return true;
}

void ParseVersion(const val& jsSpec, OcctProfile2DValidationResult& result)
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
        AddDiagnostic(result, "unsupported-version", "Only profile2d spec version 1 is supported.", "version");
        return;
    }

    result.spec.version = static_cast<int>(version);
}

void ParseSegments(
    const val& jsSegments,
    OcctProfile2DValidationResult& result,
    const OcctProfile2DValidationOptions& options)
{
    const unsigned segmentCount = jsSegments["length"].as<unsigned>();
    if (segmentCount == 0) {
        AddDiagnostic(result, "degenerate-segment", "Spec.segments must contain at least one segment.", JoinPath(options.rootPath, "segments"));
        return;
    }

    std::array<double, 2> currentPoint = result.spec.start;
    bool hasCurrentPoint = result.spec.hasStart;
    for (unsigned segmentIndex = 0; segmentIndex < segmentCount; ++segmentIndex) {
        const std::string segmentPath = SegmentPath(options.rootPath, static_cast<int>(segmentIndex));
        const val jsSegment = jsSegments[segmentIndex];
        if (!IsObject(jsSegment)) {
            AddDiagnostic(result, "invalid-type", "Each profile segment must be an object.", segmentPath, static_cast<int>(segmentIndex));
            continue;
        }

        OcctProfile2DSegment segment;
        if (hasCurrentPoint) {
            segment.start = currentPoint;
            segment.hasStart = true;
        }
        if (TryParseStringProperty(jsSegment, "id", segment.id, result, segmentPath + ".id", static_cast<int>(segmentIndex))) {
            segment.hasId = true;
        }
        if (TryParseStringProperty(jsSegment, "tag", segment.tag, result, segmentPath + ".tag", static_cast<int>(segmentIndex))) {
            segment.hasTag = true;
        }

        val jsKind = val::undefined();
        if (!TryGetOwnProperty(jsSegment, "kind", jsKind)) {
            AddDiagnostic(result, "missing-field", "Each profile segment requires a kind.", segmentPath + ".kind", static_cast<int>(segmentIndex));
            result.spec.segments.push_back(segment);
            continue;
        }
        if (!IsString(jsKind)) {
            AddDiagnostic(result, "invalid-type", "Expected a string value.", segmentPath + ".kind", static_cast<int>(segmentIndex));
            result.spec.segments.push_back(segment);
            continue;
        }
        segment.kind = jsKind.as<std::string>();

        val jsEnd = val::undefined();
        if (!TryGetOwnProperty(jsSegment, "end", jsEnd)) {
            AddDiagnostic(result, "missing-field", "Each profile segment requires an end point.", segmentPath + ".end", static_cast<int>(segmentIndex));
        } else {
            segment.hasEnd = TryParseLocalPoint2(jsEnd, segment.end, result, segmentPath + ".end", static_cast<int>(segmentIndex));
        }

        if (segment.kind == "arc_center") {
            val jsCenter = val::undefined();
            if (!TryGetOwnProperty(jsSegment, "center", jsCenter)) {
                AddDiagnostic(result, "missing-field", "arc_center segments require a center point.", segmentPath + ".center", static_cast<int>(segmentIndex));
            } else {
                segment.hasCenter = TryParseLocalPoint2(jsCenter, segment.center, result, segmentPath + ".center", static_cast<int>(segmentIndex));
            }
        } else if (segment.kind == "arc_3pt") {
            val jsThrough = val::undefined();
            if (!TryGetOwnProperty(jsSegment, "through", jsThrough)) {
                AddDiagnostic(result, "missing-field", "arc_3pt segments require a through point.", segmentPath + ".through", static_cast<int>(segmentIndex));
            } else {
                segment.hasThrough = TryParseLocalPoint2(jsThrough, segment.through, result, segmentPath + ".through", static_cast<int>(segmentIndex));
            }
        } else if (segment.kind != "line") {
            AddDiagnostic(result, "unsupported-segment-kind", "Supported segment kinds are line, arc_center, and arc_3pt.", segmentPath + ".kind", static_cast<int>(segmentIndex));
        }

        result.spec.segments.push_back(segment);
        if (segment.hasEnd) {
            currentPoint = segment.end;
            hasCurrentPoint = true;
        }
    }
}

} // anonymous namespace

OcctProfile2DValidationResult ValidateProfile2DSpec(const val& jsSpec)
{
    return ParseAndValidateProfile2DSpec(jsSpec);
}

OcctProfile2DValidationResult ParseAndValidateProfile2DSpec(
    const val& jsSpec,
    const OcctProfile2DValidationOptions& options)
{
    OcctProfile2DValidationResult result;

    if (!IsObject(jsSpec)) {
        AddDiagnostic(result, "invalid-spec", "Profile2D spec must be an object.");
        return result;
    }

    ParseVersion(jsSpec, result);

    val jsStart = val::undefined();
    const std::string startPath = JoinPath(options.rootPath, "start");
    if (!TryGetOwnProperty(jsSpec, "start", jsStart)) {
        AddDiagnostic(result, "missing-field", "Spec.start is required.", startPath);
    } else {
        result.spec.hasStart = TryParseLocalPoint2(jsStart, result.spec.start, result, startPath);
    }

    val jsSegments = val::undefined();
    const std::string segmentsPath = JoinPath(options.rootPath, "segments");
    if (!TryGetOwnProperty(jsSpec, "segments", jsSegments)) {
        AddDiagnostic(result, "missing-field", "Spec.segments is required.", segmentsPath);
    } else if (!IsArrayLike(jsSegments)) {
        AddDiagnostic(result, "invalid-type", "Spec.segments must be an array.", segmentsPath);
    } else if (result.spec.hasStart) {
        ParseSegments(jsSegments, result, options);
    }

    result.hasSpec = result.spec.hasStart && !result.spec.segments.empty();
    OcctProfile2DValidationResult normalized = ValidateNormalizedProfile2DSpec(result.spec, options);
    result.hasSpec = normalized.hasSpec;
    result.spec = normalized.spec;
    result.diagnostics.insert(result.diagnostics.end(), normalized.diagnostics.begin(), normalized.diagnostics.end());
    result.ok = result.diagnostics.empty();
    return result;
}

OcctProfile2DValidationResult ValidateNormalizedProfile2DSpec(
    const OcctProfile2DSpec& spec,
    const OcctProfile2DValidationOptions& options)
{
    OcctProfile2DValidationResult result;
    result.spec = spec;
    result.hasSpec = spec.hasStart;

    if (!spec.hasStart) {
        AddDiagnostic(result, "missing-field", "Spec.start is required.", JoinPath(options.rootPath, "start"));
        return result;
    }

    if (spec.segments.empty()) {
        AddDiagnostic(result, "degenerate-segment", "Spec.segments must contain at least one segment.", JoinPath(options.rootPath, "segments"));
        return result;
    }

    std::array<double, 2> currentPoint = spec.start;
    bool hasCurrentPoint = true;
    for (size_t segmentIndex = 0; segmentIndex < spec.segments.size(); ++segmentIndex) {
        const OcctProfile2DSegment& segment = spec.segments[segmentIndex];
        const std::string segmentPath = SegmentPath(options.rootPath, static_cast<int>(segmentIndex));

        if (!segment.hasEnd) {
            AddDiagnostic(result, "missing-field", "Each profile segment requires an end point.", segmentPath + ".end", static_cast<int>(segmentIndex));
            hasCurrentPoint = false;
            continue;
        }

        if (segment.hasStart && hasCurrentPoint && !PointsCoincident(segment.start, currentPoint)) {
            AddDiagnostic(
                result,
                "profile-discontinuous",
                "Each profile segment must begin where the previous segment ended.",
                segmentPath,
                static_cast<int>(segmentIndex));
        }

        const std::array<double, 2> segmentStart = segment.hasStart ? segment.start : currentPoint;
        if (segment.kind == "line") {
            if (PointsCoincident(segmentStart, segment.end)) {
                AddDiagnostic(
                    result,
                    "degenerate-segment",
                    "line segments must end at a different point than they start.",
                    segmentPath,
                    static_cast<int>(segmentIndex));
            }
        } else if (segment.kind == "arc_center") {
            ValidateArcCenterSegment(segmentStart, segment, result, segmentPath, static_cast<int>(segmentIndex));
        } else if (segment.kind == "arc_3pt") {
            ValidateArc3PointSegment(segmentStart, segment, result, segmentPath, static_cast<int>(segmentIndex));
        } else if (!segment.kind.empty()) {
            AddDiagnostic(
                result,
                "unsupported-segment-kind",
                "Supported segment kinds are line, arc_center, and arc_3pt.",
                segmentPath + ".kind",
                static_cast<int>(segmentIndex));
        }

        currentPoint = segment.end;
        hasCurrentPoint = true;
    }

    if (options.requireClosed && !PointsCoincident(currentPoint, spec.start)) {
        AddDiagnostic(
            result,
            "profile-not-closed",
            "Profiles must end at the same point as start.",
            JoinPath(options.rootPath, "segments"));
    }

    result.ok = result.diagnostics.empty();
    return result;
}
