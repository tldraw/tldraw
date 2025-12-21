---
title: Image level of detail
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - image
  - LOD
  - resolution
---

# Image level of detail

When we added image support to tldraw, we wanted images to load quickly. Drop a photo onto the canvas and it should appear immediately—no waiting. But we also didn't want to waste bandwidth. A 4000×3000 pixel photo displayed at thumbnail size doesn't need its full resolution.

The naive solution is straightforward: calculate the screen size of the image, request that resolution from the server. It works, but there's a problem. Pan and zoom the canvas and you're triggering dozens of resolution changes per second. Each change flickers the image as the new version loads. The browser cache helps, but you're still hammering the network with requests for resolutions you never actually need.

## The debouncing strategy

We solved this with a two-tier loading approach: the first load is immediate, subsequent loads are debounced.

When an image first appears on screen, we request its resolution right away. No debouncing, no delay—the image shows up fast. This is the UX win we wanted.

```typescript
// First load - immediate
resolveAssetUrl(editor, assetId, screenScale, exportInfo, (url) => resolve(asset, url))
```

But once that first resolution is loaded, we track that fact with a ref:

```typescript
const didAlreadyResolve = useRef(false)
```

If the screen scale changes again—zooming in, zooming out, moving the camera—we don't request the new resolution immediately. Instead we wait 500ms.

```typescript
if (didAlreadyResolve.current) {
  let tick = 0

  const resolveAssetAfterAWhile = () => {
    tick++
    if (tick > 500 / 16) {
      // debounce for 500ms
      resolveAssetUrl(editor, assetId, screenScale, exportInfo, (url) => resolve(asset, url))
      cancelDebounceFn?.()
    }
  }

  cancelDebounceFn?.()
  editor.on('tick', resolveAssetAfterAWhile)
  cancelDebounceFn = () => editor.off('tick', resolveAssetAfterAWhile)
}
```

The debounce is implemented using the editor's tick events. The editor emits `tick` on every animation frame—roughly 60fps, or about 16ms per tick. We count ticks until we hit 500ms worth: `tick > 500 / 16` evaluates to `tick > 31.25`, so we wait about 32 ticks.

If the camera moves again during those 500ms, the event listener is canceled and re-registered, resetting the counter. The resolution change only happens after the user stops moving for half a second.

## Power-of-two stepping

We can't request arbitrary resolutions for every possible zoom level—you'd end up with hundreds of unique URLs that never hit the browser cache. Instead we snap screen scales to powers of two:

```typescript
const zoomStepFunction = (zoom: number) => Math.pow(2, Math.ceil(Math.log2(zoom)))
const steppedScreenScale = zoomStepFunction(screenScale)
```

This maps any zoom level to the next-higher power of two:

- 0.10 → 0.125 (2^-3)
- 0.13 → 0.25 (2^-2)
- 0.73 → 1 (2^0)
- 1.5 → 2 (2^1)

You zoom from 0.5× to 0.6×, both map to the same resolution. You zoom from 0.6× to 0.7×, still the same resolution. You cross 0.75× and it jumps to the next step. This drastically reduces the number of unique image URLs, improving cache hit rates.

Combined with the 500ms debounce, this means resolution changes only happen when you've moved enough to cross a power-of-two boundary _and_ stopped moving for half a second.

## Camera state for dense canvases

The debouncing logic works well for individual images, but when you have hundreds of images on screen, there's another problem: every camera movement recalculates screen scales for every image, even though the zoom level hasn't changed.

For dense canvases—above 500 shapes—we use a cached zoom level while the camera is moving:

```typescript
@computed getEfficientZoomLevel() {
  return this._getAboveDebouncedZoomThreshold()
    ? this.getDebouncedZoomLevel()
    : this.getZoomLevel()
}
```

The debounced zoom level checks the camera state. If the camera is idle, it returns the current zoom. If the camera is moving, it returns a cached value captured when movement started:

```typescript
@computed getDebouncedZoomLevel() {
  if (this.options.debouncedZoom) {
    if (this.getCameraState() === 'idle') {
      return this.getZoomLevel()
    } else {
      return this._debouncedZoomLevel.get()
    }
  }

  return this.getZoomLevel()
}
```

The camera state transitions to `moving` when panning or zooming starts, and returns to `idle` after 64ms of no activity:

```typescript
private _tickCameraState() {
  // always reset the timeout
  this._cameraStateTimeoutRemaining = this.options.cameraMovingTimeoutMs
  // If the state is idle, then start the tick
  if (this._cameraState.__unsafe__getWithoutCapture() !== 'idle') return
  this._cameraState.set('moving')
  this._debouncedZoomLevel.set(unsafe__withoutCapture(() => this.getCamera().z))
  this.on('tick', this._decayCameraStateTimeout)
}

private _decayCameraStateTimeout(elapsed: number) {
  this._cameraStateTimeoutRemaining -= elapsed
  if (this._cameraStateTimeoutRemaining > 0) return
  this.off('tick', this._decayCameraStateTimeout)
  this._cameraState.set('idle')
}
```

This prevents hundreds of components from recalculating screen scales on every animation frame during camera movement. For canvases with fewer than 500 shapes, the overhead is small enough that we skip this optimization and always use the live zoom level.

## The tradeoff

The 500ms debounce is a compromise. Shorter and you upgrade resolution faster, but you also make more network requests and see more flickering. Longer and you reduce network churn, but users see lower-resolution images for longer after they stop panning.

We picked 500ms because it feels right. Stop moving the canvas and half a second later the image snaps to a crisper version. It's noticeable, but not frustrating. And during active panning, you're not hammered with resolution changes that would never finish loading anyway.

The power-of-two stepping compounds this benefit. Most zoom changes don't cross a power-of-two boundary, so they don't trigger resolution changes at all. You can zoom smoothly from 0.5× to 0.7× and the image stays at the 1× resolution step the whole time.

For dense canvases, the cached zoom level keeps reactive recalculations from dragging down frame rates. You can pan a canvas with 1000 images and the screen scale logic only runs when the camera stops moving, not on every frame.

## Where this lives

The debouncing logic is in `packages/tldraw/src/lib/shapes/shared/useImageOrVideoAsset.ts`, which handles resolution selection for both image and video shapes.

The efficient zoom level calculation is in `packages/editor/src/lib/editor/Editor.ts`, along with the camera state management that determines when to use the cached zoom.

The threshold values—500 shapes for debounced zoom, 64ms for camera idle timeout, 500ms for resolution debouncing—are configured in `packages/editor/src/lib/options.ts`.
