#pragma once

#include "importer.hpp"

#include <string>

struct ExactModelEntry {
    int id = 0;
    int refCount = 1;
    std::string sourceFormat;
    std::string sourceUnit;
    double unitScaleToMeters = 0.0;
    TopoDS_Shape exactShape;
    std::vector<TopoDS_Shape> exactGeometryShapes;
};

class ExactModelStore {
public:
    static ExactModelStore& Instance();

    int Register(
        const TopoDS_Shape& exactShape,
        const std::vector<TopoDS_Shape>& exactGeometryShapes,
        const std::string& sourceFormat,
        const std::string& sourceUnit,
        double unitScaleToMeters);

    OcctLifecycleResult Retain(int exactModelId);
    OcctLifecycleResult Release(int exactModelId);
    OcctLifecycleResult GetEntry(int exactModelId, ExactModelEntry& entry);

private:
    ExactModelStore() = default;
    ExactModelStore(const ExactModelStore&) = delete;
    ExactModelStore& operator=(const ExactModelStore&) = delete;
};
