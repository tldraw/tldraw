#version 300 es
precision mediump float;
precision mediump int;

// Constants
const float UV_SCALE = 0.5;
const float UV_OFFSET = 0.5;

in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * UV_SCALE + UV_OFFSET;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
