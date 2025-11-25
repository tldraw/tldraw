# Minimal Shader Example

A bare-bones WebGL shader template that renders a solid color background responding to tldraw's dark mode. Use this as the starting point for a new shader.

## What This Example Does

- Creates a full-screen quad with a simple shader
- Adapts background color based on tldraw's dark/light mode
- Provides the minimal foundation for building custom shader effects

## Key Files

- **[config.ts](config.ts)** - Configuration with localStorage persistence
- **[vertex.glsl](vertex.glsl)** - Basic vertex shader for full-screen quad
- **[fragment.glsl](fragment.glsl)** - Simple fragment shader outputting solid color
- **[MinimalShaderManager.ts](MinimalShaderManager.ts)** - Core WebGL setup and render loop incorporating glsl files
- **[MinimalRenderer.tsx](MinimalRenderer.tsx)** - React component integrating the shader manager
- **[MinimalConfigPanel.tsx](MinimalConfigPanel.tsx)** - UI panel for runtime configuration controls

## How to Modify This Example

### Adding New Uniforms

1. **In fragment.glsl**: Add uniform declaration

   ```glsl
   uniform float u_myValue;
   ```

2. **In MinimalShaderManager.ts**:
   - Add property to store uniform location (line ~14):
     ```typescript
     private u_myValue: WebGLUniformLocation | null = null
     ```
   - Get uniform location in `onInitialize` after line 103:
     ```typescript
     this.u_myValue = this.gl.getUniformLocation(this.program, 'u_myValue')
     ```
   - Set uniform value in `onRender` (around line 144):
     ```typescript
     if (this.u_myValue) {
     	this.gl.uniform1f(this.u_myValue, this.config.get().myValue)
     }
     ```

### Adding Configuration Values

1. **In config.ts**:
   - Add property to `ShaderManagerConfig` interface (line ~4):
     ```typescript
     export interface ShaderManagerConfig extends WebGLManagerConfig {
     	count: number
     	myValue: number // Add here
     }
     ```
   - Add default value in `DEFAULT_CONFIG` (line ~8):
     ```typescript
     myValue: 0.5,
     ```

2. **In MinimalConfigPanel.tsx**:
   - Add slider range to `SLIDER_CONFIGS` (line ~8):
     ```typescript
     const SLIDER_CONFIGS: Record<string, { min: number; max: number }> = {
     	count: { min: 0, max: 100 },
     	myValue: { min: 0, max: 1 }, // Add here
     }
     ```
   - The panel will automatically generate a slider for the new value

### Modifying the Fragment Shader

The fragment shader (fragment.glsl) is where visual effects happen:

- **Input**: `v_uv` - normalized UV coordinates (0-1) from vertex shader
- **Output**: `fragColor` - RGBA color for the pixel
- **Current behavior**: Outputs solid color from `u_bgColor` uniform

Example modifications:

**Gradient effect**:

```glsl
void main() {
  vec3 color = mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), v_uv.x);
  fragColor = vec4(color, 1.0);
}
```

**Animated pattern with time**:

```glsl
uniform float u_time;

void main() {
  float pattern = sin(v_uv.x * 10.0 + u_time) * cos(v_uv.y * 10.0 + u_time);
  fragColor = vec4(vec3(pattern), 1.0);
}
```

### Using Pointer Position

The shader manager tracks pointer position (MinimalShaderManager.ts:184). To use it:

1. Add uniform to fragment.glsl:

   ```glsl
   uniform vec2 u_pointer;
   ```

2. Get and set in MinimalShaderManager.ts:

   ```typescript
   // In onInitialize:
   this.u_pointer = this.gl.getUniformLocation(this.program, 'u_pointer')

   // In onRender:
   if (this.u_pointer) {
   	this.gl.uniform2f(this.u_pointer, this.pointer.x, this.pointer.y)
   }
   ```

### Adding Time-Based Animation

Time values are available in `onRender`:

```typescript
onRender = (deltaTime: number, currentTime: number): void => {
	// deltaTime: time since last frame (seconds)
	// currentTime: total elapsed time (seconds)

	if (this.u_time) {
		this.gl.uniform1f(this.u_time, currentTime)
	}
}
```

### Working with tldraw Shapes

The shader manager has access to the editor instance. To react to shapes:

```typescript
onUpdate = (): void => {
	const shapes = this.editor.getCurrentPageShapes()
	// Process shapes and update shader uniforms
}
```

Use the `pageToCanvas` helper (line 199) to convert shape coordinates to shader UV space.

## Common Patterns

### Multiple Uniforms

Group related uniforms into arrays for efficiency:

```typescript
// Instead of separate calls:
this.gl.uniform1f(this.u_value1, val1)
this.gl.uniform1f(this.u_value2, val2)

// Use vectors:
this.gl.uniform2f(this.u_values, val1, val2)
```

### Conditional Rendering

Toggle effects based on config:

```glsl
uniform bool u_enableEffect;

void main() {
  vec3 color = u_bgColor;
  if (u_enableEffect) {
    color = applyEffect(color);
  }
  fragColor = vec4(color, 1.0);
}
```

### Debug Visualization

Visualize UV coordinates or other values:

```glsl
void main() {
  // Red-green gradient showing UV space
  fragColor = vec4(v_uv.x, v_uv.y, 0.0, 1.0);
}
```

## Next Steps

For more complex examples, see:

- **rainbow/** - Animated color effects with multiple uniforms
- **fluid/** - Interactive fluid simulation with pointer tracking
- **shadow/** - Shape-aware rendering using tldraw editor data
