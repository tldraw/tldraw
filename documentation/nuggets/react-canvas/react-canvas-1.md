---
title: React as a canvas renderer
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - react
  - DOM
  - canvas
---

# React as a canvas renderer

Most infinite canvas applications use WebGL or Canvas2D with custom renderers that draw everything to a bitmap. We use React and native DOM elements instead. Every shape on the canvas is a real DOM node, positioned with CSS transforms.

This is unusual. It means we can't use canvas-specific optimizations like dirty regions or sprite batching. But it gives us something more valuable: extensibility. Third-party shapes get the full React ecosystem, native text editing, iframes that work without custom implementations, and standard browser DevTools.

The tradeoff is worth it for our goals. We built tldraw to be extended, and React's component model fits that better than a custom rendering API.

## Two-stage rendering

Shapes render in two stages. The first stage positions the container—transform, width, height, and clip path. The second stage renders the content inside.

This split exists because positioning happens more frequently than content changes. When you drag a shape, only the container updates. The content inside doesn't re-render unless the shape's props change.

### Stage 1: Container positioning

We use `useQuickReactor` for container updates. This is a hook that runs effects immediately, without batching or throttling. When a shape's transform changes, the container updates synchronously:

```typescript
useQuickReactor(
  'set shape stuff',
  () => {
    const shape = editor.getShape(id)
    if (!shape) return

    const pageTransform = editor.getShapePageTransform(id)
    const transform = Mat.toCssString(pageTransform)

    if (transform !== prev.transform) {
      setStyleProperty(containerRef.current, 'transform', transform)
      prev.transform = transform
    }

    const bounds = editor.getShapeGeometry(shape).bounds
    const width = Math.max(bounds.width, 1)
    const height = Math.max(bounds.height, 1)

    if (width !== prev.width || height !== prev.height) {
      setStyleProperty(containerRef.current, 'width', width + 'px')
      setStyleProperty(containerRef.current, 'height', height + 'px')
      prev.width = width
      prev.height = height
    }
  },
  [editor]
)
```

The previous values are stored in a ref. We only touch the DOM when something actually changed. This matters because calling `element.style.setProperty` is cheap, but not free—avoiding unnecessary calls helps when you have hundreds of shapes.

The minimum dimensions are 1px. Browsers won't render an element with zero width or height, so shapes with degenerate bounds would disappear without this.

### Stage 2: Content rendering

Shape content uses `React.memo` with a custom equality check:

```typescript
export const InnerShape = memo(
  function InnerShape<T extends TLShape>({ shape, util }: { shape: T; util: ShapeUtil<T> }) {
    return useStateTracking(
      'InnerShape:' + shape.type,
      () => util.component(util.editor.store.unsafeGetWithoutCapture(shape.id) as T),
      [util, shape.id]
    )
  },
  (prev, next) => areShapesContentEqual(prev.shape, next.shape) && prev.util === next.util
)
```

The equality function compares props and meta by reference:

```typescript
export const areShapesContentEqual = (a: TLShape, b: TLShape) =>
  a.props === b.props && a.meta === b.meta
```

This works because props and meta are immutable. If you change a shape's color, you get a new props object. Reference equality is sufficient.

## Camera transform

The entire shapes layer transforms via CSS. Panning and zooming don't touch individual shapes—they just change one transform on the parent container:

```typescript
useQuickReactor(
  'position layers',
  function positionLayersWhenCameraMoves() {
    const { x, y, z } = editor.getCamera()

    const offset =
      z >= 1
        ? modulate(z, [1, 8], [0.125, 0.5], true)
        : modulate(z, [0.1, 1], [-2, 0.125], true)

    const transform = `scale(${toDomPrecision(z)}) translate(${toDomPrecision(
      x + offset
    )}px,${toDomPrecision(y + offset)}px)`

    setStyleProperty(rHtmlLayer.current, 'transform', transform)
  },
  [editor, container]
)
```

The offset calculation compensates for the 1px container size to ensure pixel-perfect alignment at different zoom levels. Without this, you'd see subpixel shifts as you zoom.

`toDomPrecision` rounds to four decimal places. CSS transforms with more precision don't render differently, but they make style attribute strings longer. Four decimals is enough for smooth animation without bloating the DOM.

## Stable DOM order

Shapes render in the same DOM order every frame, sorted by ID. The visual stacking order comes from CSS `z-index`, not DOM position.

This matters for iframes. Moving an element in the DOM causes React to unmount and remount it. Iframes reload when remounted, which is both slow and annoying—imagine an embedded YouTube video restarting every time you reorder layers.

By always sorting by ID, shapes stay in the same DOM position. We calculate z-index values based on the visual stacking order, so shapes with lower indices appear in front without DOM reordering:

```typescript
@computed getRenderingShapes() {
  const renderingShapes = this.getUnorderedRenderingShapes(true)

  // Its IMPORTANT that the result be sorted by id AND include the index
  // that the shape should be displayed at. Steve, this is the past you
  // telling the present you not to change this.

  return renderingShapes.sort(sortById)
}
```

The z-index space starts at 8000 for foreground shapes and 4000 for background shapes. When a shape provides a background for children (like a frame), we allocate another 4000-unit layer for nested content. This gives us room for thousands of shapes without running out of z-index space.

## Viewport culling

Shapes outside the viewport set `display: none`. This prevents the browser from painting them, which matters when you have thousands of shapes on a large canvas.

The culling calculation runs in a computed signal. It checks every shape's bounds against the viewport:

```typescript
function fromScratch(editor: Editor): Set<TLShapeId> {
  const shapesIds = editor.getCurrentPageShapeIds()
  const viewportPageBounds = editor.getViewportPageBounds()
  const notVisibleShapes = new Set<TLShapeId>()

  shapesIds.forEach((id) => {
    const shape = editor.getShape(id)
    if (!shape) return

    const canCull = editor.getShapeUtil(shape.type).canCull(shape)
    if (!canCull) return

    const pageBounds = editor.getShapePageBounds(id)
    if (pageBounds === undefined || !viewportPageBounds.includes(pageBounds)) {
      notVisibleShapes.add(id)
    }
  })

  return notVisibleShapes
}
```

The computed signal returns the previous Set object if contents haven't changed. This prevents unnecessary re-renders—if the same shapes are culled between frames, dependent components don't update.

Selected shapes and the shape being edited are never culled, even if they're offscreen. You need to see what you're working on.

## Reactivity

We use a custom signals library instead of React state. Signals are fine-grained reactive values—when one changes, only the components that depend on it re-render.

This matters for performance. In a naive React implementation, moving one shape would cause the parent to re-render, which would reconcile all its children. With signals, moving one shape only updates that shape's container.

Three hooks handle reactivity:

**useValue**: Subscribes to a signal and returns its current value. Uses React 18's `useSyncExternalStore` for subscription management:

```typescript
const renderingShapes = useValue('rendering shapes', () => editor.getRenderingShapes(), [editor])
```

**useStateTracking**: Wraps a render function in a reactive tracking context. The component re-renders when any signals it reads change:

```typescript
return useStateTracking(
  'InnerShape:' + shape.type,
  () => util.component(shape),
  [util, shape.id]
)
```

**useQuickReactor**: Runs effects immediately when dependencies change. No throttling, no animation frame. This is what we use for container positioning:

```typescript
useQuickReactor(
  'set display',
  () => {
    const isCulled = editor.getCulledShapes().has(id)
    setStyleProperty(containerRef.current, 'display', isCulled ? 'none' : 'block')
  },
  [editor]
)
```

There's also `useReactor`, which throttles effects to the next animation frame. We don't use it for positioning because we want immediate updates.

## Performance characteristics

Direct DOM manipulation avoids React reconciliation for positioning. Only content changes trigger React re-renders.

Fine-grained reactivity prevents cascading updates. Moving one shape doesn't re-render others.

CSS transforms leverage the GPU compositor. The browser handles visual updates without reflow.

The culling computation reuses Set objects when possible. If the same shapes are culled between frames, the computed signal returns the same reference.

These optimizations add up. We can render thousands of shapes at 60fps on a laptop.

## Why not canvas?

The HTML canvas element is fast. Drawing to a bitmap lets you use dirty regions, sprite batching, and other optimizations that aren't possible with DOM.

But canvas is a black box. You can't use native text selection, native accessibility, or browser DevTools to inspect what you drew. Custom shapes need to implement their own rendering logic instead of using React components.

For a closed system, that's fine. For an extensible SDK, it's a problem. We want third-party developers to bring their own components, use existing React libraries, and embed arbitrary HTML. The DOM makes that straightforward.

The performance tradeoff is real—we can't use some canvas-specific optimizations. But we found that with careful optimization, React and DOM are fast enough for an infinite canvas. The extensibility we gain is worth more than the performance we give up.

## Related files

- `/packages/editor/src/lib/components/Shape.tsx` - Two-stage shape rendering
- `/packages/editor/src/lib/components/default-components/DefaultCanvas.tsx` - Canvas structure and camera positioning
- `/packages/state-react/src/lib/useStateTracking.ts` - Reactive render tracking
- `/packages/state-react/src/lib/useQuickReactor.ts` - Immediate reactive effects
- `/packages/editor/src/lib/editor/derivations/notVisibleShapes.ts` - Viewport culling
- `/packages/editor/src/lib/editor/Editor.ts` - getRenderingShapes, getCulledShapes
