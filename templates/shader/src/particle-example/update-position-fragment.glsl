// Fragment shader for updating particle positions
// Reads current position and velocity, outputs new position

precision highp float;

uniform sampler2D u_positionTexture;
uniform sampler2D u_velocityTexture;
uniform vec2 u_resolution;
uniform float u_deltaTime;

const float BASE = 256.0;
const float OFFSET = BASE * BASE / 2.0;

// Decode a value from two color channels
float decode(vec2 channels, float scale) {
    return (dot(channels, vec2(BASE, BASE * BASE)) - OFFSET) / scale;
}

// Encode a value into two color channels
vec2 encode(float value, float scale) {
    value = value * scale + OFFSET;
    float x = mod(value, BASE);
    float y = floor(value / BASE);
    return vec2(x, y) / BASE;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    
    // Sample current position and velocity
    vec4 posSample = texture2D(u_positionTexture, uv);
    vec4 velSample = texture2D(u_velocityTexture, uv);
    
    // Decode position and velocity
    float px = decode(posSample.rg, 1.0);
    float py = decode(posSample.ba, 1.0);
    float vx = decode(velSample.rg, 1.0);
    float vy = decode(velSample.ba, 1.0);
    
    // Update position based on velocity
    px += vx * u_deltaTime;
    py += vy * u_deltaTime;
    
    // Encode new position
    vec2 newPx = encode(px, 1.0);
    vec2 newPy = encode(py, 1.0);
    
    gl_FragColor = vec4(newPx, newPy);
}

