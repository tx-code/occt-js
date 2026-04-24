#pragma once

#include <emscripten/val.h>

#include "importer.hpp"

OcctCompositeShapeValidationResult ValidateCompositeShapeSpec(const emscripten::val& jsSpec);
OcctCompositeShapeBuildResult BuildCompositeShape(const emscripten::val& jsSpec, const emscripten::val& jsOptions);
