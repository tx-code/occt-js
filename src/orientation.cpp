#include "orientation.hpp"

#include "importer-iges-staging.hpp"
#include "importer-utils.hpp"

#include <algorithm>
#include <array>
#include <cctype>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <istream>
#include <limits>
#include <optional>
#include <streambuf>
#include <string>
#include <utility>
#include <vector>

#include <BRepAdaptor_Curve.hxx>
#include <BRepAdaptor_Surface.hxx>
#include <BRepBndLib.hxx>
#include <BRep_Builder.hxx>
#include <BRepBuilderAPI_Transform.hxx>
#include <BRepGProp.hxx>
#include <BRepLib.hxx>
#include <BRepTools.hxx>
#include <Bnd_Box.hxx>
#include <GCPnts_TangentialDeflection.hxx>
#include <GProp_GProps.hxx>
#include <GProp_PrincipalProps.hxx>
#include <GeomAbs_SurfaceType.hxx>
#include <GeomAdaptor_Curve.hxx>
#include <HLRAlgo_Projector.hxx>
#include <HLRBRep_PolyAlgo.hxx>
#include <HLRBRep_PolyHLRToShape.hxx>
#include <IFSelect_ReturnStatus.hxx>
#include <IGESCAFControl_Reader.hxx>
#include <Quantity_Color.hxx>
#include <STEPCAFControl_Reader.hxx>
#include <STEPControl_Reader.hxx>
#include <Standard_ArrayStreamBuffer.hxx>
#include <Standard_Failure.hxx>
#include <TDF_LabelSequence.hxx>
#include <TDocStd_Document.hxx>
#include <TopExp_Explorer.hxx>
#include <TopoDS.hxx>
#include <TopoDS_Compound.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Face.hxx>
#include <TopAbs_Orientation.hxx>
#include <TopLoc_Location.hxx>
#include <UnitsMethods.hxx>
#include <XCAFApp_Application.hxx>
#include <XCAFDoc_DocumentTool.hxx>
#include <XCAFDoc_ShapeTool.hxx>
#include <gp.hxx>
#include <gp_Ax1.hxx>
#include <gp_Ax2.hxx>
#include <gp_Ax3.hxx>
#include <gp_Dir.hxx>
#include <gp_Pln.hxx>
#include <gp_Pnt.hxx>
#include <gp_Trsf.hxx>
#include <gp_Vec.hxx>

namespace {

struct LoadedShape {
    bool success = false;
    std::string error;
    TopoDS_Shape shape;
    std::string sourceUnit;
    double unitScaleToMeters = 0.0;
};

struct PlaneCandidate {
    int faceId = 0;
    double area = 0.0;
    gp_Ax3 frame;
};

struct Stage1Computation {
    bool success = false;
    std::string error;
    gp_Trsf transform;
    TopoDS_Shape shape;
    OrientationStage1Result diagnostics;
    std::string strategy;
    double confidence = 0.0;
};

struct Stage2Computation {
    gp_Trsf transform;
    TopoDS_Shape shape;
    OrientationStage2Result diagnostics;
    bool applied = false;
};

struct Point2 {
    double x = 0.0;
    double y = 0.0;
};

constexpr double kMinimumRelativeArea = 0.1;
constexpr double kPointTol = 1e-7;

std::array<float, 16> IdentityMatrix()
{
    return {
        1.0f, 0.0f, 0.0f, 0.0f,
        0.0f, 1.0f, 0.0f, 0.0f,
        0.0f, 0.0f, 1.0f, 0.0f,
        0.0f, 0.0f, 0.0f, 1.0f
    };
}

std::array<float, 16> TrsfToMatrix(const gp_Trsf& trsf)
{
    std::array<float, 16> m;
    m[0] = static_cast<float>(trsf.Value(1, 1));
    m[1] = static_cast<float>(trsf.Value(2, 1));
    m[2] = static_cast<float>(trsf.Value(3, 1));
    m[3] = 0.0f;
    m[4] = static_cast<float>(trsf.Value(1, 2));
    m[5] = static_cast<float>(trsf.Value(2, 2));
    m[6] = static_cast<float>(trsf.Value(3, 2));
    m[7] = 0.0f;
    m[8] = static_cast<float>(trsf.Value(1, 3));
    m[9] = static_cast<float>(trsf.Value(2, 3));
    m[10] = static_cast<float>(trsf.Value(3, 3));
    m[11] = 0.0f;
    m[12] = static_cast<float>(trsf.Value(1, 4));
    m[13] = static_cast<float>(trsf.Value(2, 4));
    m[14] = static_cast<float>(trsf.Value(3, 4));
    m[15] = 1.0f;
    return m;
}

gp_Trsf GetAlignmentTrsf(const gp_Ax3& target, const gp_Ax3& source)
{
    gp_Trsf tSource;
    tSource.SetTransformation(source);

    gp_Trsf tTarget;
    tTarget.SetTransformation(target);
    tTarget.Invert();

    return tTarget * tSource;
}

UnitsMethods_LengthUnit LinearUnitToLengthUnit(ImportParams::LinearUnit linearUnit)
{
    switch (linearUnit) {
        case ImportParams::LinearUnit::Millimeter:
            return UnitsMethods_LengthUnit_Millimeter;
        case ImportParams::LinearUnit::Centimeter:
            return UnitsMethods_LengthUnit_Centimeter;
        case ImportParams::LinearUnit::Meter:
            return UnitsMethods_LengthUnit_Meter;
        case ImportParams::LinearUnit::Inch:
            return UnitsMethods_LengthUnit_Inch;
        case ImportParams::LinearUnit::Foot:
            return UnitsMethods_LengthUnit_Foot;
        default:
            return UnitsMethods_LengthUnit_Millimeter;
    }
}

void FillUnitMetadata(const Handle(TDocStd_Document)& doc, LoadedShape& loaded)
{
    Standard_Real unitInMeters = 0.0;
    if (!XCAFDoc_DocumentTool::GetLengthUnit(doc, unitInMeters)) {
        return;
    }

    loaded.unitScaleToMeters = unitInMeters;
    if (std::abs(unitInMeters - 0.001) < 1e-9) {
        loaded.sourceUnit = "MM";
    } else if (std::abs(unitInMeters - 0.01) < 1e-9) {
        loaded.sourceUnit = "CM";
    } else if (std::abs(unitInMeters - 1.0) < 1e-9) {
        loaded.sourceUnit = "M";
    } else if (std::abs(unitInMeters - 0.0254) < 1e-6) {
        loaded.sourceUnit = "INCH";
    } else if (std::abs(unitInMeters - 0.3048) < 1e-6) {
        loaded.sourceUnit = "FOOT";
    } else {
        loaded.sourceUnit = "CUSTOM";
    }
}

bool ReadAndTransferXde(const uint8_t* data,
                        size_t size,
                        const std::string& fileName,
                        const OrientationParams& params,
                        const std::string& format,
                        const Handle(TDocStd_Document)& doc,
                        std::string& outError)
{
    Standard_ArrayStreamBuffer streamBuf(
        reinterpret_cast<const char*>(data),
        static_cast<Standard_Size>(size));
    std::istream istream(&streamBuf);

    if (format == "step") {
        STEPCAFControl_Reader cafReader;
        cafReader.SetColorMode(false);
        cafReader.SetNameMode(false);

        STEPControl_Reader& reader = cafReader.ChangeReader();
        const IFSelect_ReturnStatus readStatus = reader.ReadStream(
            fileName.empty() ? "input.stp" : fileName.c_str(),
            istream);

        if (readStatus != IFSelect_RetDone) {
            outError = "STEP reader failed to parse the file.";
            return false;
        }
        if (!cafReader.Transfer(doc)) {
            outError = "Failed to transfer STEP data to XDE document.";
            return false;
        }
        return true;
    }

    if (format == "iges") {
        IGESCAFControl_Reader cafReader;
        cafReader.SetColorMode(false);
        cafReader.SetNameMode(false);

        if (!ReadIgesFromMemoryViaTempFile(data, size, fileName, cafReader, outError)) {
            return false;
        }
        if (!cafReader.Transfer(doc)) {
            outError = "Failed to transfer IGES data to XDE document.";
            return false;
        }
        return true;
    }

    outError = "Unsupported XDE format: " + format;
    return false;
}

LoadedShape LoadXdeShapeFromMemory(const uint8_t* data,
                                   size_t size,
                                   const std::string& fileName,
                                   const OrientationParams& params,
                                   const std::string& format)
{
    LoadedShape loaded;

    Handle(XCAFApp_Application) app = XCAFApp_Application::GetApplication();
    Handle(TDocStd_Document) doc;
    app->NewDocument("BinXCAF", doc);

    if (doc.IsNull()) {
        loaded.error = "Failed to create XDE document.";
        return loaded;
    }

    XCAFDoc_DocumentTool::SetLengthUnit(doc, 1.0, LinearUnitToLengthUnit(params.linearUnit));

    std::string readError;
    if (!ReadAndTransferXde(data, size, fileName, params, format, doc, readError)) {
        loaded.error = readError;
        app->Close(doc);
        return loaded;
    }

    FillUnitMetadata(doc, loaded);

    Handle(XCAFDoc_ShapeTool) shapeTool = XCAFDoc_DocumentTool::ShapeTool(doc->Main());
    TDF_LabelSequence freeShapes;
    shapeTool->GetFreeShapes(freeShapes);
    if (freeShapes.Length() == 0) {
        loaded.error = "No shapes found in source file.";
        app->Close(doc);
        return loaded;
    }

    loaded.shape = shapeTool->GetOneShape();
    if (loaded.shape.IsNull()) {
        loaded.error = "Failed to build a single imported shape.";
        app->Close(doc);
        return loaded;
    }

    loaded.success = true;
    app->Close(doc);
    return loaded;
}

LoadedShape LoadBrepShapeFromMemory(const uint8_t* data,
                                    size_t size,
                                    const std::string& /*fileName*/,
                                    const OrientationParams& /*params*/)
{
    LoadedShape loaded;

    Standard_ArrayStreamBuffer streamBuf(
        reinterpret_cast<const char*>(data),
        static_cast<Standard_Size>(size));
    std::istream istream(&streamBuf);

    TopoDS_Shape shape;
    BRep_Builder builder;
    BRepTools::Read(shape, istream, builder);

    if (shape.IsNull()) {
        loaded.error = "BREP reader failed to parse the file.";
        return loaded;
    }

    loaded.shape = shape;
    loaded.success = true;
    return loaded;
}

LoadedShape LoadShapeFromMemory(const std::string& format,
                                const uint8_t* data,
                                size_t size,
                                const OrientationParams& params)
{
    std::string normalizedFormat = format;
    std::transform(normalizedFormat.begin(), normalizedFormat.end(), normalizedFormat.begin(), [](unsigned char c) {
        return static_cast<char>(std::tolower(c));
    });

    if (normalizedFormat == "step") {
        return LoadXdeShapeFromMemory(data, size, "input.stp", params, normalizedFormat);
    }
    if (normalizedFormat == "iges") {
        return LoadXdeShapeFromMemory(data, size, "input.igs", params, normalizedFormat);
    }
    if (normalizedFormat == "brep") {
        return LoadBrepShapeFromMemory(data, size, "input.brep", params);
    }

    LoadedShape loaded;
    loaded.error = "Unsupported format: " + format;
    return loaded;
}

ImportParams BuildMeshingParams(const OrientationParams& params)
{
    ImportParams meshParams;
    meshParams.linearUnit = params.linearUnit;
    return meshParams;
}

bool GetBoundingBox(const TopoDS_Shape& shape,
                    double& xmin,
                    double& ymin,
                    double& zmin,
                    double& xmax,
                    double& ymax,
                    double& zmax)
{
    Bnd_Box box;
    BRepBndLib::Add(shape, box);
    if (box.IsVoid()) {
        return false;
    }

    box.Get(xmin, ymin, zmin, xmax, ymax, zmax);
    return std::isfinite(xmin) && std::isfinite(ymin) && std::isfinite(zmin)
        && std::isfinite(xmax) && std::isfinite(ymax) && std::isfinite(zmax);
}

double ComputeBasisArea(const TopoDS_Shape& shape)
{
    double xmin = 0.0;
    double ymin = 0.0;
    double zmin = 0.0;
    double xmax = 0.0;
    double ymax = 0.0;
    double zmax = 0.0;
    if (!GetBoundingBox(shape, xmin, ymin, zmin, xmax, ymax, zmax)) {
        return 1.0;
    }

    const double dx = std::max(0.0, xmax - xmin);
    const double dy = std::max(0.0, ymax - ymin);
    const double dz = std::max(0.0, zmax - zmin);
    const double volume = dx * dy * dz;
    if (volume > 1e-12) {
        return std::pow(volume, 2.0 / 3.0);
    }

    const double maxProjectedArea = std::max({dx * dy, dx * dz, dy * dz, 1e-9});
    return maxProjectedArea;
}

double ComputeFaceArea(const TopoDS_Face& face)
{
    GProp_GProps props;
    BRepGProp::SurfaceProperties(face, props);
    return props.Mass();
}

gp_Dir NormalizeDir(const std::array<double, 3>& v)
{
    gp_Vec vec(v[0], v[1], v[2]);
    if (vec.Magnitude() <= gp::Resolution()) {
        return gp::DZ();
    }
    return gp_Dir(vec);
}

gp_Pnt MakePoint(const std::array<double, 3>& p)
{
    return gp_Pnt(p[0], p[1], p[2]);
}

gp_Ax3 MakePresetAx3(const OrientationAxisInput& axis)
{
    return gp_Ax3(MakePoint(axis.origin), NormalizeDir(axis.direction));
}

Stage1Computation ComputeStage1(const TopoDS_Shape& inputShape, const OrientationParams& params)
{
    Stage1Computation stage1;
    stage1.transform.SetTransformation(gp_Ax3());
    stage1.shape = inputShape;
    stage1.diagnostics.detectedAxis = {0.0, 0.0, 1.0};

    if (params.presetAxis.isSet) {
        const gp_Ax3 presetAx = MakePresetAx3(params.presetAxis);
        stage1.transform = GetAlignmentTrsf(gp_Ax3(gp::Origin(), gp::DZ()), presetAx);
        stage1.shape = BRepBuilderAPI_Transform(inputShape, stage1.transform, true).Shape();
        stage1.diagnostics.detectedAxis = {
            presetAx.Direction().X(),
            presetAx.Direction().Y(),
            presetAx.Direction().Z()
        };
        stage1.strategy = "preset-axis";
        stage1.confidence = 0.85;
        stage1.success = true;
        return stage1;
    }

    const double basisArea = ComputeBasisArea(inputShape);
    std::vector<PlaneCandidate> planeCandidates;
    std::vector<gp_Dir> cylinderAxes;
    int planarFaceCount = 0;
    int cylindricalFaceCount = 0;
    int otherSurfaceCount = 0;

    int faceId = 0;
    for (TopExp_Explorer exp(inputShape, TopAbs_FACE); exp.More(); exp.Next()) {
        ++faceId;
        const TopoDS_Face& face = TopoDS::Face(exp.Current());
        BRepAdaptor_Surface surface(face, false);

        if (surface.GetType() == GeomAbs_Plane) {
            ++planarFaceCount;
            const double faceArea = ComputeFaceArea(face);
            if (basisArea > 0.0 && faceArea / basisArea < kMinimumRelativeArea) {
                continue;
            }

            gp_Ax3 candidateAx = surface.Plane().Position();
            if (face.Orientation() != TopAbs_REVERSED) {
                candidateAx.XReverse();
                candidateAx.ZReverse();
            }

            planeCandidates.push_back({faceId, faceArea, candidateAx});
        } else if (surface.GetType() == GeomAbs_Cylinder) {
            ++cylindricalFaceCount;
            cylinderAxes.push_back(surface.Cylinder().Axis().Direction());
        } else {
            ++otherSurfaceCount;
        }
    }

    std::sort(planeCandidates.begin(), planeCandidates.end(), [](const PlaneCandidate& a, const PlaneCandidate& b) {
        return a.area > b.area;
    });

    std::optional<gp_Ax3> resultAx;
    for (const PlaneCandidate& candidate : planeCandidates) {
        if (!resultAx.has_value()) {
            resultAx = candidate.frame;
            stage1.diagnostics.baseFaceId = candidate.faceId;
            stage1.diagnostics.hasBaseFaceId = true;
            stage1.strategy = "largest-planar-base";
            stage1.confidence = 0.8;
        }

        const bool hasCylinderSupport = std::any_of(cylinderAxes.begin(), cylinderAxes.end(), [&](const gp_Dir& cylAxis) {
            return cylAxis.IsParallel(candidate.frame.Axis().Direction(), Precision::Angular());
        });

        if (!hasCylinderSupport) {
            continue;
        }

        resultAx = candidate.frame;
        stage1.diagnostics.baseFaceId = candidate.faceId;
        stage1.diagnostics.hasBaseFaceId = true;
        stage1.diagnostics.usedCylinderSupport = true;
        stage1.strategy = "planar-base-with-cylinder-support";
        stage1.confidence = 0.95;
        break;
    }

    if (!resultAx.has_value() && !cylinderAxes.empty()) {
        int bestCount = -1;
        gp_Dir bestAxis = cylinderAxes.front();

        for (const gp_Dir& candidateAxis : cylinderAxes) {
            const int currentCount = static_cast<int>(std::count_if(cylinderAxes.begin(), cylinderAxes.end(), [&](const gp_Dir& other) {
                return candidateAxis.IsParallel(other, Precision::Angular());
            }));

            if (currentCount > bestCount) {
                bestCount = currentCount;
                bestAxis = candidateAxis;
            }
        }

        resultAx = gp_Ax3(gp::Origin(), bestAxis);
        stage1.strategy = "dominant-cylinder-axis";
        stage1.confidence = 0.65;
    }

    if (!resultAx.has_value()) {
        GProp_GProps props;
        BRepGProp::VolumeProperties(inputShape, props, 1.0e-4);
        if (props.Mass() <= gp::Resolution()) {
            BRepGProp::SurfaceProperties(inputShape, props);
        }

        if (props.Mass() > gp::Resolution()) {
            const GProp_PrincipalProps principal = props.PrincipalProperties();
            const gp_Vec principalX = principal.ThirdAxisOfInertia();
            const gp_Vec principalZ = principal.FirstAxisOfInertia();

            if (principalX.Magnitude() > gp::Resolution() && principalZ.Magnitude() > gp::Resolution()) {
                const gp_Pnt origin = props.CentreOfMass();
                const gp_Dir xDir(principalX);
                const gp_Dir zDir(principalZ);
                resultAx = gp_Ax3(origin, zDir, xDir);
                stage1.strategy = "principal-inertia-fallback";
                stage1.confidence = 0.5;
            }
        }
    }

    if (!resultAx.has_value()) {
        stage1.error = "Failed to detect a machining-oriented axis.";
        return stage1;
    }

    stage1.transform = GetAlignmentTrsf(gp_Ax3(gp::Origin(), gp::DZ()), resultAx.value());
    stage1.shape = BRepBuilderAPI_Transform(inputShape, stage1.transform, true).Shape();
    stage1.diagnostics.detectedAxis = {
        resultAx->Direction().X(),
        resultAx->Direction().Y(),
        resultAx->Direction().Z()
    };
    stage1.success = true;
    return stage1;
}

const TopoDS_Shape& Build3dCurves(const TopoDS_Shape& shape)
{
    for (TopExp_Explorer it(shape, TopAbs_EDGE); it.More(); it.Next()) {
        BRepLib::BuildCurve3d(TopoDS::Edge(it.Current()));
    }
    return shape;
}

TopoDS_Shape BuildDiscreteProjection(const TopoDS_Shape& shape)
{
    gp_Ax2 transform(gp::Origin(), gp::DZ());
    HLRAlgo_Projector projector(transform);

    Handle(HLRBRep_PolyAlgo) polyAlgo = new HLRBRep_PolyAlgo;
    polyAlgo->Projector(projector);
    polyAlgo->Load(shape);
    polyAlgo->Update();

    HLRBRep_PolyHLRToShape shapes;
    shapes.Update(polyAlgo);

    TopoDS_Compound compound;
    BRep_Builder builder;
    builder.MakeCompound(compound);

    auto addIfValid = [&](const TopoDS_Shape& projected) {
        if (!projected.IsNull()) {
            builder.Add(compound, Build3dCurves(projected));
        }
    };

    addIfValid(shapes.VCompound());
    addIfValid(shapes.Rg1LineVCompound());
    addIfValid(shapes.RgNLineVCompound());
    addIfValid(shapes.OutLineVCompound());

    return compound;
}

void AppendUniquePoint(std::vector<gp_Pnt>& points, const gp_Pnt& point)
{
    for (const gp_Pnt& existing : points) {
        if (existing.Distance(point) < Precision::Confusion()) {
            return;
        }
    }
    points.push_back(point);
}

std::vector<gp_Pnt> ExtractSamplePoints(const TopoDS_Shape& shape)
{
    const double linearTol = 0.001;
    const double angularTol = 1.0 * M_PI / 180.0;

    std::vector<gp_Pnt> points;

    for (TopExp_Explorer exp(shape, TopAbs_EDGE); exp.More(); exp.Next()) {
        const TopoDS_Edge& edge = TopoDS::Edge(exp.Current());
        BRepAdaptor_Curve curve(edge);

        if (curve.Curve().Curve().IsNull()) {
            BRepLib::BuildCurves3d(edge, Precision::Confusion());
            curve.Initialize(edge);
        }
        if (curve.Curve().Curve().IsNull()) {
            continue;
        }

        const double firstParam = curve.FirstParameter();
        const double lastParam = curve.LastParameter();
        const gp_Trsf edgeTrsf = edge.Location().Transformation();

        GeomAdaptor_Curve geomCurve(
            Handle(Geom_Curve)::DownCast(curve.Curve().Curve()->Transformed(edgeTrsf))
        );

        GCPnts_TangentialDeflection pointGen(geomCurve, firstParam, lastParam, angularTol, linearTol);
        const int nbPoints = pointGen.NbPoints();

        if (nbPoints <= 0) {
            AppendUniquePoint(points, geomCurve.Value(firstParam));
            AppendUniquePoint(points, geomCurve.Value(lastParam));
            continue;
        }

        for (int index = 1; index <= nbPoints; ++index) {
            AppendUniquePoint(points, geomCurve.Value(pointGen.Parameter(index)));
        }
    }

    return points;
}

bool AlmostEqual2d(const Point2& a, const Point2& b)
{
    return std::abs(a.x - b.x) < kPointTol && std::abs(a.y - b.y) < kPointTol;
}

double Cross(const Point2& o, const Point2& a, const Point2& b)
{
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

std::vector<Point2> ConvexHull(std::vector<Point2> points)
{
    std::sort(points.begin(), points.end(), [](const Point2& a, const Point2& b) {
        if (std::abs(a.x - b.x) >= kPointTol) {
            return a.x < b.x;
        }
        return a.y < b.y;
    });

    points.erase(std::unique(points.begin(), points.end(), [](const Point2& a, const Point2& b) {
        return AlmostEqual2d(a, b);
    }), points.end());

    if (points.size() <= 1) {
        return points;
    }

    std::vector<Point2> lower;
    for (const Point2& point : points) {
        while (lower.size() >= 2 && Cross(lower[lower.size() - 2], lower.back(), point) <= 0.0) {
            lower.pop_back();
        }
        lower.push_back(point);
    }

    std::vector<Point2> upper;
    for (auto it = points.rbegin(); it != points.rend(); ++it) {
        while (upper.size() >= 2 && Cross(upper[upper.size() - 2], upper.back(), *it) <= 0.0) {
            upper.pop_back();
        }
        upper.push_back(*it);
    }

    lower.pop_back();
    upper.pop_back();
    lower.insert(lower.end(), upper.begin(), upper.end());
    return lower;
}

std::optional<double> ComputeStage2Angle(const std::vector<gp_Pnt>& points3d)
{
    if (points3d.size() < 2) {
        return std::nullopt;
    }

    std::vector<Point2> points2d;
    points2d.reserve(points3d.size());
    for (const gp_Pnt& point : points3d) {
        points2d.push_back({point.X(), point.Y()});
    }

    std::vector<Point2> hull = ConvexHull(std::move(points2d));
    if (hull.size() < 2) {
        return std::nullopt;
    }

    double bestArea = std::numeric_limits<double>::max();
    double bestAngle = 0.0;

    for (size_t i = 0; i < hull.size(); ++i) {
        const Point2& current = hull[i];
        const Point2& next = hull[(i + 1) % hull.size()];
        const double dx = next.x - current.x;
        const double dy = next.y - current.y;
        if (std::hypot(dx, dy) < kPointTol) {
            continue;
        }

        const double theta = std::atan2(dy, dx);
        const double c = std::cos(theta);
        const double s = std::sin(theta);

        double minX = std::numeric_limits<double>::max();
        double maxX = std::numeric_limits<double>::lowest();
        double minY = std::numeric_limits<double>::max();
        double maxY = std::numeric_limits<double>::lowest();

        for (const Point2& point : hull) {
            const double rx = c * point.x + s * point.y;
            const double ry = -s * point.x + c * point.y;
            minX = std::min(minX, rx);
            maxX = std::max(maxX, rx);
            minY = std::min(minY, ry);
            maxY = std::max(maxY, ry);
        }

        const double width = maxX - minX;
        const double height = maxY - minY;
        const double area = width * height;
        if (area >= bestArea) {
            continue;
        }

        bestArea = area;
        bestAngle = -theta;
        if (height > width) {
            bestAngle += M_PI_2;
        }
    }

    return bestAngle;
}

Stage2Computation ComputeStage2(const TopoDS_Shape& stage1Shape)
{
    Stage2Computation stage2;
    stage2.transform.SetTransformation(gp_Ax3());
    stage2.shape = stage1Shape;

    std::vector<gp_Pnt> points;
    try {
        TopoDS_Shape projected = BuildDiscreteProjection(stage1Shape);
        points = ExtractSamplePoints(projected);
    } catch (...) {
        points.clear();
    }

    if (points.empty()) {
        points = ExtractSamplePoints(stage1Shape);
    }

    std::optional<double> angle = ComputeStage2Angle(points);
    if (!angle.has_value() || std::abs(*angle) < 1e-9) {
        stage2.diagnostics.rotationAroundZDeg = 0.0;
        return stage2;
    }

    stage2.transform.SetRotation(gp::OZ(), *angle);
    stage2.shape = BRepBuilderAPI_Transform(stage1Shape, stage2.transform, true).Shape();
    stage2.diagnostics.rotationAroundZDeg = *angle * 180.0 / M_PI;
    stage2.applied = true;
    return stage2;
}

gp_Dir TransformDir(const gp_Trsf& trsf, const gp_Dir& dir)
{
    gp_Vec vec(dir.X(), dir.Y(), dir.Z());
    vec.Transform(trsf);
    if (vec.Magnitude() <= gp::Resolution()) {
        return dir;
    }
    return gp_Dir(vec);
}

OrientationResult BuildOrientationResult(const LoadedShape& loaded,
                                         const Stage1Computation& stage1,
                                         const Stage2Computation& stage2)
{
    OrientationResult result;
    result.success = true;
    result.stage1 = stage1.diagnostics;
    result.stage2 = stage2.diagnostics;
    result.strategy = stage2.applied
        ? (stage1.strategy + "+projected-min-area-rect")
        : stage1.strategy;
    result.confidence = stage1.confidence;
    result.sourceUnit = loaded.sourceUnit;
    result.unitScaleToMeters = loaded.unitScaleToMeters;

    gp_Trsf totalTransform = stage1.transform;
    totalTransform.PreMultiply(stage2.transform);
    result.transform = TrsfToMatrix(totalTransform);

    double xmin = 0.0;
    double ymin = 0.0;
    double zmin = 0.0;
    double xmax = 0.0;
    double ymax = 0.0;
    double zmax = 0.0;
    if (!GetBoundingBox(stage2.shape, xmin, ymin, zmin, xmax, ymax, zmax)) {
        result.success = false;
        result.error = "Failed to compute oriented bounding box.";
        return result;
    }

    struct AxisExtent {
        double extent = 0.0;
        gp_Dir worldDir = gp::DX();
    };

    std::vector<AxisExtent> extents = {
        {xmax - xmin, gp::DX()},
        {ymax - ymin, gp::DY()},
        {zmax - zmin, gp::DZ()}
    };
    std::sort(extents.begin(), extents.end(), [](const AxisExtent& a, const AxisExtent& b) {
        return a.extent > b.extent;
    });

    result.bbox.dx = extents[0].extent;
    result.bbox.dy = extents[1].extent;
    result.bbox.dz = extents[2].extent;

    const gp_Pnt orientedCenter(
        0.5 * (xmin + xmax),
        0.5 * (ymin + ymax),
        0.5 * (zmin + zmax)
    );

    gp_Trsf inverseTransform = totalTransform;
    inverseTransform.Invert();

    const gp_Pnt localOrigin = orientedCenter.Transformed(inverseTransform);
    result.localFrame.origin = {localOrigin.X(), localOrigin.Y(), localOrigin.Z()};

    const gp_Dir xDir = TransformDir(inverseTransform, extents[0].worldDir);
    const gp_Dir yDir = TransformDir(inverseTransform, extents[1].worldDir);
    const gp_Dir zDir = TransformDir(inverseTransform, extents[2].worldDir);
    result.localFrame.xDir = {xDir.X(), xDir.Y(), xDir.Z()};
    result.localFrame.yDir = {yDir.X(), yDir.Y(), yDir.Z()};
    result.localFrame.zDir = {zDir.X(), zDir.Y(), zDir.Z()};

    return result;
}

} // namespace

OrientationResult AnalyzeOptimalOrientationFromMemory(
    const std::string& format,
    const uint8_t* data,
    size_t size,
    const OrientationParams& params
)
{
    OrientationResult result;

    std::string normalizedFormat = format;
    std::transform(normalizedFormat.begin(), normalizedFormat.end(), normalizedFormat.begin(), [](unsigned char c) {
        return static_cast<char>(std::tolower(c));
    });

    if (normalizedFormat != "step" && normalizedFormat != "iges" && normalizedFormat != "brep") {
        result.error = "Unsupported format: " + format;
        return result;
    }

    if (!params.mode.empty() && params.mode != "manufacturing") {
        result.error = "Unsupported orientation mode: " + params.mode;
        return result;
    }

    try {
        LoadedShape loaded = LoadShapeFromMemory(normalizedFormat, data, size, params);
        if (!loaded.success) {
            result.error = loaded.error;
            return result;
        }

        TopoDS_Shape shape = loaded.shape;
        if (shape.IsNull()) {
            result.error = "Loaded shape is null.";
            return result;
        }

        ImportParams meshParams = BuildMeshingParams(params);
        if (!TriangulateShape(shape, meshParams)) {
            result.error = "Failed to triangulate the loaded shape.";
            return result;
        }

        Stage1Computation stage1 = ComputeStage1(shape, params);
        if (!stage1.success) {
            result.error = stage1.error;
            return result;
        }

        Stage2Computation stage2 = ComputeStage2(stage1.shape);
        result = BuildOrientationResult(loaded, stage1, stage2);
    }
    catch (const Standard_Failure& ex) {
        result.error = "OCCT exception: ";
        result.error += ex.GetMessageString();
    }
    catch (const std::exception& ex) {
        result.error = "C++ exception: ";
        result.error += ex.what();
    }
    catch (...) {
        result.error = "Unknown exception during orientation analysis.";
    }

    return result;
}
