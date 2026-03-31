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

    varying vec4 vColor;
    varying float vDashPeriod;

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
      vec2 offset = normal * sideFlag * lineWidth * 0.5 * pixelToNdc;

      vec4 clipBase = mix(clipA, clipB, along);
      gl_Position = clipBase;
      gl_Position.xy += offset * clipBase.w;

      vColor = color;
      vDashPeriod = dashPeriod;
    }
  `;

  Effect.ShadersStore[`${SHADER_NAME}FragmentShader`] = `
    precision highp float;

    varying vec4 vColor;
    varying float vDashPeriod;

    void main(void) {
      if (vDashPeriod > 0.0) {
        float dashWave = mod(gl_FragCoord.x + gl_FragCoord.y, vDashPeriod);
        if (dashWave > vDashPeriod * 0.5) {
          discard;
        }
      }

      gl_FragColor = vColor;
    }
  `;
}

function updateViewportUniform(material) {
  const scene = material.getScene();
  const engine = scene.getEngine();
  material.setVector2("viewportSize", new Vector2(
    engine.getRenderWidth(),
    engine.getRenderHeight(),
  ));
}

export function createLinePassMaterial(scene, theme = "dark") {
  ensureLinePassShaders();

  const material = new ShaderMaterial(`occt_line_pass_${theme}`, scene, SHADER_NAME, {
    attributes: ["position", "nextPosition", "sideFlag", "along", "color", "dashPeriod", "lineWidth"],
    uniforms: ["world", "view", "projection", "viewportSize"],
    needAlphaBlending: false,
  });

  material.backFaceCulling = false;
  material.disableDepthWrite = true;
  material.needDepthPrePass = false;
  material.separateCullingPass = false;
  material.alpha = 1;
  material.forceDepthWrite = false;
  // Use fixed-function depth bias to avoid coplanar z-fighting without x-ray artifacts.
  material.zOffset = -1;
  material.zOffsetUnits = -2;
  material.onBindObservable.add(() => {
    updateViewportUniform(material);
  });

  updateViewportUniform(material);

  return material;
}
