# Fluid Simulation Example

A WebGL-based fluid simulation that reacts to shape interactions on the tldraw canvas, creating dynamic visual effects as shapes are created, moved, and manipulated. The incredible fluid shader is adapted from the work of Pavel Dobryakov, see license in fluid.ts.

## Overview

This example demonstrates how to:

- Create a real-time fluid simulation background using WebGL
- Extract and track tldraw shape geometry
- Map shape movements to fluid dynamics
- Create splats (fluid disturbances) based on shape velocity and position
- Build an interactive configuration panel for live parameter tuning

## Key Components

### FluidManager

Manages the integration between tldraw and the fluid simulation:

- Tracks shape creation and updates using store listeners
- Extracts shape geometry and converts to normalized screen coordinates
- Calculates velocity from shape position changes
- Creates fluid splats along shape edges based on movement
- Handles eraser tool for direct user interaction with fluid

### FluidSimulation (fluid.ts)

The core WebGL fluid dynamics engine:

- Implements Navier-Stokes equations for fluid motion
- Uses framebuffer ping-ponging for real-time computation
- Supports post-processing effects (bloom, sunrays)
- Renders velocity and dye fields with configurable dissipation

### ConfigPanel

Live UI for adjusting simulation parameters:

- Simulation resolution and quality settings
- Dissipation rates for velocity and density
- Visual effects (bloom, sunrays, shading)
- Color mode (colorful with auto-color cycling)
- Splat force and radius controls

## Configuration

The fluid simulation is highly configurable via `fluid-config.ts`:

**Performance Settings:**

- `quality`: Canvas resolution multiplier
- `simResolution`: Simulation grid detail (lower = faster)
- `dyeResolution`: Visual quality (higher = sharper)

**Physics Parameters:**

- `velocityDissipation`: How quickly motion decays
- `densityDissipation`: How quickly colors fade
- `pressure`: Strength of incompressibility constraint
- `curl`: Vorticity confinement (creates swirls)

**Visual Effects:**

- `bloom`: Glow effect on bright areas
- `sunrays`: Radial light rays effect
- `shading`: Depth perception
- `colorful`: Automatic color cycling

**Shape Integration:**

- `velocityScale`: Multiplier for shape velocity → fluid velocity
- `boundsSampleCount`: Points sampled for bounds-based shapes
- `darkModeColorMap`/`lightModeColorMap`: Shape color → fluid color mapping

## How It Works

1. `FluidManager` listens to the tldraw store for shape changes
2. When shapes are created or updated:
   - Geometry is extracted using `extractShapeGeometry`
   - Points are converted to normalized coordinates (0-1 range)
   - Velocity is calculated from position delta
   - Color is mapped from shape color to RGB
3. `createSplatsFromGeometry` creates fluid disturbances along shape edges
4. The fluid simulation updates continuously via `requestAnimationFrame`
5. Camera movements also create splats for all visible shapes

## Interactive Features

- **Eraser Tool**: Drag to create fluid disturbances directly
- **Shape Movement**: Moving shapes creates velocity-based splats
- **Camera Panning**: Canvas movement affects all visible shapes
- **Live Config**: Adjust parameters in real-time via the config panel

## Customization Ideas

- Modify color maps for different visual styles
- Add shape-type-specific splat behaviors
- Implement collision detection with shape boundaries
- Create tool-specific fluid effects (e.g., drawing creates trails)
- Add audio-reactive parameters
- Experiment with different splat patterns

## Performance Tips

- Lower `simResolution` for better performance
- Reduce `dyeResolution` if visual quality isn't critical
- Decrease `pressureIterations` for faster computation
- Disable `bloom` and `sunrays` effects if needed
- Use `paused` config to freeze the simulation
- Adjust `velocityScale` to control splat intensity
