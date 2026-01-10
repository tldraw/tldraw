---
title: Camera slide momentum
created_at: 01/05/2026
updated_at: 01/05/2026
keywords:
  - camera
  - momentum
  - hand tool
  - friction
  - velocity
status: published
date: 01/05/2026
order: 1
---

# Camera slide momentum

Drag the canvas with the hand tool and release while moving. The camera continues sliding in that direction with gradually decreasing speed, like sliding something across ice. This momentum behavior feels natural because it matches our physical intuition about friction and inertia. The implementation involves three coordinated systems: capturing velocity at release, smoothing velocity measurements during the drag, and applying exponential decay to create the slide.

## Capturing velocity at release

When you release the pointer while dragging, the hand tool needs to know how fast you were moving. This happens in the `Dragging` state's `complete()` method:

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

The velocity gets clamped to a maximum of 2 pixels per millisecond. Without this cap, a very fast flick could send the canvas flying off to infinity. The cap is high enough to allow satisfying fast pans but prevents loss of control.

The minimum threshold of 0.1 px/ms filters out unintentional momentum from slow, careful drags. When you deliberately position the canvas, it should just stop where you leave it. The threshold ensures only intentional flicks trigger sliding.

## Smoothing velocity measurements

Raw pointer velocity is noisy—individual frames can have velocity spikes from tiny timing variations or cursor position quantization. The `InputsManager` smooths these measurements by blending each new velocity reading with the previous one:

```typescript
// Blend current velocity with new measurement
const next = pointerVelocity.clone().lrp(direction.mul(length / elapsed), 0.5)

// if the velocity is very small, just set it to 0
if (Math.abs(next.x) < 0.01) next.x = 0
if (Math.abs(next.y) < 0.01) next.y = 0
```

The `lrp` (linear interpolation) at 0.5 creates a halfway blend between the previous velocity and the new measurement. This removes spikes while staying responsive to actual movement changes. The same smoothing factor appears in tldraw's drawing tools—it's a sweet spot that balances noise reduction with responsiveness.

The tiny-value cutoff prevents imperceptible drift. Components smaller than 0.01 px/ms are rounded to zero, keeping the velocity vector clean.

## Applying friction to slide

Once the velocity is captured and the slide begins, the `slideCamera` method runs an animation loop that applies friction each frame:

```typescript
const cz = editor.getZoomLevel()
let currentSpeed = Math.min(1, speed ?? 1)

// ... setup ...

const moveCamera = (elapsed: number) => {
	const movementVelocity = direction.clone().mul(currentSpeed / cz)
	editor.setCamera(editor.getCamera(), { immediate: true })

	currentSpeed *= 1 - friction

	if (currentSpeed < speedThreshold) {
		this.stopCameraAnimation()
	}
}
```

The movement gets divided by the zoom level (`cz`). This makes the slide feel consistent at any zoom—higher zoom means less canvas-space movement for the same screen-space velocity. Without this adjustment, slides would feel too aggressive when zoomed in and too sluggish when zoomed out.

Friction is applied multiplicatively: `currentSpeed *= 1 - friction`. With the default friction of 0.09, each frame retains 91% of the previous frame's speed. This creates an exponential decay curve—the characteristic "ease-out" feeling of something gradually coming to rest.

The animation stops when speed drops below a threshold (default 0.01 px/ms). Movement below this point is imperceptible, so continuing would just waste computation cycles.

## Why 0.09 for friction?

The default friction value of 0.09 was chosen to match the feel of macOS trackpad scroll decay—that smooth, natural deceleration when you lift your fingers during momentum scrolling. It's high enough to bring the canvas to rest in a reasonable time but low enough to create a satisfying sense of physicality.

Values around 0.2 make the canvas stop too abruptly, breaking the illusion of momentum. Values around 0.03 let the canvas drift too far, making it hard to control where you end up. The exponential decay at 0.09 hits the sweet spot where the slide feels intentional and controllable.

## Edge cases and options

The `slideCamera` method respects several configuration options and editor states:

Camera lock normally prevents all camera movement. The `force: true` option overrides this, allowing programmatic slides even when the user has locked the camera.

Animation speed can be set to zero in user preferences. When disabled, `slideCamera` returns immediately without starting the animation.

Speed and friction can be customized per call:

```typescript
editor.slideCamera({
	speed: velocity.len(),
	direction: velocity,
	friction: 0.12, // custom friction
	speedThreshold: 0.02, // custom stop point
})
```

This makes `slideCamera` useful beyond just the hand tool. Custom tools can implement momentum-based interactions with different physical characteristics—maybe a "throw" tool with lower friction for longer slides, or a precise positioning tool with higher friction for quick settling.

## The broader pattern

Camera slide momentum is part of a larger family of physics-inspired interactions in tldraw. The velocity smoothing technique appears in drawing tools. The exponential decay pattern matches wheel scrolling behavior. The tick-based animation integrates with other camera movements through the unified animation system.

These patterns create consistency across different interactions. Users don't consciously notice that all momentum-based movements use the same underlying physics model, but they feel the coherence. The canvas behaves like a physical object with weight and friction, not a collection of independent effects.

## Related

- [Wheel momentum filtering](../wheel-momentum/wheel-momentum.md) — Handling phantom wheel events during momentum scrolling
- [Click detection state machine](../click-state-machine/click-state-machine.md) — Another timing-sensitive input system
