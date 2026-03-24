/**
 * Debug: compare mesh vertex bounding box vs edge vertex bounding box
 * for each node in the assembly tree, accounting for transform chain.
 */
import { readFileSync } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const factory = require("../dist/occt-js.js");

function mat4Multiply(a, b) {
    const r = new Array(16).fill(0);
    for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
            for (let k = 0; k < 4; k++)
                r[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k];
    return r;
}

function transformPoint(mat, x, y, z) {
    return [
        mat[0]*x + mat[4]*y + mat[8]*z + mat[12],
        mat[1]*x + mat[5]*y + mat[9]*z + mat[13],
        mat[2]*x + mat[6]*y + mat[10]*z + mat[14],
    ];
}

const IDENTITY = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];

async function main() {
    const m = await factory();
    const data = readFileSync("./test/as1_pe_203.stp");
    const r = m.ReadStepFile(new Uint8Array(data), {
        linearDeflection: 0.1, angularDeflection: 0.5,
        readNames: true, readColors: true
    });

    let issues = 0;

    function walkNode(n, parentWorldMatrix, depth) {
        const localMat = n.transform || IDENTITY;
        const worldMat = mat4Multiply(parentWorldMatrix, localMat);
        const prefix = "  ".repeat(depth);

        if (n.isAssembly) {
            for (const c of n.children || []) walkNode(c, worldMat, depth + 1);
            return;
        }

        const meshIds = Array.isArray(n.meshes) ? n.meshes : [];
        for (const gi of meshIds) {
            if (gi < 0 || gi >= r.geometries.length) continue;
            const geo = r.geometries[gi];
            if (!geo || geo.positions.length === 0) continue;

            // Compute world-space bbox of mesh vertices
            let mMin = [Infinity, Infinity, Infinity];
            let mMax = [-Infinity, -Infinity, -Infinity];
            for (let i = 0; i < geo.positions.length; i += 3) {
                const [wx, wy, wz] = transformPoint(worldMat,
                    geo.positions[i], geo.positions[i+1], geo.positions[i+2]);
                for (let j = 0; j < 3; j++) {
                    mMin[j] = Math.min(mMin[j], [wx,wy,wz][j]);
                    mMax[j] = Math.max(mMax[j], [wx,wy,wz][j]);
                }
            }

            // Compute world-space bbox of edge vertices
            let eMin = [Infinity, Infinity, Infinity];
            let eMax = [-Infinity, -Infinity, -Infinity];
            let edgeVertCount = 0;
            for (const edge of geo.edges || []) {
                for (let i = 0; i < edge.points.length; i += 3) {
                    const [wx, wy, wz] = transformPoint(worldMat,
                        edge.points[i], edge.points[i+1], edge.points[i+2]);
                    for (let j = 0; j < 3; j++) {
                        eMin[j] = Math.min(eMin[j], [wx,wy,wz][j]);
                        eMax[j] = Math.max(eMax[j], [wx,wy,wz][j]);
                    }
                    edgeVertCount++;
                }
            }

            // Compare
            const meshCenter = mMin.map((v, i) => ((v + mMax[i]) / 2).toFixed(1));
            const edgeCenter = eMin.map((v, i) => ((v + eMax[i]) / 2).toFixed(1));
            const match = meshCenter.every((v, i) => Math.abs(parseFloat(v) - parseFloat(edgeCenter[i])) < 1.0);

            if (!match && edgeVertCount > 0) {
                console.log(`${prefix}${n.name} geo[${gi}]: MISMATCH!`);
                console.log(`${prefix}  mesh center: ${meshCenter}`);
                console.log(`${prefix}  edge center: ${edgeCenter}`);
                issues++;
            } else if (edgeVertCount > 0) {
                console.log(`${prefix}${n.name} geo[${gi}]: OK (center ${meshCenter})`);
            }
        }

        for (const c of n.children || []) walkNode(c, worldMat, depth + 1);
    }

    for (const rn of r.rootNodes) walkNode(rn, IDENTITY, 0);
    console.log(`\nIssues: ${issues}`);
}

main().catch(e => { console.error(e); process.exit(1); });
