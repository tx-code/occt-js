#include "exact-model-store.hpp"

#include <algorithm>
#include <mutex>
#include <unordered_map>
#include <unordered_set>

namespace {

struct ExactModelStoreState {
    std::mutex mutex;
    int nextId = 1;
    std::unordered_map<int, ExactModelEntry> liveEntries;
    std::unordered_set<int> releasedEntries;
};

ExactModelStoreState& State()
{
    static ExactModelStoreState state;
    return state;
}

OcctLifecycleResult MakeOk()
{
    OcctLifecycleResult result;
    result.ok = true;
    return result;
}

OcctLifecycleResult MakeFailure(const std::string& code, const std::string& message)
{
    OcctLifecycleResult result;
    result.ok = false;
    result.code = code;
    result.message = message;
    return result;
}

} // namespace

ExactModelStore& ExactModelStore::Instance()
{
    static ExactModelStore store;
    return store;
}

int ExactModelStore::Register(
    const TopoDS_Shape& exactShape,
    const std::vector<TopoDS_Shape>& exactGeometryShapes,
    const std::string& sourceFormat,
    const std::string& sourceUnit,
    double unitScaleToMeters)
{
    if (exactShape.IsNull()) {
        return 0;
    }

    auto& state = State();
    std::lock_guard<std::mutex> lock(state.mutex);

    const int exactModelId = state.nextId++;
    ExactModelEntry entry;
    entry.id = exactModelId;
    entry.refCount = 1;
    entry.sourceFormat = sourceFormat;
    entry.sourceUnit = sourceUnit;
    entry.unitScaleToMeters = unitScaleToMeters;
    entry.exactShape = exactShape;
    entry.exactGeometryShapes = exactGeometryShapes;
    state.liveEntries.emplace(exactModelId, std::move(entry));
    return exactModelId;
}

OcctLifecycleResult ExactModelStore::Retain(int exactModelId)
{
    auto& state = State();
    std::lock_guard<std::mutex> lock(state.mutex);

    auto liveIt = state.liveEntries.find(exactModelId);
    if (liveIt != state.liveEntries.end()) {
        ++liveIt->second.refCount;
        return MakeOk();
    }

    if (state.releasedEntries.count(exactModelId) > 0) {
        return MakeFailure("released-handle", "Exact model handle has already been released.");
    }

    return MakeFailure("invalid-handle", "Exact model handle is unknown.");
}

OcctLifecycleResult ExactModelStore::Release(int exactModelId)
{
    auto& state = State();
    std::lock_guard<std::mutex> lock(state.mutex);

    auto liveIt = state.liveEntries.find(exactModelId);
    if (liveIt == state.liveEntries.end()) {
        if (state.releasedEntries.count(exactModelId) > 0) {
            return MakeFailure("released-handle", "Exact model handle has already been released.");
        }
        return MakeFailure("invalid-handle", "Exact model handle is unknown.");
    }

    --liveIt->second.refCount;
    if (liveIt->second.refCount <= 0) {
        state.releasedEntries.insert(exactModelId);
        state.liveEntries.erase(liveIt);
    }

    return MakeOk();
}

OcctLifecycleResult ExactModelStore::GetEntry(int exactModelId, ExactModelEntry& entry)
{
    auto& state = State();
    std::lock_guard<std::mutex> lock(state.mutex);

    auto liveIt = state.liveEntries.find(exactModelId);
    if (liveIt != state.liveEntries.end()) {
        entry = liveIt->second;
        return MakeOk();
    }

    if (state.releasedEntries.count(exactModelId) > 0) {
        return MakeFailure("released-handle", "Exact model handle has already been released.");
    }

    return MakeFailure("invalid-handle", "Exact model handle is unknown.");
}

OcctExactModelDiagnostics ExactModelStore::GetDiagnostics()
{
    auto& state = State();
    std::lock_guard<std::mutex> lock(state.mutex);

    OcctExactModelDiagnostics diagnostics;
    diagnostics.liveExactModelCount = static_cast<int>(state.liveEntries.size());
    diagnostics.releasedHandleCount = static_cast<int>(state.releasedEntries.size());
    diagnostics.liveExactModels.reserve(state.liveEntries.size());

    for (const auto& [exactModelId, entry] : state.liveEntries) {
        OcctExactModelDiagnosticsEntry diagnosticEntry;
        diagnosticEntry.exactModelId = exactModelId;
        diagnosticEntry.refCount = entry.refCount;
        diagnosticEntry.sourceFormat = entry.sourceFormat;
        diagnosticEntry.sourceUnit = entry.sourceUnit;
        diagnosticEntry.unitScaleToMeters = entry.unitScaleToMeters;
        diagnosticEntry.exactGeometryCount = static_cast<int>(entry.exactGeometryShapes.size());
        diagnostics.liveExactModels.push_back(std::move(diagnosticEntry));
    }

    std::sort(
        diagnostics.liveExactModels.begin(),
        diagnostics.liveExactModels.end(),
        [](const OcctExactModelDiagnosticsEntry& left, const OcctExactModelDiagnosticsEntry& right) {
            return left.exactModelId < right.exactModelId;
        }
    );

    return diagnostics;
}
