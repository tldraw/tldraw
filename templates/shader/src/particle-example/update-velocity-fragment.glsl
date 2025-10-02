// Rain velocity update shader
// Applies gravity, wind, collisions with shapes, and respawning

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

const float BASE = 256.0;
const float OFFSET = BASE * BASE / 2.0;

float decode(vec2 channels, float scale) {
    return (dot(channels, vec2(BASE, BASE * BASE)) - OFFSET) / scale;
}

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

    // Apply downward gravity (positive Y is down)
    vy += u_gravity * u_deltaTime * 60.0;

    // Add subtle wind effect
    float windStrength = sin(u_time * 0.5 + uv.y * 10.0) * 5.0;
    vx += windStrength * u_deltaTime;

    // Check for obstacle collision
    vec2 obstacleUV = vec2(px / u_canvasSize.x, 1.0 - py / u_canvasSize.y);
    vec4 obstacle = texture2D(u_obstacleTexture, obstacleUV);

    // If we hit an obstacle (alpha > 0), bounce off with damping
    if (obstacle.a > 0.1) {
        // Extract surface normal from RGB channels (0-1 range maps to -1 to 1)
        vec2 normal = obstacle.rg * 2.0 - 1.0;

        // Reflect velocity around normal
        vec2 vel = vec2(vx, vy);
        vec2 reflected = reflect(vel, normal);

        // Apply damping to simulate energy loss
        vx = reflected.x * u_damping;
        vy = reflected.y * u_damping;

        // Push particle away from obstacle to prevent sticking
        px += normal.x * 3.0;
        py += normal.y * 3.0;
    }

    // Pseudo-random value for particle respawning variation
    float randomSeed = sin(u_time * 123.456 + uv.x * 789.0 + uv.y * 321.0) * 0.5;

    // When particle falls below screen, respawn at top
    if (py > u_canvasSize.y + 20.0) {
        py = -10.0 - randomSeed * 20.0; // Spawn just above screen
        px = mod(px + (uv.x - 0.5) * 100.0 + randomSeed * 50.0, u_canvasSize.x);
        vx = (randomSeed - 0.25) * 15.0; // New horizontal drift
        vy = 30.0 + randomSeed * 40.0; // Reset falling velocity (downward)
    }

    // Wrap horizontally (wind can push particles off sides)
    if (px < -20.0) {
        px += u_canvasSize.x + 40.0;
    } else if (px > u_canvasSize.x + 20.0) {
        px -= u_canvasSize.x + 40.0;
    }

    // If somehow particle goes above screen, push it down
    if (py < -50.0) {
        py = -10.0;
        vy = 50.0;
    }

    // Encode new velocity
    vec2 newVx = encode(vx, 1.0);
    vec2 newVy = encode(vy, 1.0);

    gl_FragColor = vec4(newVx, newVy);
}
