#include "exact-query.hpp"

#include "exact-model-store.hpp"

#include <BRepAdaptor_Curve.hxx>
#include <BRepAdaptor_Surface.hxx>
#include <BRepTools.hxx>
#include <GProp_GProps.hxx>
#include <BRepGProp.hxx>
#include <Standard_Failure.hxx>
#include <TopAbs_ShapeEnum.hxx>
#include <TopExp.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopoDS.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Face.hxx>
#include <gp_Circ.hxx>
#include <gp_Cone.hxx>
#include <gp_Cylinder.hxx>
#include <gp_Dir.hxx>
#include <gp_Pnt.hxx>
#include <gp_Sphere.hxx>
#include <gp_Torus.hxx>
#include <GeomAbs_CurveType.hxx>
#include <GeomAbs_SurfaceType.hxx>

#include <algorithm>
#include <cctype>

namespace {

template <typename TResult>
TResult MakeFailure(const std::string& code, const std::string& message)
{
    TResult result;
    result.ok = false;
    result.code = code;
    result.message = message;
    return result;
}

std::string NormalizeKind(const std::string& kind)
{
    std::string normalized = kind;
    std::transform(normalized.begin(), normalized.end(), normalized.begin(), [](unsigned char c) {
        return static_cast<char>(std::tolower(c));
    });
    return normalized;
}

std::array<double, 3> ToArray(const gp_Pnt& point)
{
    return { point.X(), point.Y(), point.Z() };
}

std::array<double, 3> ToArray(const gp_Dir& direction)
{
    return { direction.X(), direction.Y(), direction.Z() };
}

template <typename TResult>
TResult ConvertFailure(const OcctLifecycleResult& lifecycle)
{
    return MakeFailure<TResult>(lifecycle.code, lifecycle.message);
}

OcctLifecycleResult LookupGeometryShape(
    int exactModelId,
    int exactShapeHandle,
    ExactModelEntry& entry,
    TopoDS_Shape& geometryShape)
{
    OcctLifecycleResult lifecycle = ExactModelStore::Instance().GetEntry(exactModelId, entry);
    if (!lifecycle.ok) {
        return lifecycle;
    }

    if (exactShapeHandle <= 0 || exactShapeHandle > static_cast<int>(entry.exactGeometryShapes.size())) {
        return MakeFailure<OcctLifecycleResult>("invalid-id", "Exact shape handle is out of range for this model.");
    }

    geometryShape = entry.exactGeometryShapes[exactShapeHandle - 1];
    if (geometryShape.IsNull()) {
        return MakeFailure<OcctLifecycleResult>("invalid-id", "Exact shape handle does not reference a retained geometry definition.");
    }

    OcctLifecycleResult ok;
    ok.ok = true;
    return ok;
}

OcctLifecycleResult ResolveFace(
    int exactModelId,
    int exactShapeHandle,
    int elementId,
    TopoDS_Face& face)
{
    ExactModelEntry entry;
    TopoDS_Shape geometryShape;
    OcctLifecycleResult lifecycle = LookupGeometryShape(exactModelId, exactShapeHandle, entry, geometryShape);
    if (!lifecycle.ok) {
        return lifecycle;
    }

    TopTools_IndexedMapOfShape faces;
    TopExp::MapShapes(geometryShape, TopAbs_FACE, faces);
    if (elementId <= 0 || elementId > faces.Extent()) {
        return MakeFailure<OcctLifecycleResult>("invalid-id", "Requested face id is out of range for this exact geometry.");
    }

    face = TopoDS::Face(faces(elementId));
    if (face.IsNull()) {
        return MakeFailure<OcctLifecycleResult>("invalid-id", "Requested face id did not resolve to a retained exact face.");
    }

    OcctLifecycleResult ok;
    ok.ok = true;
    return ok;
}

OcctLifecycleResult ResolveEdge(
    int exactModelId,
    int exactShapeHandle,
    int elementId,
    TopoDS_Edge& edge)
{
    ExactModelEntry entry;
    TopoDS_Shape geometryShape;
    OcctLifecycleResult lifecycle = LookupGeometryShape(exactModelId, exactShapeHandle, entry, geometryShape);
    if (!lifecycle.ok) {
        return lifecycle;
    }

    TopTools_IndexedMapOfShape edges;
    TopExp::MapShapes(geometryShape, TopAbs_EDGE, edges);
    if (elementId <= 0 || elementId > edges.Extent()) {
        return MakeFailure<OcctLifecycleResult>("invalid-id", "Requested edge id is out of range for this exact geometry.");
    }

    edge = TopoDS::Edge(edges(elementId));
    if (edge.IsNull()) {
        return MakeFailure<OcctLifecycleResult>("invalid-id", "Requested edge id did not resolve to a retained exact edge.");
    }

    OcctLifecycleResult ok;
    ok.ok = true;
    return ok;
}

std::string FamilyFromSurfaceType(const GeomAbs_SurfaceType type)
{
    switch (type) {
        case GeomAbs_Plane:
            return "plane";
        case GeomAbs_Cylinder:
            return "cylinder";
        case GeomAbs_Cone:
            return "cone";
        case GeomAbs_Sphere:
            return "sphere";
        case GeomAbs_Torus:
            return "torus";
        default:
            return "other";
    }
}

std::string FamilyFromCurveType(const GeomAbs_CurveType type)
{
    switch (type) {
        case GeomAbs_Line:
            return "line";
        case GeomAbs_Circle:
            return "circle";
        default:
            return "other";
    }
}

gp_Pnt SampleFacePoint(const TopoDS_Face& face, BRepAdaptor_Surface& surface)
{
    double uFirst = 0.0;
    double uLast = 0.0;
    double vFirst = 0.0;
    double vLast = 0.0;
    BRepTools::UVBounds(face, uFirst, uLast, vFirst, vLast);
    return surface.Value(0.5 * (uFirst + uLast), 0.5 * (vFirst + vLast));
}

} // namespace

OcctExactGeometryTypeResult GetExactGeometryType(
    int exactModelId,
    int exactShapeHandle,
    const std::string& kind,
    int elementId)
{
    try {
        const std::string normalizedKind = NormalizeKind(kind);
        if (normalizedKind == "face") {
            TopoDS_Face face;
            OcctLifecycleResult lifecycle = ResolveFace(exactModelId, exactShapeHandle, elementId, face);
            if (!lifecycle.ok) {
                return ConvertFailure<OcctExactGeometryTypeResult>(lifecycle);
            }

            BRepAdaptor_Surface surface(face, false);
            OcctExactGeometryTypeResult result;
            result.ok = true;
            result.family = FamilyFromSurfaceType(surface.GetType());
            return result;
        }

        if (normalizedKind == "edge") {
            TopoDS_Edge edge;
            OcctLifecycleResult lifecycle = ResolveEdge(exactModelId, exactShapeHandle, elementId, edge);
            if (!lifecycle.ok) {
                return ConvertFailure<OcctExactGeometryTypeResult>(lifecycle);
            }

            BRepAdaptor_Curve curve(edge);
            OcctExactGeometryTypeResult result;
            result.ok = true;
            result.family = FamilyFromCurveType(curve.GetType());
            return result;
        }

        return MakeFailure<OcctExactGeometryTypeResult>("unsupported-kind", "Exact geometry type is only supported for face or edge refs.");
    } catch (const Standard_Failure& failure) {
        return MakeFailure<OcctExactGeometryTypeResult>(
            "internal-error",
            failure.GetMessageString() != nullptr ? failure.GetMessageString() : "OCCT exact geometry type query failed."
        );
    }
}

OcctExactRadiusResult MeasureExactRadius(
    int exactModelId,
    int exactShapeHandle,
    const std::string& kind,
    int elementId)
{
    try {
        const std::string normalizedKind = NormalizeKind(kind);
        if (normalizedKind == "edge") {
            TopoDS_Edge edge;
            OcctLifecycleResult lifecycle = ResolveEdge(exactModelId, exactShapeHandle, elementId, edge);
            if (!lifecycle.ok) {
                return ConvertFailure<OcctExactRadiusResult>(lifecycle);
            }

            BRepAdaptor_Curve curve(edge);
            if (curve.GetType() != GeomAbs_Circle) {
                return MakeFailure<OcctExactRadiusResult>("unsupported-geometry", "Exact radius is not supported for the requested element.");
            }

            gp_Circ circle = curve.Circle();
            const double midParam = 0.5 * (curve.FirstParameter() + curve.LastParameter());
            OcctExactRadiusResult result;
            result.ok = true;
            result.family = "circle";
            result.radius = circle.Radius();
            result.diameter = result.radius * 2.0;
            result.localCenter = ToArray(circle.Location());
            result.localAnchorPoint = ToArray(curve.Value(midParam));
            result.localAxisDirection = ToArray(circle.Axis().Direction());
            return result;
        }

        if (normalizedKind == "face") {
            TopoDS_Face face;
            OcctLifecycleResult lifecycle = ResolveFace(exactModelId, exactShapeHandle, elementId, face);
            if (!lifecycle.ok) {
                return ConvertFailure<OcctExactRadiusResult>(lifecycle);
            }

            BRepAdaptor_Surface surface(face, false);
            OcctExactRadiusResult result;
            if (surface.GetType() == GeomAbs_Cylinder) {
                gp_Cylinder cylinder = surface.Cylinder();
                result.ok = true;
                result.family = "cylinder";
                result.radius = cylinder.Radius();
                result.diameter = result.radius * 2.0;
                result.localCenter = ToArray(cylinder.Location());
                result.localAnchorPoint = ToArray(SampleFacePoint(face, surface));
                result.localAxisDirection = ToArray(cylinder.Axis().Direction());
                return result;
            }

            if (surface.GetType() == GeomAbs_Sphere) {
                gp_Sphere sphere = surface.Sphere();
                result.ok = true;
                result.family = "sphere";
                result.radius = sphere.Radius();
                result.diameter = result.radius * 2.0;
                result.localCenter = ToArray(sphere.Location());
                result.localAnchorPoint = ToArray(SampleFacePoint(face, surface));
                result.localAxisDirection = { 0.0, 0.0, 0.0 };
                return result;
            }

            return MakeFailure<OcctExactRadiusResult>("unsupported-geometry", "Exact radius is not supported for the requested element.");
        }

        return MakeFailure<OcctExactRadiusResult>("unsupported-kind", "Exact radius is only supported for face or edge refs.");
    } catch (const Standard_Failure& failure) {
        return MakeFailure<OcctExactRadiusResult>(
            "internal-error",
            failure.GetMessageString() != nullptr ? failure.GetMessageString() : "OCCT exact radius query failed."
        );
    }
}

OcctExactCenterResult MeasureExactCenter(
    int exactModelId,
    int exactShapeHandle,
    const std::string& kind,
    int elementId)
{
    try {
        const std::string normalizedKind = NormalizeKind(kind);
        if (normalizedKind == "edge") {
            TopoDS_Edge edge;
            OcctLifecycleResult lifecycle = ResolveEdge(exactModelId, exactShapeHandle, elementId, edge);
            if (!lifecycle.ok) {
                return ConvertFailure<OcctExactCenterResult>(lifecycle);
            }

            BRepAdaptor_Curve curve(edge);
            if (curve.GetType() != GeomAbs_Circle) {
                return MakeFailure<OcctExactCenterResult>("unsupported-geometry", "Exact center is not supported for the requested element.");
            }

            gp_Circ circle = curve.Circle();
            OcctExactCenterResult result;
            result.ok = true;
            result.family = "circle";
            result.localCenter = ToArray(circle.Location());
            result.localAxisDirection = ToArray(circle.Axis().Direction());
            return result;
        }

        if (normalizedKind == "face") {
            TopoDS_Face face;
            OcctLifecycleResult lifecycle = ResolveFace(exactModelId, exactShapeHandle, elementId, face);
            if (!lifecycle.ok) {
                return ConvertFailure<OcctExactCenterResult>(lifecycle);
            }

            BRepAdaptor_Surface surface(face, false);
            OcctExactCenterResult result;
            switch (surface.GetType()) {
                case GeomAbs_Cylinder: {
                    gp_Cylinder cylinder = surface.Cylinder();
                    result.ok = true;
                    result.family = "cylinder";
                    result.localCenter = ToArray(cylinder.Location());
                    result.localAxisDirection = ToArray(cylinder.Axis().Direction());
                    return result;
                }
                case GeomAbs_Sphere: {
                    gp_Sphere sphere = surface.Sphere();
                    result.ok = true;
                    result.family = "sphere";
                    result.localCenter = ToArray(sphere.Location());
                    result.localAxisDirection = { 0.0, 0.0, 0.0 };
                    return result;
                }
                case GeomAbs_Cone: {
                    gp_Cone cone = surface.Cone();
                    result.ok = true;
                    result.family = "cone";
                    result.localCenter = ToArray(cone.Apex());
                    result.localAxisDirection = ToArray(cone.Axis().Direction());
                    return result;
                }
                case GeomAbs_Torus: {
                    gp_Torus torus = surface.Torus();
                    result.ok = true;
                    result.family = "torus";
                    result.localCenter = ToArray(torus.Location());
                    result.localAxisDirection = ToArray(torus.Axis().Direction());
                    return result;
                }
                default:
                    return MakeFailure<OcctExactCenterResult>("unsupported-geometry", "Exact center is not supported for the requested element.");
            }
        }

        return MakeFailure<OcctExactCenterResult>("unsupported-kind", "Exact center is only supported for face or edge refs.");
    } catch (const Standard_Failure& failure) {
        return MakeFailure<OcctExactCenterResult>(
            "internal-error",
            failure.GetMessageString() != nullptr ? failure.GetMessageString() : "OCCT exact center query failed."
        );
    }
}
