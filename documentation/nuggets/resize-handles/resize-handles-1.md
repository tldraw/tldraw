---
title: Resize handles on rotated shapes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - resize
  - handles
  - cursor
status: published
date: 12/21/2025
order: 0
---

# Resize handles on rotated shapes

Rotate a rectangle in tldraw, then hover over a corner handle. The resize cursor rotates with the shape, perfectly aligned with the handle's orientation. Drag the handle and the cursor stays locked to the correct angle, even as the shape flips during resize. This feels natural—the cursor direction matches the resize direction.

The problem is that browsers don't support rotated cursors. The CSS `cursor` property gives you eight fixed orientations for resize cursors: four cardinal directions and four diagonals. No rotation, no transform properties, no way to rotate them via CSS. If your shape is rotated 37 degrees, you're supposed to pick the closest available cursor and accept the mismatch.

We don't accept that mismatch. We generate custom cursors at any angle using SVG embedded in data URIs.

## Browsers give you eight cursors

The standard resize cursors cover the basic cases:

- `nwse-resize` and `nesw-resize` for diagonals
- `ew-resize` and `ns-resize` for edges

These work fine for axis-aligned shapes. But as soon as a shape rotates, the cursor becomes misleading. A handle at the visual "top" of a 45-degree rotated square should show a cursor pointing upward at 45 degrees. The browser's `ns-resize` cursor points straight up at 0 degrees.

We could snap to the nearest of the eight available angles, but that creates jarring jumps as rotation crosses thresholds. A shape rotating smoothly from 0 to 90 degrees would cause the cursor to suddenly flip from one diagonal to another. And for rotations near 22.5, 67.5, or other midpoints between the fixed angles, you'd always be visibly wrong.

## SVG in a data URI

Instead of using CSS cursor keywords, we construct SVG graphics on the fly and embed them as data URIs in the cursor property.

```typescript
function getCursorCss(
	svg: string,
	r: number, // rotation in degrees
	tr: number, // additional rotation offset
	f: boolean, // flip flag
	color: string,
	hotspotX = 16,
	hotspotY = 16
) {
	const a = (-tr - r) * (PI / 180) // Convert to radians
	const s = Math.sin(a)
	const c = Math.cos(a)
	const dx = 1 * c - 1 * s // Rotated drop shadow offset
	const dy = 1 * s + 1 * c

	return `url("data:image/svg+xml,<svg height='32' width='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg' style='color: ${color};'>
    <defs>
      <filter id='shadow' y='-40%' x='-40%' width='180px' height='180%' color-interpolation-filters='sRGB'>
        <feDropShadow dx='${dx}' dy='${dy}' stdDeviation='1.2' flood-opacity='.5'/>
      </filter>
    </defs>
    <g fill='none' transform='rotate(${r + tr} 16 16)${f ? ` scale(-1,-1) translate(0, -32)` : ''}' filter='url(%23shadow)'>
      ${svg.replaceAll('"', "'")}
    </g>
  </svg>") ${hotspotX} ${hotspotY}, pointer`
}
```

The cursor canvas is 32x32 pixels. The hotspot sits at (16, 16)—the center—so the visual cursor graphic rotates around the point where the user is clicking.

The SVG content comes from predefined path strings for corner and edge handles:

```typescript
const CORNER_SVG = `<path d='m19.7432 17.0869-4.072 4.068 2.829 2.828-8.473-.013-.013-8.47 2.841 2.842 4.075-4.068 1.414-1.415-2.844-2.842h8.486v8.484l-2.83-2.827z' fill='%23fff'/><path d='m18.6826 16.7334-4.427 4.424 1.828 1.828-5.056-.016-.014-5.054 1.842 1.841 4.428-4.422 2.474-2.475-1.844-1.843h5.073v5.071l-1.83-1.828z' fill='%23000'/>`

const EDGE_SVG = `<path d='m9 17.9907v.005l5.997 5.996.001-3.999h1.999 2.02v4l5.98-6.001-5.98-5.999.001 4.019-2.021.002h-2l.001-4.022zm1.411.003 3.587-3.588-.001 2.587h3.5 2.521v-2.585l3.565 3.586-3.564 3.585-.001-2.585h-2.521l-3.499-.001-.001 2.586z' fill='%23fff'/><path d='m17.4971 18.9932h2.521v2.586l3.565-3.586-3.565-3.585v2.605h-2.521-3.5v-2.607l-3.586 3.587 3.586 3.586v-2.587z' fill='%23000'/>`
```

Each SVG has a white outline and black fill to stay visible against any background. We wrap them in a group with a rotation transform: `rotate(${r + tr} 16 16)` rotates around the center point by the sum of the shape's rotation and any additional offset.

## The shadow always points down

Drop shadows need special handling. If we just rotated the entire SVG including the shadow filter, the shadow would rotate with the cursor graphic. A cursor rotated 180 degrees would have its shadow pointing upward, which looks wrong—shadows come from above.

We want the cursor graphic itself to rotate, but the shadow to always fall "downward" in screen space. To achieve this, we rotate the shadow's offset vector by the negative of the cursor rotation:

```typescript
const a = (-tr - r) * (PI / 180) // Negate the rotation
const s = Math.sin(a)
const c = Math.cos(a)
const dx = 1 * c - 1 * s // Standard rotation matrix
const dy = 1 * s + 1 * c
```

This is a 2D rotation matrix applied to the vector (1, 1). When the cursor rotates, the shadow offset rotates in the opposite direction by the same amount, keeping the shadow in a consistent downward-right direction relative to the screen.

The shadow is defined in the SVG filter as `<feDropShadow dx='${dx}' dy='${dy}' .../>`, using the calculated offset values. The result is a cursor that rotates freely while maintaining a consistent lighting direction.

## Cursor types and rotation offsets

We have different cursor graphics for different handle types, each with a base rotation offset:

```typescript
const CURSORS: Record<TLCursorType, CursorFunction> = {
	'ew-resize': (r, f, c) => getCursorCss(EDGE_SVG, r, 0, f, c),
	'ns-resize': (r, f, c) => getCursorCss(EDGE_SVG, r, 90, f, c),
	'nesw-resize': (r, f, c) => getCursorCss(CORNER_SVG, r, 0, f, c),
	'nwse-resize': (r, f, c) => getCursorCss(CORNER_SVG, r, 90, f, c),
}
```

Edge handles use the same SVG but with different rotation offsets. `ew-resize` is horizontal (0°), `ns-resize` is vertical (90°). Corner handles work similarly—the diagonal cursors are the same graphic rotated by 90 degrees.

The shape's actual rotation gets added to these base offsets, so a `nesw-resize` handle on a shape rotated 45 degrees will render at 45 degrees, perfectly aligned with the handle's orientation.

## Flipping during resize

When you resize a shape past its opposite edge, it flips. The scale goes negative, the shape mirrors, and the cursor needs to flip too. A northwest handle that crosses to the southeast should become a southeast cursor.

The flip logic uses XOR on the scale signs:

```typescript
updateCursor({
	dragHandle,
	isFlippedX: scale.x < 0,
	isFlippedY: scale.y < 0,
	rotation: selectionRotation,
})

// Inside updateCursor:
if (isFlippedX !== isFlippedY) {
	// XOR
	nextCursor.type = 'nesw-resize' // flip from nwse
}
```

If the shape is flipped on both axes or neither axis, the diagonal cursor direction stays the same. If it's flipped on exactly one axis, the cursor switches to the opposite diagonal. This XOR condition captures that logic cleanly: `true !== false` flips, `true !== true` doesn't, `false !== false` doesn't.

The SVG rendering also receives the flip flag and applies a scale transform: `scale(-1,-1) translate(0, -32)`. This mirrors the cursor graphic to match the flipped resize direction.

## Theme and color

The cursor color adapts to the editor's theme:

```typescript
getCursor(type, rotation, isDarkMode ? 'white' : 'black')
```

In dark mode, cursors are white. In light mode, black. The SVG paths already have both colors—white outline, black fill—so they stay visible against any background. The `color` parameter sets the foreground color for the overall SVG, but the paths override it with explicit fills.

This theme awareness happens in a reactive hook:

```typescript
useQuickReactor(
	'useCursor',
	() => {
		const { type, rotation } = editor.getInstanceState().cursor

		if (STATIC_CURSORS.includes(type)) {
			container.style.setProperty('--tl-cursor', `var(--tl-cursor-${type})`)
			return
		}

		container.style.setProperty(
			'--tl-cursor',
			getCursor(type, rotation, isDarkMode ? 'white' : 'black')
		)
	},
	[editor, container, isDarkMode]
)
```

Static cursors like `pointer`, `grab`, and `text` use CSS variables. Only resize and rotate cursors get the dynamic SVG treatment.

## The multi-selection compromise

When multiple shapes with different rotations are selected together, showing a rotated cursor would be misleading—it couldn't match all the shapes. We show an unrotated cursor instead:

```typescript
this.editor.setCursor({
	type: cursorType,
	rotation: selected.length === 1 ? this.editor.getSelectionRotation() : 0,
})
```

Single selection: cursor rotates with the shape. Multiple selection: cursor stays axis-aligned. This is a pragmatic choice—there's no "correct" cursor direction when shapes are rotated differently, so we fall back to the browser's standard cursors.

## The tradeoff

This technique works because data URI cursors are widely supported and SVG is flexible enough to handle rotation, shadows, and flipping in a single inline string. The implementation is compact—about 30 lines to generate the cursor CSS.

The cost is that every cursor update constructs a new data URI string. This happens on hover and during resize, potentially many times per second. But string construction is fast, and browsers cache cursor rendering, so the overhead is negligible compared to the rest of the resize operation.

We also don't get native cursor rendering. The browser's built-in cursors are pixel-perfect at their intended size. Our SVG cursors scale with DPI but might look slightly different across browsers. That's a worthwhile tradeoff for correct rotation at any angle.

## Key files

- packages/editor/src/lib/hooks/useCursor.ts — `getCursorCss` function and cursor definitions
- packages/tldraw/src/lib/tools/SelectTool/childStates/Resizing.ts — `updateCursor` with flip logic
- packages/tldraw/src/lib/tools/SelectTool/childStates/PointingResizeHandle.ts — Cursor on hover
