#pragma once

#include "importer.hpp"
#include <cstdint>
#include <string>

/// Import a BREP file from an in-memory buffer.
///
/// @param data      Pointer to the raw file bytes.
/// @param size      Number of bytes.
/// @param fileName  Logical file name for metadata only.
/// @param params    Tessellation / import parameters.
/// @return          Populated scene graph, with success==true on success.
OcctSceneData ImportBrepFromMemory(
    const uint8_t*      data,
    size_t              size,
    const std::string&  fileName,
    const ImportParams& params
);
