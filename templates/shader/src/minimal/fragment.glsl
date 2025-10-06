#version 300 es
precision highp float;
precision highp int;

in vec2 v_uv;
out vec4 fragColor;

uniform vec3 u_bgColor;

void main() {
	fragColor = vec4(u_bgColor, 1.0);
}