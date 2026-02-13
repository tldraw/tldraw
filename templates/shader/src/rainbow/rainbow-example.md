# Rainbow Shader Example

A WebGL shader that renders colorful rainbow distance fields around tldraw shapes, creating discrete color bands that adapt to dark/light mode.

## What This Example Does

- Extracts geometry from all tldraw shapes in real-time
- Calculates distance fields from shape edges
- Renders rainbow color bands based on distance
- Adapts colors for dark/light mode
- Provides on-demand rendering for performance

## Key Files

- **[config.ts](config.ts)** - Configuration with localStorage persistence
- **[vertex.glsl](vertex.glsl)** - Standard full-screen quad vertex shader
- **[fragment.glsl](fragment.glsl)** - Distance field shader with rainbow color generation
- **[RainbowShaderManager.ts](RainbowShaderManager.ts)** - Shape geometry extraction and WebGL rendering
- **[RainbowRenderer.tsx](RainbowRenderer.tsx)** - React component integrating the shader manager
- **[RainbowConfigPanel.tsx](RainbowConfigPanel.tsx)** - UI panel for runtime configuration controls

## How It Works

### Shape Geometry Extraction

1. **Reactive Updates** (RainbowShaderManager.ts:150): Uses tldraw's `react()` to subscribe to shape changes, camera changes, and theme changes
2. **Extract All Shapes** (line 156): `onUpdate` iterates through all shapes on the current page
3. **Get Geometry** (line 290): Uses `editor.getShapeGeometry()` to get shape vertices
4. **Transform to Canvas Space** (lines 272-282, 294-295):
   - Apply shape transform matrix to vertices
   - Convert from page coordinates to screen coordinates
   - Normalize to canvas UV space (0-1 range)
5. **Build Segments** (lines 298-318): Connect vertices into line segments, handling closed vs open shapes

### Distance Field Calculation

The fragment shader (fragment.glsl) calculates distance from each pixel to the nearest shape edge:

1. **Convert UV to Pixels** (line 103): `pixelPos = v_uv * u_resolution`
2. **Find Nearest Segment** (lines 109-123):
   - Loop through all segments (up to `maxSegments`)
   - Use `closestPointOnSegment` to find closest point on each segment
   - Track minimum distance across all segments
3. **Quantize Distance** (lines 139-140): Floor distance into discrete bands for stepped effect
4. **Generate Color** (line 144): Use `rotateHue` function to get rainbow color for the band
5. **Apply Alpha** (line 156): Smooth falloff using ease-out quintic function

### Rainbow Color Generation

The `rotateHue` function (fragment.glsl:47-58) cycles through the full spectrum:

- Red → Yellow → Green → Cyan → Blue → Magenta → Red
- Each band gets a color based on its index
- `offset` parameter rotates colors along the spectrum

## Configuration

### Performance Settings

- **quality** (0.1-1.0): Resolution multiplier
  - Affects `maxSegments` calculation: `Math.floor(Math.min(512, 2000 / quality))`
  - Lower quality = supports more shapes
  - Default: 0.5

### Visual Parameters

- **stepSize** (1-50): Distance between color bands in pixels
  - Larger values = wider bands
  - Default: 10

- **steps** (1-100): Number of color bands to render
  - More steps = rainbow extends further from shapes
  - Default: 10

- **offset** (0-1): Color rotation offset
  - Animating this value rotates the rainbow
  - Default: 0

### Rendering Options

- **pixelate**: Apply pixelated rendering style
- **startPaused**: Render on-demand instead of continuously (default: true)

## How to Modify This Example

### Changing Color Schemes

The `rotateHue` function (fragment.glsl:47-58) can be modified for different color schemes:

**Warm colors only**:

```glsl
vec3 rotateHue(float step, float steps, float offset) {
  float t = mod(step + offset * steps, steps) / steps;
  return mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), t); // Red to Yellow
}
```

**Custom gradient**:

```glsl
vec3 rotateHue(float step, float steps, float offset) {
  float t = mod(step + offset * steps, steps) / steps;
  vec3 color1 = vec3(0.2, 0.5, 1.0); // Light blue
  vec3 color2 = vec3(1.0, 0.2, 0.5); // Pink
  return mix(color1, color2, t);
}
```

### Adjusting Distance Bands

Modify the quantization (fragment.glsl:139-140):

**Smooth gradient instead of bands**:

```glsl
// Remove these lines:
// float bandIndex = floor(minDist / (maxDistance/steps));
// minDist = bandIndex * (maxDistance/steps);

// Use continuous distance:
float t = minDist / maxDistance;
vec3 rainbowColor = rotateHue(t * steps, steps, u_offset);
```

**Non-uniform band spacing**:

```glsl
float bandIndex = pow(minDist / maxDistance, 2.0) * steps; // Exponential spacing
```

### Adding Noise Effects

The shader includes `fbm` (Fractal Brownian Motion) function (lines 74-86):

```glsl
void main() {
  // ... existing distance calculation ...

  // Add noise to distance
  float noiseValue = fbm(pixelPos * 0.01);
  minDist += noiseValue * 5.0;

  // ... rest of shader ...
}
```

### Animating the Effect

Use the time parameter in `onRender`:

```typescript
onRender = (deltaTime: number, currentTime: number): void => {
	// ... existing code ...

	// Auto-rotate colors
	const animatedOffset = (currentTime * 0.1) % 1.0
	if (this.u_offset) {
		this.gl.uniform1f(this.u_offset, animatedOffset)
	}

	// Pulse effect
	const pulseStepSize = 10 + Math.sin(currentTime * 2) * 5
	if (this.u_stepSize) {
		this.gl.uniform1f(this.u_stepSize, pulseStepSize)
	}
}
```

### Filtering Shapes

Modify `onUpdate` to process only certain shapes (RainbowShaderManager.ts:155):

```typescript
onUpdate = (): void => {
	const shapes = this.editor.getCurrentPageShapes()
	this.geometries = []

	for (const shape of shapes) {
		// Filter by type
		if (shape.type === 'geo' || shape.type === 'draw') {
			const geometry = this.extractGeometry(shape, camera, vsb)
			if (geometry) {
				this.geometries.push(geometry)
			}
		}
	}
}
```

### Custom Geometry Processing

Extend `extractGeometry` for shape-specific effects (line 284):

```typescript
private extractGeometry = (
  shape: TLShape,
  camera: { x: number; y: number; z: number },
  viewportScreenBounds: Box
): Array<{ start: Vec; end: Vec }> | null => {
  // Get base geometry
  const segments = /* ... existing code ... */

  // Add extra segments for specific shape types
  if (shape.type === 'draw') {
    // Sample more points from draw shapes for smoother curves
    // ... custom sampling logic ...
  }

  return segments
}
```

### Adding New Uniforms

1. **In fragment.glsl**: Add uniform declaration

   ```glsl
   uniform float u_brightness;
   ```

2. **In RainbowShaderManager.ts**:
   - Add property (line ~25):
     ```typescript
     private u_brightness: WebGLUniformLocation | null = null
     ```
   - Get location in `onInitialize` (after line 127):
     ```typescript
     this.u_brightness = this.gl.getUniformLocation(this.program, 'u_brightness')
     ```
   - Set value in `onRender` (around line 213):
     ```typescript
     if (this.u_brightness) {
     	this.gl.uniform1f(this.u_brightness, this.getConfig().brightness)
     }
     ```

3. **In config.ts**: Add to interface and defaults (lines 4-17)

4. **In RainbowConfigPanel.tsx**: Add slider range (line 8)

## Performance Considerations

### Segment Limits

The shader has a maximum segment limit to stay within WebGL uniform limits:

```typescript
this.maxSegments = Math.floor(Math.min(512, 2000 / quality))
```

- Lower quality = more segments allowed
- Segments beyond limit are clipped (line 219)
- Consider simplifying geometry for complex shapes

### On-Demand Rendering

The example uses `startPaused: true` (config.ts:11) for better performance:

- Renders only when shapes change
- Set to `false` for continuous animation
- Call `tick()` manually to trigger renders

### Optimization Tips

- Reduce `quality` to process fewer pixels
- Lower `steps` to reduce color calculations
- Simplify `rotateHue` if using solid colors
- Cache geometry if shapes don't change frequently

## Common Patterns

### Conditional Rendering by Distance

```glsl
void main() {
  // ... distance calculation ...

  // Different effects based on distance
  if (minDist < 10.0) {
    fragColor = vec4(1.0, 1.0, 1.0, 1.0); // White core
  } else if (minDist < 50.0) {
    fragColor = vec4(rainbowColor, 1.0); // Solid rainbow
  } else {
    fragColor = vec4(rainbowColor, alpha); // Faded rainbow
  }
}
```

### Shape-Specific Colors

Pass additional data through a separate uniform array:

```typescript
// In RainbowShaderManager.ts
const allColors: number[] = []
for (const geometry of this.geometries) {
	// Extract color from shape
	const color = getShapeColor(shape)
	allColors.push(color.r, color.g, color.b)
}
this.gl.uniform3fv(this.u_colors, allColors)
```

### Debug Visualization

Visualize the distance field directly:

```glsl
void main() {
  // ... distance calculation ...

  // Grayscale visualization of distance
  float visualDist = minDist / maxDistance;
  fragColor = vec4(vec3(visualDist), 1.0);
}
```

## Next Steps

For other shader patterns, see:

- **minimal/** - Basic shader template with minimal features
- **fluid/** - Interactive fluid simulation responding to shape movements
- **shadow/** - Shape-aware shadows with soft falloff
