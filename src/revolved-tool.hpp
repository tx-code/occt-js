#pragma once

#include <emscripten/val.h>

#include "importer.hpp"

OcctRevolvedToolValidationResult ValidateRevolvedToolSpec(const emscripten::val& jsSpec);
OcctRevolvedToolBuildResult BuildRevolvedTool(const emscripten::val& jsSpec, const emscripten::val& jsOptions);
