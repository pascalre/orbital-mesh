uniform vec3 color1;
uniform vec3 color2;
uniform vec3 uSunDirection;

varying float vReflectionFactor;
varying vec3 vWorldNormal;

void main() {
  float f = clamp(vReflectionFactor, 0.0, 1.0);

  vec3 sunDir = normalize(uSunDirection);
  float sunFacing = smoothstep(-0.2, 0.5, dot(vWorldNormal, sunDir));

  vec3 finalColor = mix(color2, color1, f);
  gl_FragColor = vec4(finalColor, f * sunFacing);
}