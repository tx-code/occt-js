#include "importer-xde.hpp"
#include "importer-utils.hpp"

#include <streambuf>
#include <istream>
#include <fstream>
#include <map>
#include <cstdint>
#include <cmath>
#include <vector>
#include <cstdio>

// OCCT headers
#include <STEPCAFControl_Reader.hxx>
#include <STEPControl_Reader.hxx>
#include <IGESCAFControl_Reader.hxx>
#include <XCAFApp_Application.hxx>
#include <XCAFDoc_DocumentTool.hxx>
#include <XCAFDoc_ShapeTool.hxx>
#include <XCAFDoc_ColorTool.hxx>
#include <TDocStd_Document.hxx>
#include <TDF_Label.hxx>
#include <TDF_LabelSequence.hxx>
#include <TDF_ChildIterator.hxx>
#include <TDataStd_Name.hxx>
#include <TopoDS_Shape.hxx>
#include <TopLoc_Location.hxx>
#include <Quantity_Color.hxx>
#include <TopAbs_ShapeEnum.hxx>
#include <TopExp_Explorer.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopExp.hxx>
#include <Standard_ArrayStreamBuffer.hxx>
#include <TDF_Tool.hxx>
#include <Standard_Failure.hxx>
#include <IFSelect_ReturnStatus.hxx>
#include <UnitsMethods.hxx>

namespace {

std::array<float, 16> TrsfToMatrix(const gp_Trsf& trsf)
{
    std::array<float, 16> m;
    // Column 0
    m[0] = static_cast<float>(trsf.Value(1, 1));
    m[1] = static_cast<float>(trsf.Value(2, 1));
    m[2] = static_cast<float>(trsf.Value(3, 1));
    m[3] = 0.0f;
    // Column 1
    m[4] = static_cast<float>(trsf.Value(1, 2));
    m[5] = static_cast<float>(trsf.Value(2, 2));
    m[6] = static_cast<float>(trsf.Value(3, 2));
    m[7] = 0.0f;
    // Column 2
    m[8] = static_cast<float>(trsf.Value(1, 3));
    m[9] = static_cast<float>(trsf.Value(2, 3));
    m[10] = static_cast<float>(trsf.Value(3, 3));
    m[11] = 0.0f;
    // Column 3 (translation)
    m[12] = static_cast<float>(trsf.Value(1, 4));
    m[13] = static_cast<float>(trsf.Value(2, 4));
    m[14] = static_cast<float>(trsf.Value(3, 4));
    m[15] = 1.0f;
    return m;
}

std::array<float, 16> IdentityMatrix()
{
    return {1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1};
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

std::string GetLabelNameNoRef(const TDF_Label& label)
{
    Handle(TDataStd_Name) nameAttr;
    if (!label.FindAttribute(TDataStd_Name::GetID(), nameAttr)) {
        return {};
    }
    Standard_Integer utf8Len = nameAttr->Get().LengthOfCString();
    if (utf8Len <= 0) {
        return {};
    }
    char* nameBuf = new char[static_cast<size_t>(utf8Len) + 1];
    nameAttr->Get().ToUTF8CString(nameBuf);
    std::string name(nameBuf, static_cast<size_t>(utf8Len));
    delete[] nameBuf;
    return name;
}

std::string GetLabelName(const TDF_Label& label,
                         const Handle(XCAFDoc_ShapeTool)& shapeTool)
{
    if (XCAFDoc_ShapeTool::IsReference(label)) {
        TDF_Label refLabel;
        shapeTool->GetReferredShape(label, refLabel);
        return GetLabelName(refLabel, shapeTool);
    }
    return GetLabelNameNoRef(label);
}

bool GetLabelColorNoRef(const TDF_Label& label,
                        const Handle(XCAFDoc_ColorTool)& colorTool,
                        OcctColor& color)
{
    Quantity_Color qColor;
    if (colorTool->GetColor(label, XCAFDoc_ColorSurf, qColor)
        || colorTool->GetColor(label, XCAFDoc_ColorCurv, qColor)
        || colorTool->GetColor(label, XCAFDoc_ColorGen, qColor))
    {
        color = OcctColor(qColor.Red(), qColor.Green(), qColor.Blue());
        return true;
    }
    return false;
}

bool GetLabelColor(const TDF_Label& label,
                   const Handle(XCAFDoc_ShapeTool)& shapeTool,
                   const Handle(XCAFDoc_ColorTool)& colorTool,
                   OcctColor& color)
{
    if (GetLabelColorNoRef(label, colorTool, color)) {
        return true;
    }
    if (XCAFDoc_ShapeTool::IsReference(label)) {
        TDF_Label refLabel;
        shapeTool->GetReferredShape(label, refLabel);
        return GetLabelColor(refLabel, shapeTool, colorTool, color);
    }
    return false;
}

bool GetShapeColor(const TopoDS_Shape& shape,
                   const Handle(XCAFDoc_ShapeTool)& shapeTool,
                   const Handle(XCAFDoc_ColorTool)& colorTool,
                   OcctColor& color)
{
    TDF_Label shapeLabel;
    if (!shapeTool->Search(shape, shapeLabel)) {
        return false;
    }
    return GetLabelColor(shapeLabel, shapeTool, colorTool, color);
}

bool IsFreeShape(const TDF_Label& label, const Handle(XCAFDoc_ShapeTool)& shapeTool)
{
    TopoDS_Shape tmpShape;
    return shapeTool->GetShape(label, tmpShape) && shapeTool->IsFree(label);
}

bool IsMeshNode(const TDF_Label& label, const Handle(XCAFDoc_ShapeTool)& shapeTool)
{
    if (!label.HasChild()) {
        return true;
    }

    for (TDF_ChildIterator it(label); it.More(); it.Next()) {
        if (shapeTool->IsSubShape(it.Value())) {
            return true;
        }
    }

    bool hasFreeShapeChild = false;
    for (TDF_ChildIterator it(label); it.More(); it.Next()) {
        if (IsFreeShape(it.Value(), shapeTool)) {
            hasFreeShapeChild = true;
            break;
        }
    }
    return !hasFreeShapeChild;
}

void ExtractShapeMeshes(const TopoDS_Shape& shape,
                        const Handle(XCAFDoc_ShapeTool)& shapeTool,
                        const Handle(XCAFDoc_ColorTool)& colorTool,
                        OcctSceneData& scene,
                        OcctNodeData& node,
                        std::map<uintptr_t, int>& shapeHashToMeshIndex)
{
    auto extractOne = [&](const TopoDS_Shape& subShape) {
        auto* tshapePtr = subShape.IsNull() ? nullptr : subShape.TShape().get();
        auto it = shapeHashToMeshIndex.find(reinterpret_cast<uintptr_t>(tshapePtr));
        if (it != shapeHashToMeshIndex.end()) {
            node.meshIndices.push_back(it->second);
            return;
        }

        OcctMeshData meshData = ExtractMeshFromShape(subShape);
        if (meshData.positions.empty()) {
            return;
        }

        meshData.name = node.name;

        OcctColor shapeColor;
        GetShapeColor(subShape, shapeTool, colorTool, shapeColor);
        meshData.color = shapeColor;

        TopTools_IndexedMapOfShape localFaceMap;
        TopExp::MapShapes(subShape, TopAbs_FACE, localFaceMap);
        for (int fi = 1; fi <= localFaceMap.Extent(); ++fi) {
            if (fi - 1 < static_cast<int>(meshData.faces.size())) {
                OcctColor faceColor;
                if (GetShapeColor(localFaceMap(fi), shapeTool, colorTool, faceColor)) {
                    meshData.faces[fi - 1].color = faceColor;
                } else {
                    meshData.faces[fi - 1].color = shapeColor;
                }
            }
        }

        int meshIdx = static_cast<int>(scene.meshes.size());
        scene.meshes.push_back(std::move(meshData));
        shapeHashToMeshIndex[reinterpret_cast<uintptr_t>(tshapePtr)] = meshIdx;
        node.meshIndices.push_back(meshIdx);
    };

    for (TopExp_Explorer ex(shape, TopAbs_SOLID); ex.More(); ex.Next()) {
        extractOne(ex.Current());
    }
    for (TopExp_Explorer ex(shape, TopAbs_SHELL, TopAbs_SOLID); ex.More(); ex.Next()) {
        extractOne(ex.Current());
    }
    bool hasStandaloneFaces = false;
    for (TopExp_Explorer ex(shape, TopAbs_FACE, TopAbs_SHELL); ex.More(); ex.Next()) {
        hasStandaloneFaces = true;
        break;
    }
    if (hasStandaloneFaces) {
        extractOne(shape);
    }
}

void TraverseLabel(const TDF_Label& label,
                   const Handle(XCAFDoc_ShapeTool)& shapeTool,
                   const Handle(XCAFDoc_ColorTool)& colorTool,
                   const ImportParams& params,
                   OcctSceneData& scene,
                   std::map<uintptr_t, int>& shapeCache)
{
    int nodeIndex = static_cast<int>(scene.nodes.size());
    scene.nodes.emplace_back();

    TDF_Label refLabel = label;
    if (shapeTool->IsReference(label)) {
        shapeTool->GetReferredShape(label, refLabel);
    }

    scene.nodes[nodeIndex].name = GetLabelName(label, shapeTool);

    {
        TCollection_AsciiString entry;
        TDF_Tool::Entry(label, entry);
        scene.nodes[nodeIndex].id = entry.ToCString();
    }

    TopLoc_Location loc = shapeTool->GetLocation(label);
    if (loc.IsIdentity()) {
        scene.nodes[nodeIndex].transform = IdentityMatrix();
    } else {
        scene.nodes[nodeIndex].transform = TrsfToMatrix(loc.Transformation());
    }

    if (IsMeshNode(refLabel, shapeTool)) {
        scene.nodes[nodeIndex].isAssembly = false;
        TopoDS_Shape shape = shapeTool->GetShape(refLabel);
        if (!shape.IsNull()) {
            ExtractShapeMeshes(shape, shapeTool, colorTool, scene, scene.nodes[nodeIndex], shapeCache);
        }
    } else {
        scene.nodes[nodeIndex].isAssembly = true;
        for (TDF_ChildIterator it(refLabel); it.More(); it.Next()) {
            TDF_Label childLabel = it.Value();
            if (IsFreeShape(childLabel, shapeTool)) {
                int childIdx = static_cast<int>(scene.nodes.size());
                TraverseLabel(childLabel, shapeTool, colorTool, params, scene, shapeCache);
                scene.nodes[nodeIndex].childIndices.push_back(childIdx);
            }
        }
    }
}

void AppendRootNodes(const TDF_LabelSequence& freeShapes,
                     const Handle(XCAFDoc_ShapeTool)& shapeTool,
                     const Handle(XCAFDoc_ColorTool)& colorTool,
                     const ImportParams& params,
                     OcctSceneData& scene)
{
    std::map<uintptr_t, int> shapeCache;

    if (params.rootMode == ImportParams::RootMode::MultipleShapes
        || freeShapes.Length() == 1)
    {
        for (int i = 1; i <= freeShapes.Length(); ++i) {
            int rootIdx = static_cast<int>(scene.nodes.size());
            TraverseLabel(
                freeShapes.Value(i),
                shapeTool,
                colorTool,
                params,
                scene,
                shapeCache);
            scene.rootNodeIndices.push_back(rootIdx);
        }
        return;
    }

    // Preserve XDE-derived child semantics, names, and colors while exposing a
    // single logical root for callers that want one top-level node.
    int rootIdx = static_cast<int>(scene.nodes.size());
    scene.nodes.emplace_back();
    scene.nodes[rootIdx].id = "__root__";
    scene.nodes[rootIdx].name = "Root";
    scene.nodes[rootIdx].isAssembly = true;
    scene.nodes[rootIdx].transform = IdentityMatrix();

    for (int i = 1; i <= freeShapes.Length(); ++i) {
        int childIdx = static_cast<int>(scene.nodes.size());
        TraverseLabel(
            freeShapes.Value(i),
            shapeTool,
            colorTool,
            params,
            scene,
            shapeCache);
        scene.nodes[rootIdx].childIndices.push_back(childIdx);
    }

    scene.rootNodeIndices.push_back(rootIdx);
}

bool ReadAndTransferXde(const uint8_t* data,
                        size_t size,
                        const std::string& fileName,
                        const ImportParams& params,
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
        cafReader.SetColorMode(params.readColors);
        cafReader.SetNameMode(params.readNames);

        STEPControl_Reader& reader = cafReader.ChangeReader();
        IFSelect_ReturnStatus readStatus = reader.ReadStream(
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
        cafReader.SetColorMode(params.readColors);
        cafReader.SetNameMode(params.readNames);

        // Match occt-import-js behavior: import IGES via temporary file.
        // (ReadStream is not reliable for IGES in this OCCT toolchain.)
        std::string tempFileName = fileName.empty() ? "temp_input.igs" : (fileName + ".tmp.igs");
        {
            std::ofstream tmpFile(tempFileName, std::ios::binary);
            if (!tmpFile.is_open()) {
                outError = "Failed to create temporary IGES file.";
                return false;
            }
            tmpFile.write(reinterpret_cast<const char*>(data), static_cast<std::streamsize>(size));
            if (!tmpFile.good()) {
                tmpFile.close();
                std::remove(tempFileName.c_str());
                outError = "Failed to write temporary IGES file.";
                return false;
            }
        }

        IFSelect_ReturnStatus readStatus = cafReader.ReadFile(tempFileName.c_str());
        std::remove(tempFileName.c_str());

        if (readStatus != IFSelect_RetDone) {
            outError = "IGES reader failed to parse the file.";
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

} // namespace

OcctSceneData ImportXdeFromMemory(
    const uint8_t* data,
    size_t size,
    const std::string& fileName,
    const ImportParams& params,
    const std::string& format)
{
    OcctSceneData scene;

    try {
        Handle(XCAFApp_Application) app = XCAFApp_Application::GetApplication();
        Handle(TDocStd_Document) doc;
        app->NewDocument("BinXCAF", doc);

        if (doc.IsNull()) {
            scene.error = "Failed to create XDE document.";
            return scene;
        }

        // Match occt-import-js: set caller-selected unit before transfer.
        XCAFDoc_DocumentTool::SetLengthUnit(doc, 1.0, LinearUnitToLengthUnit(params.linearUnit));

        std::string readError;
        if (!ReadAndTransferXde(data, size, fileName, params, format, doc, readError)) {
            scene.error = readError;
            app->Close(doc);
            return scene;
        }

        {
            Standard_Real unitInMeters = 0.0;
            if (XCAFDoc_DocumentTool::GetLengthUnit(doc, unitInMeters)) {
                scene.unitScaleToMeters = unitInMeters;
                if (std::abs(unitInMeters - 0.001) < 1e-9) {
                    scene.sourceUnit = "MM";
                } else if (std::abs(unitInMeters - 0.01) < 1e-9) {
                    scene.sourceUnit = "CM";
                } else if (std::abs(unitInMeters - 1.0) < 1e-9) {
                    scene.sourceUnit = "M";
                } else if (std::abs(unitInMeters - 0.0254) < 1e-6) {
                    scene.sourceUnit = "INCH";
                } else if (std::abs(unitInMeters - 0.3048) < 1e-6) {
                    scene.sourceUnit = "FOOT";
                } else {
                    scene.sourceUnit = "CUSTOM";
                }
            }
        }

        Handle(XCAFDoc_ShapeTool) shapeTool = XCAFDoc_DocumentTool::ShapeTool(doc->Main());
        Handle(XCAFDoc_ColorTool) colorTool = XCAFDoc_DocumentTool::ColorTool(doc->Main());

        TDF_LabelSequence freeShapes;
        shapeTool->GetFreeShapes(freeShapes);

        if (freeShapes.Length() == 0) {
            scene.error = "No shapes found in source file.";
            app->Close(doc);
            return scene;
        }

        TDF_Label mainLabel = shapeTool->Label();
        for (TDF_ChildIterator it(mainLabel); it.More(); it.Next()) {
            TDF_Label childLabel = it.Value();
            if (IsFreeShape(childLabel, shapeTool)) {
                TopoDS_Shape shape = shapeTool->GetShape(childLabel);
                if (!shape.IsNull()) {
                    TriangulateShape(shape, params);
                }
            }
        }

        AppendRootNodes(freeShapes, shapeTool, colorTool, params, scene);

        scene.success = true;
        app->Close(doc);
    }
    catch (const Standard_Failure& ex) {
        scene.error = "OCCT exception: ";
        scene.error += ex.GetMessageString();
    }
    catch (const std::exception& ex) {
        scene.error = "C++ exception: ";
        scene.error += ex.what();
    }
    catch (...) {
        scene.error = "Unknown exception during XDE import.";
    }

    return scene;
}
