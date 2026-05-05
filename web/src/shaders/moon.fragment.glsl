uniform sampler2D uTexture;
uniform vec3 uSunDirection;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vec3 texColor = texture2D(uTexture, vUv).rgb;

  vec3 normal = normalize(vNormal);
  vec3 sunDir = normalize(uSunDirection);

  float dotNL = dot(normal, sunDir);
  float diffuse = max(dotNL, 0.0);

  float earthshine = max(dot(normal, -sunDir), 0.0) * 0.05;
  vec3 earthshineColor = vec3(0.4, 0.5, 0.7) * earthshine;

  float terminator = smoothstep(-0.1, 0.1, dotNL);

  vec3 finalColor = texColor * (diffuse + earthshineColor);

  gl_FragColor = vec4(finalColor, 1.0);
}