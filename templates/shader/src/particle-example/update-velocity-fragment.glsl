// Fragment shader for updating particle velocities
// Applies gravity, collision detection, and boundary wrapping

precision highp float;

uniform sampler2D u_positionTexture;
uniform sampler2D u_velocityTexture;
uniform sampler2D u_obstacleTexture;
uniform vec2 u_resolution;
uniform vec2 u_canvasSize;
uniform float u_deltaTime;
uniform float u_gravity;
uniform float u_damping;
uniform float u_time;
uniform vec2 u_particleIndex;

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
    
    // Apply gravity
    vy -= u_gravity * u_deltaTime * 60.0;
    
    // Check for obstacle collision
    vec2 obstacleUV = vec2(px / u_canvasSize.x, 1.0 - py / u_canvasSize.y);
    vec4 obstacle = texture2D(u_obstacleTexture, obstacleUV);
    
    // If we hit an obstacle (alpha > 0), reflect velocity
    if (obstacle.a > 0.1) {
        // Extract normal from RGB (stored as 0-1, convert to -1 to 1)
        vec2 normal = obstacle.rg * 2.0 - 1.0;
        
        // Reflect velocity
        vec2 vel = vec2(vx, vy);
        vec2 reflected = reflect(vel, normal);
        vx = reflected.x * u_damping;
        vy = reflected.y * u_damping;
        
        // Nudge particle away from obstacle
        px += normal.x * 2.0;
        py += normal.y * 2.0;
    }
    
    // Wrap particles around the screen with entropy preservation
    bool wasReset = false;
    float randomValue = sin(u_time * 123.456) * 0.5;
    
    if (py < 0.0) {
        py += u_canvasSize.y;
        // Add particle index and random value to preserve entropy
        px += (uv.x - 0.5) * 10.0 + randomValue;
        vx += (uv.y - 0.5) * 5.0;
        wasReset = true;
    }
    
    if (px < 0.0) {
        px += u_canvasSize.x;
        py += (uv.y - 0.5) * 10.0 + randomValue;
        vy += (uv.x - 0.5) * 5.0;
    } else if (px > u_canvasSize.x) {
        px -= u_canvasSize.x;
        py += (uv.y - 0.5) * 10.0 - randomValue;
        vy -= (uv.x - 0.5) * 5.0;
    }
    
    // Encode new velocity
    vec2 newVx = encode(vx, 1.0);
    vec2 newVy = encode(vy, 1.0);
    
    gl_FragColor = vec4(newVx, newVy);
}

