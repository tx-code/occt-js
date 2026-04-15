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
#include <TopoDS_Iterator.hxx>

namespace {

std::array<float, 16> IdentityMatrix()
{
    return {1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1};
}

void ExtractShapeMeshes(
    const TopoDS_Shape& shape,
    const ImportParams& params,
    OcctSceneData& scene,
    OcctNodeData& node,
    std::vector<TopoDS_Shape>* exactGeometryShapes = nullptr)
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
        meshData.color = params.ResolveFallbackColor();
        if (params.ShouldUseDefaultColor()) {
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

    if (node.meshIndices.empty()) {
        extractOne(shape);
    }
}

std::vector<TopoDS_Shape> CollectDirectChildren(const TopoDS_Shape& shape)
{
    std::vector<TopoDS_Shape> children;
    for (TopoDS_Iterator it(shape); it.More(); it.Next()) {
        if (!it.Value().IsNull()) {
            children.push_back(it.Value());
        }
    }
    return children;
}

std::vector<TopoDS_Shape> CollectRootShapes(const TopoDS_Shape& shape, const ImportParams& params)
{
    if (params.rootMode != ImportParams::RootMode::MultipleShapes) {
        return { shape };
    }

    TopoDS_Shape splitShape = shape;
    while (splitShape.ShapeType() == TopAbs_COMPOUND || splitShape.ShapeType() == TopAbs_COMPSOLID) {
        std::vector<TopoDS_Shape> children = CollectDirectChildren(splitShape);
        if (children.size() != 1) {
            break;
        }
        splitShape = children[0];
    }

    if (splitShape.ShapeType() != TopAbs_COMPOUND && splitShape.ShapeType() != TopAbs_COMPSOLID) {
        return { shape };
    }

    std::vector<TopoDS_Shape> roots = CollectDirectChildren(splitShape);

    if (roots.size() <= 1) {
        return { shape };
    }

    return roots;
}

void AppendRootNode(const TopoDS_Shape& shape,
                    const std::string& nodeId,
                    const std::string& nodeName,
                    const ImportParams& params,
                    OcctSceneData& scene,
                    std::vector<TopoDS_Shape>* exactGeometryShapes = nullptr)
{
    scene.nodes.emplace_back();
    OcctNodeData& root = scene.nodes.back();
    root.id = nodeId;
    root.name = nodeName;
    root.isAssembly = false;
    root.transform = IdentityMatrix();

    ExtractShapeMeshes(shape, params, scene, root, exactGeometryShapes);
}

} // namespace

OcctExactImportData ImportExactBrepFromMemory(
    const uint8_t* data,
    size_t size,
    const std::string& fileName,
    const ImportParams& params)
{
    OcctExactImportData imported;
    OcctSceneData& scene = imported.scene;

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
            return imported;
        }

        TopoDS_Shape meshingShape = shape;
        TriangulateShape(meshingShape, params);

        const std::string baseName = fileName.empty() ? "BREP" : fileName;
        const std::vector<TopoDS_Shape> rootShapes = CollectRootShapes(meshingShape, params);

        for (size_t i = 0; i < rootShapes.size(); ++i) {
            const bool useIndexedName = rootShapes.size() > 1;
            const std::string nodeName = useIndexedName
                ? (baseName + " #" + std::to_string(i + 1))
                : baseName;

            const int rootIndex = static_cast<int>(scene.nodes.size());
            AppendRootNode(
                rootShapes[i],
                std::to_string(rootIndex),
                nodeName,
                params,
                scene,
                &imported.exactGeometryShapes);

            if (!scene.nodes[rootIndex].meshIndices.empty()) {
                scene.rootNodeIndices.push_back(rootIndex);
            }
        }

        if (scene.rootNodeIndices.empty()) {
            scene.error = "No meshable shapes found in BREP file.";
            return imported;
        }

        imported.exactShape = meshingShape;
        if (imported.exactGeometryShapes.size() != scene.meshes.size()) {
            scene.error = "Failed to align exact geometry bindings with exported geometries.";
            return imported;
        }
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

    return imported;
}

OcctSceneData ImportBrepFromMemory(
    const uint8_t* data,
    size_t size,
    const std::string& fileName,
    const ImportParams& params)
{
    return ImportExactBrepFromMemory(data, size, fileName, params).scene;
}
