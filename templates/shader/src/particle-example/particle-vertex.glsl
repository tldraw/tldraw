// Vertex shader for rendering particles as point sprites
// Reads particle positions from texture and converts to screen space

attribute vec2 a_index;

uniform sampler2D u_positionTexture;
uniform sampler2D u_velocityTexture;
uniform vec2 u_stateSize;
uniform vec2 u_canvasSize;
uniform float u_particleSize;

varying vec4 v_color;

const float BASE = 256.0;
const float OFFSET = BASE * BASE / 2.0;

// Decode a value from two color channels
float decode(vec2 channels, float scale) {
    return (dot(channels, vec2(BASE, BASE * BASE)) - OFFSET) / scale;
}

void main() {
    vec2 uv = a_index / u_stateSize;
    
    // Sample position and velocity from textures
    vec4 posSample = texture2D(u_positionTexture, uv);
    vec4 velSample = texture2D(u_velocityTexture, uv);
    
    // Decode position
    float px = decode(posSample.rg, 1.0);
    float py = decode(posSample.ba, 1.0);
    
    // Decode velocity for coloring
    float vx = decode(velSample.rg, 1.0);
    float vy = decode(velSample.ba, 1.0);
    float speed = length(vec2(vx, vy));
    
    // Convert to normalized device coordinates (-1 to 1)
    vec2 ndc = (vec2(px, py) / u_canvasSize) * 2.0 - 1.0;
    
    gl_Position = vec4(ndc, 0.0, 1.0);
    gl_PointSize = u_particleSize;
    
    // Color based on speed (slow = white, fast = blue)
    float speedNorm = clamp(speed / 500.0, 0.0, 1.0);
    v_color = vec4(1.0 - speedNorm, 1.0 - speedNorm, 1.0, 0.8);
}

