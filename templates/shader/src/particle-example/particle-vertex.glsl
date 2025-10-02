// Rain particle vertex shader
// Renders falling rain particles with realistic appearance

attribute vec2 a_index;

uniform sampler2D u_positionTexture;
uniform sampler2D u_velocityTexture;
uniform vec2 u_stateSize;
uniform vec2 u_canvasSize;
uniform float u_particleSize;

varying vec4 v_color;
varying float v_speed;

const float BASE = 256.0;
const float OFFSET = BASE * BASE / 2.0;

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

    // Decode velocity
    float vx = decode(velSample.rg, 1.0);
    float vy = decode(velSample.ba, 1.0);
    float speed = length(vec2(vx, vy));

    // Convert to normalized device coordinates
    vec2 ndc = (vec2(px, py) / u_canvasSize) * 2.0 - 1.0;
    ndc.y = -ndc.y; // Flip Y for correct orientation

    gl_Position = vec4(ndc, 0.0, 1.0);

    // Rain drops: elongated based on falling speed
    float speedFactor = clamp(speed / 100.0, 0.3, 2.0);
    gl_PointSize = u_particleSize * speedFactor;

    // Light blue rain color with transparency
    float alpha = clamp(speed / 80.0, 0.4, 0.9);
    v_color = vec4(0.7, 0.85, 1.0, alpha);
    v_speed = speed;
}
