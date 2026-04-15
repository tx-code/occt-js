#include "exact-query.hpp"

#include "exact-model-store.hpp"

#include <BRepExtrema_DistShapeShape.hxx>
#include <BRepClass_FaceClassifier.hxx>
#include <BRepAdaptor_Curve.hxx>
#include <BRepLProp_SLProps.hxx>
#include <BRepAdaptor_Surface.hxx>
#include <GProp_GProps.hxx>
#include <BRepGProp.hxx>
#include <BRepTools.hxx>
#include <BRep_Tool.hxx>
#include <GeomAPI_ProjectPointOnSurf.hxx>
#include <Precision.hxx>
#include <Standard_Failure.hxx>
#include <TopAbs_State.hxx>
#include <TopAbs_ShapeEnum.hxx>
#include <TopAbs_Orientation.hxx>
#include <TopExp.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopoDS.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Face.hxx>
#include <TopoDS_Vertex.hxx>
#include <TopLoc_Location.hxx>
#include <gp_Circ.hxx>
#include <gp_Cone.hxx>
#include <gp_Cylinder.hxx>
#include <gp_Dir.hxx>
#include <gp_Lin.hxx>
#include <gp_Pnt.hxx>
#include <gp_Pln.hxx>
#include <gp_Sphere.hxx>
#include <gp_Torus.hxx>
#include <gp_Vec.hxx>
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

gp_Pnt Midpoint(const gp_Pnt& left, const gp_Pnt& right)
{
    return gp_Pnt(
        0.5 * (left.X() + right.X()),
        0.5 * (left.Y() + right.Y()),
        0.5 * (left.Z() + right.Z())
    );
}

gp_Pnt ToPoint(const std::array<double, 3>& point)
{
    return gp_Pnt(point[0], point[1], point[2]);
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

OcctLifecycleResult ResolveVertex(
    int exactModelId,
    int exactShapeHandle,
    int elementId,
    TopoDS_Vertex& vertex)
{
    ExactModelEntry entry;
    TopoDS_Shape geometryShape;
    OcctLifecycleResult lifecycle = LookupGeometryShape(exactModelId, exactShapeHandle, entry, geometryShape);
    if (!lifecycle.ok) {
        return lifecycle;
    }

    TopTools_IndexedMapOfShape vertices;
    TopExp::MapShapes(geometryShape, TopAbs_VERTEX, vertices);
    if (elementId <= 0 || elementId > vertices.Extent()) {
        return MakeFailure<OcctLifecycleResult>("invalid-id", "Requested vertex id is out of range for this exact geometry.");
    }

    vertex = TopoDS::Vertex(vertices(elementId));
    if (vertex.IsNull()) {
        return MakeFailure<OcctLifecycleResult>("invalid-id", "Requested vertex id did not resolve to a retained exact vertex.");
    }

    OcctLifecycleResult ok;
    ok.ok = true;
    return ok;
}

OcctLifecycleResult ResolveElementShape(
    int exactModelId,
    int exactShapeHandle,
    const std::string& kind,
    int elementId,
    TopoDS_Shape& shape)
{
    const std::string normalizedKind = NormalizeKind(kind);
    if (normalizedKind == "face") {
        TopoDS_Face face;
        OcctLifecycleResult lifecycle = ResolveFace(exactModelId, exactShapeHandle, elementId, face);
        if (!lifecycle.ok) {
            return lifecycle;
        }
        shape = face;
        OcctLifecycleResult ok;
        ok.ok = true;
        return ok;
    }

    if (normalizedKind == "edge") {
        TopoDS_Edge edge;
        OcctLifecycleResult lifecycle = ResolveEdge(exactModelId, exactShapeHandle, elementId, edge);
        if (!lifecycle.ok) {
            return lifecycle;
        }
        shape = edge;
        OcctLifecycleResult ok;
        ok.ok = true;
        return ok;
    }

    if (normalizedKind == "vertex") {
        TopoDS_Vertex vertex;
        OcctLifecycleResult lifecycle = ResolveVertex(exactModelId, exactShapeHandle, elementId, vertex);
        if (!lifecycle.ok) {
            return lifecycle;
        }
        shape = vertex;
        OcctLifecycleResult ok;
        ok.ok = true;
        return ok;
    }

    return MakeFailure<OcctLifecycleResult>("unsupported-geometry", "Exact pairwise queries only support face, edge, or vertex refs.");
}

TopoDS_Shape ApplyOccurrenceTransform(const TopoDS_Shape& shape, const gp_Trsf& transform)
{
    if (shape.IsNull()) {
        return shape;
    }
    return shape.Moved(TopLoc_Location(transform));
}

OcctLifecycleResult MeasureMinimumDistance(
    const TopoDS_Shape& shapeA,
    const TopoDS_Shape& shapeB,
    double& value,
    gp_Pnt& pointA,
    gp_Pnt& pointB)
{
    BRepExtrema_DistShapeShape distance(shapeA, shapeB, Precision::Confusion());
    if (!distance.IsDone()) {
        return MakeFailure<OcctLifecycleResult>("internal-error", "OCCT exact distance query did not complete.");
    }
    if (distance.NbSolution() <= 0) {
        return MakeFailure<OcctLifecycleResult>("internal-error", "OCCT exact distance query returned no solutions.");
    }

    value = distance.Value();
    pointA = distance.PointOnShape1(1);
    pointB = distance.PointOnShape2(1);

    OcctLifecycleResult ok;
    ok.ok = true;
    return ok;
}

bool TryMakeDirection(const gp_Pnt& from, const gp_Pnt& to, gp_Dir& direction)
{
    gp_Vec delta(from, to);
    if (delta.Magnitude() <= Precision::Confusion()) {
        return false;
    }
    direction = gp_Dir(delta);
    return true;
}

double CanonicalAngle(const double radians)
{
    constexpr double halfPi = 1.5707963267948966;
    return radians > halfPi ? 3.14159265358979323846 - radians : radians;
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

template <typename TResult>
TResult MakeUnsupportedKind(const std::string& message)
{
    return MakeFailure<TResult>("unsupported-geometry", message);
}

OcctLifecycleResult ResolveFaceProjection(
    const TopoDS_Face& face,
    const gp_Pnt& queryPoint,
    gp_Pnt& projectedPoint,
    double& u,
    double& v)
{
    TopLoc_Location surfaceLocation;
    Handle(Geom_Surface) surface = BRep_Tool::Surface(face, surfaceLocation);
    if (surface.IsNull()) {
        return MakeFailure<OcctLifecycleResult>("unsupported-geometry", "Exact face normal is not supported for faces without an evaluable surface.");
    }

    double uFirst = 0.0;
    double uLast = 0.0;
    double vFirst = 0.0;
    double vLast = 0.0;
    BRepTools::UVBounds(face, uFirst, uLast, vFirst, vLast);

    GeomAPI_ProjectPointOnSurf projector(
        queryPoint,
        surface,
        uFirst,
        uLast,
        vFirst,
        vLast,
        Precision::Confusion()
    );
    if (!projector.IsDone() || projector.NbPoints() <= 0) {
        return MakeFailure<OcctLifecycleResult>("query-out-of-range", "Exact face normal query point does not project onto the trimmed face.");
    }

    projectedPoint = projector.NearestPoint();
    projector.LowerDistanceParameters(u, v);

    BRepClass_FaceClassifier classifier(face, projectedPoint, Precision::Confusion());
    if (classifier.State() != TopAbs_IN && classifier.State() != TopAbs_ON) {
        return MakeFailure<OcctLifecycleResult>("query-out-of-range", "Exact face normal query point does not project onto the trimmed face.");
    }

    OcctLifecycleResult ok;
    ok.ok = true;
    return ok;
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

OcctExactEdgeLengthResult MeasureExactEdgeLength(
    int exactModelId,
    int exactShapeHandle,
    const std::string& kind,
    int elementId)
{
    try {
        const std::string normalizedKind = NormalizeKind(kind);
        if (normalizedKind != "edge") {
            return MakeUnsupportedKind<OcctExactEdgeLengthResult>("Exact edge length is only supported for edge refs.");
        }

        TopoDS_Edge edge;
        OcctLifecycleResult lifecycle = ResolveEdge(exactModelId, exactShapeHandle, elementId, edge);
        if (!lifecycle.ok) {
            return ConvertFailure<OcctExactEdgeLengthResult>(lifecycle);
        }

        GProp_GProps properties;
        BRepGProp::LinearProperties(edge, properties, false, false);

        BRepAdaptor_Curve curve(edge);
        OcctExactEdgeLengthResult result;
        result.ok = true;
        result.value = properties.Mass();
        result.localStartPoint = ToArray(curve.Value(curve.FirstParameter()));
        result.localEndPoint = ToArray(curve.Value(curve.LastParameter()));
        return result;
    } catch (const Standard_Failure& failure) {
        return MakeFailure<OcctExactEdgeLengthResult>(
            "internal-error",
            failure.GetMessageString() != nullptr ? failure.GetMessageString() : "OCCT exact edge length query failed."
        );
    }
}

OcctExactFaceAreaResult MeasureExactFaceArea(
    int exactModelId,
    int exactShapeHandle,
    const std::string& kind,
    int elementId)
{
    try {
        const std::string normalizedKind = NormalizeKind(kind);
        if (normalizedKind != "face") {
            return MakeUnsupportedKind<OcctExactFaceAreaResult>("Exact face area is only supported for face refs.");
        }

        TopoDS_Face face;
        OcctLifecycleResult lifecycle = ResolveFace(exactModelId, exactShapeHandle, elementId, face);
        if (!lifecycle.ok) {
            return ConvertFailure<OcctExactFaceAreaResult>(lifecycle);
        }

        GProp_GProps properties;
        BRepGProp::SurfaceProperties(face, properties, false, false);

        OcctExactFaceAreaResult result;
        result.ok = true;
        result.value = properties.Mass();
        result.localCentroid = ToArray(properties.CentreOfMass());
        return result;
    } catch (const Standard_Failure& failure) {
        return MakeFailure<OcctExactFaceAreaResult>(
            "internal-error",
            failure.GetMessageString() != nullptr ? failure.GetMessageString() : "OCCT exact face area query failed."
        );
    }
}

OcctExactFaceNormalResult EvaluateExactFaceNormal(
    int exactModelId,
    int exactShapeHandle,
    const std::string& kind,
    int elementId,
    const std::array<double, 3>& localQueryPoint)
{
    try {
        const std::string normalizedKind = NormalizeKind(kind);
        if (normalizedKind != "face") {
            return MakeUnsupportedKind<OcctExactFaceNormalResult>("Exact face normal is only supported for face refs.");
        }

        TopoDS_Face face;
        OcctLifecycleResult lifecycle = ResolveFace(exactModelId, exactShapeHandle, elementId, face);
        if (!lifecycle.ok) {
            return ConvertFailure<OcctExactFaceNormalResult>(lifecycle);
        }

        const gp_Pnt queryPoint = ToPoint(localQueryPoint);
        gp_Pnt projectedPoint;
        double u = 0.0;
        double v = 0.0;
        lifecycle = ResolveFaceProjection(face, queryPoint, projectedPoint, u, v);
        if (!lifecycle.ok) {
            return ConvertFailure<OcctExactFaceNormalResult>(lifecycle);
        }

        BRepAdaptor_Surface surface(face, false);
        BRepLProp_SLProps props(surface, u, v, 1, Precision::Confusion());
        if (!props.IsNormalDefined()) {
            return MakeFailure<OcctExactFaceNormalResult>("unsupported-geometry", "Exact face normal is not defined at the requested query point.");
        }

        gp_Dir normal = props.Normal();
        if (face.Orientation() == TopAbs_REVERSED) {
            normal.Reverse();
        }

        OcctExactFaceNormalResult result;
        result.ok = true;
        result.localPoint = ToArray(projectedPoint);
        result.localNormal = ToArray(normal);
        return result;
    } catch (const Standard_Failure& failure) {
        return MakeFailure<OcctExactFaceNormalResult>(
            "internal-error",
            failure.GetMessageString() != nullptr ? failure.GetMessageString() : "OCCT exact face normal query failed."
        );
    }
}

OcctExactDistanceResult MeasureExactDistance(
    int exactModelId,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const gp_Trsf& transformA,
    const gp_Trsf& transformB)
{
    try {
        TopoDS_Shape shapeA;
        OcctLifecycleResult lifecycle = ResolveElementShape(exactModelId, exactShapeHandleA, kindA, elementIdA, shapeA);
        if (!lifecycle.ok) {
            return ConvertFailure<OcctExactDistanceResult>(lifecycle);
        }

        TopoDS_Shape shapeB;
        lifecycle = ResolveElementShape(exactModelId, exactShapeHandleB, kindB, elementIdB, shapeB);
        if (!lifecycle.ok) {
            return ConvertFailure<OcctExactDistanceResult>(lifecycle);
        }

        shapeA = ApplyOccurrenceTransform(shapeA, transformA);
        shapeB = ApplyOccurrenceTransform(shapeB, transformB);

        double value = 0.0;
        gp_Pnt pointA;
        gp_Pnt pointB;
        lifecycle = MeasureMinimumDistance(shapeA, shapeB, value, pointA, pointB);
        if (!lifecycle.ok) {
            return ConvertFailure<OcctExactDistanceResult>(lifecycle);
        }
        if (value <= Precision::Confusion()) {
            return MakeFailure<OcctExactDistanceResult>(
                "coincident-geometry",
                "Exact distance requires geometry with a stable separation direction."
            );
        }

        gp_Dir workingPlaneNormal;
        if (!TryMakeDirection(pointA, pointB, workingPlaneNormal)) {
            return MakeFailure<OcctExactDistanceResult>(
                "coincident-geometry",
                "Exact distance requires geometry with a stable separation direction."
            );
        }

        OcctExactDistanceResult result;
        result.ok = true;
        result.value = value;
        result.pointA = ToArray(pointA);
        result.pointB = ToArray(pointB);
        result.workingPlaneOrigin = ToArray(Midpoint(pointA, pointB));
        result.workingPlaneNormal = ToArray(workingPlaneNormal);
        return result;
    } catch (const Standard_Failure& failure) {
        return MakeFailure<OcctExactDistanceResult>(
            "internal-error",
            failure.GetMessageString() != nullptr ? failure.GetMessageString() : "OCCT exact distance query failed."
        );
    }
}

OcctExactAngleResult MeasureExactAngle(
    int exactModelId,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const gp_Trsf& transformA,
    const gp_Trsf& transformB)
{
    try {
        const std::string normalizedKindA = NormalizeKind(kindA);
        const std::string normalizedKindB = NormalizeKind(kindB);
        if (normalizedKindA == "edge" && normalizedKindB == "edge") {
            TopoDS_Edge edgeA;
            OcctLifecycleResult lifecycle = ResolveEdge(exactModelId, exactShapeHandleA, elementIdA, edgeA);
            if (!lifecycle.ok) {
                return ConvertFailure<OcctExactAngleResult>(lifecycle);
            }

            TopoDS_Edge edgeB;
            lifecycle = ResolveEdge(exactModelId, exactShapeHandleB, elementIdB, edgeB);
            if (!lifecycle.ok) {
                return ConvertFailure<OcctExactAngleResult>(lifecycle);
            }

            edgeA = TopoDS::Edge(ApplyOccurrenceTransform(edgeA, transformA));
            edgeB = TopoDS::Edge(ApplyOccurrenceTransform(edgeB, transformB));

            BRepAdaptor_Curve curveA(edgeA);
            BRepAdaptor_Curve curveB(edgeB);
            if (curveA.GetType() != GeomAbs_Line || curveB.GetType() != GeomAbs_Line) {
                return MakeFailure<OcctExactAngleResult>(
                    "unsupported-geometry",
                    "Exact angle only supports line/line or plane/plane pairs."
                );
            }

            const gp_Lin lineA = curveA.Line();
            const gp_Lin lineB = curveB.Line();
            if (lineA.Position().Direction().IsParallel(lineB.Position().Direction(), Precision::Angular())) {
                return MakeFailure<OcctExactAngleResult>(
                    lineA.Distance(lineB) <= Precision::Confusion() ? "coincident-geometry" : "parallel-geometry",
                    lineA.Distance(lineB) <= Precision::Confusion()
                        ? "Exact angle is not defined for coincident planar faces or overlapping linear edges."
                        : "Exact angle is not defined for parallel planar faces or collinear linear edges."
                );
            }

            double distanceValue = 0.0;
            gp_Pnt pointA;
            gp_Pnt pointB;
            lifecycle = MeasureMinimumDistance(edgeA, edgeB, distanceValue, pointA, pointB);
            if (!lifecycle.ok) {
                return ConvertFailure<OcctExactAngleResult>(lifecycle);
            }

            gp_Dir workingPlaneNormal(gp_Vec(lineA.Direction().XYZ().Crossed(lineB.Direction().XYZ())));

            OcctExactAngleResult result;
            result.ok = true;
            result.value = CanonicalAngle(lineA.Angle(lineB));
            result.origin = ToArray(Midpoint(pointA, pointB));
            result.directionA = ToArray(lineA.Direction());
            result.directionB = ToArray(lineB.Direction());
            result.pointA = ToArray(pointA);
            result.pointB = ToArray(pointB);
            result.workingPlaneOrigin = ToArray(Midpoint(pointA, pointB));
            result.workingPlaneNormal = ToArray(workingPlaneNormal);
            return result;
        }

        if (normalizedKindA == "face" && normalizedKindB == "face") {
            TopoDS_Face faceA;
            OcctLifecycleResult lifecycle = ResolveFace(exactModelId, exactShapeHandleA, elementIdA, faceA);
            if (!lifecycle.ok) {
                return ConvertFailure<OcctExactAngleResult>(lifecycle);
            }

            TopoDS_Face faceB;
            lifecycle = ResolveFace(exactModelId, exactShapeHandleB, elementIdB, faceB);
            if (!lifecycle.ok) {
                return ConvertFailure<OcctExactAngleResult>(lifecycle);
            }

            faceA = TopoDS::Face(ApplyOccurrenceTransform(faceA, transformA));
            faceB = TopoDS::Face(ApplyOccurrenceTransform(faceB, transformB));

            BRepAdaptor_Surface surfaceA(faceA, false);
            BRepAdaptor_Surface surfaceB(faceB, false);
            if (surfaceA.GetType() != GeomAbs_Plane || surfaceB.GetType() != GeomAbs_Plane) {
                return MakeFailure<OcctExactAngleResult>(
                    "unsupported-geometry",
                    "Exact angle only supports line/line or plane/plane pairs."
                );
            }

            const gp_Pln planeA = surfaceA.Plane();
            const gp_Pln planeB = surfaceB.Plane();
            if (planeA.Axis().Direction().IsParallel(planeB.Axis().Direction(), Precision::Angular())) {
                return MakeFailure<OcctExactAngleResult>(
                    planeA.Distance(planeB) <= Precision::Confusion() ? "coincident-geometry" : "parallel-geometry",
                    planeA.Distance(planeB) <= Precision::Confusion()
                        ? "Exact angle is not defined for coincident planar faces or overlapping linear edges."
                        : "Exact angle is not defined for parallel planar faces or collinear linear edges."
                );
            }

            double distanceValue = 0.0;
            gp_Pnt pointA;
            gp_Pnt pointB;
            lifecycle = MeasureMinimumDistance(faceA, faceB, distanceValue, pointA, pointB);
            if (!lifecycle.ok) {
                return ConvertFailure<OcctExactAngleResult>(lifecycle);
            }

            gp_Dir workingPlaneNormal(gp_Vec(planeA.Axis().Direction().XYZ().Crossed(planeB.Axis().Direction().XYZ())));

            OcctExactAngleResult result;
            result.ok = true;
            result.value = CanonicalAngle(planeA.Axis().Direction().Angle(planeB.Axis().Direction()));
            result.origin = ToArray(Midpoint(pointA, pointB));
            result.directionA = ToArray(planeA.Axis().Direction());
            result.directionB = ToArray(planeB.Axis().Direction());
            result.pointA = ToArray(pointA);
            result.pointB = ToArray(pointB);
            result.workingPlaneOrigin = ToArray(Midpoint(pointA, pointB));
            result.workingPlaneNormal = ToArray(workingPlaneNormal);
            return result;
        }

        return MakeFailure<OcctExactAngleResult>(
            "unsupported-geometry",
            "Exact angle only supports line/line or plane/plane pairs."
        );
    } catch (const Standard_Failure& failure) {
        return MakeFailure<OcctExactAngleResult>(
            "internal-error",
            failure.GetMessageString() != nullptr ? failure.GetMessageString() : "OCCT exact angle query failed."
        );
    }
}
