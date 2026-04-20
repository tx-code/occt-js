# Phase 26 Soak Report

**Generated:** 2026-04-20T05:35:00.106Z  
**Scenario:** `exact-lifecycle-long-session-soak`  
**Command:** `npm run test:soak:exact`

## Run Configuration

- Fixture: `test/simple_part.step`
- Cycles: `120`
- Query iterations per cycle: `24`
- Expected operations per cycle: `72` (`GetExactGeometryType` + `MeasureExactFaceArea` + `MeasureExactEdgeLength`)

## Result Summary

- Total operations: `8640`
- Released-handle checks: `120`
- Total elapsed: `637.313 ms`
- Throughput: `13556.91 ops/s`

Cycle duration stats:

- `minMs`: `3.474`
- `avgMs`: `5.31`
- `p95Ms`: `8.13`
- `maxMs`: `103.482`

Final diagnostics snapshot:

- `liveExactModelCount`: `0`
- `releasedHandleCount`: `120`

## Conclusion

The soak run completed successfully with deterministic lifecycle behavior:

- each cycle opened and released a retained exact model successfully
- post-release queries consistently returned typed `released-handle` failures
- live exact-model count returned to zero at the end of every cycle and at run completion

This report provides explicit long-session evidence for Phase 26 milestone closeout.
