<div alt style="text-align: center; transform: scale(.5);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-dark.png" />
		<img alt="tldraw" src="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-light.png" />
	</picture>
</div>

This template demonstrates how to integrate WebGL shaders with [tldraw](https://github.com/tldraw/tldraw), creating dynamic backgrounds that respond to canvas interactions. It includes four complete examples and a reusable `WebGLManager` base class for building custom shader effects.

## Local development

Install dependencies with `yarn` or `npm install`.

Run the development server with `yarn dev` or `npm run dev`.

Open `http://localhost:5173/` in your browser to see the app.

## What's included

- **WebGLManager base class** ([`src/WebGLManager.ts`](src/WebGLManager.ts)) - Handles WebGL lifecycle, viewport synchronization, and animation loop integration with tldraw's reactive system
- **Four example shaders** - Fluid simulation, rainbow gradients, dynamic shadows, and a minimal starter template
- **Config panel components** ([`src/config-panel/`](src/config-panel/)) - Pre-built UI controls for adjusting shader parameters with localStorage persistence
- **Full TypeScript support** - Strongly typed throughout

Switch between examples using the toggle buttons in the tldraw style panel.

## Examples

### Fluid Simulation

A real-time fluid simulation that creates dynamic flows from shape interactions. Based on Pavel Dobryakov's WebGL fluid implementation.

- Navier-Stokes fluid dynamics
- Shape movements create velocity-based splats
- Configurable physics and visual effects

**See:** [`src/fluid/`](src/fluid/) | [Documentation](src/fluid/fluid.md)

### Rainbow

An animated gradient shader demonstrating time-based effects and uniform management.

**See:** [`src/rainbow/`](src/rainbow/)

### Shadows

Dynamic shadow casting from tldraw shapes using raymarching and signed distance fields.

**See:** [`src/shadow/`](src/shadow/)

### Minimal

A bare-bones template for starting new shader projects. Renders a solid color that adapts to dark mode.

**See:** [`src/minimal/`](src/minimal/) | [Documentation](src/minimal/minimal-example.md)

## Architecture

### WebGLManager

The `WebGLManager` class ([`src/WebGLManager.ts`](src/WebGLManager.ts)) provides the foundation for all shader examples. It handles:

- WebGL2 context creation and lifecycle management
- Automatic viewport synchronization with tldraw's canvas
- Animation loop with lifecycle hooks: `onInitialize()`, `onUpdate()`, `onRender()`, `onDispose()`
- Quality/resolution management
- Integration with tldraw's reactive state system

To create a custom shader, extend `WebGLManager` and implement the lifecycle hooks. See the minimal example for a starting point.

### Config Panel

The config panel system ([`src/config-panel/`](src/config-panel/)) provides reusable UI components for creating interactive shader controls:

- `ConfigPanel` - Collapsible container with reset functionality
- `ConfigPanelSlider` - Numeric slider control
- `ConfigPanelBooleanControl` - Checkbox control

Config values are stored in reactive atoms and automatically persisted to localStorage. See [config-panel.md](src/config-panel/config-panel.md) for usage details.

### Renderer Pattern

Each example follows this pattern:

1. Define a config interface extending `WebGLManagerConfig` in `config.ts`
2. Create a shader manager class extending `WebGLManager`
3. Write GLSL shaders (vertex and fragment)
4. Create a React renderer component using `useLayoutEffect` to initialize the manager
5. Build a config panel for live parameter adjustment
6. Register the renderer as tldraw's `Background` component

See any of the example directories for complete implementations.

## Creating a custom shader

The fastest way to create a custom shader is to copy the minimal example:

```bash
cp -r src/minimal src/my-shader
```

Then customize the following files:

- `config.ts` - Define your configuration parameters
- `fragment.glsl` / `vertex.glsl` - Write your shader code
- `MyShaderManager.ts` - Extend WebGLManager and implement rendering logic
- `MyRenderer.tsx` - Create the React component
- `MyConfigPanel.tsx` - Build UI controls

Finally, register your shader in [`src/App.tsx`](src/App.tsx).

For a detailed walkthrough, see [src/minimal/minimal-example.md](src/minimal/minimal-example.md).

## Integration with tldraw

The `WebGLManager` has direct access to the tldraw editor instance, allowing you to:

- Access shapes: `this.editor.getCurrentPageShapes()`
- Listen to shape changes: `this.editor.store.listen()`
- Get camera state: `this.editor.getCamera()`
- Convert coordinates: `this.editor.pageToViewport()`
- Track pointer position: `this.editor.inputs.currentPagePoint`

The fluid simulation example ([`src/fluid/FluidManager.ts`](src/fluid/FluidManager.ts)) demonstrates shape integration in depth.

## Resources

- [WebGL2 Fundamentals](https://webgl2fundamentals.org/) - WebGL tutorials
- [The Book of Shaders](https://thebookofshaders.com/) - GLSL shader programming
- [Shadertoy](https://www.shadertoy.com/) - Shader examples
- [tldraw Documentation](https://tldraw.dev) - tldraw SDK docs

## License

This project is provided under the MIT license found [here](https://github.com/tldraw/vite-template/blob/main/LICENSE.md). The tldraw SDK is provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

## Trademarks

Copyright (c) 2024-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Distributions

You can find tldraw on npm [here](https://www.npmjs.com/package/@tldraw/tldraw?activeTab=versions).

## Contribution

Please see our [contributing guide](https://github.com/tldraw/tldraw/blob/main/CONTRIBUTING.md). Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## Community

Have questions, comments or feedback? [Join our discord](https://discord.tldraw.com/?utm_source=github&utm_medium=readme&utm_campaign=sociallink). For the latest news and release notes, visit [tldraw.dev](https://tldraw.dev).

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw).
