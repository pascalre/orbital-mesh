uniform sampler2D uTexture;
uniform vec3 uSunDirection;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  // Textur-Farbe an den UV-Koordinaten abgreifen
  vec3 texColor = texture2D(uTexture, vUv).rgb;
  
  // Normalvektor normalisieren
  vec3 normal = normalize(vNormal);
  vec3 sunDir = normalize(uSunDirection);
  
  // Diffuse Beleuchtung (Lambert)
  float dotNL = dot(normal, sunDir);
  float diffuse = max(dotNL, 0.0);
  
  // "Earthshine" - Ein ganz schwaches Licht auf der dunklen Seite
  float earthshine = max(dot(normal, -sunDir), 0.0) * 0.05;
  vec3 earthshineColor = vec3(0.4, 0.5, 0.7) * earthshine;
  
  // Schattenkante weicher machen (Terminator)
  float terminator = smoothstep(-0.1, 0.1, dotNL);
  
  vec3 finalColor = texColor * (diffuse + earthshineColor);
  
  gl_FragColor = vec4(finalColor, 1.0);
}