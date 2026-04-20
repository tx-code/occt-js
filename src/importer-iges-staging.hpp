#pragma once

#include <cstddef>
#include <cstdint>
#include <string>

class IGESCAFControl_Reader;

bool ReadIgesFromMemoryViaTempFile(
    const uint8_t* data,
    size_t size,
    const std::string& logicalFileName,
    IGESCAFControl_Reader& cafReader,
    std::string& outError);
