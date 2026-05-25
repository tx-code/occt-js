#pragma once

#include "importer.hpp"

#include <array>
#include <cstdint>
#include <string>
#include <vector>
#include <TopoDS_Shape.hxx>

struct OcctGeometryTransformResult {
    bool success = false;
    std::string format;
    std::string error;
    std::vector<uint8_t> content;
};

OcctGeometryTransformResult TransformStepFromMemory(
    const uint8_t* data,
    size_t size,
    const std::array<double, 16>& matrix,
    const ImportParams& params);

OcctGeometryTransformResult TransformBrepFromMemory(
    const uint8_t* data,
    size_t size,
    const std::array<double, 16>& matrix,
    const ImportParams& params);

OcctGeometryTransformResult ExportShapeToFormat(
    const TopoDS_Shape& shape,
    const std::string& format);
