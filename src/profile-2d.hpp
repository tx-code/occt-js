#pragma once

#include <emscripten/val.h>

#include "importer.hpp"

struct OcctProfile2DValidationOptions {
    std::string rootPath;
    bool requireClosed = true;
};

OcctProfile2DValidationResult ValidateProfile2DSpec(const emscripten::val& jsSpec);
OcctProfile2DValidationResult ParseAndValidateProfile2DSpec(
    const emscripten::val& jsSpec,
    const OcctProfile2DValidationOptions& options = {});
OcctProfile2DValidationResult ValidateNormalizedProfile2DSpec(
    const OcctProfile2DSpec& spec,
    const OcctProfile2DValidationOptions& options = {});
