---
title: Top-left origin
created_at: 01/10/2026
updated_at: 02/13/2026
keywords:
  - coordinates
  - origin
  - browser
  - canvas
  - atan2
  - rotation
---

When we built tldraw, we had to pick a coordinate system. The mathematical convention uses Cartesian coordinates: origin at the center, y increasing upward. That's what you'll find in textbooks and in APIs like OpenGL that model the world mathematically.

But most 2D graphics libraries, game engines, and UI frameworks already use top-left origin with y increasing downward — the same convention as the browser. tldraw does too. Our origin sits at the top left of the viewport, with y increasing downward. If you've only worked with math-oriented graphics APIs, this might feel wrong — but if you've done any web, game, or UI development, it's probably what you expect.

## The conversion that isn't there

Here's why we did it. Look at what happens when a user drops a file onto the canvas:

```ts
point: editor.screenToPage({ x: e.clientX, y: e.clientY })
```

The browser gives us `clientX` and `clientY` measured from the top-left of the viewport. Our `screenToPage` method scales and offsets that point for the camera, but it never flips an axis:

```ts
screenToPage(point: VecLike) {
  const { screenBounds } = this.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!
  const { x: cx, y: cy, z: cz = 1 } = this.getCamera()
  return new Vec(
    (point.x - screenBounds.x) / cz - cx,
    (point.y - screenBounds.y) / cz - cy,
  )
}
```

The x and y lines are identical in structure. No negation, no subtraction from a height value, no `viewport.height - y`. The point flows from browser space into page space through a uniform transform.

If we'd used Cartesian coordinates, that second line would need to flip: `viewport.height - ((point.y - screenBounds.y) / cz - cy)`. And every conversion going the other direction — page to screen, page to viewport — would need its own flip. CSS overlay positioning, tooltip placement, hit testing against DOM elements, drag-and-drop coordinates — every boundary between our world and the browser's would require a negation and a height offset.

That's not one conversion. The codebase has dozens of places where screen coordinates and page coordinates meet. Each one would be a place to introduce an off-by-one-height bug.

## Where it hurts

The tradeoff shows up in angle math. In a y-up coordinate system, `Math.atan2(y, x)` returns angles that increase counter-clockwise — the mathematical convention. With y-down, the same function returns angles that increase clockwise.

tldraw's `Vec.Angle` method is a direct `atan2` call:

```ts
static Angle(A: VecLike, B: VecLike): number {
  return Math.atan2(B.y - A.y, B.x - A.x)
}
```

This means a positive rotation in tldraw is clockwise. Every textbook and every Stack Overflow answer about rotation assumes the opposite convention. When we compute angle distances, we have to be explicit about direction:

```ts
function clockwiseAngleDist(a0: number, a1: number): number {
	a0 = canonicalizeRotation(a0)
	a1 = canonicalizeRotation(a1)
	if (a0 > a1) {
		a1 += PI2
	}
	return a1 - a0
}

function counterClockwiseAngleDist(a0: number, a1: number): number {
	return PI2 - clockwiseAngleDist(a0, a1)
}
```

We can't just subtract two angles and check the sign. We need named functions that make the direction explicit, because the "natural" direction of our angles is backwards from what most developers expect.

And it compounds. When a shape is flipped along one axis, we need to negate its rotation — but the negation has to account for the parent's page rotation too:

```ts
const rotation = -options.initialShape.rotation - 2 * parentRotation
```

Lines like this are hard to derive and easy to get wrong. They exist because our rotation convention doesn't match the mathematical one.

## The arithmetic

We interact with the browser on every pointer event, every frame, every CSS overlay. We interact with textbook trigonometry in rotation code, arc math, and angle snapping. The browser interactions outnumber the trig by at least ten to one.

If you're building a canvas app and weighing this decision: match the platform. The coordinate system that eliminates the most conversions is the one you should pick, even if it makes the occasional `atan2` feel backwards. You'll spend more time debugging coordinate mismatches at system boundaries than you will adjusting rotation formulas.

## Source files

- Screen/page conversions: `/packages/editor/src/lib/editor/Editor.ts` (`screenToPage` at line 3820, `pageToScreen` at line 3842)
- Angle utilities: `/packages/editor/src/lib/primitives/utils.ts` (`clockwiseAngleDist` at line 126, `canonicalizeRotation` at line 108)
- Vec angle methods: `/packages/editor/src/lib/primitives/Vec.ts` (`Angle` at line 476, `ToAngle` at line 555)
- Browser event intake: `/packages/editor/src/lib/hooks/useCanvasEvents.ts` (line 111)
