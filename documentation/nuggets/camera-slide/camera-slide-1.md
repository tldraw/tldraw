---
title: Camera slide momentum
created_at: 01/05/2026
updated_at: 01/05/2026
keywords:
  - camera
  - hand tool
  - momentum
  - velocity
  - friction
---

# Camera slide momentum

Drag the canvas with the hand tool, then let go with some speed. The camera keeps moving for a bit, gradually slowing down like you'd just given it a push on ice. That momentum effect—the "slide"—comes from tracking pointer velocity at release and applying friction over time.

## Capturing velocity at release

When you drag with the hand tool and release the pointer, the editor checks how fast you were moving:

```typescript
private complete() {
	const { editor } = this
	const pointerVelocity = editor.inputs.getPointerVelocity()

	const velocityAtPointerUp = Math.min(pointerVelocity.len(), 2)

	if (velocityAtPointerUp > 0.1) {
		this.editor.slideCamera({ speed: velocityAtPointerUp, direction: pointerVelocity })
	}

	this.parent.transition('idle')
}
```

The velocity is measured in pixels per millisecond. If you release while moving faster than 0.1 px/ms, the camera slides. The speed gets capped at 2 to prevent the canvas from flying off into the distance.

We added a minimum threshold to filter out tiny movements so that if you're barely dragging when you release, the camera just stops. This keeps slow, deliberate pans from accidentally triggering momentum.

## Smoothed velocity tracking

To avoid jitter, we smooth pointer velocity using linear interpolation across frames:

```typescript
updatePointerVelocity(elapsed: number) {
	const currentScreenPoint = this.getCurrentScreenPoint()
	const pointerVelocity = this.getPointerVelocity()

	if (elapsed === 0) return

	const delta = Vec.Sub(currentScreenPoint, this._velocityPrevPoint)
	this._velocityPrevPoint = currentScreenPoint.clone()

	const length = delta.len()
	const direction = length ? delta.div(length) : new Vec(0, 0)

	// Blend current velocity with new measurement
	const next = pointerVelocity.clone().lrp(direction.mul(length / elapsed), 0.5)

	// Zero out very small components
	if (Math.abs(next.x) < 0.01) next.x = 0
	if (Math.abs(next.y) < 0.01) next.y = 0

	if (!pointerVelocity.equals(next)) {
		this._pointerVelocity.set(next)
	}
}
```

The `lrp` (linear interpolation) with a factor of 0.5 means the new velocity is calculated at half-way between the previous (smoothed) velocity and the new raw velocity. This removes spikes from individual frames while still responding quickly to changes in pointer movement. As a fun fact, we do the same with pointer positions while drawing to remove noise there, too.

Very small velocity components (< 0.01) get zeroed out. This prevents tiny residual movements that would be imperceptible but would keep the velocity calculation active.

## Applying friction

When the camera starts sliding, we reduce its speed on every tick using friction:

```typescript
slideCamera(opts) {
	const { speed, friction = this.options.cameraSlideFriction, direction, speedThreshold = 0.01 } = opts
	let currentSpeed = Math.min(speed, 1)

	const moveCamera = (elapsed: number) => {
		const { x: cx, y: cy, z: cz } = this.getCamera()
		const movementVec = Vec.Mul(direction, (currentSpeed * elapsed) / cz)

		// Apply friction
		currentSpeed *= 1 - friction
		if (currentSpeed < speedThreshold) {
			cancel()
		} else {
			this._setCamera(new Vec(cx + movementVec.x, cy + movementVec.y, cz))
		}
	}

	this.on('tick', moveCamera)

	return this
}
```

We use a default friction value of 0.09, meaning the camera retains 91% of its speed each tick. On every animation frame (roughly 60fps), the speed multiplies by 0.91. This creates exponential decay: quick to slow down at first, then gradually tapering off.

The slide continues until speed drops below 0.01. At that point, the movement between frames is imperceptible, so we stop the animation.

## Why friction feels physical

We chose a friction value of 0.09 to feel natural—like sliding something across a smooth surface—and to match the decay of the Mac trackpad scroll decay. Higher friction (like 0.2) makes the camera stop too abruptly. Lower friction (like 0.03) makes it drift too far.

The exponential decay from `currentSpeed *= 1 - friction` matches physical intuition. Real-world friction is proportional to velocity: the faster you're moving, the more resistance you encounter. As speed decreases, so does the rate of slowdown, creating that characteristic "ease-out" feeling.

We also divide the movement by camera zoom so the slide feels consistent at any zoom level. At higher zoom, the same screen-space velocity translates to less canvas-space movement—but the slide looks and feels the same to you.

## When it doesn't slide

A few conditions prevent sliding:

- Velocity at release is below 0.1 px/ms (too slow to feel intentional)
- User has animations disabled (`animationSpeed === 0`)
- User has enabled the "prefers reduced motion" preference
- Camera is locked (`isLocked` in camera options)

## Try it yourself

The `slideCamera` method is part of the public editor API, so you can use it in your own tools and interactions. Any time you want to animate the camera with momentum, you can capture pointer velocity and call `slideCamera`:

```typescript
const velocity = editor.inputs.getPointerVelocity()
if (velocity.len() > 0.1) {
	editor.slideCamera({
		speed: velocity.len(),
		direction: velocity,
		friction: 0.09  // or customize this
	})
}
```

The friction parameter is optional—it defaults to 0.09, but you can adjust it for different feels. Try 0.15 for a quicker stop, or 0.05 for a longer glide. The difference is subtle but noticeable, especially on trackpads where momentum scrolling sets expectations for how things should feel.

