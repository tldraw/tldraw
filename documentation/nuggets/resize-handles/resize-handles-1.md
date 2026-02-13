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

When you select a shape on a canvas application, handles should appear so that you can resize and rotate it. Each handle gets a cursor that shows what dragging it would do. This is usually a double-headed arrow pointing in the resize direction, or a curved arrow for rotation.

Browsers provide resize cursor icons - but if a shape on your canvas app is rotated, the mismatch would look like this:

[gif]

In tldraw, like other canvas apps, the cursor rotates with the shape so it always matches the handle's direction. Getting this to feel right meant handling a surprising number of small details—custom SVG cursors, counter-rotating shadows, flip logic, theming, and zoom. We walk through these details below.

## Cursors in the browser

The CSS `cursor` property gives you eight fixed orientations for resize cursors: `nwse-resize` and `nesw-resize` for diagonals, and `ew-resize` and `ns-resize` for edges:

[img]

When shapes are aligned with the axes of the page, the cursors are positioned correctly - but as soon as a shape rotates, the cursor becomes misleading. A handle at the visual "top" of a 45-degree rotated square should show the same `ns-resize` cursor, but rotated by 45 degrees.

## Text all the way down

There's an escape hatch: the CSS `cursor` property accepts a `url()` pointing to a custom image. Since SVG is a text format, you can build it as a string, set the rotation to whatever angle you need, and then generate a new cursor for that angle. Browsers accept data URIs in `cursor: url(...)`, so you can inline the whole thing without needing to serve any files.

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
	const a = (-tr - r) * (PI / 180)
	const s = Math.sin(a)
	const c = Math.cos(a)
	const dx = 1 * c - 1 * s
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

The cursor is 32x32 pixels, and since they're SVGs they can scale cleanly to any display density. The hotspot sits at (16, 16)—the center—so the visual cursor graphic rotates around the point where the user is clicking.

The SVG content comes from predefined path strings for corner and edge handles:

```typescript
const CORNER_SVG = `<path d='m19.7432 17.0869...' fill='%23fff'/><path d='m18.6826 16.7334...' fill='%23000'/>`
const EDGE_SVG = `<path d='m9 17.9907...' fill='%23fff'/><path d='m17.4971 18.9932...' fill='%23000'/>`
const ROTATE_CORNER_SVG = `<path d="M22.4789 9.45728..." fill="black"/><path d="M21.4789 7.03223..." fill="white"/>`
```

Each SVG has a white outline and black fill to stay visible against any background. We wrap them in a group with a rotation transform: `rotate(${r + tr} 16 16)` rotates around the center point by the sum of the shape's rotation and any additional offset.

## The shadow always points down

There were a few lines in `getCursorCss` above that we didn't explain: the `dx` and `dy` shadow offset. Cursors need drop shadows to stay readable. Without this, a thin arrow can vanish against busy canvas content. But shadows introduce a subtle problem: a drop shadow has a direction - it falls down and to the right, matching the way light falls on screen UI from the top left of the screen. If we just rotated the entire SVG including the shadow filter, the shadow would rotate with the cursor graphic. A cursor rotated 180 degrees would have its shadow pointing upward, which looks wrong:

[gif]

We want the cursor graphic to rotate, but the shadow to always fall "downward" in screen space. The shadow is defined as an SVG filter with a `dx` and `dy` offset—normally (1, 1), meaning one pixel right and one pixel down. But the filter sits inside the rotated `<g>` group, so its coordinate system rotates along with everything else. If the group rotates 180°, the filter's "down-right" becomes "up-left" in screen space.

To fix this, we pre-rotate the shadow offset by the _negative_ of the cursor's rotation. Think of it this way: if the group is about to rotate 90° clockwise, we point the shadow offset 90° counter-clockwise. When the group's transform then applies on top, the two rotations cancel out and the shadow lands back at its original screen-space direction:

```typescript
const a = (-tr - r) * (PI / 180) // Negate the rotation
const s = Math.sin(a)
const c = Math.cos(a)
const dx = 1 * c - 1 * s // Standard rotation matrix
const dy = 1 * s + 1 * c
```

This is a 2D rotation applied to the vector (1, 1) — the shadow's default "one pixel right, one pixel down" offset. Since `a` is the _negation_ of the cursor's rotation, this rotates the offset backward by exactly the amount the SVG group will rotate forward. The two cancel out, and the shadow always lands at its original screen-space direction regardless of cursor angle.

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

A black cursor disappears on a dark canvas. Each cursor SVG has a white outline behind a black fill for contrast, but the overall color flips with the theme: white in dark mode, black in light mode.

[gif]

## Zoom

Handles and rotation zones need to stay the same visual size on screen regardless of zoom level. If their size were fixed in canvas units, they'd balloon when you zoom in and vanish when you zoom out. The fix is to divide by zoom:

```typescript
const targetSize = (6 / zoom) * mobileHandleMultiplier
```

This single value controls the size of every handle and rotation zone. On touch devices, `mobileHandleMultiplier` bumps it up by 75% to accommodate finger taps.

--

All of this—counter-rotating shadows, XOR flip logic, theme colors, zoom-compensated hit areas—lives in a single function that builds a string. Each detail is small on its own, but together they're what makes the cursor feel like it belongs to the shape rather than floating above it.
