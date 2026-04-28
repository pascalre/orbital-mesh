uniform vec3 color1; // rimHex (Blau)
uniform vec3 color2; // facingHex (Schwarz/Transparent)
uniform vec3 uSunDirection;

varying float vReflectionFactor;
varying vec3 vWorldNormal;

void main() {
  float f = clamp(vReflectionFactor, 0.0, 1.0);
  
  // Sonnen-Abhängigkeit: Nur leuchten, wenn die Sonne die Atmosphäre trifft
  vec3 sunDir = normalize(uSunDirection);
  float sunFacing = smoothstep(-0.2, 0.5, dot(vWorldNormal, sunDir));

  // Deine Farbmischung
  vec3 finalColor = mix(color2, color1, f);
  
  // Die Transparenz (f) wird mit sunFacing multipliziert
  gl_FragColor = vec4(finalColor, f * sunFacing);
}