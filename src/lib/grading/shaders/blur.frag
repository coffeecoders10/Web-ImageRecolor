#version 300 es
precision highp float;

// Single-direction 9-tap Gaussian blur. Run twice (horizontal, then
// vertical) against a downsampled source to build a soft blur pyramid
// used by local contrast / clarity / dehaze and the bloom pass.

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform vec2 uDirection; // (1,0) horizontal, (0,1) vertical

const float WEIGHTS[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

void main() {
  vec3 result = texture(uSource, vUv).rgb * WEIGHTS[0];

  for (int i = 1; i < 5; i++) {
    vec2 offset = uDirection * uTexelSize * float(i) * 1.6;
    result += texture(uSource, vUv + offset).rgb * WEIGHTS[i];
    result += texture(uSource, vUv - offset).rgb * WEIGHTS[i];
  }

  fragColor = vec4(result, 1.0);
}
