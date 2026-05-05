uniform float fresnelBias;
uniform float fresnelScale;
uniform float fresnelPower;

varying float vReflectionFactor;
varying vec3 vWorldNormal;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);

  vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
  vWorldNormal = worldNormal;

  vec3 I = worldPosition.xyz - cameraPosition;
  vReflectionFactor = fresnelBias + fresnelScale * pow(1.0 + dot(normalize(I), worldNormal), fresnelPower);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}