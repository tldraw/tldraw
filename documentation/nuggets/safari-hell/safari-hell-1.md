---
title: Safari quirks and workarounds
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - Safari
  - browser
  - workarounds
---

When building a canvas application that works across browsers, you quickly learn that Safari has its own set of quirks. Some are performance problems, others are rendering bugs that don't appear in Chrome or Firefox. We've built workarounds for the most significant ones, but they're worth documenting—both as reference and as a reminder of the browser landscape we're working in.

## Text shadows kill Safari performance

Text shapes in tldraw have a subtle shadow by default—a small CSS text-shadow that helps them stand out against busy backgrounds. It's a minor visual detail, but it has major performance implications on Safari.

In Chrome or Firefox, you can have dozens of text shapes with shadows on screen and maintain 60fps during camera movement. Safari drops to around 20fps with the same scene. The difference is dramatic enough that text shadows feel unusable.

The problem isn't with rendering static text—Safari handles that fine. The issue is when those shadowed text elements move during panning or zooming. Safari's compositor doesn't batch or optimize text shadows the way Chrome's does, so every moving text shape becomes an expensive layer.

We disable text shadows completely on Safari:

```typescript
// DefaultCanvas.tsx
const rMemoizedStuff = useRef({ lodDisableTextOutline: false, allowTextOutline: true })

useQuickReactor(
  'position layers',
  function positionLayersWhenCameraMoves() {
    const { x, y, z } = editor.getCamera()

    // This should only run once on first load
    if (rMemoizedStuff.current.allowTextOutline && tlenv.isSafari) {
      container.style.setProperty('--tl-text-outline', 'none')
      rMemoizedStuff.current.allowTextOutline = false
    }

    // And this should only run if we're not in Safari;
    // If we're below the lod distance for text shadows, turn them off
    if (
      rMemoizedStuff.current.allowTextOutline &&
      z < editor.options.textShadowLod !== rMemoizedStuff.current.lodDisableTextOutline
    ) {
      const lodDisableTextOutline = z < editor.options.textShadowLod
      container.style.setProperty(
        '--tl-text-outline',
        lodDisableTextOutline ? 'none' : `var(--tl-text-outline-reference)`
      )
      rMemoizedStuff.current.lodDisableTextOutline = lodDisableTextOutline
    }
    // ... camera transform logic
  },
  [editor, container]
)
```

On Safari, we set `allowTextOutline` to false immediately, which removes text shadows for the entire session. On other browsers, we use a level-of-detail optimization—text shadows get disabled when zoomed out below a threshold (default 0.35), where they're less visible anyway.

The CSS custom property `--tl-text-outline` controls the shadow. Setting it to `none` disables shadows; setting it to `var(--tl-text-outline-reference)` restores them. This approach lets us toggle shadows without re-rendering components.

The performance difference is too large to ignore. Chrome users get the visual polish of text shadows; Safari users get smooth 60fps panning. That's the tradeoff.

## The culled element viewport bug

Tldraw culls shapes that are outside the viewport—they're marked with `display: none` to avoid rendering work. This is a standard performance optimization. Chrome and Firefox handle this correctly, but Safari has a repaint bug.

The problem: when a culled element returns to the viewport, Safari doesn't always invalidate its cached render state. The element is present in the DOM with the correct styles (`display: block`), but Safari doesn't paint it. It remains invisible until something else triggers a reflow—scrolling, resizing, or another layout change.

This creates a bad user experience. You pan away from a shape, pan back, and it's missing. Pan a bit more and it suddenly appears.

The fix is to force a reflow whenever the set of culled shapes changes. Reading `offsetHeight` on an element forces the browser to perform a synchronous layout calculation, which triggers Safari to repaint:

```typescript
// DefaultCanvas.tsx
function ReflowIfNeeded() {
  const editor = useEditor()
  const culledShapesRef = useRef<Set<TLShapeId>>(new Set())

  useQuickReactor(
    'reflow for culled shapes',
    () => {
      const culledShapes = editor.getCulledShapes()
      if (
        culledShapesRef.current.size === culledShapes.size &&
        [...culledShapes].every((id) => culledShapesRef.current.has(id))
      )
        return

      culledShapesRef.current = culledShapes
      const canvas = document.getElementsByClassName('tl-canvas')
      if (canvas.length === 0) return

      // This causes a reflow
      // https://gist.github.com/paulirish/5d52fb081b3570c81e3a
      const _height = (canvas[0] as HTMLDivElement).offsetHeight
    },
    [editor]
  )
  return null
}
```

The component tracks which shapes are culled in a ref. When that set changes—either in size or contents—we access `offsetHeight` on the canvas element. The result is unused; we're just reading it to trigger the side effect.

Paul Irish maintains a [gist of properties that trigger reflow](https://gist.github.com/paulirish/5d52fb081b3570c81e3a). Reading any layout property will do it: `offsetHeight`, `offsetWidth`, `clientHeight`, `getBoundingClientRect()`, etc. We use `offsetHeight` because it's concise and obvious.

This component only renders on Safari:

```typescript
{tlenv.isSafari && <ReflowIfNeeded />}
```

Chrome and Firefox don't need it. Their rendering engines handle DOM visibility changes correctly without manual intervention.

## Why this matters

These aren't edge cases—they're core interactions. Panning with text on screen, shapes moving in and out of view. In a canvas application, these happen constantly. A 20fps pan or invisible shapes breaks the experience.

The workarounds are pragmatic rather than elegant. Disabling text shadows is a permanent visual compromise for Safari users. Forcing reflows adds overhead that Chrome and Firefox don't need. But the alternative is worse: unusable performance or broken rendering.

Safari's market share means we can't ignore these issues. We detect the browser, apply the workarounds, and move on. It works.

## Source files

- `/packages/editor/src/lib/globals/environment.ts` - Browser detection via user agent
- `/packages/editor/src/lib/components/default-components/DefaultCanvas.tsx:53-78` - Text shadow disable logic
- `/packages/editor/src/lib/components/default-components/DefaultCanvas.tsx:408-431` - ReflowIfNeeded component
- `/packages/editor/src/lib/options.ts:144` - textShadowLod constant (0.35)
- [Paul Irish's reflow-triggering properties](https://gist.github.com/paulirish/5d52fb081b3570c81e3a)
