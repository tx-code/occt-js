#pragma once

#include <emscripten/val.h>

#include "importer.hpp"

OcctRevolvedToolValidationResult ValidateRevolvedShapeSpec(const emscripten::val& jsSpec);
OcctRevolvedToolBuildResult BuildRevolvedShape(const emscripten::val& jsSpec, const emscripten::val& jsOptions);
