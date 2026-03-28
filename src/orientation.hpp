#pragma once

#include "importer.hpp"

#include <array>
#include <cstddef>
#include <cstdint>
#include <string>

struct OrientationAxisInput {
    std::array<double, 3> origin {0.0, 0.0, 0.0};
    std::array<double, 3> direction {0.0, 0.0, 1.0};
    bool isSet = false;
};

struct OrientationParams {
    ImportParams::LinearUnit linearUnit = ImportParams::LinearUnit::Millimeter;
    std::string mode = "manufacturing";
    OrientationAxisInput presetAxis;
};

struct OrientationFrame {
    std::array<double, 3> origin {0.0, 0.0, 0.0};
    std::array<double, 3> xDir {1.0, 0.0, 0.0};
    std::array<double, 3> yDir {0.0, 1.0, 0.0};
    std::array<double, 3> zDir {0.0, 0.0, 1.0};
};

struct OrientationBbox {
    double dx = 0.0;
    double dy = 0.0;
    double dz = 0.0;
};

struct OrientationStage1Result {
    int baseFaceId = 0;
    bool hasBaseFaceId = false;
    bool usedCylinderSupport = false;
    std::array<double, 3> detectedAxis {0.0, 0.0, 1.0};
};

struct OrientationStage2Result {
    double rotationAroundZDeg = 0.0;
};

struct OrientationResult {
    bool success = false;
    std::string error;
    std::array<float, 16> transform {
        1.0f, 0.0f, 0.0f, 0.0f,
        0.0f, 1.0f, 0.0f, 0.0f,
        0.0f, 0.0f, 1.0f, 0.0f,
        0.0f, 0.0f, 0.0f, 1.0f
    };
    OrientationFrame localFrame;
    OrientationBbox bbox;
    std::string strategy;
    OrientationStage1Result stage1;
    OrientationStage2Result stage2;
    double confidence = 0.0;
    std::string sourceUnit;
    double unitScaleToMeters = 0.0;
};

OrientationResult AnalyzeOptimalOrientationFromMemory(
    const std::string& format,
    const uint8_t* data,
    size_t size,
    const OrientationParams& params
);
