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
  vec3 sunDir = normalize(uSunDirection);

  float sunOrientation = dot(sunDir, normal);

  float dayMix = smoothstep(-0.1, 0.2, sunOrientation);

  vec2 cloudUv = vec2(vUv.x - uTime, vUv.y);
  float clouds = textureGrad(cloudsTexture, cloudUv, dFdx(vUv), dFdy(vUv)).r;

  vec3 dayColor = texture2D(dayTexture, vUv).rgb;
  vec3 nightColor = texture2D(nightTexture, vUv).rgb;

  vec3 baseColor = mix(nightColor, dayColor, dayMix);
  gl_FragColor = vec4(mix(baseColor, vec3(0.9), clouds * dayMix), 1.0);
}