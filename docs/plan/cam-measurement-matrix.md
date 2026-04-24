# CAM Measurement Matrix

Status: research note for future scoping, not a shipped package contract.

This document maps common CAM-oriented measurement needs to the right ownership boundary in `occt-js`.

`occt-js` should stay a lightweight OCCT Wasm runtime plus package-first adapters. It should not grow into a full CAD/CAM inspection workbench.

For this note, `main library` means the reusable published runtime/package surface rather than the browser demo. When the lower-level root carrier and the package-first adapter differ, the row calls that split out explicitly.

## Boundary

Put work in the main library only when it is:

- exact and deterministic
- driven by explicit refs, shapes, or directions
- returned as typed geometry DTOs
- reusable across multiple downstream apps

Keep work in the demo when it is:

- selection-to-action routing
- CAM-specific naming such as `clearance`, `step depth`, or `setup angle`
- overlay, panel, and current-result UX
- tolerance, pass/fail, probing, or report workflows
- session, camera, or inspection-product behavior

## Priority Matrix

| Capability | CAM value | Main library | Demo | Current status | Recommendation |
| --- | --- | --- | --- | --- | --- |
| Distance / minimum distance / clearance / step depth | P0 | Keep exact pairwise primitives such as `measureExactDistance(...)` and `measureExactThickness(...)`. Add a new carrier API only if a real kernel gap is proven. | Name the workflow as `clearance`, `face gap`, or `step depth`; own the action routing and display. | Canonical docs already ship the pairwise exact surface. Demo now exposes `Distance` / `Thickness` plus demo-owned `Clearance` / `Step Depth` workflows. | Demo-first refinement. Do not widen the package surface yet. |
| Radius / diameter | P0 | Keep `measureExactRadius(...)`, `suggestExactRadiusPlacement(...)`, and `suggestExactDiameterPlacement(...)` in the reusable runtime/package surface. | Expose them with CAM/tool-fit language when useful. | Implemented today in the runtime/package surface and exposed in the demo, but not yet enumerated in the canonical measurement SDK docs. | Keep the implementation; avoid treating it as broader contract expansion until the canonical docs are updated. |
| Hole / counterbore / countersink / chamfer | P0-P1 | Keep narrow helper semantics on explicit refs: `describeExactHole(...)` and `describeExactChamfer(...)`, plus package-first `describeExactCounterbore(...)` / `describeExactCountersink(...)` wrappers over the root `DescribeExactCompoundHole(...)` carrier call. | Show supported manufacturing labels, summaries, and downstream UX. | `Hole` and `Chamfer` are canonical docs today; `Counterbore` and `Countersink` are implemented and demo-exposed today, but not yet enumerated in the canonical measurement SDK docs. | Keep helper surface narrow; avoid whole-model discovery. |
| Center-to-center / surface-to-center | P1 | Prefer composition over a new API. Promote to a dedicated package API only if multiple downstream apps need the same typed contract. | Own concrete hole-spacing and datum-to-hole workflows. | Demo now exposes both as named demo-owned workflows composed over the shipped exact surface. | Demo-first. |
| Angle / setup angle | P0 | Keep `measureExactAngle(...)` as the exact primitive. | Own setup/alignment naming and workflow framing. | Shipped in the main library and surfaced in the demo. | Keep the primitive in the library and the workflow in the demo. |
| Relation checks (`parallel`, `perpendicular`, `concentric`, `tangent`) | P1 | Keep `classifyExactRelation(...)` as a narrow exact relation helper. | Use it for setup explanations or helper badges; do not turn it into full GD&T. | Shipped in the main library; not a dedicated CAM mode in the demo. | Demo may consume it; keep the kernel boundary narrow. |
| Minimum radius analysis | P2 | Only add as a future pure analysis API if there is a real reusable need above explicit ref measurement. | Own heatmaps, scene coloring, and interaction. | Not shipped. | Defer to a separate milestone. |
| Accessibility / undercut / 3-axis machinability | P2 | Only consider a future directional analysis contract with explicit input directions. | Own visualization, UX, and manufacturing interpretation. | Not shipped. | Defer to a separate milestone. |
| Tolerance / probing / inspection report | P3 | Keep out of the main library. | If ever built here, keep it app-level only. | Not shipped. | Out of scope for the current repository boundary. |

## Currently Exposed Demo Actions

The current browser demo is a simplified integration sample, not a full CAM inspection product.
This table describes the actions exposed in the demo UI today; it is not a second package-contract definition.

| Selection | Measurements | Helpers |
| --- | --- | --- |
| one face | `Face Area`, `Radius`, `Diameter` | `Hole`, `Counterbore`, `Countersink`, `Chamfer` |
| one edge | `Edge Length`, `Radius`, `Diameter` | `Hole` |
| two faces | `Distance`, `Clearance`, `Angle`, `Thickness`, `Step Depth`, `Center to Center`, `Surface to Center` | `Midpoint`, `Symmetry` |
| two edges | `Distance`, `Angle` | `Midpoint`, `Symmetry` |

Implications:

- The main library already covers most of the exact P0 foundation.
- The main missing CAM-flavored layer is not more kernel surface; it is better downstream naming and workflow framing in the demo.
- New CAM workflow additions should continue to start as demo-owned compositions over the shipped exact surface unless a concrete reusable primitive gap is proven first.

## Recommended Scope Rule

Use this rule before adding a new measurement capability:

1. If it can be expressed as an exact, reusable, typed geometry primitive on explicit refs, it may belong in the main library.
2. If it is mainly a workflow label, selection policy, inspection flow, or UX presentation, keep it in the demo.
3. If it needs whole-model mining, tolerance policy, probing cycles, or reporting, it is outside the current `occt-js` boundary unless a future milestone explicitly reopens that scope.

## External References

This matrix was derived from official product documentation for:

- Autodesk Fusion analysis and manual inspection tools
- Siemens NX CMM inspection programming and related measurement/tolerance material
- Mastercam Smart Measure, Probing, and Probing Inspect

Reference URLs:

- <https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/files/SLD-INSPECT-TOOLS.htm>
- <https://help.autodesk.com/cloudhelp/ENU/Fusion-Model/files/SLD-MINIMUM-RADIUS-ANALYSIS.htm>
- <https://help.autodesk.com/cloudhelp/ENU/Fusion-CAM/files/MFG-MANUAL-INSPECTION-CENTER-TO-CENTER.htm>
- <https://www.siemens.com/en-us/products/nx-manufacturing/part-quality-control/cmm-inspection-programming/>
- <https://www.plm.automation.siemens.com/en_us/Images/Siemens-PLM-NX-CMM-Inspection-Programming-Add-on-fs_tcm1023-209075.pdf>
- <https://www.mastercam.com/solutions/add-ons/mastercam-probing/>
- <https://www.mastercam.com/community/blog/mastercam-probing-inspect-released-2/>
- <https://ux.mastercam.com/PDFs/whatsnew.pdf>
