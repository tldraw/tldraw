# Config Panel

A collapsible, reusable configuration panel component for building interactive controls for shader templates. The config panel provides a consistent UI for adjusting shader parameters in real-time.

## Overview

The config panel system consists of:

- **ConfigPanel**: Container component with collapse/expand functionality and reset button
- **ConfigPanelSlider**: Slider control for numeric values (int or float)
- **ConfigPanelBooleanControl**: Checkbox control for boolean values
- **ConfigPanelLabel**: Text label component

All controls are styled to match the tldraw UI and automatically handle state persistence.

## ConfigPanel Component

The main container component that wraps all configuration controls.

### Props

- `children`: React nodes containing the control components
- `onReset`: Callback function to reset configuration to defaults

### Features

- **Collapsible**: Click the mixer icon to expand/collapse the panel
- **Persistent State**: Panel expanded/collapsed state is saved to localStorage
- **Reset Button**: Visible when expanded, calls the `onReset` callback
- **Scroll Prevention**: Prevents wheel events from affecting the canvas behind it

### Usage

```tsx
import { ConfigPanel } from '../config-panel/ConfigPanel'
import { resetMyConfig } from './config'

function MyConfigPanel() {
	return <ConfigPanel onReset={resetMyConfig}>{/* Add controls here */}</ConfigPanel>
}
```

## ConfigPanelSlider

A slider control for numeric values with automatic range mapping.

### Props

- `prop`: Property name (passed to onChange)
- `label`: Display label for the slider
- `min`: Minimum value
- `max`: Maximum value
- `value`: Current value
- `type`: Either `'float'` or `'int'`
- `onChange`: Callback `(prop: string, value: number) => void`

### Features

- Automatically maps between slider steps (1-100) and actual value range
- Rounds to integers when `type='int'`
- Uses tldraw's built-in `TldrawUiSlider` component

### Usage

```tsx
<ConfigPanelSlider
	prop="splatRadius"
	label="Splat Radius"
	min={0.01}
	max={1}
	value={config.splatRadius}
	type="float"
	onChange={handleChange}
/>
```

## ConfigPanelBooleanControl

A checkbox control for boolean values.

### Props

- `prop`: Property name (passed to onChange)
- `label`: Display label for the checkbox
- `value`: Current boolean value
- `onChange`: Callback `(prop: string, value: boolean) => void`

### Usage

```tsx
<ConfigPanelBooleanControl
	prop="paused"
	label="Paused"
	value={config.paused}
	onChange={handleChange}
/>
```

## Reactive Configuration Pattern

The config panel works with tldraw's reactive `atom` system for automatic state management and persistence.

### Setting Up Config

```tsx
import { atom, react } from 'tldraw'

// 1. Define default configuration
const DEFAULT_CONFIG = {
	quality: 0.5,
	paused: false,
	// ... other properties
}

// 2. Load from localStorage with fallback
const STORAGE_KEY = 'my-shader-config'
let initialValue = DEFAULT_CONFIG

try {
	const value = localStorage.getItem(STORAGE_KEY)
	if (value) initialValue = JSON.parse(value)
} catch {
	// Use defaults if parse fails
}

// 3. Create reactive atom
export const myConfig = atom('my-config', initialValue)

// 4. Reset function
export function resetMyConfig() {
	myConfig.set(DEFAULT_CONFIG)
}

// 5. Auto-save to localStorage
react('save to local storage', () => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(myConfig.get()))
})
```

### Using Config in Component

```tsx
import { useValue } from 'tldraw'
import { myConfig } from './config'

export function MyConfigPanel() {
	// Subscribe to reactive config changes
	const config = useValue('config', () => myConfig.get(), [])

	// Update config properties
	const handleChange = useCallback((prop: string, value: number | boolean) => {
		myConfig.update((prev) => ({ ...prev, [prop]: value }))
	}, [])

	return (
		<ConfigPanel onReset={resetMyConfig}>
			<ConfigPanelSlider
				prop="quality"
				label="Quality"
				min={0}
				max={1}
				value={config.quality}
				type="float"
				onChange={handleChange}
			/>
			<ConfigPanelBooleanControl
				prop="paused"
				label="Paused"
				value={config.paused}
				onChange={handleChange}
			/>
		</ConfigPanel>
	)
}
```

## Styling

The config panel uses CSS classes that can be customized:

- `.shader-config-panel`: Main panel container
- `.shader-config-panel--expanded`: Applied when expanded
- `.shader-config-panel--collapsed`: Applied when collapsed
- `.shader-config-header`: Header with reset and toggle buttons
- `.shader-config-content`: Content area (only visible when expanded)
- `.shader-slider-container`: Container for slider controls
- `.shader-boolean-control`: Container for boolean controls
- `.shader-boolean-input`: Checkbox input element

## Integration with Shader Manager

The config panel is typically placed in the tldraw component tree and accessed by a shader manager:

```tsx
function MyShaderRenderer({ editor }: { editor: Editor }) {
	const canvas = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		if (!canvas.current) return
		// Initialize shader with reactive config
		const manager = new MyShaderManager(canvas.current, editor, myConfig)
		return () => manager.dispose()
	}, [editor])

	return <canvas ref={canvas} className="shader-canvas" />
}

export default function ShaderExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw>
				<MyShaderRenderer />
				<MyConfigPanel />
			</Tldraw>
		</div>
	)
}
```

## Best Practices

1. **Group Related Controls**: Organize controls by category (e.g., "General Settings", "Simulation Settings", "Visual Effects")
2. **Sensible Ranges**: Choose min/max values that provide useful adjustment without breaking the effect
3. **Clear Labels**: Use concise, descriptive labels (abbreviate if needed to fit the UI)
4. **Reasonable Defaults**: Set defaults that work well out of the box
5. **Persist State**: Always use the reactive atom pattern with localStorage persistence
6. **Type Safety**: Define TypeScript interfaces for your config objects
7. **Reset Function**: Always provide a reset function for returning to defaults

## Example: Complete Config Panel Setup

See `templates/shader/src/fluid/` for a full example implementing:

- `config.ts`: Reactive atom with localStorage persistence
- `FluidConfigPanel.tsx`: Complete configuration UI with 20+ controls
- `FluidManager.ts`: Shader manager that reads from the config atom
- Integration with WebGL fluid simulation

This demonstrates the full pattern for creating a configurable shader effect with a professional UI.
