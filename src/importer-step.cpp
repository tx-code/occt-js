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
#include <XCAFDoc_Location.hxx>
#include <TDocStd_Document.hxx>
#include <TDF_Label.hxx>
#include <TDF_LabelSequence.hxx>
#include <TDF_ChildIterator.hxx>
#include <TDataStd_Name.hxx>
#include <TopoDS_Shape.hxx>
#include <TopLoc_Location.hxx>
#include <gp_Trsf.hxx>
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
//  Convert gp_Trsf to a column-major 4x4 float array.
// ---------------------------------------------------------------------------
std::array<float, 16> TrsfToMatrix(const gp_Trsf& trsf)
{
    std::array<float, 16> m;
    // Row 0
    m[0]  = static_cast<float>(trsf.Value(1, 1));
    m[1]  = static_cast<float>(trsf.Value(2, 1));
    m[2]  = static_cast<float>(trsf.Value(3, 1));
    m[3]  = 0.0f;
    // Row 1
    m[4]  = static_cast<float>(trsf.Value(1, 2));
    m[5]  = static_cast<float>(trsf.Value(2, 2));
    m[6]  = static_cast<float>(trsf.Value(3, 2));
    m[7]  = 0.0f;
    // Row 2
    m[8]  = static_cast<float>(trsf.Value(1, 3));
    m[9]  = static_cast<float>(trsf.Value(2, 3));
    m[10] = static_cast<float>(trsf.Value(3, 3));
    m[11] = 0.0f;
    // Row 3 (translation)
    m[12] = static_cast<float>(trsf.Value(1, 4));
    m[13] = static_cast<float>(trsf.Value(2, 4));
    m[14] = static_cast<float>(trsf.Value(3, 4));
    m[15] = 1.0f;
    return m;
}

// Identity 4x4 column-major
std::array<float, 16> IdentityMatrix()
{
    return {
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    };
}

// ---------------------------------------------------------------------------
//  Retrieve the user-visible name from a label (via TDataStd_Name).
// ---------------------------------------------------------------------------
std::string GetLabelName(const TDF_Label& label)
{
    Handle(TDataStd_Name) nameAttr;
    if (label.FindAttribute(TDataStd_Name::GetID(), nameAttr)) {
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
    return {};
}

// ---------------------------------------------------------------------------
//  Get color from a label using the color tool.
// ---------------------------------------------------------------------------
OcctColor GetLabelColor(const TDF_Label& label,
                        const Handle(XCAFDoc_ColorTool)& colorTool)
{
    Quantity_Color qColor;
    if (colorTool->GetColor(label, XCAFDoc_ColorSurf, qColor) ||
        colorTool->GetColor(label, XCAFDoc_ColorCurv, qColor) ||
        colorTool->GetColor(label, XCAFDoc_ColorGen, qColor))
    {
        return OcctColor(qColor.Red(), qColor.Green(), qColor.Blue());
    }
    return {};
}

// ---------------------------------------------------------------------------
//  Get color for a shape.
// ---------------------------------------------------------------------------
OcctColor GetShapeColor(const TopoDS_Shape& shape,
                        const Handle(XCAFDoc_ColorTool)& colorTool)
{
    Quantity_Color qColor;
    if (colorTool->GetColor(shape, XCAFDoc_ColorSurf, qColor) ||
        colorTool->GetColor(shape, XCAFDoc_ColorCurv, qColor) ||
        colorTool->GetColor(shape, XCAFDoc_ColorGen, qColor))
    {
        return OcctColor(qColor.Red(), qColor.Green(), qColor.Blue());
    }
    return {};
}

// ---------------------------------------------------------------------------
//  Recursively traverse the XDE document tree and populate OcctSceneData.
// ---------------------------------------------------------------------------
void TraverseLabel(
    const TDF_Label&                         label,
    const Handle(XCAFDoc_ShapeTool)&         shapeTool,
    const Handle(XCAFDoc_ColorTool)&         colorTool,
    const ImportParams&                      params,
    OcctSceneData&                           scene,
    std::map<size_t, int>&                   shapeHashToMeshIndex)
{
    // Create a node for this label
    int nodeIndex = static_cast<int>(scene.nodes.size());
    scene.nodes.emplace_back();
    OcctNodeData& node = scene.nodes.back();

    // Name
    node.name = GetLabelName(label);

    // ID (use entry string)
    {
        TCollection_AsciiString entry;
        TDF_Tool::Entry(label, entry);
        node.id = entry.ToCString();
    }

    // Transform
    TopLoc_Location loc = shapeTool->GetLocation(label);
    if (loc.IsIdentity()) {
        node.transform = IdentityMatrix();
    } else {
        node.transform = TrsfToMatrix(loc.Transformation());
    }

    // Resolve reference
    TDF_Label refLabel = label;
    if (shapeTool->IsReference(label)) {
        shapeTool->GetReferredShape(label, refLabel);
        // Inherit name from reference target if current is empty
        if (node.name.empty()) {
            node.name = GetLabelName(refLabel);
        }
    }

    // Color from this label or referenced label
    OcctColor nodeColor = GetLabelColor(label, colorTool);
    if (!nodeColor.isValid) {
        nodeColor = GetLabelColor(refLabel, colorTool);
    }
    // nodeColor is used later as fallback for mesh color (not stored on node)

    // Check if it is an assembly (has sub-labels that are shapes)
    if (shapeTool->IsAssembly(refLabel))
    {
        node.isAssembly = true;

        TDF_LabelSequence children;
        shapeTool->GetComponents(refLabel, children);

        for (int i = 1; i <= children.Length(); ++i)
        {
            int childIdx = static_cast<int>(scene.nodes.size());
            TraverseLabel(children.Value(i), shapeTool, colorTool,
                          params, scene, shapeHashToMeshIndex);
            // Re-fetch our node reference since vector may have reallocated
            scene.nodes[nodeIndex].childIndices.push_back(childIdx);
        }
    }
    else
    {
        // Leaf shape – triangulate and extract mesh
        TopoDS_Shape shape = shapeTool->GetShape(refLabel);
        if (!shape.IsNull())
        {
            size_t shapeHash = std::hash<TopoDS_Shape>{}(shape);

            auto it = shapeHashToMeshIndex.find(shapeHash);
            if (it != shapeHashToMeshIndex.end()) {
                // Reuse an already-extracted mesh
                scene.nodes[nodeIndex].meshIndex = it->second;
            } else {
                // Triangulate
                TriangulateShape(shape, params);

                // Extract
                TopLoc_Location identity;
                OcctMeshData meshData = ExtractMeshFromShape(shape, identity);
                meshData.name = node.name;

                // Assign per-face colors
                OcctColor shapeColor = GetShapeColor(shape, colorTool);
                if (!shapeColor.isValid) {
                    shapeColor = nodeColor;
                }
                meshData.color = shapeColor;

                // Fill face-range colors from sub-shape colors
                {
                    int faceIdx = 0;
                    TopExp_Explorer faceExplorer(shape, TopAbs_FACE);
                    for (; faceExplorer.More(); faceExplorer.Next()) {
                        if (faceIdx < static_cast<int>(meshData.faceRanges.size())) {
                            OcctColor faceColor = GetShapeColor(
                                faceExplorer.Current(), colorTool);
                            if (faceColor.isValid) {
                                meshData.faceRanges[faceIdx].color = faceColor;
                            } else {
                                meshData.faceRanges[faceIdx].color = shapeColor;
                            }
                        }
                        ++faceIdx;
                    }
                }

                int meshIdx = static_cast<int>(scene.meshes.size());
                scene.meshes.push_back(std::move(meshData));
                shapeHashToMeshIndex[shapeHash] = meshIdx;
                scene.nodes[nodeIndex].meshIndex = meshIdx;
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

        // ---- Build the scene graph ----
        std::map<size_t, int> shapeHashToMeshIndex;

        for (int i = 1; i <= freeShapes.Length(); ++i)
        {
            int rootIdx = static_cast<int>(scene.nodes.size());
            TraverseLabel(
                freeShapes.Value(i),
                shapeTool,
                colorTool,
                params,
                scene,
                shapeHashToMeshIndex);
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
