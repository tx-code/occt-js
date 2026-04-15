#pragma once

#include "importer.hpp"

#include <string>

OcctExactGeometryTypeResult GetExactGeometryType(
    int exactModelId,
    int exactShapeHandle,
    const std::string& kind,
    int elementId);

OcctExactRadiusResult MeasureExactRadius(
    int exactModelId,
    int exactShapeHandle,
    const std::string& kind,
    int elementId);

OcctExactCenterResult MeasureExactCenter(
    int exactModelId,
    int exactShapeHandle,
    const std::string& kind,
    int elementId);

OcctExactEdgeLengthResult MeasureExactEdgeLength(
    int exactModelId,
    int exactShapeHandle,
    const std::string& kind,
    int elementId);

OcctExactFaceAreaResult MeasureExactFaceArea(
    int exactModelId,
    int exactShapeHandle,
    const std::string& kind,
    int elementId);

OcctExactFaceNormalResult EvaluateExactFaceNormal(
    int exactModelId,
    int exactShapeHandle,
    const std::string& kind,
    int elementId,
    const std::array<double, 3>& localQueryPoint);
