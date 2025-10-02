// Vertex shader for updating particle state textures
// Renders a full-screen quad for the update passes

attribute vec2 a_position;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}

