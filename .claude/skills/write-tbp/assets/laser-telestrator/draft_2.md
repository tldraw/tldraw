# How we built a telestrator for the infinite canvas

When we first built tldraw's laser pointer tool, we initially modeled it on the way a laser pointer looks in real life: a point that appears to leave a tail behind it as it moves. The result isn't much different than our eraser, which also uses this pattern of a self-consuming line. As your pointer moves forward, points are removed from behind, creating a constant-length trail. Stop drawing, and the trail shrinks away.

Recently, we replaced this approach for our laser pointer with a "telestrator" pattern instead. If you've ever watched a sports broadcast, especially in the '80s or '90s, you will have seen a telestrator in action: it's the tool commentators used to draw circles and arrows on replays. A few years ago I was inspired by this pattern to create an [application](https://github.com/steveruizok/telestrator) that let me annotate on top of my video screen in the same way.

Unlike a laser pointer, here the shapes are not self-consuming: the user's marks will remain on the screen until the user stops drawing. After a moment, or if the user triggers a cancel event, the marks will fade away all together.

It looks simple and works much better for things like text or arrows. I think the implementation is pretty interesting, so I thought I'd share it here.

## Sessions, not scribbles

Previously, the laser, eraser, and the "scribble selection" tools all used the Editor's "scribble" API. A scribble is essentially a freehand line that is shown as an overlay on top of shapes but behind cursors. It uses the same variable width line algorithm as the draw shape but is ephemeral.

The key insight behind this new pattern is that we would no longer be tracking drawing individual scribbles, but rather _sessions_ of annotations. Multiple strokes that belong together conceptually should also behave together visually. The eraser may only need one scribble line per session, but our new laser tool would track multiple scribbles per session.

To support this, we added a session API to our scribble manager. Instead of managing each scribble independently, we group them:

```typescript
const sessionId = this.editor.scribbles.startSession({
	selfConsume: false, // don't eat the tail while drawing
	idleTimeoutMs: 1200, // auto-stop after inactivity
	fadeMode: 'grouped', // all scribbles fade together
	fadeEasing: 'ease-in', // smooth acceleration
})
```

The `selfConsume` flag controls the "shrinking tail" behavior found in the eraser and scribble-select tool. When `false`, points accumulate as you draw instead of being removed. The session handles the rest: when to keep things visible, when to start fading, and how to fade everything together.

## Reusing the session

The LaserTool manages a single session ID that persists across multiple strokes. When you press down, we check if there's already an active session. If so, we add to it:

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

When you lift the pointer, we mark the scribble complete, but we don't stop the session. It stays alive, waiting for more strokes.

After 1200ms of inactivity, the idle timeout fires and stops the session. At that point, all the scribble marks you drew will fade out together.

## Fading together

The fade behavior took some thought. If you've drawn three strokes with different lengths, what does it mean to fade them "together"?

We tried shrinking the opacity of all lines at once, or consuming the line from both ends, or a combination of both. We also tried a linear consume, meaning that sessions with many lines would take longer to fade out.

Our approach: remove the points from all lines using a curved rate over a fixed time:

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

The ease-in curve (`progress * progress`) means the fade starts slow and accelerates. Early on you barely notice anything changing, then it all disappears quickly at the end. This matches how we perceive fade-outs in video; a linear fade looks artificially slow at the end.

A session with a few short lines will take the same amount of time to fade out as a session with a few long lines. This just felt right: the fade doesn't any information except "the fade has started" and "the fade has finished", and these are the same in all cases.

## Keeping the session alive

While you're actively drawing, we need to prevent the idle timeout from firing. The Lasering state does this by calling `extendSession` on every tick:

```typescript
override onTick() {
  this.editor.scribbles.extendSession(this.sessionId)
}
```

This resets the idle timeout, keeping the session alive as long as your pointer is down. Lift your pointer and the countdown begins. Start drawing again before it fires and you're adding to the same session. Your new strokes will fade together with the old ones.

## Cancellation

One benefit of the session pattern is clean cancellation. If something interrupts the tool (pressing escape, switching tools, a cancel event) we can clear everything in one operation:

```typescript
override onCancel() {
  if (this.sessionId && this.editor.scribbles.isSessionActive(this.sessionId)) {
    this.editor.scribbles.clearSession(this.sessionId)
    this.sessionId = null
    this.transition('idle')
  }
}
```

This clears all sessions. Even though the wait time is short, it's better to give the user a manual way to cancel the session if they want to.

## The scribble system

These changes are live on tldraw.com and will be landing in the next version of the SDK. If you want to try it early, check out the `next` branch of the [tldraw SDK](https://github.com/tldraw/tldraw).

The [scribble system](/sdk-features/scribble) is a general-purpose API, so you can use it for whatever you can imagine in your own tools. Scribbles sync, too, so maybe you'll come up with something interesting for multiplayer collaboration.

Check out the full implementation in [`ScribbleManager.ts`](https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts) and the laser tool in [`LaserTool/`](https://github.com/tldraw/tldraw/tree/main/packages/tldraw/src/lib/tools/LaserTool). If you build something clever, let us know on the [Discord](https://tldraw.com/discord)!
