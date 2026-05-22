#include "importer-xde.hpp"
#include "importer-iges-staging.hpp"
#include "importer-utils.hpp"

#include <streambuf>
#include <istream>
#include <map>
#include <set>
#include <cstdint>
#include <cmath>
#include <vector>

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
#include <TDF_Tool.hxx>
#include <TDataStd_Name.hxx>
#include <TCollection_AsciiString.hxx>
#include <TopoDS_Shape.hxx>
#include <TopLoc_Location.hxx>
#include <Quantity_Color.hxx>
#include <TopAbs_ShapeEnum.hxx>
#include <TopExp_Explorer.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopExp.hxx>
#include <BRep_Builder.hxx>
#include <Standard_ArrayStreamBuffer.hxx>
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

void ApplyLengthUnitMetadata(const Handle(TDocStd_Document)& doc,
                             std::string& sourceUnit,
                             double& unitScaleToMeters)
{
    Standard_Real unitInMeters = 0.0;
    if (!XCAFDoc_DocumentTool::GetLengthUnit(doc, unitInMeters)) {
        return;
    }

    unitScaleToMeters = unitInMeters;
    if (std::abs(unitInMeters - 0.001) < 1e-9) {
        sourceUnit = "MM";
    } else if (std::abs(unitInMeters - 0.01) < 1e-9) {
        sourceUnit = "CM";
    } else if (std::abs(unitInMeters - 1.0) < 1e-9) {
        sourceUnit = "M";
    } else if (std::abs(unitInMeters - 0.0254) < 1e-6) {
        sourceUnit = "INCH";
    } else if (std::abs(unitInMeters - 0.3048) < 1e-6) {
        sourceUnit = "FOOT";
    } else {
        sourceUnit = "CUSTOM";
    }
}

std::string LabelEntry(const TDF_Label& label)
{
    TCollection_AsciiString entry;
    TDF_Tool::Entry(label, entry);
    return entry.ToCString();
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

std::vector<TDF_Label> GetProductChildren(const TDF_Label& label,
                                          const Handle(XCAFDoc_ShapeTool)& shapeTool)
{
    std::vector<TDF_Label> children;
    for (TDF_ChildIterator it(label); it.More(); it.Next()) {
        TDF_Label childLabel = it.Value();
        if (shapeTool->IsSubShape(childLabel)) {
            continue;
        }
        TopoDS_Shape childShape;
        if (shapeTool->GetShape(childLabel, childShape)) {
            children.push_back(childLabel);
        }
    }
    return children;
}

void AddProductMessage(std::vector<OcctProductInspectionMessage>& messages,
                       const std::string& code,
                       const std::string& message,
                       const std::string& nodeId = {},
                       const std::string& severity = {})
{
    OcctProductInspectionMessage item;
    item.code = code;
    item.message = message;
    if (!nodeId.empty()) {
        item.nodeId = nodeId;
        item.hasNodeId = true;
    }
    if (!severity.empty()) {
        item.severity = severity;
        item.hasSeverity = true;
    }
    messages.push_back(std::move(item));
}

std::string ShapeIdentity(const TDF_Label& label, const TopoDS_Shape& shape)
{
    std::string identity = LabelEntry(label);
    if (!identity.empty()) {
        return identity;
    }

    auto* tshapePtr = shape.IsNull() ? nullptr : shape.TShape().get();
    if (tshapePtr != nullptr) {
        return "shape_" + std::to_string(reinterpret_cast<uintptr_t>(tshapePtr));
    }
    return "unknown_shape";
}

struct ProductInspectionTraversalState {
    std::set<std::string> uniquePartRefs;
    std::map<std::string, int> partRefOccurrences;
};

int TraverseProductLabel(const TDF_Label& label,
                         const Handle(XCAFDoc_ShapeTool)& shapeTool,
                         OcctProductInspectionResult& result,
                         ProductInspectionTraversalState& traversal)
{
    int nodeIndex = static_cast<int>(result.nodes.size());
    result.nodes.emplace_back();
    OcctProductInspectionNode& node = result.nodes[nodeIndex];

    node.id = "product_node_" + std::to_string(nodeIndex);
    node.occurrenceRef = LabelEntry(label);
    node.transform = IdentityMatrix();

    TDF_Label refLabel = label;
    if (shapeTool->IsReference(label)) {
        node.isReference = true;
        shapeTool->GetReferredShape(label, refLabel);
    }

    node.partRef = LabelEntry(refLabel);
    node.name = GetLabelName(label, shapeTool);

    TopLoc_Location loc = shapeTool->GetLocation(label);
    if (!loc.IsIdentity()) {
        node.transform = TrsfToMatrix(loc.Transformation());
    }

    TopoDS_Shape shape = shapeTool->GetShape(refLabel);
    node.hasShape = !shape.IsNull();

    std::vector<TDF_Label> children = GetProductChildren(refLabel, shapeTool);
    bool isAssemblyLabel = shapeTool->IsAssembly(refLabel) || !children.empty();
    node.isAssembly = isAssemblyLabel;
    node.kind = isAssemblyLabel ? "assembly" : "part";

    if (isAssemblyLabel) {
        result.assemblyPresent = true;
        for (const TDF_Label& childLabel : children) {
            int childIndex = TraverseProductLabel(childLabel, shapeTool, result, traversal);
            result.nodes[nodeIndex].childIndices.push_back(childIndex);
        }
        return nodeIndex;
    }

    if (!node.hasShape) {
        AddProductMessage(
            result.warnings,
            "missing_shape",
            "Product node does not have an importable shape.",
            node.id,
            "warning");
        return nodeIndex;
    }

    std::string partIdentity = ShapeIdentity(refLabel, shape);
    if (node.partRef.empty()) {
        node.partRef = partIdentity;
    }
    traversal.uniquePartRefs.insert(partIdentity);
    traversal.partRefOccurrences[partIdentity]++;
    result.partOccurrenceCount++;
    return nodeIndex;
}

bool HasRepeatedPartOccurrence(const ProductInspectionTraversalState& traversal)
{
    for (const auto& entry : traversal.partRefOccurrences) {
        if (entry.second > 1) {
            return true;
        }
    }
    return false;
}

void ClassifyProductInspection(OcctProductInspectionResult& result,
                               const ProductInspectionTraversalState& traversal)
{
    result.uniquePartCount = static_cast<int>(traversal.uniquePartRefs.size());
    const bool repeatedPartOccurrence = HasRepeatedPartOccurrence(traversal);

    if (result.assemblyPresent || repeatedPartOccurrence) {
        result.classification = "assembly";
        result.assemblyPresent = true;
        AddProductMessage(
            result.reasons,
            repeatedPartOccurrence ? "repeated_part_occurrence" : "assembly_label_present",
            repeatedPartOccurrence
                ? "The STEP product structure contains repeated occurrences of the same part."
                : "The STEP product structure contains an assembly label or assembly children.");
        return;
    }

    if (result.rootCount > 1) {
        result.classification = "multi_part";
        AddProductMessage(
            result.reasons,
            "multiple_free_shapes",
            "The STEP file contains multiple top-level free shapes.");
        return;
    }

    if (result.uniquePartCount == 1 && result.partOccurrenceCount == 1) {
        result.classification = "single_part";
        AddProductMessage(
            result.reasons,
            "single_free_shape_no_assembly",
            "The STEP file contains exactly one top-level part with no assembly structure.");
        return;
    }

    result.classification = "ambiguous";
    AddProductMessage(
        result.reasons,
        "inconclusive_product_structure",
        "The STEP file was readable but did not expose enough structure for a strict classification.");
}

void ExtractShapeMeshes(const TopoDS_Shape& shape,
                        const Handle(XCAFDoc_ShapeTool)& shapeTool,
                        const Handle(XCAFDoc_ColorTool)& colorTool,
                        const ImportParams& params,
                        OcctSceneData& scene,
                        OcctNodeData& node,
                        std::map<uintptr_t, int>& shapeHashToMeshIndex,
                        std::vector<TopoDS_Shape>* exactGeometryShapes = nullptr)
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
        meshData.color = params.ResolveImportedColor(shapeColor);

        TopTools_IndexedMapOfShape localFaceMap;
        TopExp::MapShapes(subShape, TopAbs_FACE, localFaceMap);
        for (int fi = 1; fi <= localFaceMap.Extent(); ++fi) {
            if (fi - 1 < static_cast<int>(meshData.faces.size())) {
                OcctColor faceColor;
                if (GetShapeColor(localFaceMap(fi), shapeTool, colorTool, faceColor)) {
                    meshData.faces[fi - 1].color = params.ResolveImportedColor(faceColor);
                } else {
                    meshData.faces[fi - 1].color = params.ResolveImportedColor(shapeColor);
                }
            }
        }

        if (params.ShouldUseDefaultColor()) {
            meshData.color = params.ResolveDefaultColor();
            for (auto& face : meshData.faces) {
                face.color = params.ResolveDefaultColor();
            }
        }

        int meshIdx = static_cast<int>(scene.meshes.size());
        scene.meshes.push_back(std::move(meshData));
        shapeHashToMeshIndex[reinterpret_cast<uintptr_t>(tshapePtr)] = meshIdx;
        if (exactGeometryShapes != nullptr) {
            exactGeometryShapes->push_back(subShape);
        }
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
                   std::map<uintptr_t, int>& shapeCache,
                   std::vector<TopoDS_Shape>* exactGeometryShapes = nullptr)
{
    int nodeIndex = static_cast<int>(scene.nodes.size());
    scene.nodes.emplace_back();

    TDF_Label refLabel = label;
    if (shapeTool->IsReference(label)) {
        shapeTool->GetReferredShape(label, refLabel);
    }

    scene.nodes[nodeIndex].name = GetLabelName(label, shapeTool);

    scene.nodes[nodeIndex].id = "node_" + std::to_string(nodeIndex);

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
            ExtractShapeMeshes(
                shape,
                shapeTool,
                colorTool,
                params,
                scene,
                scene.nodes[nodeIndex],
                shapeCache,
                exactGeometryShapes);
        }
    } else {
        scene.nodes[nodeIndex].isAssembly = true;
        for (TDF_ChildIterator it(refLabel); it.More(); it.Next()) {
            TDF_Label childLabel = it.Value();
            if (IsFreeShape(childLabel, shapeTool)) {
                int childIdx = static_cast<int>(scene.nodes.size());
                TraverseLabel(
                    childLabel,
                    shapeTool,
                    colorTool,
                    params,
                    scene,
                    shapeCache,
                    exactGeometryShapes);
                scene.nodes[nodeIndex].childIndices.push_back(childIdx);
            }
        }
    }
}

void AppendRootNodes(const TDF_LabelSequence& freeShapes,
                     const Handle(XCAFDoc_ShapeTool)& shapeTool,
                     const Handle(XCAFDoc_ColorTool)& colorTool,
                     const ImportParams& params,
                     OcctSceneData& scene,
                     std::vector<TopoDS_Shape>* exactGeometryShapes = nullptr)
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
                shapeCache,
                exactGeometryShapes);
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
            shapeCache,
            exactGeometryShapes);
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
        cafReader.SetColorMode(params.ShouldReadSourceColors());
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
        cafReader.SetColorMode(params.ShouldReadSourceColors());
        cafReader.SetNameMode(params.readNames);

        // Match occt-import-js behavior: import IGES via temporary file.
        // (ReadStream is not reliable for IGES in this OCCT toolchain.)
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

TopoDS_Shape BuildExactRootShape(const TDF_LabelSequence& freeShapes,
                                 const Handle(XCAFDoc_ShapeTool)& shapeTool)
{
    if (freeShapes.Length() == 1) {
        return shapeTool->GetShape(freeShapes.Value(1));
    }

    BRep_Builder builder;
    TopoDS_Compound compound;
    builder.MakeCompound(compound);

    for (Standard_Integer i = 1; i <= freeShapes.Length(); ++i) {
        TopoDS_Shape shape = shapeTool->GetShape(freeShapes.Value(i));
        if (!shape.IsNull()) {
            builder.Add(compound, shape);
        }
    }

    return compound;
}

} // namespace

OcctProductInspectionResult InspectXdeProductFromMemory(
    const uint8_t* data,
    size_t size,
    const std::string& fileName,
    const ImportParams& params,
    const std::string& format)
{
    OcctProductInspectionResult result;
    result.sourceFormat = format;

    if (format != "step") {
        result.error.code = "unsupported_format";
        result.error.message = "Unsupported product inspection format: " + format;
        return result;
    }

    try {
        Handle(XCAFApp_Application) app = XCAFApp_Application::GetApplication();
        Handle(TDocStd_Document) doc;
        app->NewDocument("BinXCAF", doc);

        if (doc.IsNull()) {
            result.error.code = "internal_error";
            result.error.message = "Failed to create XDE document.";
            return result;
        }

        XCAFDoc_DocumentTool::SetLengthUnit(doc, 1.0, LinearUnitToLengthUnit(params.linearUnit));

        std::string readError;
        if (!ReadAndTransferXde(data, size, fileName, params, format, doc, readError)) {
            result.error.code = "read_failed";
            result.error.message = readError;
            app->Close(doc);
            return result;
        }

        ApplyLengthUnitMetadata(doc, result.sourceUnit, result.unitScaleToMeters);

        Handle(XCAFDoc_ShapeTool) shapeTool = XCAFDoc_DocumentTool::ShapeTool(doc->Main());
        TDF_LabelSequence freeShapes;
        shapeTool->GetFreeShapes(freeShapes);
        result.rootCount = freeShapes.Length();

        if (freeShapes.Length() == 0) {
            result.error.code = "no_shapes";
            result.error.message = "No shapes found in source file.";
            app->Close(doc);
            return result;
        }

        ProductInspectionTraversalState traversal;
        for (int i = 1; i <= freeShapes.Length(); ++i) {
            int rootIndex = TraverseProductLabel(freeShapes.Value(i), shapeTool, result, traversal);
            result.rootNodeIndices.push_back(rootIndex);
        }

        ClassifyProductInspection(result, traversal);
        result.ok = true;
        app->Close(doc);
    }
    catch (const Standard_Failure& ex) {
        result.error.code = "internal_error";
        result.error.message = "OCCT exception: ";
        result.error.message += ex.GetMessageString();
    }
    catch (const std::exception& ex) {
        result.error.code = "internal_error";
        result.error.message = "C++ exception: ";
        result.error.message += ex.what();
    }
    catch (...) {
        result.error.code = "internal_error";
        result.error.message = "Unknown exception during XDE product inspection.";
    }

    return result;
}

OcctExactImportData ImportExactXdeFromMemory(
    const uint8_t* data,
    size_t size,
    const std::string& fileName,
    const ImportParams& params,
    const std::string& format)
{
    OcctExactImportData imported;
    OcctSceneData& scene = imported.scene;

    try {
        Handle(XCAFApp_Application) app = XCAFApp_Application::GetApplication();
        Handle(TDocStd_Document) doc;
        app->NewDocument("BinXCAF", doc);

        if (doc.IsNull()) {
            scene.error = "Failed to create XDE document.";
            return imported;
        }

        // Match occt-import-js: set caller-selected unit before transfer.
        XCAFDoc_DocumentTool::SetLengthUnit(doc, 1.0, LinearUnitToLengthUnit(params.linearUnit));

        std::string readError;
        if (!ReadAndTransferXde(data, size, fileName, params, format, doc, readError)) {
            scene.error = readError;
            app->Close(doc);
            return imported;
        }

        ApplyLengthUnitMetadata(doc, scene.sourceUnit, scene.unitScaleToMeters);

        Handle(XCAFDoc_ShapeTool) shapeTool = XCAFDoc_DocumentTool::ShapeTool(doc->Main());
        Handle(XCAFDoc_ColorTool) colorTool = XCAFDoc_DocumentTool::ColorTool(doc->Main());

        TDF_LabelSequence freeShapes;
        shapeTool->GetFreeShapes(freeShapes);

        if (freeShapes.Length() == 0) {
            scene.error = "No shapes found in source file.";
            app->Close(doc);
            return imported;
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

        AppendRootNodes(freeShapes, shapeTool, colorTool, params, scene, &imported.exactGeometryShapes);
        imported.exactShape = BuildExactRootShape(freeShapes, shapeTool);
        if (imported.exactShape.IsNull()) {
            scene.error = "Failed to build the retained exact root shape.";
            app->Close(doc);
            return imported;
        }
        if (imported.exactGeometryShapes.size() != scene.meshes.size()) {
            scene.error = "Failed to align exact geometry bindings with exported geometries.";
            app->Close(doc);
            return imported;
        }

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

    return imported;
}

OcctSceneData ImportXdeFromMemory(
    const uint8_t* data,
    size_t size,
    const std::string& fileName,
    const ImportParams& params,
    const std::string& format)
{
    return ImportExactXdeFromMemory(data, size, fileName, params, format).scene;
}
