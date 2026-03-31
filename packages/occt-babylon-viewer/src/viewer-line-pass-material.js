import { Effect } from "@babylonjs/core/Materials/effect.js";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial.js";
import { Vector2 } from "@babylonjs/core/Maths/math.vector.js";

const SHADER_NAME = "occtLinePass";

function ensureLinePassShaders() {
  if (Effect.ShadersStore[`${SHADER_NAME}VertexShader`]) {
    return;
  }

  Effect.ShadersStore[`${SHADER_NAME}VertexShader`] = `
    precision highp float;

    attribute vec3 position;
    attribute vec3 nextPosition;
    attribute float sideFlag;
    attribute float along;
    attribute vec4 color;
    attribute float dashPeriod;
    attribute float lineWidth;

    uniform mat4 world;
    uniform mat4 view;
    uniform mat4 projection;
    uniform vec2 viewportSize;
    uniform float widthScale;
    uniform float capExtension;

    varying vec4 vColor;
    varying float vDashPeriod;
    varying float vSide;

    void main(void) {
      mat4 worldViewProjection = projection * view * world;
      vec4 clipA = worldViewProjection * vec4(position, 1.0);
      vec4 clipB = worldViewProjection * vec4(nextPosition, 1.0);

      vec2 ndcA = clipA.xy / max(abs(clipA.w), 1e-6);
      vec2 ndcB = clipB.xy / max(abs(clipB.w), 1e-6);
      vec2 delta = ndcB - ndcA;
      float deltaLength = length(delta);
      vec2 dir = deltaLength > 1e-6 ? normalize(delta) : vec2(1.0, 0.0);
      vec2 normal = vec2(-dir.y, dir.x);
      vec2 pixelToNdc = vec2(2.0 / max(viewportSize.x, 1.0), 2.0 / max(viewportSize.y, 1.0));
      float halfWidth = lineWidth * widthScale * 0.5;
      float alongSign = along < 0.5 ? -1.0 : 1.0;
      vec2 normalOffset = normal * sideFlag * halfWidth * pixelToNdc;
      vec2 capOffset = dir * alongSign * halfWidth * capExtension * pixelToNdc;
      vec2 offset = normalOffset + capOffset;

      vec4 clipBase = mix(clipA, clipB, along);
      gl_Position = clipBase;
      gl_Position.xy += offset * clipBase.w;

      vColor = color;
      vDashPeriod = dashPeriod;
      vSide = sideFlag;
    }
  `;

  Effect.ShadersStore[`${SHADER_NAME}FragmentShader`] = `
    precision highp float;

    varying vec4 vColor;
    varying float vDashPeriod;
    varying float vSide;

    uniform float alphaScale;
    uniform float haloEnabled;
    uniform float haloInnerCutoff;

    void main(void) {
      if (vDashPeriod > 0.0) {
        float dashWave = mod(gl_FragCoord.x + gl_FragCoord.y, vDashPeriod);
        if (dashWave > vDashPeriod * 0.5) {
          discard;
        }
      }

      if (haloEnabled > 0.5) {
        float sideAbs = abs(vSide);
        if (sideAbs <= haloInnerCutoff) {
          discard;
        }
      }

      vec4 outColor = vColor;
      outColor.a *= alphaScale;
      if (outColor.a <= 0.001) {
        discard;
      }

      gl_FragColor = outColor;
    }
  `;
}

function resolveLayerStyle(input) {
  const mode = input?.mode === "halo" ? "halo" : "base";
  return {
    mode,
    widthScale: typeof input?.widthScale === "number" ? input.widthScale : 1,
    capExtension: typeof input?.capExtension === "number" ? input.capExtension : 0,
    alphaScale: typeof input?.alphaScale === "number" ? input.alphaScale : 1,
    haloInnerCutoff: typeof input?.haloInnerCutoff === "number" ? input.haloInnerCutoff : 0.5,
    blending: input?.blending === true,
    depthFunction: input?.depthFunction === "always" ? "always" : "lequal",
    zOffset: typeof input?.zOffset === "number" ? input.zOffset : -1,
    zOffsetUnits: typeof input?.zOffsetUnits === "number" ? input.zOffsetUnits : -2,
  };
}

function updateMaterialUniforms(material, style) {
  const scene = material.getScene();
  const engine = scene.getEngine();
  material.setVector2("viewportSize", new Vector2(
    engine.getRenderWidth(),
    engine.getRenderHeight(),
  ));
  material.setFloat("widthScale", style.widthScale);
  material.setFloat("capExtension", style.capExtension);
  material.setFloat("alphaScale", style.alphaScale);
  material.setFloat("haloEnabled", style.mode === "halo" ? 1 : 0);
  material.setFloat("haloInnerCutoff", style.haloInnerCutoff);
}

export function createLinePassMaterial(scene, theme = "dark", layerStyleInput = null) {
  ensureLinePassShaders();
  const style = resolveLayerStyle(layerStyleInput);
  const material = new ShaderMaterial(`occt_line_pass_${theme}_${style.mode}`, scene, SHADER_NAME, {
    attributes: ["position", "nextPosition", "sideFlag", "along", "color", "dashPeriod", "lineWidth"],
    uniforms: [
      "world",
      "view",
      "projection",
      "viewportSize",
      "widthScale",
      "capExtension",
      "alphaScale",
      "haloEnabled",
      "haloInnerCutoff",
    ],
    needAlphaBlending: style.blending,
  });

  material.backFaceCulling = false;
  material.disableDepthWrite = true;
  material.needDepthPrePass = false;
  material.separateCullingPass = false;
  material.alpha = style.alphaScale;
  material.forceDepthWrite = false;
  material.zOffset = style.zOffset;
  material.zOffsetUnits = style.zOffsetUnits;

  const engine = scene.getEngine();
  material.depthFunction = style.depthFunction === "always" ? engine.ALWAYS : engine.LEQUAL;

  material.onBindObservable.add(() => {
    updateMaterialUniforms(material, style);
  });

  updateMaterialUniforms(material, style);

  return material;
}
