# Shape culling

A canvas can contain thousands of shapes, but only a fraction are visible at any moment. Rendering all of them—including those far offscreen—would waste CPU cycles, DOM nodes, and battery life. tldraw "culls" shapes outside the viewport, but the implementation reveals some surprising decisions about what "visible" actually means.

## The naive approach fails

The obvious solution is to check each shape's bounding box against the viewport bounds. If they don't intersect, skip rendering. But this falls apart in several ways:

**Selected shapes must always render.** When you select a shape and pan it offscreen, its selection handles need to remain visible. If the shape itself doesn't render, you can't manipulate it.

**Shapes being edited must always render.** A text shape scrolled partially offscreen should keep its cursor position, focus state, and editing context. Culling it would destroy this state.

**Connected shapes are tricky.** An arrow connecting two shapes derives its geometry from the shapes it's bound to. When both boxes are offscreen, the arrow is offscreen. Move one box into view, and suddenly the arrow extends into the viewport. The arrow's cullability depends on its connected shapes, not just its own position.

**Bounding boxes lie.** A shape's bounds are an approximation. Shadows, strokes, and decorations can extend beyond them. The comment in the culling code acknowledges this:

```typescript
// If the shape is fully outside of the viewport page bounds, add it to the set.
// We'll ignore masks here, since they're more expensive to compute and the overhead is not worth it.
```

## How culling actually works

Culling in tldraw happens in two stages.

First, `notVisibleShapes` calculates which shapes are completely outside the viewport:

```typescript
function fromScratch(editor: Editor): Set<TLShapeId> {
  const viewportPageBounds = editor.getViewportPageBounds()
  const notVisibleShapes = new Set<TLShapeId>()

  shapesIds.forEach((id) => {
    const shape = editor.getShape(id)
    if (!shape) return

    const canCull = editor.getShapeUtil(shape.type).canCull(shape)
    if (!canCull) return

    const pageBounds = editor.getShapePageBounds(id)
    if (!viewportPageBounds.includes(pageBounds)) {
      notVisibleShapes.add(id)
    }
  })

  return notVisibleShapes
}
```

Then `getCulledShapes` takes this set and removes exceptions:

```typescript
getCulledShapes() {
  const notVisibleShapes = this.getNotVisibleShapes()
  const selectedShapeIds = this.getSelectedShapeIds()
  const editingId = this.getEditingShapeId()
  const culledShapes = new Set<TLShapeId>(notVisibleShapes)

  // we don't cull the shape we are editing
  if (editingId) {
    culledShapes.delete(editingId)
  }
  // we also don't cull selected shapes
  selectedShapeIds.forEach((id) => {
    culledShapes.delete(id)
  })

  return culledShapes
}
```

## Display none, not DOM removal

Culled shapes don't get removed from the DOM. They get `display: none`:

```typescript
useQuickReactor(
  'set display',
  () => {
    const culledShapes = editor.getCulledShapes()
    const isCulled = culledShapes.has(id)
    if (isCulled !== memoizedStuffRef.current.isCulled) {
      setStyleProperty(containerRef.current, 'display', isCulled ? 'none' : 'block')
      setStyleProperty(bgContainerRef.current, 'display', isCulled ? 'none' : 'block')
      memoizedStuffRef.current.isCulled = isCulled
    }
  },
  [editor]
)
```

This is deliberate. React component state lives in the DOM nodes. A text shape being edited has cursor position, selection range, and focus state. Removing and re-adding the DOM node would reset all of that. By using `display: none`, the node stays in the tree but doesn't participate in layout or painting.

## The arrow problem

Arrows demonstrate why culling can't be purely geometric. Consider an arrow connecting two boxes, both positioned 500 pixels offscreen. The arrow itself is offscreen—its start and end points are wherever the boxes are.

But arrows don't store their own coordinates. They're computed from bindings to other shapes. When you move one box into the viewport, the arrow's computed bounds suddenly span from inside the viewport to outside it. The arrow becomes partially visible.

This works automatically because `getShapePageBounds` for arrows depends on the positions of bound shapes. Move the boxes, and the arrow's bounds update. The culling check sees the new bounds, finds they intersect the viewport, and the arrow renders.

The test file demonstrates this:

```typescript
// Arrow connects to boxes at x=-500 and x=-1000 (outside viewport)
expect(editor.getCulledShapes()).toEqual(new Set([box1Id, box2Id, arrowId]))

// Move boxes inside viewport (x=100, x=200)
editor.updateShapes([
  { id: box1Id, type: 'geo', x: 100 },
  { id: box2Id, type: 'geo', x: 200 },
])

// Arrow automatically not culled because its bounds now include the connected boxes
expect(editor.getCulledShapes()).toEqual(new Set())
```

No special arrow logic needed. The binding system and computed geometry handle it.

## Opting out of culling

Some shapes should never be culled. A background shape that spans the entire canvas, a watermark that should always be visible, or a shape with visual effects extending far beyond its bounds.

Shape utils can override `canCull`:

```typescript
class UncullableShapeUtil extends BaseBoxShapeUtil<UncullableShape> {
  override canCull() {
    return false
  }
}
```

Shapes returning `false` from `canCull` are excluded from the culling set entirely, regardless of position.

## Incremental computation

The culling set is a computed signal, recalculated whenever the viewport or shapes change. But "recalculated" doesn't mean "recreated from scratch every frame."

```typescript
export function notVisibleShapes(editor: Editor) {
  return computed<Set<TLShapeId>>('notVisibleShapes', function updateNotVisibleShapes(prevValue) {
    const nextValue = fromScratch(editor)

    if (isUninitialized(prevValue)) return nextValue
    if (prevValue.size !== nextValue.size) return nextValue

    for (const prev of prevValue) {
      if (!nextValue.has(prev)) return nextValue
    }

    return prevValue  // No change, return same reference
  })
}
```

If the set hasn't changed—same size, same contents—the previous reference is returned. Downstream computations that depend on this set see no change and don't recompute. This matters because the culling set is checked frequently during rendering.

## What we don't do

There's no culling margin. Shapes are culled based on exact viewport bounds, not an expanded buffer zone. A shape one pixel outside the viewport is culled; bring it one pixel in, and it renders.

This is a deliberate simplicity tradeoff. A margin would catch shapes that are *almost* visible, reducing pop-in during fast pans. But it would also render more shapes than strictly necessary, and the complexity of tuning the margin for different screen sizes and zoom levels wasn't worth it. The rendering is fast enough that shapes appearing during pans isn't jarring.

We also don't check masks. A shape inside a frame might be clipped by the frame's bounds, making it invisible even though the shape itself is within the viewport. Calculating mask intersection is expensive, and the overhead of rendering a few technically-invisible shapes is less than the cost of checking every shape against every potential mask.

## Key files

- `packages/editor/src/lib/editor/derivations/notVisibleShapes.ts` — Core culling logic
- `packages/editor/src/lib/editor/Editor.ts` — `getCulledShapes` method that filters for selection and editing state
- `packages/editor/src/lib/components/Shape.tsx` — Display property toggling based on culling state
- `packages/editor/src/lib/editor/shapes/ShapeUtil.ts` — `canCull` override point
- `packages/tldraw/src/test/getCulledShapes.test.tsx` — Comprehensive culling tests
