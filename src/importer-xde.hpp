#pragma once

#include "importer.hpp"
#include <cstdint>
#include <string>

/// Import an XDE-backed CAD file (STEP/IGES) from memory.
///
/// @param data      Pointer to the raw file bytes.
/// @param size      Number of bytes.
/// @param fileName  Logical file name (used for reader registration).
/// @param params    Tessellation / import parameters.
/// @param format    Supported values: "step", "iges".
/// @return          Populated scene graph, with success==true on success.
OcctSceneData ImportXdeFromMemory(
    const uint8_t*      data,
    size_t              size,
    const std::string&  fileName,
    const ImportParams& params,
    const std::string&  format
);

OcctExactImportData ImportExactXdeFromMemory(
    const uint8_t*      data,
    size_t              size,
    const std::string&  fileName,
    const ImportParams& params,
    const std::string&  format
);
