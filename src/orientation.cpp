#include "orientation.hpp"

#include <algorithm>
#include <cctype>

OrientationResult AnalyzeOptimalOrientationFromMemory(
    const std::string& format,
    const uint8_t* /*data*/,
    size_t /*size*/,
    const OrientationParams& /*params*/
)
{
    OrientationResult result;

    std::string normalizedFormat = format;
    std::transform(normalizedFormat.begin(), normalizedFormat.end(), normalizedFormat.begin(), [](unsigned char c) {
        return static_cast<char>(std::tolower(c));
    });

    if (normalizedFormat != "step" && normalizedFormat != "iges" && normalizedFormat != "brep") {
        result.success = false;
        result.error = "Unsupported format: " + format;
        return result;
    }

    result.success = false;
    result.error = "AnalyzeOptimalOrientation not implemented yet";
    return result;
}
