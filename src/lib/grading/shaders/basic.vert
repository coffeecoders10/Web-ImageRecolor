#version 300 es

in vec2 aPosition;
out vec2 vUv;

void main() {
  // Flip V: textures are uploaded top-row-first (UNPACK_FLIP_Y_WEBGL = false)
  // but WebGL's clip space has +Y pointing up, so without this the rendered
  // canvas would come out upside down relative to the source image.
  vUv = vec2(aPosition.x * 0.5 + 0.5, 0.5 - aPosition.y * 0.5);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
