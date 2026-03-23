# occt-js 下一阶段计划

**上一阶段**: MVP 完成 (2026-03-23)
**本阶段目标**: 产品化 — 瘦身、npm 发布、功能扩展

---

## P1: Wasm 瘦身

**目标**: 从 ~11MB 减到 6-8MB

**做什么**:
- 排除不需要的可视化模块：AIS, V3d, Graphic3d, Aspect, OpenGl, Image, Font, Media, Prs3d, PrsDim, PrsMgr, StdPrs, StdSelect, Select3D, SelectBasics, SelectMgr, WNT, Wasm, Xw
- 排除不需要的交换格式：DEIGES, DEGLTF, DEOBJ, DEPLY, DESTL, DEVRML, RWGltf, RWObj, RWPly, RWStl, RWMesh, StlAPI, Vrml*, IGESCAFControl, IGES*, BRepToIGES*
- 排除 HLR（隐藏线消除）：HLRAlgo, HLRBRep, HLRTopoBRep
- 保留核心：Standard, NCollection, gp, Geom*, TopoDS, BRep*, TopExp, TopLoc, STEP*, XCAF*, TDF*, BRepMesh*, Poly, ShapeFix/Analysis, BOPAlgo
- 逐步排除 → 编译验证 → 跑测试确认不回退

**验证方式**:
- `wasm-opt --strip-debug` 后文件大小
- test_mvp_acceptance.mjs 18/18 仍通过
- ANC101.stp 导入结果不变

---

## P2: sourceUnit 提取

**做什么**:
- 从 STEP header 或 XDE document 读取单位信息
- 输出到结果对象的 `sourceUnit` 和 `unitScaleToMeters` 字段
- 支持 MM, CM, M, INCH, FOOT

**验证方式**:
- cube-mm.step → sourceUnit="MM", unitScaleToMeters=0.001
- cube-m.step → sourceUnit="M", unitScaleToMeters=1.0

---

## P3: npm 发布

**做什么**:
- 配置 package.json 的 files / main / types
- dist/ 中放 .js + .wasm
- 发布到 npm: `npm publish`
- 确定 CDN URL 模式（unpkg / jsdelivr）

**验证方式**:
- `npm install occt-js` 后能 `require('occt-js')` 调用 ReadStepFile

---

## P4: IGES 支持

**做什么**:
- 新增 `src/importer-iges.cpp` / `importer-iges.hpp`
- 使用 IGESCAFControl_Reader
- 在 js-interface.cpp 中注册 `ReadIgesFile()`
- 复用 importer-utils.cpp 的三角化逻辑

**验证方式**:
- .iges / .igs 文件导入成功

---

## P5: 性能优化

**做什么**:
- 考虑 `-Os` vs `-Oz` 的性能/体积权衡
- 大模型 benchmark（>100MB STEP）
- 内存峰值监控

---

## 优先级排序

```
P1 (瘦身) → P2 (单位) → P3 (npm) → P4 (IGES) → P5 (性能)
```
