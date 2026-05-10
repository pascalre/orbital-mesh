varying vec3 vColor;
varying float vOpacity;
uniform float uTime;
attribute float aSize;
attribute float aSpeed;
attribute float aBrightness;

void main() {
  vColor = color;
  
  vOpacity = aBrightness;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}