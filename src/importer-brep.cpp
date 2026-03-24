#include "importer-brep.hpp"
#include "importer-utils.hpp"

#include <streambuf>
#include <istream>
#include <map>
#include <cstdint>
#include <array>

#include <Standard_ArrayStreamBuffer.hxx>
#include <Standard_Failure.hxx>
#include <TopoDS_Shape.hxx>
#include <TopExp_Explorer.hxx>
#include <TopAbs_ShapeEnum.hxx>
#include <BRep_Builder.hxx>
#include <BRepTools.hxx>

namespace {

std::array<float, 16> IdentityMatrix()
{
    return {1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1};
}

void ExtractShapeMeshes(const TopoDS_Shape& shape, OcctSceneData& scene, OcctNodeData& node)
{
    std::map<uintptr_t, int> shapeHashToMeshIndex;

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

    if (node.meshIndices.empty()) {
        extractOne(shape);
    }
}

} // namespace

OcctSceneData ImportBrepFromMemory(
    const uint8_t* data,
    size_t size,
    const std::string& fileName,
    const ImportParams& params)
{
    OcctSceneData scene;

    try {
        Standard_ArrayStreamBuffer streamBuf(
            reinterpret_cast<const char*>(data),
            static_cast<Standard_Size>(size));
        std::istream istream(&streamBuf);

        TopoDS_Shape shape;
        BRep_Builder builder;
        BRepTools::Read(shape, istream, builder);

        if (shape.IsNull()) {
            scene.error = "BREP reader failed to parse the file.";
            return scene;
        }

        TopoDS_Shape meshingShape = shape;
        TriangulateShape(meshingShape, params);

        scene.nodes.emplace_back();
        OcctNodeData& root = scene.nodes.back();
        root.id = "0";
        root.name = fileName.empty() ? "BREP" : fileName;
        root.isAssembly = false;
        root.transform = IdentityMatrix();

        ExtractShapeMeshes(meshingShape, scene, root);

        if (root.meshIndices.empty()) {
            scene.error = "No meshable shapes found in BREP file.";
            return scene;
        }

        scene.rootNodeIndices.push_back(0);
        scene.success = true;
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
        scene.error = "Unknown exception during BREP import.";
    }

    return scene;
}
