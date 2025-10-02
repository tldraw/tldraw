# GPU Particle Physics

A WebGL particle physics simulation that runs entirely on the GPU, inspired by [this article](https://nullprogram.com/blog/2014/06/29/) by Chris Wellons.

## Overview

This example demonstrates:

- **GPU-based particle physics** - All simulation logic runs in WebGL shaders
- **Texture-based state storage** - Particle positions and velocities stored as textures
- **Two-channel float encoding** - Precise position/velocity values encoded across RGB channels
- **Obstacle collision** - Particles bounce off tldraw shapes
- **Entropy preservation** - Clever techniques to maintain particle randomness
- **Ping-pong rendering** - Double buffering for state updates

## How It Works

### State Representation

Particles are stored as textures where each pixel represents one particle:

- **Position Texture**: X and Y positions encoded in RG and BA channels
- **Velocity Texture**: X and Y velocities encoded in RG and BA channels

Values are encoded using two bytes (16-bit precision) per component:

```
value = value * scale + OFFSET
x_channel = floor(value % 256)
y_channel = floor(value / 256)
```

This provides 65,536 discrete values per component, enough precision for smooth motion.

### Update Pipeline

Each frame performs two render passes:

1. **Position Update** (`update-position-fragment.glsl`)
   - Reads current position and velocity from textures
   - Adds velocity × deltaTime to position
   - Writes new position to output texture

2. **Velocity Update** (`update-velocity-fragment.glsl`)
   - Applies gravity
   - Checks obstacle texture for collisions
   - Reflects velocity off obstacle normals
   - Wraps particles that exit the screen
   - Writes new velocity to output texture

### Ping-Pong Buffering

Uses two sets of textures that alternate between read and write:

- Frame N: Read from textures[0], write to textures[1]
- Frame N+1: Read from textures[1], write to textures[0]

This avoids reading from the same texture we're writing to.

### Particle Rendering

Instead of reading positions back to CPU:

1. **Vertex Shader** (`particle-vertex.glsl`)
   - Each vertex has a 2D index (particle ID)
   - Uses `texture2D()` to sample position from texture
   - Decodes position and emits point sprite
   - Colors by velocity (slow = white, fast = blue)

2. **Fragment Shader** (`particle-fragment.glsl`)
   - Renders circular point sprites
   - Discards pixels outside circle radius

### Obstacle System

Tldraw shapes are rendered to an obstacle texture:

- **RGB channels**: Surface normals (direction to push particles)
- **Alpha channel**: Collision mask (0 = empty, 1 = solid)

When a particle samples a non-zero alpha, it reflects its velocity using the normal vector.

### Entropy Conservation

The simulation maintains randomness through:

1. **Preserve values on wrap** - When particles wrap around edges, don't reset to exact coordinates. Add the screen dimension instead of setting to zero.

2. **Per-frame random value** - A single random uniform added to reset particles each frame.

3. **Particle index mixing** - Each particle's unique 2D index is mixed into resets to separate overlapping particles.

These techniques prevent particles from "clumping" into identical states over time.

## Performance

- Simulates 16,000+ particles at 60 FPS on modern GPUs
- All computation stays on GPU (no CPU ↔ GPU transfers)
- Uses WebGL2 when available, falls back to WebGL1

## Customization

Try modifying:

- **Particle count** - Adjust `particleCount` in config (N² particles)
- **Physics** - Edit gravity, damping in velocity update shader
- **Visuals** - Change particle colors, add trails, modify rendering
- **Collisions** - Improve obstacle normal calculation for better bouncing
- **Forces** - Add wind, attraction points, or other effects

## Limitations

- Particles don't interact with each other (not an n-body simulation)
- Obstacle normals are simplified (circles only)
- Requires `GL_MAX_VERTEX_TEXTURE_IMAGE_UNITS` > 0 (may not work on some mobile devices)

## References

- [Original article](https://nullprogram.com/blog/2014/06/29/) by Chris Wellons
- [WebGL particles demo](https://skeeto.github.io/webgl-particles/)
