---
title: Style system
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - styles
  - themes
  - colors
  - customization
  - design
---

The style system manages visual properties across shapes in tldraw. It provides a consistent way to apply colors, sizes, fonts, and other visual attributes, with support for custom themes and style presets.

## Overview

Styles in tldraw are:

- **Shared properties**: Applied consistently across different shape types
- **User-configurable**: Changeable via the style panel UI
- **Theme-aware**: Adapt to light/dark modes
- **Extensible**: Custom styles can be added

## Built-in styles

### Color style

```typescript
const DefaultColorStyle: StyleProp<TLDefaultColorStyle> = StyleProp.define('tldraw:color', {
	defaultValue: 'black',
	values: [
		'black',
		'grey',
		'light-violet',
		'violet',
		'blue',
		'light-blue',
		'yellow',
		'orange',
		'green',
		'light-green',
		'light-red',
		'red',
		'white',
	],
})
```

### Size style

```typescript
const DefaultSizeStyle: StyleProp<TLDefaultSizeStyle> = StyleProp.define('tldraw:size', {
	defaultValue: 'm',
	values: ['s', 'm', 'l', 'xl'],
})
```

### Font style

```typescript
const DefaultFontStyle: StyleProp<TLDefaultFontStyle> = StyleProp.define('tldraw:font', {
	defaultValue: 'draw',
	values: ['draw', 'sans', 'serif', 'mono'],
})
```

### Fill style

```typescript
const DefaultFillStyle: StyleProp<TLDefaultFillStyle> = StyleProp.define('tldraw:fill', {
	defaultValue: 'none',
	values: ['none', 'semi', 'solid', 'pattern'],
})
```

### Other styles

| Style             | Values                              | Default  |
| ----------------- | ----------------------------------- | -------- |
| `dash`            | `draw`, `solid`, `dashed`, `dotted` | `draw`   |
| `horizontalAlign` | `start`, `middle`, `end`            | `middle` |
| `verticalAlign`   | `start`, `middle`, `end`            | `middle` |
| `labelColor`      | Same as color                       | `black`  |
| `spline`          | `line`, `cubic`                     | `line`   |

## Using styles

### Getting current style

```typescript
const editor = useEditor()

// Get the current color style
const color = editor.getStyleForNextShape(DefaultColorStyle)

// Get style from selected shapes
const selection = editor.getSelectedShapes()
const sharedColor = editor.getSharedStyles().get(DefaultColorStyle)
```

### Setting styles

```typescript
// Set style for future shapes
editor.setStyleForNextShape(DefaultColorStyle, 'blue')

// Set style on selected shapes
editor.setStyleForSelectedShapes(DefaultColorStyle, 'red')

// Batch style changes
editor.batch(() => {
	editor.setStyleForSelectedShapes(DefaultColorStyle, 'green')
	editor.setStyleForSelectedShapes(DefaultSizeStyle, 'l')
})
```

### Style props on shapes

```typescript
interface GeoShapeProps {
	geo: TLDefaultGeoStyle
	color: TLDefaultColorStyle
	fill: TLDefaultFillStyle
	dash: TLDefaultDashStyle
	size: TLDefaultSizeStyle
	// ... more
}
```

## Theme system

### Color palette

Colors are defined in the theme and adapt to light/dark modes:

```typescript
const defaultColorTheme = {
	black: { solid: '#1d1d1d', semi: '#e8e8e8' },
	blue: { solid: '#4263eb', semi: '#dce1f8' },
	green: { solid: '#099268', semi: '#d3e9e2' },
	grey: { solid: '#adb5bd', semi: '#eceef0' },
	// ... more colors

	// Special colors
	background: 'hsl(210, 20%, 98%)',
	selection: { stroke: '#2f80ed', fill: 'rgba(47, 128, 237, 0.1)' },
}
```

### Dark theme

```typescript
const darkColorTheme = {
	black: { solid: '#e8e8e8', semi: '#2c2c2c' },
	blue: { solid: '#4dabf7', semi: '#1e3a5f' },
	// ... inverted for dark mode

	background: '#212529',
	selection: { stroke: '#2f80ed', fill: 'rgba(47, 128, 237, 0.2)' },
}
```

### Using theme colors

```typescript
function useThemeColor(colorStyle: TLDefaultColorStyle) {
	const editor = useEditor()
	const isDarkMode = editor.user.getIsDarkMode()

	const theme = isDarkMode ? darkColorTheme : defaultColorTheme
	return theme[colorStyle]
}
```

## Custom styles

### Defining a custom style

```typescript
import { StyleProp } from '@tldraw/tldraw'

const MyCustomStyle = StyleProp.define('myapp:custom', {
	defaultValue: 'option1',
	values: ['option1', 'option2', 'option3'],
})
```

### Using in a ShapeUtil

```typescript
class MyShapeUtil extends ShapeUtil<MyShape> {
  static override props = {
    w: T.number,
    h: T.number,
    custom: MyCustomStyle,  // Add to shape props
  }

  getDefaultProps() {
    return {
      w: 100,
      h: 100,
      custom: 'option1',
    }
  }

  component(shape: MyShape) {
    const { custom } = shape.props
    return <div data-custom={custom}>...</div>
  }
}
```

### Registering custom styles

```typescript
const customShapeUtils = [MyShapeUtil]
const customStyles = [MyCustomStyle]

<Tldraw
  shapeUtils={customShapeUtils}
  // Styles appear in style panel automatically
/>
```

## Style panel

### Default style panel

The style panel shows relevant styles for selected shapes:

```typescript
function DefaultStylePanel() {
  const editor = useEditor()
  const styles = editor.getSharedStyles()

  return (
    <div className="style-panel">
      {styles.has(DefaultColorStyle) && (
        <ColorPicker style={DefaultColorStyle} />
      )}
      {styles.has(DefaultFillStyle) && (
        <FillPicker style={DefaultFillStyle} />
      )}
      {/* ... more style pickers */}
    </div>
  )
}
```

### Custom style panel

```typescript
function CustomStylePanel() {
  const editor = useEditor()

  return (
    <DefaultStylePanel>
      {/* Add custom controls */}
      <MyCustomStylePicker />
    </DefaultStylePanel>
  )
}

<Tldraw
  components={{
    StylePanel: CustomStylePanel,
  }}
/>
```

## Shared styles

When multiple shapes are selected, the style system determines shared values:

```typescript
const styles = editor.getSharedStyles()

// Get shared value (or mixed if different)
const color = styles.get(DefaultColorStyle)
// Returns: { type: 'shared', value: 'blue' }
// Or: { type: 'mixed' }

// Check if style is relevant for selection
if (styles.has(DefaultFillStyle)) {
	// Show fill picker
}
```

### Mixed values

```typescript
function ColorPicker({ style }: { style: StyleProp<string> }) {
  const editor = useEditor()
  const sharedStyles = editor.getSharedStyles()
  const styleValue = sharedStyles.get(style)

  if (styleValue.type === 'mixed') {
    return <MixedIndicator />
  }

  return <ColorSelector value={styleValue.value} />
}
```

## Keyboard shortcuts

Default style shortcuts:

| Key | Style | Value       |
| --- | ----- | ----------- |
| `d` | Color | black       |
| `l` | Color | light blue  |
| `g` | Color | green       |
| `o` | Color | orange      |
| `r` | Color | red         |
| `v` | Color | violet      |
| `1` | Size  | small       |
| `2` | Size  | medium      |
| `3` | Size  | large       |
| `4` | Size  | extra large |

## CSS custom properties

Styles are also available as CSS custom properties:

```css
.tl-canvas {
	--tl-color-black: #1d1d1d;
	--tl-color-blue: #4263eb;
	--tl-font-draw: 'Shantell Sans', cursive;
	--tl-font-sans: 'IBM Plex Sans', sans-serif;
	/* ... */
}

.my-shape {
	color: var(--tl-color-blue);
	font-family: var(--tl-font-draw);
}
```

## Key files

- packages/tlschema/src/styles/TLStyleProp.ts - Style prop base class
- packages/tlschema/src/styles/ - Built-in style definitions
- packages/tldraw/src/lib/ui/components/StylePanel/ - Style panel UI
- packages/editor/src/lib/config/defaultStyles.ts - Default theme

## Related

- [@tldraw/tlschema](../packages/tlschema.md) - Style type definitions
- [UI components](./ui-components.md) - Style panel implementation
- [Custom shapes](../guides/custom-shapes.md) - Using styles in shapes
