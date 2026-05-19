#include "geometry-transform.hpp"

#include "importer-brep.hpp"
#include "importer-step.hpp"

#include <sstream>

#include <BRepBuilderAPI_Transform.hxx>
#include <BRepTools.hxx>
#include <IFSelect_ReturnStatus.hxx>
#include <STEPControl_StepModelType.hxx>
#include <STEPControl_Writer.hxx>
#include <Standard_Failure.hxx>
#include <TopoDS_Shape.hxx>
#include <gp_Trsf.hxx>

namespace {

gp_Trsf MatrixToTransform(const std::array<double, 16>& matrix)
{
    gp_Trsf transform;
    transform.SetValues(
        matrix[0], matrix[4], matrix[8], matrix[12],
        matrix[1], matrix[5], matrix[9], matrix[13],
        matrix[2], matrix[6], matrix[10], matrix[14]
    );
    return transform;
}

std::vector<uint8_t> StreamBytes(const std::ostringstream& stream)
{
    const std::string text = stream.str();
    return std::vector<uint8_t>(text.begin(), text.end());
}

OcctGeometryTransformResult Failure(const std::string& format, const std::string& error)
{
    OcctGeometryTransformResult result;
    result.success = false;
    result.format = format;
    result.error = error;
    return result;
}

TopoDS_Shape ApplyTransform(const TopoDS_Shape& shape, const std::array<double, 16>& matrix)
{
    return BRepBuilderAPI_Transform(shape, MatrixToTransform(matrix), Standard_True).Shape();
}

OcctGeometryTransformResult WriteStepShape(
    const TopoDS_Shape& shape,
    const std::array<double, 16>& matrix)
{
    const TopoDS_Shape transformed = ApplyTransform(shape, matrix);
    if (transformed.IsNull()) {
        return Failure("step", "Transformed STEP shape is null.");
    }

    STEPControl_Writer writer;
    IFSelect_ReturnStatus transferStatus = writer.Transfer(transformed, STEPControl_AsIs);
    if (transferStatus != IFSelect_RetDone) {
        return Failure("step", "STEP writer failed to transfer the transformed shape.");
    }

    std::ostringstream stream;
    IFSelect_ReturnStatus writeStatus = writer.WriteStream(stream);
    if (writeStatus != IFSelect_RetDone) {
        return Failure("step", "STEP writer failed to serialize the transformed shape.");
    }

    OcctGeometryTransformResult result;
    result.success = true;
    result.format = "step";
    result.content = StreamBytes(stream);
    return result;
}

OcctGeometryTransformResult WriteBrepShape(
    const TopoDS_Shape& shape,
    const std::array<double, 16>& matrix)
{
    const TopoDS_Shape transformed = ApplyTransform(shape, matrix);
    if (transformed.IsNull()) {
        return Failure("brep", "Transformed BREP shape is null.");
    }

    std::ostringstream stream;
    BRepTools::Write(transformed, stream);

    OcctGeometryTransformResult result;
    result.success = true;
    result.format = "brep";
    result.content = StreamBytes(stream);
    return result;
}

} // namespace

OcctGeometryTransformResult TransformStepFromMemory(
    const uint8_t* data,
    size_t size,
    const std::array<double, 16>& matrix,
    const ImportParams& params)
{
    try {
        OcctExactImportData imported =
            ImportExactStepFromMemory(data, size, "input.stp", params);
        if (!imported.scene.success) {
            return Failure("step", imported.scene.error);
        }
        if (imported.exactShape.IsNull()) {
            return Failure("step", "STEP import produced a null exact shape.");
        }
        return WriteStepShape(imported.exactShape, matrix);
    }
    catch (const Standard_Failure& ex) {
        return Failure("step", std::string("OCCT exception: ") + ex.GetMessageString());
    }
    catch (const std::exception& ex) {
        return Failure("step", std::string("C++ exception: ") + ex.what());
    }
    catch (...) {
        return Failure("step", "Unknown exception during STEP transform export.");
    }
}

OcctGeometryTransformResult TransformBrepFromMemory(
    const uint8_t* data,
    size_t size,
    const std::array<double, 16>& matrix,
    const ImportParams& params)
{
    try {
        OcctExactImportData imported =
            ImportExactBrepFromMemory(data, size, "input.brep", params);
        if (!imported.scene.success) {
            return Failure("brep", imported.scene.error);
        }
        if (imported.exactShape.IsNull()) {
            return Failure("brep", "BREP import produced a null exact shape.");
        }
        return WriteBrepShape(imported.exactShape, matrix);
    }
    catch (const Standard_Failure& ex) {
        return Failure("brep", std::string("OCCT exception: ") + ex.GetMessageString());
    }
    catch (const std::exception& ex) {
        return Failure("brep", std::string("C++ exception: ") + ex.what());
    }
    catch (...) {
        return Failure("brep", "Unknown exception during BREP transform export.");
    }
}
