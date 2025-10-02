// Update pass vertex shader
// Renders a full-screen quad for fragment shader computations

attribute vec2 a_position;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}
