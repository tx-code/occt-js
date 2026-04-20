#include "revolved-tool.hpp"

#include <algorithm>
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

void AddDiagnostic(
    OcctRevolvedToolValidationResult& result,
    const std::string& code,
    const std::string& message,
    const std::string& path = std::string(),
    int segmentIndex = -1)
{
    OcctRevolvedToolDiagnostic diagnostic;
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
    result.diagnostics.push_back(diagnostic);
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
    OcctRevolvedToolValidationResult& result,
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

bool TryParsePoint2(
    const val& jsValue,
    std::array<double, 2>& point,
    OcctRevolvedToolValidationResult& result,
    const std::string& path,
    int segmentIndex = -1)
{
    if (!IsArrayLike(jsValue) || jsValue["length"].as<unsigned>() < 2) {
        AddDiagnostic(result, "invalid-type", "Expected a 2D point [radius, z].", path, segmentIndex);
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
            continue;
        }

        if (axis == 0 && value < 0.0) {
            AddDiagnostic(result, "negative-radius", "Radius coordinates must be >= 0.", axisPath, segmentIndex);
            ok = false;
        }
    }

    return ok;
}

double SquaredDistance(const std::array<double, 2>& left, const std::array<double, 2>& right)
{
    const double dx = left[0] - right[0];
    const double dz = left[1] - right[1];
    return dx * dx + dz * dz;
}

bool PointsCoincident(const std::array<double, 2>& left, const std::array<double, 2>& right)
{
    return SquaredDistance(left, right) <= (kPointTolerance * kPointTolerance);
}

bool ValidateArcCenterSegment(
    const std::array<double, 2>& start,
    const OcctRevolvedToolSegment& segment,
    OcctRevolvedToolValidationResult& result,
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
            "profile.segments[" + std::to_string(segmentIndex) + "]",
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
            "profile.segments[" + std::to_string(segmentIndex) + "]",
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
            "profile.segments[" + std::to_string(segmentIndex) + "]",
            segmentIndex);
        return false;
    }

    return true;
}

bool ValidateArc3PointSegment(
    const std::array<double, 2>& start,
    const OcctRevolvedToolSegment& segment,
    OcctRevolvedToolValidationResult& result,
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
            "profile.segments[" + std::to_string(segmentIndex) + "]",
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
            "profile.segments[" + std::to_string(segmentIndex) + "]",
            segmentIndex);
        return false;
    }

    return true;
}

void ParseSegment(
    const val& jsSegment,
    int segmentIndex,
    const std::array<double, 2>& currentPoint,
    bool hasCurrentPoint,
    OcctRevolvedToolValidationResult& result)
{
    const std::string segmentPath = "profile.segments[" + std::to_string(segmentIndex) + "]";
    if (!IsObject(jsSegment)) {
        AddDiagnostic(result, "invalid-type", "Each profile segment must be an object.", segmentPath, segmentIndex);
        return;
    }

    OcctRevolvedToolSegment segment;
    if (TryParseStringProperty(jsSegment, "id", segment.id, result, segmentPath + ".id", segmentIndex)) {
        segment.hasId = true;
    }
    if (TryParseStringProperty(jsSegment, "tag", segment.tag, result, segmentPath + ".tag", segmentIndex)) {
        segment.hasTag = true;
    }

    val jsKind = val::undefined();
    if (!TryGetOwnProperty(jsSegment, "kind", jsKind)) {
        AddDiagnostic(result, "missing-field", "Each profile segment requires a kind.", segmentPath + ".kind", segmentIndex);
        result.spec.profile.segments.push_back(segment);
        return;
    }
    if (!IsString(jsKind)) {
        AddDiagnostic(result, "invalid-type", "Expected a string value.", segmentPath + ".kind", segmentIndex);
        result.spec.profile.segments.push_back(segment);
        return;
    }
    segment.kind = jsKind.as<std::string>();

    val jsEnd = val::undefined();
    if (!TryGetOwnProperty(jsSegment, "end", jsEnd)) {
        AddDiagnostic(result, "missing-field", "Each profile segment requires an end point.", segmentPath + ".end", segmentIndex);
    } else {
        segment.hasEnd = TryParsePoint2(jsEnd, segment.end, result, segmentPath + ".end", segmentIndex);
    }

    if (segment.kind == "arc_center") {
        val jsCenter = val::undefined();
        if (!TryGetOwnProperty(jsSegment, "center", jsCenter)) {
            AddDiagnostic(result, "missing-field", "arc_center segments require a center point.", segmentPath + ".center", segmentIndex);
        } else {
            segment.hasCenter = TryParsePoint2(jsCenter, segment.center, result, segmentPath + ".center", segmentIndex);
        }
    } else if (segment.kind == "arc_3pt") {
        val jsThrough = val::undefined();
        if (!TryGetOwnProperty(jsSegment, "through", jsThrough)) {
            AddDiagnostic(result, "missing-field", "arc_3pt segments require a through point.", segmentPath + ".through", segmentIndex);
        } else {
            segment.hasThrough = TryParsePoint2(jsThrough, segment.through, result, segmentPath + ".through", segmentIndex);
        }
    } else if (segment.kind != "line") {
        AddDiagnostic(result, "unsupported-segment-kind", "Supported segment kinds are line, arc_center, and arc_3pt.", segmentPath + ".kind", segmentIndex);
    }

    if (hasCurrentPoint && segment.hasEnd) {
        if (segment.kind == "line") {
            if (PointsCoincident(currentPoint, segment.end)) {
                AddDiagnostic(
                    result,
                    "degenerate-segment",
                    "line segments must end at a different point than they start.",
                    segmentPath,
                    segmentIndex);
            }
        } else if (segment.kind == "arc_center") {
            ValidateArcCenterSegment(currentPoint, segment, result, segmentIndex);
        } else if (segment.kind == "arc_3pt") {
            ValidateArc3PointSegment(currentPoint, segment, result, segmentIndex);
        }
    }

    result.spec.profile.segments.push_back(segment);
}

void ParseProfile(const val& jsProfile, OcctRevolvedToolValidationResult& result)
{
    if (!IsObject(jsProfile)) {
        AddDiagnostic(result, "missing-field", "Spec.profile must be an object.", "profile");
        return;
    }

    std::string plane = "XZ";
    TryParseStringProperty(jsProfile, "plane", plane, result, "profile.plane");
    if (plane != "XZ") {
        AddDiagnostic(result, "unsupported-plane", "Only the XZ revolve profile plane is supported in v1.", "profile.plane");
    }
    result.spec.profile.plane = plane;

    val jsStart = val::undefined();
    if (!TryGetOwnProperty(jsProfile, "start", jsStart)) {
        AddDiagnostic(result, "missing-field", "Spec.profile.start is required.", "profile.start");
    } else {
        result.spec.profile.hasStart = TryParsePoint2(jsStart, result.spec.profile.start, result, "profile.start");
    }

    val jsClosure = val::undefined();
    if (!TryGetOwnProperty(jsProfile, "closure", jsClosure)) {
        AddDiagnostic(result, "missing-field", "Spec.profile.closure is required.", "profile.closure");
    } else if (!IsString(jsClosure)) {
        AddDiagnostic(result, "invalid-type", "Expected a string value.", "profile.closure");
    } else {
        result.spec.profile.closure = jsClosure.as<std::string>();
        result.spec.profile.hasClosure = true;
        if (result.spec.profile.closure != "explicit" && result.spec.profile.closure != "auto_axis") {
            AddDiagnostic(result, "invalid-closure", "Supported closure values are explicit and auto_axis.", "profile.closure");
        }
    }

    val jsSegments = val::undefined();
    if (!TryGetOwnProperty(jsProfile, "segments", jsSegments)) {
        AddDiagnostic(result, "missing-field", "Spec.profile.segments is required.", "profile.segments");
        return;
    }
    if (!IsArrayLike(jsSegments)) {
        AddDiagnostic(result, "invalid-type", "Spec.profile.segments must be an array.", "profile.segments");
        return;
    }

    const unsigned segmentCount = jsSegments["length"].as<unsigned>();
    if (segmentCount == 0) {
        AddDiagnostic(result, "degenerate-segment", "Spec.profile.segments must contain at least one segment.", "profile.segments");
        return;
    }

    std::array<double, 2> currentPoint = result.spec.profile.start;
    bool hasCurrentPoint = result.spec.profile.hasStart;
    for (unsigned segmentIndex = 0; segmentIndex < segmentCount; ++segmentIndex) {
        ParseSegment(jsSegments[segmentIndex], static_cast<int>(segmentIndex), currentPoint, hasCurrentPoint, result);

        const OcctRevolvedToolSegment& parsedSegment = result.spec.profile.segments.back();
        if (parsedSegment.hasEnd) {
            currentPoint = parsedSegment.end;
            hasCurrentPoint = true;
        }
    }

    if (result.spec.profile.closure == "explicit"
        && result.spec.profile.hasStart
        && !result.spec.profile.segments.empty()) {
        const OcctRevolvedToolSegment& lastSegment = result.spec.profile.segments.back();
        if (lastSegment.hasEnd && !PointsCoincident(result.spec.profile.start, lastSegment.end)) {
            AddDiagnostic(
                result,
                "profile-not-closed",
                "Explicit profiles must end at the same point as profile.start.",
                "profile.segments");
        }
    }
}

void ParseUnits(const val& jsSpec, OcctRevolvedToolValidationResult& result)
{
    val jsUnits = val::undefined();
    if (!TryGetOwnProperty(jsSpec, "units", jsUnits)) {
        AddDiagnostic(result, "missing-field", "Spec.units is required.", "units");
        return;
    }
    if (!IsString(jsUnits)) {
        AddDiagnostic(result, "invalid-type", "Expected a string value.", "units");
        return;
    }
    result.spec.units = jsUnits.as<std::string>();

    if (result.spec.units != "mm" && result.spec.units != "inch") {
        AddDiagnostic(result, "unsupported-unit", "Supported units are mm and inch.", "units");
    }
}

void ParseVersion(const val& jsSpec, OcctRevolvedToolValidationResult& result)
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
        AddDiagnostic(result, "unsupported-version", "Only revolved tool spec version 1 is supported.", "version");
        return;
    }

    result.spec.version = static_cast<int>(version);
}

void ParseRevolve(const val& jsSpec, OcctRevolvedToolValidationResult& result)
{
    val jsRevolve = val::undefined();
    if (!TryGetOwnProperty(jsSpec, "revolve", jsRevolve)) {
        return;
    }
    if (!IsObject(jsRevolve)) {
        AddDiagnostic(result, "invalid-type", "Spec.revolve must be an object.", "revolve");
        return;
    }

    val jsAngleDeg = val::undefined();
    if (!TryGetOwnProperty(jsRevolve, "angleDeg", jsAngleDeg)) {
        return;
    }
    if (!IsNumber(jsAngleDeg)) {
        AddDiagnostic(result, "invalid-type", "Spec.revolve.angleDeg must be a number.", "revolve.angleDeg");
        return;
    }

    const double angleDeg = jsAngleDeg.as<double>();
    result.spec.angleDeg = angleDeg;
    if (!std::isfinite(angleDeg) || angleDeg <= 0.0 || angleDeg > 360.0) {
        AddDiagnostic(result, "invalid-revolve-angle", "Revolve angle must be > 0 and <= 360 degrees.", "revolve.angleDeg");
    }
}

} // anonymous namespace

OcctRevolvedToolValidationResult ValidateRevolvedToolSpec(const val& jsSpec)
{
    OcctRevolvedToolValidationResult result;
    if (!IsObject(jsSpec)) {
        AddDiagnostic(result, "invalid-spec", "Revolved tool spec must be an object.");
        return result;
    }

    ParseVersion(jsSpec, result);
    ParseUnits(jsSpec, result);

    val jsProfile = val::undefined();
    if (TryGetOwnProperty(jsSpec, "profile", jsProfile)) {
        ParseProfile(jsProfile, result);
    } else {
        AddDiagnostic(result, "missing-field", "Spec.profile is required.", "profile");
    }

    ParseRevolve(jsSpec, result);

    result.ok = result.diagnostics.empty();
    result.hasSpec = result.ok;
    return result;
}
