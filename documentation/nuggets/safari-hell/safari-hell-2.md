---
title: Safari quirks and workarounds
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - Safari
  - browser
  - workarounds
---

# Safari quirks and workarounds

Building a canvas app that works across browsers means dealing with Safari's unique behaviors. Some are documented WebKit bugs, others are just implementation differences that force you to write special cases. Here are two of the more subtle ones we've encountered.

## Gesture events: trackpad vs touch

Two-finger pinch gestures look straightforward until you realize Safari uses completely different events depending on whether you're on a trackpad or a touchscreen.

On iOS, a pinch is just a `pointermove` event with two touches. You track both pointer positions, measure the distance between them, and detect when that distance changes.

On desktop Safari with a trackpad, there are zero touches. Instead, the browser fires `gesturechange` and `gestureend` events. These are WebKit-specific events that don't exist in Chrome or Firefox.

We check for this in our pinch handler:

```typescript
// In (desktop) Safari, a two finger trackpad pinch will be a "gesturechange" event
// and will have 0 touches; on iOS, a two-finger pinch will be a "pointermove" event
// with two touches.
const isSafariTrackpadPinch =
  gesture.type === 'gesturechange' || gesture.type === 'gestureend'
```

This distinction matters because it affects how we resolve the pinch state machine. On touch screens, we start in a "not sure" state—the gesture could be panning (moving the canvas) or zooming (changing scale). We watch what the pointers do and commit to one interpretation once we have enough information.

But trackpad pinches are unambiguous. If we see a `gesturechange` event, we know it's a zoom gesture. We skip the disambiguation state machine entirely:

```typescript
const updatePinchState = (isSafariTrackpadPinch: boolean) => {
  if (isSafariTrackpadPinch) {
    pinchState = 'zooming'
  }

  if (pinchState === 'zooming') {
    return
  }

  // ... ambiguity resolution for touch screens
}
```

The distinction is invisible in the final experience, but without it, trackpad pinch-to-zoom would delay or misfire as the state machine tries to decide whether you're panning or zooming.

## Clipboard write: the synchronous requirement

Safari enforces a strict requirement for clipboard operations: you must create the `ClipboardItem` synchronously in the same tick as the user gesture that triggered the copy. If there's any async gap between the click and the clipboard write, Safari silently rejects the operation.

This is tracked as [WebKit bug 222262](https://bugs.webkit.org/show_bug.cgi?id=222262). The security model is reasonable—browsers need to verify that clipboard writes are genuinely user-initiated—but the implementation constraint is awkward.

Here's the problem. Preparing clipboard data often requires async work. You might need to serialize shapes, render them as an image, or compress the result. The natural structure would be:

```typescript
// This fails in Safari
async function copyShapes() {
  const textBlob = await serializeShapes()
  const imageBlob = await renderAsPNG()
  await navigator.clipboard.write([
    new ClipboardItem({
      'text/plain': textBlob,
      'image/png': imageBlob,
    })
  ])
}
```

But this doesn't work. By the time you call `navigator.clipboard.write`, you're no longer in the same tick as the user gesture. Safari sees no active user intent and rejects the write.

The solution is to create the `ClipboardItem` synchronously with promise-valued types, then let the promises resolve later:

```typescript
export function clipboardWrite(types: Record<string, Promise<Blob>>): Promise<void> {
  // Note: it's important that this function itself isn't async and doesn't really use promises -
  // we need to create the relevant `ClipboardItem`s and call navigator.clipboard.write
  // synchronously to make sure safari knows that the user _wants_ to copy See
  // https://bugs.webkit.org/show_bug.cgi?id=222262

  const entries = Object.entries(types)

  // clipboard.write will swallow errors if any of the promises reject. we log them here so we can
  // understand what might have gone wrong.
  for (const [_, promise] of entries) promise.catch((err) => console.error(err))

  return navigator.clipboard.write([new ClipboardItem(types)])
}
```

The function isn't async. It doesn't await anything. It creates the `ClipboardItem` with promises as values and immediately calls `navigator.clipboard.write`. The promises for the actual blob data resolve later, but the user intent is captured in that synchronous tick.

This works because the `ClipboardItem` constructor accepts promises. The browser understands that you're committing to provide the data, even though you haven't finished generating it yet. The key is that the commitment happens synchronously.

## The pattern

Safari workarounds follow a common pattern: check the browser, take a different code path, test obsessively. We detect Safari once at startup using user agent sniffing:

```typescript
if ('navigator' in window) {
  tlenv.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  tlenv.isIos = !!navigator.userAgent.match(/iPad/i) || !!navigator.userAgent.match(/iPhone/i)
  // ...
}
```

Then we branch on these flags throughout the codebase. Gesture handling checks for Safari's trackpad pinch events. Clipboard operations ensure synchronous construction. Text rendering disables shadows entirely on Safari because the compositor can't handle them at 60fps.

Some of these are WebKit bugs that might eventually get fixed. Others are architectural differences that won't change. Either way, the workarounds are here to stay.

## Source files

- `/packages/editor/src/lib/hooks/useGestureEvents.ts` - Pinch gesture detection and state machine
- `/packages/tldraw/src/lib/utils/clipboard.ts` - Synchronous clipboard write implementation
- `/packages/editor/src/lib/globals/environment.ts` - Browser detection
