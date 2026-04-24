#pragma once

#include <emscripten/val.h>

#include "importer.hpp"

OcctHelicalSweepValidationResult ValidateHelicalSweepSpec(const emscripten::val& jsSpec);
OcctHelicalSweepBuildResult BuildHelicalSweep(const emscripten::val& jsSpec, const emscripten::val& jsOptions);
