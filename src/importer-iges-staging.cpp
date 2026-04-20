#include "importer-iges-staging.hpp"

#include <IFSelect_ReturnStatus.hxx>
#include <IGESCAFControl_Reader.hxx>

#include <atomic>
#include <cctype>
#include <chrono>
#include <cstdio>
#include <fstream>

namespace {

std::atomic<unsigned long long> gIgesTempSequence {0};

std::string BuildTempStem(const std::string& logicalFileName)
{
    std::string stem = logicalFileName.empty() ? "temp_input_igs" : logicalFileName;
    for (char& ch : stem) {
        const unsigned char code = static_cast<unsigned char>(ch);
        if (!std::isalnum(code)) {
            ch = '_';
        }
    }
    if (stem.empty()) {
        return "temp_input_igs";
    }
    if (stem.size() > 64) {
        stem.resize(64);
    }
    return stem;
}

std::string BuildTempFileName(const std::string& logicalFileName)
{
    const unsigned long long nowMicros = static_cast<unsigned long long>(
        std::chrono::duration_cast<std::chrono::microseconds>(
            std::chrono::steady_clock::now().time_since_epoch())
            .count());
    const unsigned long long sequence = gIgesTempSequence.fetch_add(1, std::memory_order_relaxed) + 1;

    std::string fileName = BuildTempStem(logicalFileName);
    fileName += ".tmp.";
    fileName += std::to_string(nowMicros);
    fileName += ".";
    fileName += std::to_string(sequence);
    fileName += ".igs";
    return fileName;
}

} // namespace

bool ReadIgesFromMemoryViaTempFile(
    const uint8_t* data,
    size_t size,
    const std::string& logicalFileName,
    IGESCAFControl_Reader& cafReader,
    std::string& outError)
{
    const std::string tempFileName = BuildTempFileName(logicalFileName);
    {
        std::ofstream tmpFile(tempFileName, std::ios::binary);
        if (!tmpFile.is_open()) {
            outError = "Failed to create temporary IGES file.";
            return false;
        }
        tmpFile.write(reinterpret_cast<const char*>(data), static_cast<std::streamsize>(size));
        if (!tmpFile.good()) {
            tmpFile.close();
            std::remove(tempFileName.c_str());
            outError = "Failed to write temporary IGES file.";
            return false;
        }
    }

    const IFSelect_ReturnStatus readStatus = cafReader.ReadFile(tempFileName.c_str());
    std::remove(tempFileName.c_str());

    if (readStatus != IFSelect_RetDone) {
        outError = "IGES reader failed to parse the file.";
        return false;
    }

    return true;
}
