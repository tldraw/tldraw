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
readability: 9
voice: 8
potential: 9
accuracy: 9
notes: "Strong problem framing and genuine insights (counter-rotating shadow, XOR flip logic). No AI tells. Code examples closely match source—CURSORS record trimmed to resize entries only, which is a fair editorial choice. Minor imprecision around the color parameter's actual effect on the SVG paths."
---

# Resize handles on rotated shapes

When you select a shape on a canvas application, handles appear around it for resizing and rotating. Each handle gets a cursor that shows what dragging it would do—a double-headed arrow pointing in the resize direction, or a curved arrow for rotation.

Browsers provide these cursor icons (`nw-resize`, `e-resize`, etc.) but they're fixed at their predefined angles—you can't rotate them. So if a shape on your canvas app is rotated, the mismatch would look like this:

[gif]

In tldraw, like other canvas apps, the cursor rotates with the shape so it always matches the handle's direction. Getting this to feel right means handling a surprising number of small details—custom SVG cursors, counter-rotating shadows, flip logic, theming, and zoom. This post walks through them.

## Browsers give you eight cursors

The CSS `cursor` property gives you eight fixed orientations for resize cursors: `nwse-resize` and `nesw-resize` for diagonals, and `ew-resize` and `ns-resize` for edges:

[img]

When shapes are aligned with the axes of the page, the cursors are positioned correctly - but as soon as a shape rotates, the cursor becomes misleading. A handle at the visual "top" of a 45-degree rotated square should show the same `ns-resize` cursor, but rotated by 45 degrees.

We could snap to the nearest of the eight available angles, but that creates jarring jumps as rotation crosses thresholds. A shape rotating smoothly from 0 to 90 degrees would cause the cursor to suddenly flip from one diagonal to another. And for rotations near 22.5, 67.5, or other midpoints between the fixed angles, you'd always be visibly wrong.

## SVG in a data URI

The CSS `cursor` property does accept one escape hatch: the `url()` function. You can point it at a custom image. The obvious approach would be to pre-render cursor images at every angle—but that's hundreds of images, and you'd still be snapping to the nearest pre-rendered angle.

SVG changes the equation. Because SVG is a text format, you can build it as a string, set the rotation to whatever angle you need, and generate a new cursor on the fly. And because browsers accept data URIs in `cursor: url(...)`, you can inline the whole thing—no files, no network requests, just a string in a style property.

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

The cursor canvas is 32x32 pixels, but since the cursors are SVG they scale cleanly to any display density. The hotspot sits at (16, 16)—the center—so the visual cursor graphic rotates around the point where the user is clicking.

The SVG content comes from predefined path strings for corner and edge handles:

```typescript
const CORNER_SVG = `<path d='m19.7432 17.0869-4.072 4.068 2.829 2.828-8.473-.013-.013-8.47 2.841 2.842 4.075-4.068 1.414-1.415-2.844-2.842h8.486v8.484l-2.83-2.827z' fill='%23fff'/><path d='m18.6826 16.7334-4.427 4.424 1.828 1.828-5.056-.016-.014-5.054 1.842 1.841 4.428-4.422 2.474-2.475-1.844-1.843h5.073v5.071l-1.83-1.828z' fill='%23000'/>`

const EDGE_SVG = `<path d='m9 17.9907v.005l5.997 5.996.001-3.999h1.999 2.02v4l5.98-6.001-5.98-5.999.001 4.019-2.021.002h-2l.001-4.022zm1.411.003 3.587-3.588-.001 2.587h3.5 2.521v-2.585l3.565 3.586-3.564 3.585-.001-2.585h-2.521l-3.499-.001-.001 2.586z' fill='%23fff'/><path d='m17.4971 18.9932h2.521v2.586l3.565-3.586-3.565-3.585v2.605h-2.521-3.5v-2.607l-3.586 3.587 3.586 3.586v-2.587z' fill='%23000'/>`
```

Each SVG has a white outline and black fill to stay visible against any background. We wrap them in a group with a rotation transform: `rotate(${r + tr} 16 16)` rotates around the center point by the sum of the shape's rotation and any additional offset.

## The shadow always points down

Cursors need drop shadows to stay readable—without one, a thin arrow can vanish against busy canvas content. But shadows introduce a subtle problem. A drop shadow has a direction: it falls down and to the right, matching the way light falls on screen UI. If we just rotated the entire SVG including the shadow filter, the shadow would rotate with the cursor graphic. A cursor rotated 180 degrees would have its shadow pointing upward, which looks wrong.

We want the cursor graphic itself to rotate, but the shadow to always fall "downward" in screen space. The fix is to rotate the shadow's offset vector by the _negative_ of the cursor rotation:

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

A selection box has several kinds of handles: edges, corners, and rotation zones just outside each corner. Each needs a different cursor graphic—a double-headed arrow for edges, a diagonal arrow for corners, a curved arrow for rotation. But we don't need a unique SVG for every one. We only need three base SVGs, then rotate them to the right angle with an offset:

```typescript
const CURSORS: Record<TLCursorType, CursorFunction> = {
	'ew-resize': (r, f, c) => getCursorCss(EDGE_SVG, r, 0, f, c),
	'ns-resize': (r, f, c) => getCursorCss(EDGE_SVG, r, 90, f, c),
	'nesw-resize': (r, f, c) => getCursorCss(CORNER_SVG, r, 0, f, c),
	'nwse-resize': (r, f, c) => getCursorCss(CORNER_SVG, r, 90, f, c),
	'nwse-rotate': (r, f, c) => getCursorCss(ROTATE_CORNER_SVG, r, 0, f, c),
	'nesw-rotate': (r, f, c) => getCursorCss(ROTATE_CORNER_SVG, r, 90, f, c),
	'senw-rotate': (r, f, c) => getCursorCss(ROTATE_CORNER_SVG, r, 180, f, c),
	'swne-rotate': (r, f, c) => getCursorCss(ROTATE_CORNER_SVG, r, 270, f, c),
}
```

Three SVG graphics, ten cursor types. Edge handles use the same SVG but with different rotation offsets. `ew-resize` is horizontal (0°), `ns-resize` is vertical (90°). Corner handles work similarly—the diagonal cursors are the same graphic rotated by 90 degrees. And the rotation cursors—the curved arrows that appear when you hover just outside a corner—use a third SVG with four offsets, one per corner.

The shape's actual rotation gets added to these base offsets, so a `nesw-resize` handle on a shape rotated 45 degrees will render at 45 degrees, perfectly aligned with the handle's orientation. The rotation cursors follow the same rule.

## Flipping during resize

When you resize a shape past its opposite edge, it flips. The scale goes negative, the shape mirrors, and the cursor needs to flip too. A northwest handle that crosses to the southeast should become a southeast cursor.

Think about which diagonal cursor to show: `nwse-resize` (↘↖) or `nesw-resize` (↗↙). Flipping on the X axis swaps left and right, turning one diagonal into the other. Flipping on the Y axis does the same. But flipping on _both_ axes? That's a 180° rotation—the diagonal direction is unchanged. So the cursor should only switch when exactly one axis is flipped. That's an XOR:

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

A black cursor disappears on a dark canvas. The cursor SVGs already have both a white outline and a black fill for contrast, but the overall color needs to match the theme:

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

## Handle distance scales with zoom

Resize handles sit directly on the selection box, but rotation cursors need to sit just outside each corner—close enough to discover, far enough to not overlap the resize handles.

[img]

The tricky part is zoom. If that gap were a fixed number of canvas units, it would balloon when you zoom in and vanish when you zoom out. We need it to stay the same visual size on screen regardless of zoom level:

```typescript
const targetSize = (6 / zoom) * mobileHandleMultiplier
```

Each rotation zone is an invisible rectangle, `targetSize * 3` wide and tall, positioned `targetSize * 3` beyond the corner:

```typescript
<rect
  x={cx - targetSize * 3}
  y={cy - targetSize * 3}
  width={Math.max(1, targetSize * 3)}
  height={Math.max(1, targetSize * 3)}
/>
```

At 2x zoom, `targetSize` is 3 canvas units. At 0.5x, it's 12. The rotation zones—and all the resize handles—scale inversely with zoom, staying the same visual size on screen. Zoom in on a shape and the handles don't grow to dominate the canvas. Zoom out and they don't shrink to subpixel invisibility.

The same `targetSize` controls the resize handle hit areas (3× targetSize for corners, 2× for edges) and adjusts for touch input—on coarse pointer devices, `mobileHandleMultiplier` is 1.75, making handles 75% larger to accommodate finger taps.

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

We traded native cursor rendering for rotational freedom. The browser's built-in cursors are pixel-perfect at their intended size and consistent across platforms. Our SVG cursors scale with DPI but might look slightly different across browsers, and every cursor update constructs a new data URI string—potentially many times per second during hover and resize.

In practice, the cost is negligible. String construction is fast, browsers cache cursor rendering, and the whole implementation is about 30 lines. The payoff—correct rotation at any angle, consistent shadows, theme-aware colors, and flip handling—would be impossible with the browser's eight fixed cursors.
