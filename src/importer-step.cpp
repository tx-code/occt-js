#include "importer-step.hpp"
#include "importer-xde.hpp"

OcctSceneData ImportStepFromMemory(
    const uint8_t* data,
    size_t size,
    const std::string& fileName,
    const ImportParams& params)
{
    return ImportXdeFromMemory(data, size, fileName, params, "step");
}

OcctExactImportData ImportExactStepFromMemory(
    const uint8_t* data,
    size_t size,
    const std::string& fileName,
    const ImportParams& params)
{
    return ImportExactXdeFromMemory(data, size, fileName, params, "step");
}
