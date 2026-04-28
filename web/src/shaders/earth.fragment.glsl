uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform sampler2D cloudsTexture;
uniform vec3 uSunDirection;
uniform float uTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDirection = normalize(vPosition - cameraPosition);
  vec3 sunDir = normalize(uSunDirection);

  // Sonnen-Ausrichtung (Licht/Schatten)
  float sunOrientation = dot(sunDir, normal);

  // 1. Tag & Nacht Mix
  // Wir machen den Übergang etwas schärfer für einen realistischen Terminatoren
  float dayMix = smoothstep(-0.2, 0.5, sunOrientation);
  vec3 dayColor = texture2D(dayTexture, vUv).rgb;
  vec3 nightColor = texture2D(nightTexture, vUv).rgb;

  // 2. Wolken-Ebene (mit Zeit-Versatz)
  // uTime * Geschwindigkeit sorgt für die Eigenbewegung der Wolken
  vec2 cloudUv = vec2(fract(vUv.x - uTime * 0.004), vUv.y);
  float clouds = textureGrad(cloudsTexture, cloudUv, dFdx(vUv), dFdy(vUv)).r;

  // 3. Kombination
  vec3 baseColor = mix(nightColor, dayColor, dayMix);
  
  // Wolken auf der Tagseite weiß, auf der Nachtseite dunkel (oder leicht bläulich)
  vec3 finalColor = mix(baseColor, vec3(0.9), clouds * dayMix);

  // Optional: Nachtlichter unter den Wolken leicht dimmen
  finalColor = mix(finalColor, nightColor * (1.0 - clouds * 0.5), (1.0 - dayMix) * clouds);

  gl_FragColor = vec4(finalColor, 1.0);
}