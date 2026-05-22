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

OcctProductInspectionResult InspectStepProductFromMemory(
    const uint8_t* data,
    size_t size,
    const std::string& fileName,
    const ImportParams& params)
{
    return InspectXdeProductFromMemory(data, size, fileName, params, "step");
}

OcctSelectedStepImportResult ImportSelectedStepOccurrenceFromMemory(
    const uint8_t* data,
    size_t size,
    const std::string& fileName,
    const ImportParams& params,
    const std::string& occurrenceRef)
{
    return ImportSelectedXdeOccurrenceFromMemory(data, size, fileName, params, "step", occurrenceRef);
}
