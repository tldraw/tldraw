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

To slide the camera, we need two things at the moment of release: how fast you were moving, and in what direction. Together they give us a velocity vector—the starting condition for the whole animation.

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

The velocity is measured in pixels per millisecond. The speed gets capped at 2 to prevent the canvas from flying off into the distance, and there's a minimum threshold of 0.1 below which we don't slide at all. Without that threshold, slow deliberate pans—where you're barely moving when you release—would accidentally trigger a little drift. The threshold separates "I want this to glide" from "I'm done moving."

## Smoothed velocity tracking

Pointer events don't arrive at perfectly regular intervals, and individual frames can spike—move a pixel more or less than expected due to timing jitter. If we used the raw velocity from the last frame, the slide direction and speed at release would feel unpredictable. So we smooth the velocity, blending each new measurement with the previous one:

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

The `lrp` (linear interpolation) with a factor of 0.5 means each new velocity is the midpoint between the previous smoothed velocity and the latest raw measurement. That's enough to absorb single-frame spikes while still responding quickly when you genuinely change direction. As a fun fact, we do the same with pointer positions while drawing to remove noise there, too.

Very small velocity components (< 0.01) get zeroed out. Without this, tiny residual movements—imperceptible on screen—would keep the velocity vector slightly nonzero, and the slide would start from a direction you didn't intend.

## Applying friction

Once we have a velocity, the camera needs to slow down and eventually stop. Without friction the slide would continue forever—or until the camera hits the edge of the coordinate space. We apply friction on every tick, draining a fraction of the speed each frame:

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

The key line is `currentSpeed *= 1 - friction`. With the default friction of 0.09, the camera retains 91% of its speed each tick. On every animation frame (roughly 60fps), the speed multiplies by 0.91—creating exponential decay that's quick to slow down at first, then gradually tapers off.

The slide continues until speed drops below 0.01. At that point, the movement between frames is imperceptible, so we stop the animation and avoid burning CPU on invisible updates.

## Why friction feels physical

Getting the friction value right is more about feel than physics, but the physics help. Real-world friction is proportional to velocity: the faster you're moving, the more resistance you encounter. Our `currentSpeed *= 1 - friction` produces the same relationship—an exponential decay where the rate of slowdown tracks the current speed, creating that characteristic "ease-out" feeling.

We landed on 0.09 by tuning against the Mac trackpad scroll decay, which most users have internalized as "how momentum should feel." Higher friction (like 0.2) makes the camera stop too abruptly, as if it hit sand. Lower friction (like 0.03) makes it drift too far, like ice with no resistance. 0.09 splits the difference—a smooth surface with just enough grip.

There's one more detail: we divide the movement by camera zoom (`/ cz` in the code above). Without this, zooming in would make the slide cover more canvas distance for the same screen-space gesture. Dividing by zoom keeps the slide feeling consistent—the same flick produces the same visual result at any zoom level.

## When it doesn't slide

Not every release should trigger momentum. Some users have accessibility needs that make unexpected motion disorienting, and some editor configurations intentionally lock the camera in place. We check for these before starting a slide:

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
		friction: 0.09, // or customize this
	})
}
```

The friction parameter is optional—it defaults to 0.09, but you can adjust it for different feels. Try 0.15 for a quicker stop, or 0.05 for a longer glide. The difference is subtle but noticeable, especially on trackpads where momentum scrolling sets expectations for how things should feel.
