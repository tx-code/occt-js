#pragma once

#include "importer.hpp"

#include <gp_Trsf.hxx>

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

OcctExactDistanceResult MeasureExactDistance(
    int exactModelId,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const gp_Trsf& transformA,
    const gp_Trsf& transformB);

OcctExactDistanceResult MeasureExactDistanceCrossModel(
    int exactModelIdA,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    const gp_Trsf& transformA,
    int exactModelIdB,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const gp_Trsf& transformB);

OcctExactAngleResult MeasureExactAngle(
    int exactModelId,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const gp_Trsf& transformA,
    const gp_Trsf& transformB);

OcctExactAngleResult MeasureExactAngleCrossModel(
    int exactModelIdA,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    const gp_Trsf& transformA,
    int exactModelIdB,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const gp_Trsf& transformB);

OcctExactThicknessResult MeasureExactThickness(
    int exactModelId,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const gp_Trsf& transformA,
    const gp_Trsf& transformB);

OcctExactThicknessResult MeasureExactThicknessCrossModel(
    int exactModelIdA,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    const gp_Trsf& transformA,
    int exactModelIdB,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const gp_Trsf& transformB);

OcctExactRelationResult ClassifyExactRelation(
    int exactModelId,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const gp_Trsf& transformA,
    const gp_Trsf& transformB);

OcctExactRelationResult ClassifyExactRelationCrossModel(
    int exactModelIdA,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    const gp_Trsf& transformA,
    int exactModelIdB,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const gp_Trsf& transformB);

OcctExactPlacementResult SuggestExactDistancePlacement(
    int exactModelId,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const gp_Trsf& transformA,
    const gp_Trsf& transformB);

OcctExactPlacementResult SuggestExactDistancePlacementCrossModel(
    int exactModelIdA,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    const gp_Trsf& transformA,
    int exactModelIdB,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const gp_Trsf& transformB);

OcctExactPlacementResult SuggestExactAnglePlacement(
    int exactModelId,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const gp_Trsf& transformA,
    const gp_Trsf& transformB);

OcctExactPlacementResult SuggestExactAnglePlacementCrossModel(
    int exactModelIdA,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    const gp_Trsf& transformA,
    int exactModelIdB,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const gp_Trsf& transformB);

OcctExactPlacementResult SuggestExactThicknessPlacement(
    int exactModelId,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const gp_Trsf& transformA,
    const gp_Trsf& transformB);

OcctExactPlacementResult SuggestExactThicknessPlacementCrossModel(
    int exactModelIdA,
    int exactShapeHandleA,
    const std::string& kindA,
    int elementIdA,
    const gp_Trsf& transformA,
    int exactModelIdB,
    int exactShapeHandleB,
    const std::string& kindB,
    int elementIdB,
    const gp_Trsf& transformB);

OcctExactPlacementResult SuggestExactRadiusPlacement(
    int exactModelId,
    int exactShapeHandle,
    const std::string& kind,
    int elementId);

OcctExactPlacementResult SuggestExactDiameterPlacement(
    int exactModelId,
    int exactShapeHandle,
    const std::string& kind,
    int elementId);

OcctExactHoleResult DescribeExactHole(
    int exactModelId,
    int exactShapeHandle,
    const std::string& kind,
    int elementId);

OcctExactChamferResult DescribeExactChamfer(
    int exactModelId,
    int exactShapeHandle,
    const std::string& kind,
    int elementId);

OcctExactCompoundHoleResult DescribeExactCompoundHole(
    int exactModelId,
    int exactShapeHandle,
    const std::string& kind,
    int elementId);
