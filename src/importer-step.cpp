#include "importer-step.hpp"
#include "importer-utils.hpp"

#include <streambuf>
#include <istream>
#include <sstream>
#include <map>

// OCCT headers
#include <STEPCAFControl_Reader.hxx>
#include <STEPControl_Reader.hxx>
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
#include <Standard_ArrayStreamBuffer.hxx>
#include <TDF_Tool.hxx>
#include <Standard_Failure.hxx>
#include <IFSelect_ReturnStatus.hxx>

// ============================================================================
//  Helpers
// ============================================================================

namespace {

// ---------------------------------------------------------------------------
//  Convert gp_Trsf to a column-major 4x4 float array (Babylon.js compatible).
// ---------------------------------------------------------------------------
std::array<float, 16> TrsfToMatrix(const gp_Trsf& trsf)
{
    std::array<float, 16> m;
    // Column 0
    m[0]  = static_cast<float>(trsf.Value(1, 1));
    m[1]  = static_cast<float>(trsf.Value(2, 1));
    m[2]  = static_cast<float>(trsf.Value(3, 1));
    m[3]  = 0.0f;
    // Column 1
    m[4]  = static_cast<float>(trsf.Value(1, 2));
    m[5]  = static_cast<float>(trsf.Value(2, 2));
    m[6]  = static_cast<float>(trsf.Value(3, 2));
    m[7]  = 0.0f;
    // Column 2
    m[8]  = static_cast<float>(trsf.Value(1, 3));
    m[9]  = static_cast<float>(trsf.Value(2, 3));
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
    return { 1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1 };
}

// ---------------------------------------------------------------------------
//  Get name from label — proper UTF-8 conversion (matches occt-import-js).
// ---------------------------------------------------------------------------
std::string GetLabelNameNoRef(const TDF_Label& label)
{
    Handle(TDataStd_Name) nameAttr;
    if (!label.FindAttribute(TDataStd_Name::GetID(), nameAttr)) {
        return {};
    }
    TCollection_ExtendedString extStr = nameAttr->Get();
    std::string result;
    for (int i = 1; i <= extStr.Length(); ++i) {
        Standard_ExtCharacter ch = extStr.Value(i);
        if (ch < 128) {
            result += static_cast<char>(ch);
        } else {
            result += '?';
        }
    }
    return result;
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

// ---------------------------------------------------------------------------
//  Get color from label (matches occt-import-js: try label, then reference).
// ---------------------------------------------------------------------------
bool GetLabelColorNoRef(const TDF_Label& label,
                        const Handle(XCAFDoc_ColorTool)& colorTool,
                        OcctColor& color)
{
    Quantity_Color qColor;
    if (colorTool->GetColor(label, XCAFDoc_ColorSurf, qColor) ||
        colorTool->GetColor(label, XCAFDoc_ColorCurv, qColor) ||
        colorTool->GetColor(label, XCAFDoc_ColorGen, qColor))
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

// ---------------------------------------------------------------------------
//  Check if a label is a free shape.
// ---------------------------------------------------------------------------
bool IsFreeShape(const TDF_Label& label, const Handle(XCAFDoc_ShapeTool)& shapeTool)
{
    TopoDS_Shape tmpShape;
    return shapeTool->GetShape(label, tmpShape) && shapeTool->IsFree(label);
}

// ---------------------------------------------------------------------------
//  Check if a label is a mesh node (leaf that has geometry, not assembly).
//  Matches occt-import-js: no children, or only subshape/non-freeshape children.
// ---------------------------------------------------------------------------
bool IsMeshNode(const TDF_Label& label, const Handle(XCAFDoc_ShapeTool)& shapeTool)
{
    if (!label.HasChild()) {
        return true;
    }

    // If it has a subshape child, treat as mesh node
    for (TDF_ChildIterator it(label); it.More(); it.Next()) {
        if (shapeTool->IsSubShape(it.Value())) {
            return true;
        }
    }

    // If no free-shape child, treat as mesh node
    bool hasFreeShapeChild = false;
    for (TDF_ChildIterator it(label); it.More(); it.Next()) {
        if (IsFreeShape(it.Value(), shapeTool)) {
            hasFreeShapeChild = true;
            break;
        }
    }
    return !hasFreeShapeChild;
}

// ---------------------------------------------------------------------------
//  Extract meshes from a shape.
//  Matches occt-import-js: enumerate SOLIDs, then SHELLs not in SOLIDs,
//  then standalone FACEs not in SHELLs.
// ---------------------------------------------------------------------------
void ExtractShapeMeshes(
    const TopoDS_Shape& shape,
    const Handle(XCAFDoc_ShapeTool)& shapeTool,
    const Handle(XCAFDoc_ColorTool)& colorTool,
    OcctSceneData& scene,
    OcctNodeData& node,
    std::map<int, int>& shapeHashToMeshIndex)
{
    auto extractOne = [&](const TopoDS_Shape& subShape) {
        // Geometry deduplication via shape hash
        int shapeHash = subShape.IsNull() ? 0 : subShape.IsPartner(subShape) ? subShape.HashCode(INT_MAX) : subShape.HashCode(INT_MAX);
        auto it = shapeHashToMeshIndex.find(shapeHash);
        if (it != shapeHashToMeshIndex.end()) {
            // Reuse existing mesh
            node.meshIndex = it->second;
            return;
        }

        OcctMeshData meshData = ExtractMeshFromShape(subShape);
        if (meshData.positions.empty()) return;

        // Name
        meshData.name = node.name;

        // Color: try shape-level, then node name lookup
        OcctColor shapeColor;
        GetShapeColor(subShape, shapeTool, colorTool, shapeColor);
        meshData.color = shapeColor;

        // Per-face colors
        int faceIdx = 0;
        for (TopExp_Explorer ex(subShape, TopAbs_FACE); ex.More(); ex.Next()) {
            if (faceIdx < static_cast<int>(meshData.faceRanges.size())) {
                OcctColor faceColor;
                if (GetShapeColor(ex.Current(), shapeTool, colorTool, faceColor)) {
                    meshData.faceRanges[faceIdx].color = faceColor;
                } else {
                    meshData.faceRanges[faceIdx].color = shapeColor;
                }
            }
            ++faceIdx;
        }

        int meshIdx = static_cast<int>(scene.meshes.size());
        scene.meshes.push_back(std::move(meshData));
        shapeHashToMeshIndex[shapeHash] = meshIdx;
        node.meshIndex = meshIdx;
    };

    // Solids
    for (TopExp_Explorer ex(shape, TopAbs_SOLID); ex.More(); ex.Next()) {
        extractOne(ex.Current());
    }
    // Shells not part of a solid
    for (TopExp_Explorer ex(shape, TopAbs_SHELL, TopAbs_SOLID); ex.More(); ex.Next()) {
        extractOne(ex.Current());
    }
    // Standalone faces not part of a shell
    bool hasStandaloneFaces = false;
    for (TopExp_Explorer ex(shape, TopAbs_FACE, TopAbs_SHELL); ex.More(); ex.Next()) {
        hasStandaloneFaces = true;
        break;
    }
    if (hasStandaloneFaces) {
        extractOne(shape); // will enumerate TopAbs_FACE in ExtractMeshFromShape
    }
}

// ---------------------------------------------------------------------------
//  Recursively traverse the XDE document tree.
// ---------------------------------------------------------------------------
void TraverseLabel(
    const TDF_Label&                     label,
    const Handle(XCAFDoc_ShapeTool)&     shapeTool,
    const Handle(XCAFDoc_ColorTool)&     colorTool,
    const ImportParams&                  params,
    OcctSceneData&                       scene)
{
    int nodeIndex = static_cast<int>(scene.nodes.size());
    scene.nodes.emplace_back();

    // Resolve reference
    TDF_Label refLabel = label;
    if (shapeTool->IsReference(label)) {
        shapeTool->GetReferredShape(label, refLabel);
    }

    // Name
    scene.nodes[nodeIndex].name = GetLabelName(label, shapeTool);

    // ID
    {
        TCollection_AsciiString entry;
        TDF_Tool::Entry(label, entry);
        scene.nodes[nodeIndex].id = entry.ToCString();
    }

    // Transform
    TopLoc_Location loc = shapeTool->GetLocation(label);
    if (loc.IsIdentity()) {
        scene.nodes[nodeIndex].transform = IdentityMatrix();
    } else {
        scene.nodes[nodeIndex].transform = TrsfToMatrix(loc.Transformation());
    }

    // Check if mesh node (leaf) or assembly (has children)
    if (IsMeshNode(refLabel, shapeTool)) {
        scene.nodes[nodeIndex].isAssembly = false;

        // Extract mesh from the shape
        TopoDS_Shape shape = shapeTool->GetShape(refLabel);
        if (!shape.IsNull()) {
            ExtractShapeMeshes(shape, shapeTool, colorTool, scene, scene.nodes[nodeIndex]);
        }
    } else {
        scene.nodes[nodeIndex].isAssembly = true;

        // Recurse children
        for (TDF_ChildIterator it(refLabel); it.More(); it.Next()) {
            TDF_Label childLabel = it.Value();
            if (IsFreeShape(childLabel, shapeTool)) {
                int childIdx = static_cast<int>(scene.nodes.size());
                TraverseLabel(childLabel, shapeTool, colorTool, params, scene);
                scene.nodes[nodeIndex].childIndices.push_back(childIdx);
            }
        }
    }
}

} // anonymous namespace

// ============================================================================
//  Public API
// ============================================================================

OcctSceneData ImportStepFromMemory(
    const uint8_t*     data,
    size_t             size,
    const std::string& fileName,
    const ImportParams& params)
{
    OcctSceneData scene;

    try {
        // ---- Create an XDE application and document ----
        Handle(XCAFApp_Application) app = XCAFApp_Application::GetApplication();
        Handle(TDocStd_Document) doc;
        app->NewDocument("BinXCAF", doc);

        if (doc.IsNull()) {
            scene.error = "Failed to create XDE document.";
            return scene;
        }

        // ---- Set up the STEP reader ----
        STEPCAFControl_Reader cafReader;
        cafReader.SetColorMode(params.readColors);
        cafReader.SetNameMode(params.readNames);

        STEPControl_Reader& reader = cafReader.ChangeReader();

        // Wrap memory in a stream
        Standard_ArrayStreamBuffer streamBuf(
            reinterpret_cast<const char*>(data),
            static_cast<Standard_Size>(size));
        std::istream istream(&streamBuf);

        // Read the STEP data
        IFSelect_ReturnStatus readStatus = reader.ReadStream(
            fileName.empty() ? "input.stp" : fileName.c_str(),
            istream);

        if (readStatus != IFSelect_RetDone) {
            scene.error = "STEP reader failed to parse the file.";
            app->Close(doc);
            return scene;
        }

        // Transfer into the XDE document
        if (!cafReader.Transfer(doc)) {
            scene.error = "Failed to transfer STEP data to XDE document.";
            app->Close(doc);
            return scene;
        }

        // ---- Extract tools ----
        Handle(XCAFDoc_ShapeTool) shapeTool =
            XCAFDoc_DocumentTool::ShapeTool(doc->Main());
        Handle(XCAFDoc_ColorTool) colorTool =
            XCAFDoc_DocumentTool::ColorTool(doc->Main());

        // ---- Get free (root) shapes ----
        TDF_LabelSequence freeShapes;
        shapeTool->GetFreeShapes(freeShapes);

        if (freeShapes.Length() == 0) {
            scene.error = "No shapes found in STEP file.";
            app->Close(doc);
            return scene;
        }

        // ---- Triangulate at root level (matches occt-import-js) ----
        // This ensures all sub-shapes get triangulated in one pass.
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

        // ---- Build the scene graph ----
        for (int i = 1; i <= freeShapes.Length(); ++i)
        {
            int rootIdx = static_cast<int>(scene.nodes.size());
            TraverseLabel(
                freeShapes.Value(i),
                shapeTool,
                colorTool,
                params,
                scene);
            scene.rootNodeIndices.push_back(rootIdx);
        }

        scene.success = true;
        app->Close(doc);
    }
    catch (const Standard_Failure& ex) {
        scene.error  = "OCCT exception: ";
        scene.error += ex.GetMessageString();
    }
    catch (const std::exception& ex) {
        scene.error  = "C++ exception: ";
        scene.error += ex.what();
    }
    catch (...) {
        scene.error = "Unknown exception during STEP import.";
    }

    return scene;
}
