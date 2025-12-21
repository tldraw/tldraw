---
title: Drag detection and thresholds
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - drag
  - pointer
  - input
  - threshold
  - zoom
---

# Drag detection and thresholds

A pointer down doesn't immediately mean a drag. The user might be clicking, long-pressing, or just about to drag. We need to wait until the pointer moves far enough to be confident it's a drag—but "far enough" depends on the input device and zoom level.

## The problem

On a touchscreen, your finger covers more pixels than a mouse cursor. If we treated a 2-pixel movement as a drag, every tap would become an unintended drag. But on a mouse, 2 pixels might be exactly what the user meant.

We also need to account for zoom. At 200% zoom, moving 4 screen pixels represents 2 pixels in document space. At 50% zoom, those same 4 screen pixels are 8 document pixels. The threshold needs to stay consistent regardless of how zoomed in you are.

## Squared distances

The drag detection code uses `Vec.Dist2`, which returns the squared distance between two points:

```typescript
Vec.Dist2(inputs.getOriginPagePoint(), inputs.getCurrentPagePoint())
```

This avoids the expensive `Math.sqrt` calculation. Instead of computing the actual distance and comparing it to a threshold, we compare the squared distance to a squared threshold. The math works out the same:

```
distance > threshold
↓
sqrt(dx² + dy²) > threshold
↓
dx² + dy² > threshold²
```

The drag thresholds are stored pre-squared:

```typescript
dragDistanceSquared: 16,         // 4 squared (mouse/precise pointer)
coarseDragDistanceSquared: 36,   // 6 squared (touch/coarse pointer)
```

## Device-specific thresholds

The drag detection picks the threshold based on whether we're using a coarse pointer:

```typescript
if (
  inputs.getIsPointing() &&
  !inputs.getIsDragging() &&
  Vec.Dist2(inputs.getOriginPagePoint(), inputs.getCurrentPagePoint()) *
    this.getZoomLevel() >
    (instanceState.isCoarsePointer
      ? this.options.coarseDragDistanceSquared
      : this.options.dragDistanceSquared) / cz
) {
  inputs.setIsDragging(true)
  clearTimeout(this._longPressTimeout)
}
```

Coarse pointers (touch, stylus) need 6 pixels of movement. Fine pointers (mouse, trackpad) only need 4. This prevents accidental drags on touch without making mouse interactions feel sluggish.

## Zoom compensation

The formula includes zoom compensation:

```typescript
distance * zoomLevel > threshold / cameraZoom
```

This keeps the threshold consistent in screen space. At 200% zoom, you need to move half as far in document space to trigger a drag. At 50% zoom, you need to move twice as far.

Without zoom compensation, dragging at high zoom levels would be frustrating—tiny movements would fail to register as drags. At low zoom levels, the opposite problem: accidental drags from small hand movements.

## UI element thresholds

UI elements use different thresholds because they're not affected by the canvas zoom:

```typescript
uiDragDistanceSquared: 16,          // 4 squared (UI elements)
uiCoarseDragDistanceSquared: 625,   // 25 squared (UI on mobile)
```

The mobile UI threshold is notably higher (25 pixels vs 6 pixels on the canvas). UI elements are typically smaller than canvas shapes, and the cost of an accidental drag in the UI is higher—you might close a panel or trigger an unwanted action. The extra cushion prevents UI interactions from feeling twitchy.

## Where this lives

Drag detection happens in the editor's pointer event processing loop at `packages/editor/src/lib/editor/Editor.ts:10572-10582`. The constants are defined in `packages/editor/src/lib/options.ts:117-122`.

The `InputsManager` tracks the origin point (where the pointer went down), current point, and dragging state. Once dragging is set to true, states like `PointingCanvas` transition to `Brushing`, and `PointingShape` transitions to `Translating`.

The squared distance optimization shows up throughout the codebase—anytime we need to compare distances, we use `Vec.Dist2` and compare against squared thresholds. It's a small performance win that adds up when you're checking distances 60 times per second during pointer movement.
