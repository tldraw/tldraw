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

There's a bunch of invisible work happening with cursors on any web app. Aside from hit-testing, cursors also give the user a continuous preview of what their next action will do—before they do it.

Canvas apps like tldraw need something even more specific than the browser defaults. When you select a shape, handles appear around it for resizing and rotating. Each handle shows a type of cursor that hints at what dragging it would do, like a double-headed arrow for the resize direction or a curved arrow for rotation. Browsers do provide resize cursors for this—but they point in fixed directions.

So if a selected shape on your canvas is rotated, the mismatch would look like this:

[gif]

In tldraw, the cursor rotates with the shape so it always matches the handle's direction. Getting this to feel right meant handling a surprising number of small details including custom SVG cursors, counter-rotating shadows, flip logic, and zoom. We walk through these details below.

## Cursors in the browser

The CSS `cursor` property gives you four fixed orientations for resize cursors: `nwse-resize` and `nesw-resize` for diagonals, and `ew-resize` and `ns-resize` for edges:

[img]

These are fine for axis-aligned shapes, but there's no way to rotate them.

## Text all the way down

Thankfully, there's an escape hatch: the CSS `cursor` property accepts a `url()` pointing to a custom image. Since SVG is a text format, you can build it as a string, set the rotation to whatever angle you need, and then generate a new cursor for that angle. Browsers accept data URIs in `cursor: url(...)`, so you can inline the whole thing without serving any files.

One approach is to snap each handle's cursor to the nearest of these four directions based on the handle's rotated position. This works, but means cursors jump in 45-degree increments rather than rotating smoothly with the shape.

Below is our implementation in tldraw. The function takes an SVG path string, wraps it in a 32x32 SVG with a rotation transform and a drop shadow filter, then encodes the whole thing as a data URI that the browser can use directly as a cursor:

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

Since the cursors are SVGs, they scale cleanly to any display density. The click point sits at the center of the 32×32 image, so the graphic rotates around exactly where the user is pointing.

The SVG content comes from predefined path strings for corner and edge handles:

```typescript
const CORNER_SVG = `<path d='m19.7432 17.0869...' fill='%23fff'/><path d='m18.6826 16.7334...' fill='%23000'/>`
const EDGE_SVG = `<path d='m9 17.9907...' fill='%23fff'/><path d='m17.4971 18.9932...' fill='%23000'/>`
const ROTATE_CORNER_SVG = `<path d="M22.4789 9.45728..." fill="black"/><path d="M21.4789 7.03223..." fill="white"/>`
```

Each SVG has a white outline and black fill to stay visible against any background. We wrap them in a group with a rotation transform: `rotate(${r + tr} 16 16)` rotates around the center point by the sum of the shape's rotation and any additional offset.

## Cursor types and rotation offsets

A selection box has edges, corners, and rotation zones — ten cursor types in all. Building a separate SVG for each would work, but most of them are the same shape pointing in a different direction. So we only need three base SVGs and a rotation offset for each variant:

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

Edge-handles use the same SVG but with different rotation offsets. `ew-resize` is horizontal (0°), `ns-resize` is vertical (90°). Corner handles work similarly—the diagonal cursors are the same graphic rotated by 90 degrees. Rotation cursors use a third SVG with four offsets, one per corner.

The shape's actual rotation gets added to these base offsets, so a `nesw-resize` handle on a shape rotated 45 degrees will render at 45 degrees, perfectly aligned with the handle's orientation. The rotation cursors follow the same rule.

## Shadows should not fall upwards

Rotating the entire SVG leaves a subtler problem. Cursors need drop shadows to stay readable against busy canvas content, but drop shadows have a direction. It should always fall down and to the right, as if the light source was from the top-left corner. However, when rotating SVGs, the shadow rotates with it:

[img]

To edit this, we define the shadow as an SVG filter with a `dx` and `dy` offset—normally (1, 1), meaning one pixel right and one pixel down. But the filter sits inside the rotated `<g>` group, so its coordinate system rotates along with everything else. If the group rotates 180°, the filter's "bottom-right" becomes "top-left" in screen space.

The fix is to counter-rotate the shadow offset. The shadow's default offset is `(1, 1)` — one pixel right, one pixel down. If we rotate that vector by the _negative_ of the cursor's rotation before the group transform applies, the two rotations cancel out and the shadow always falls in the same screen-space direction.

To rotate a 2D vector, you multiply it by a rotation matrix. Here that means taking the angle, computing its sine and cosine, and applying the standard formula:

```typescript
const a = (-tr - r) * (PI / 180) // negate the cursor's rotation
const s = Math.sin(a)
const c = Math.cos(a)
const dx = 1 * c - 1 * s // rotate (1, 1) by angle a
const dy = 1 * s + 1 * c
```

## Flipping during resize

When you resize a shape past its opposite edge in tldraw, it flips. The scale goes negative, the shape mirrors, and therefore the cursor needs to flip too. A `nwse-resize` handle that crosses to the opposite corner should become `nesw-resize`.

[gif]

Think about which diagonal cursor to show: `nwse-resize` or `nesw-resize`. Flipping on the X axis swaps left and right, turning one diagonal into the other. Flipping on the Y axis does the same. But flipping on _both_ axes? That's a 180° rotation—the diagonal direction is unchanged. So the cursor should only switch when exactly one axis is flipped. That's an XOR!

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

## Zoom

Handles and rotation zones need to stay the same visual size on screen regardless of zoom level. If their size were fixed in canvas units, they'd balloon when you zoom in and vanish when you zoom out. The fix is to divide by zoom:

```typescript
const targetSize = (6 / zoom) * mobileHandleMultiplier
```

On touch devices, `mobileHandleMultiplier` bumps it up by 75% to accommodate finger taps.

--

The difference between the broken version and the working version is a single CSS declaration: cursor: url(...). The browser doesn't know that inside that string is a rotation matrix, a counter-rotating shadow, an XOR flip, a theme color, and a zoom divisor. It just shows the cursor.
