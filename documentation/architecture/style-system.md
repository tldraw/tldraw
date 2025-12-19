---
title: Style system
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - styles
  - themes
  - colors
  - customization
  - design
---

## Overview

tldraw's style system manages visual properties shared across shapes. A style is represented by a `StyleProp` that defines allowed values and defaults. The editor stores styles on shapes, exposes them in the UI, and resolves them through the active theme.

## Key components

### StyleProp definitions

A `StyleProp` declares the value space for a style and its default:

```typescript
const DefaultColorStyle = StyleProp.define('tldraw:color', {
	defaultValue: 'black',
	values: ['black', 'grey', 'blue', 'green', 'red', 'white'],
})
```

### Built-in styles

Common built-in styles include:

- Color, fill, dash
- Size, font
- Horizontal and vertical alignment
- Label color

### Themes

Themes map style values to actual colors and UI tokens. The default theme provides light and dark palettes plus selection and background colors.

## Data flow

1. The editor tracks styles for the next shape and for the current selection.
2. Shapes store style values in their props.
3. UI components read shared styles to render picker state.
4. The theme resolves style values to concrete colors at render time.

## Extension points

- Define custom styles with `StyleProp.define`.
- Add custom style pickers in the UI.
- Provide a custom theme for brand colors or palette changes.

## Key files

- packages/tlschema/src/styles/ - Default style definitions
- packages/editor/src/lib/editor/Editor.ts - Style APIs on the editor
- packages/tldraw/src/lib/ui/components/StylePanel/ - Style UI components
- packages/tldraw/src/lib/ui/theme/ - Theme tokens and palettes

## Related

- [Shape system](./shape-system.md) - How styles are stored on shapes
- [UI components](./ui-components.md) - Style panel customization
