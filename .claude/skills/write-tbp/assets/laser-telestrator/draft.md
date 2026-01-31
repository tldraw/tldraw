# How we built a telestrator for the infinite canvas

If you've ever watched a sports broadcast, you've seen a telestrator—the tool commentators use to draw circles and arrows on replays. Draw a few marks, lift the pen, draw some more, and then everything fades away together. It looks simple, but getting this behavior right on a canvas turns out to be surprisingly tricky.

When we built tldraw's laser pointer tool, we initially reached for the same approach we used for other freehand tools: a self-consuming line that eats its own tail as you draw. The eraser uses this pattern—as your pointer moves forward, points are removed from behind, creating a constant-length trail. Stop drawing, and the trail shrinks away.

But for a laser pointer, this felt wrong. When you circle something and then add an arrow, you don't want your circle eating itself while you're still thinking. You want everything you've drawn in this annotation session to stay visible, then fade away as one unit when you're done.

## The telestrator pattern

The key insight is that a laser pointer isn't just a freehand line—it's a _session_ of annotations. Multiple strokes that belong together conceptually should also behave together visually.

We call this the session-based architecture, or internally, the "telestrator pattern." Instead of managing each scribble independently, we group them:

```typescript
const sessionId = this.editor.scribbles.startSession({
	selfConsume: false, // don't eat the tail while drawing
	idleTimeoutMs: 1200, // auto-stop after inactivity
	fadeMode: 'grouped', // all scribbles fade together
	fadeEasing: 'ease-in', // smooth acceleration
})
```

The `selfConsume: false` flag is what makes this a telestrator rather than an eraser. Points accumulate as you draw instead of being removed. The session handles the lifecycle—when to keep things visible, when to start fading, how to fade everything together.

## Session lifecycle

The LaserTool manages a single session ID that persists across multiple strokes:

```typescript
getSessionId(): string {
  // Reuse existing session if it's still active
  if (this.sessionId && this.editor.scribbles.isSessionActive(this.sessionId)) {
    return this.sessionId
  }

  // Create a new session
  this.sessionId = this.editor.scribbles.startSession({
    selfConsume: false,
    idleTimeoutMs: this.editor.options.laserDelayMs,
    fadeMode: 'grouped',
    fadeEasing: 'ease-in',
  })

  return this.sessionId
}
```

When you press down, we add a new scribble to the session. When you lift up, we mark that scribble complete—but we don't stop the session. The session stays alive, waiting for more strokes.

The magic happens when you stop drawing. After 1200ms of inactivity, the idle timeout fires and stops the session. At that point, all the scribbles you drew—circles, arrows, underlines, whatever—fade out together as one cohesive visual unit.

## Grouped fade

The fade itself needed some thought. If you've drawn three strokes with different lengths, how do you fade them "together"?

We track the total number of points at fade start, then remove them proportionally over time:

```typescript
private tickGroupedFade(session: Session, elapsed: number): void {
  const progress = session.fadeElapsed / session.options.fadeDurationMs
  const easedProgress = session.options.fadeEasing === 'ease-in'
    ? progress * progress
    : progress

  const targetRemoved = Math.floor(easedProgress * session.totalPointsAtFadeStart)
  const actuallyRemoved = session.totalPointsAtFadeStart - remainingPoints
  const pointsToRemove = Math.max(1, targetRemoved - actuallyRemoved)

  // Remove points from first scribble that has any
  let removed = 0
  let itemIndex = 0
  while (removed < pointsToRemove && itemIndex < session.items.length) {
    const item = session.items[itemIndex]
    if (item.scribble.points.length > 0) {
      item.scribble.points.shift()
      removed++
    } else {
      itemIndex++
    }
  }
}
```

The ease-in curve (`progress * progress`) means the fade starts slow and accelerates—early on you barely notice anything changing, then it all disappears quickly at the end. This matches how we perceive fade-outs in video; a linear fade looks artificially slow at the end.

## Keeping it alive

While you're actively drawing, we want to prevent the idle timeout from firing. The Lasering state does this by calling `extendSession` on every tick:

```typescript
override onTick() {
  this.editor.scribbles.extendSession(this.sessionId)
}
```

This resets the idle timeout, keeping the session alive as long as your pointer is down. Lift your pointer, and the countdown to fade begins. Start drawing again before it fires, and you're adding to the same session—your new strokes will fade together with the old ones.

## Why not just use a timer?

You might wonder why we built all this session machinery instead of just setting a timer when the pointer lifts. The answer is robustness.

A session encapsulates all the state: which scribbles belong together, whether we're still drawing or fading, how much time has elapsed. If something interrupts the tool—a cancel event, switching tools, pressing escape—we can clear the session in one operation. All the scribbles disappear immediately, and we're back to a clean slate:

```typescript
override onCancel() {
  if (this.sessionId && this.editor.scribbles.isSessionActive(this.sessionId)) {
    this.editor.scribbles.clearSession(this.sessionId)
    this.sessionId = null
    this.transition('idle')
  }
}
```

Without sessions, we'd need to track each scribble's timer individually and coordinate cancellation across all of them. The session pattern turns a distributed state problem into a simple lookup.

## The scribble system

The laser tool sits on top of our general-purpose [scribble system](/sdk-features/scribble). Scribbles are temporary freehand paths that exist only in instance state—they're never persisted to the document. They move through states (starting, active, complete, stopping) and handle their own fade-out animation.

The session API adds grouping and lifecycle management on top. Other tools like the eraser use the simpler direct API with self-consuming scribbles. The architecture supports both use cases without either needing to know about the other.

You can find the scribble session implementation in [`packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts`](https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts), and the laser tool in [`packages/tldraw/src/lib/tools/LaserTool/`](https://github.com/tldraw/tldraw/tree/main/packages/tldraw/src/lib/tools/LaserTool).
