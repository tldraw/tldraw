# Shadow Casting Example

This example demonstrates real-time shadow casting in tldraw using WebGL shaders.

## Features

- **Dynamic Shadow Casting**: Shadows are cast from shapes based on your cursor position, which acts as a light source
- **Soft Shadows**: Penumbra effect creates realistic soft shadow edges
- **Ray-Segment Intersection**: Uses geometric ray casting to determine which pixels are occluded
- **Performance Optimized**: Only renders within the light radius and uses quality settings to balance performance

## How it works

The shader:

1. Takes the cursor position as a light source
2. For each pixel, casts a ray from the pixel to the light
3. Checks if any shape geometry segments intersect with the ray
4. If a segment blocks the ray, the pixel is in shadow
5. Applies soft shadow sampling for realistic penumbra
6. Renders a warm light with distance-based falloff

Move your cursor around the canvas to see the light and shadows update in real-time!
