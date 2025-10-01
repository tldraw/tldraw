<div alt style="text-align: center; transform: scale(.5);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-dark.png" />
		<img alt="tldraw" src="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-light.png" />
	</picture>
</div>

This repo contains a starter-kit for creating a fluid simulation background with [tldraw](https://github.com/tldraw/tldraw). The template demonstrates how to integrate WebGL fluid dynamics that respond to shape interactions on the canvas.

## Local development

Install dependencies with `yarn` or `npm install`.

Run the development server with `yarn dev` or `npm run dev`.

Open `http://localhost:5173/` in your browser to see the app.

## Overview

This starter kit demonstrates how to create an interactive fluid simulation background that responds to tldraw shapes and user interactions. The fluid dynamics are rendered using WebGL shaders and create beautiful, organic visual effects.

Key features:

- **WebGL Fluid Simulation**: Real-time fluid dynamics rendered with custom shaders
- **Shape-Based Interactions**: Shapes on the canvas influence the fluid flow patterns
- **Customizable Parameters**: Extensive configuration options for tweaking the simulation
- **Performance Optimized**: Efficient rendering with quality settings for different devices
- **Persistent Settings**: Configuration is saved to localStorage

The fluid simulation reacts to:

- Shape positions and movement
- Shape colors (influencing dye colors in the fluid)
- Canvas interactions like drawing and erasing
- Mouse/touch movements across the canvas

## File structure

- **`src/App.tsx`:** The main entry-point that sets up tldraw with the fluid background and configuration panel.
- **`src/FluidRenderer.tsx`:** React component that renders the WebGL canvas and manages the fluid simulation lifecycle.
- **`src/FluidManager.ts`:** Core class that orchestrates the fluid simulation, handles shape interactions, and manages WebGL resources.
- **`src/fluid.ts`:** Low-level WebGL fluid simulation implementation with shaders for velocity, pressure, and dye advection.
- **`src/ConfigPanel.tsx`:** UI panel for real-time adjustment of simulation parameters like quality, velocity scale, and visual effects.
- **`src/fluid-config.ts`:** Configuration state management with localStorage persistence.
- **`src/shader.css`:** Styling for the configuration panel and app layout.

## Simulation Parameters

The fluid simulation includes many configurable parameters:

### Performance Settings

- **Quality**: Affects canvas resolution (0-1 scale)
- **Sim Resolution**: Grid resolution for physics calculations
- **Dye Resolution**: Visual quality of fluid colors

### Physics Settings

- **Velocity Scale**: How much shapes influence fluid motion
- **Curl**: Fluid turbulence and swirl intensity
- **Pressure**: How fluid responds to obstacles
- **Viscosity**: Fluid thickness and flow resistance

### Visual Settings

- **Splat Radius**: Size of fluid disturbances from interactions
- **Color Intensity**: Brightness of dye colors
- **Bloom Effects**: Post-processing glow effects

All settings can be adjusted in real-time through the configuration panel and are automatically saved to localStorage.

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
