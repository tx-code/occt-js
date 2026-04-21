#pragma once

#include <emscripten/val.h>

#include "importer.hpp"

OcctExtrudedShapeValidationResult ValidateExtrudedShapeSpec(const emscripten::val& jsSpec);
OcctExtrudedShapeBuildResult BuildExtrudedShape(const emscripten::val& jsSpec, const emscripten::val& jsOptions);
