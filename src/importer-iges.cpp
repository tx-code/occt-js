#include "importer-iges.hpp"
#include "importer-xde.hpp"

OcctSceneData ImportIgesFromMemory(
    const uint8_t* data,
    size_t size,
    const std::string& fileName,
    const ImportParams& params)
{
    return ImportXdeFromMemory(data, size, fileName, params, "iges");
}
