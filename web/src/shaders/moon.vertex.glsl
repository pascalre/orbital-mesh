varying vec3 vNormal;
varying vec2 vUv;

void main() {
  vUv = uv;
  // Wichtig: Normalen in World Space transformieren
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}