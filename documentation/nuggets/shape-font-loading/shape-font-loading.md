---
title: Microtask batching for font loading
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - shape
  - font
  - loading
---

# Microtask batching for font loading

When dozens of text shapes mount simultaneously during document load, each requests fonts independently. Without coordination, you create duplicate `FontFace` objects, trigger redundant network requests, and fire separate state updates for each shape—causing visible flicker as shapes pop in one by one.

Tldraw solves this with microtask batching: accumulate all font requests synchronously during React's render pass, then load them together in a single batch. The trick is `queueMicrotask`, which runs after all synchronous code completes but before the browser yields control. This timing lets you see every request before processing any of them.

## The render coordination problem

React renders all components in a single synchronous burst. When shapes mount and each requests fonts, there's no natural pause to deduplicate:

```typescript
// Each shape mounts and requests fonts
useEffect(() => {
	const fonts = getFontsForShape(shape)
	fonts.forEach((font) => loadFont(font)) // Duplicate work
}, [shape])
```

Even if `loadFont` checks whether a font is already loading, you still trigger multiple state updates—one per shape. Shape A's font finishes loading, causing a re-render. Then shape B's, then C's. The cascade creates flicker.

You need to batch the requests before any loading begins, but all the `useEffect` calls happen synchronously in the same event loop tick.

## Microtask timing

The JavaScript event loop schedules work in three phases:

1. **Synchronous code** - Runs immediately in the current task
2. **Microtasks** - Run after synchronous code, before the next task
3. **Tasks** (setTimeout, setImmediate) - Run in future event loop iterations

`queueMicrotask` schedules work to run after all synchronous code completes, but before the browser yields. This is the perfect moment to process accumulated requests.

Here's tldraw's `FontManager.requestFonts`:

```typescript
// packages/editor/src/lib/editor/managers/FontManager/FontManager.ts
private fontsToLoad = new Set<TLFontFace>()

requestFonts(fonts: TLFontFace[]) {
  if (!this.fontsToLoad.size) {
    queueMicrotask(() => {
      const toLoad = this.fontsToLoad
      this.fontsToLoad = new Set()
      transact(() => {
        for (const font of toLoad) {
          this.ensureFontIsLoaded(font)
        }
      })
    })
  }
  for (const font of fonts) {
    this.fontsToLoad.add(font)
  }
}
```

The first call schedules a microtask, then adds its fonts to the set. Subsequent calls during the same synchronous execution skip scheduling (the set already has items) and just add fonts. The `Set` naturally deduplicates.

When synchronous code finishes, the microtask processes every accumulated font in one batch. The `transact` wrapper groups all state updates from font loading into a single notification, so dependent components re-render once instead of cascading.

## How shapes request fonts

Each shape component sets up font tracking on mount using a reactive effect:

```typescript
// packages/editor/src/lib/components/Shape.tsx
useEffect(() => {
	return react('load fonts', () => {
		const fonts = editor.fonts.getShapeFontFaces(id)
		editor.fonts.requestFonts(fonts)
	})
}, [editor, id])
```

The `react()` wrapper makes this effect reactive—it automatically re-runs if the shape's props change. Change text from regular to bold, and the effect requests the bold font variant. All these font requests accumulate in the same set and process together in the microtask.

Each shape type implements `getFontFaces` to declare its font requirements:

```typescript
// packages/tldraw/src/lib/shapes/text/TextShapeUtil.tsx
override getFontFaces(shape: TLTextShape) {
  return getFontsFromRichText(this.editor, shape.props.richText, {
    family: `tldraw_${shape.props.font}`,
    weight: 'normal',
    style: 'normal',
  })
}
```

The `getFontsFromRichText` function walks rich text structure looking for formatting marks (bold, italic) and returns the specific font faces needed. A text shape with mixed bold and italic text returns three fonts—normal, bold, and italic variants—but each font is only loaded once across all shapes.

## Reactive font state tracking

The `FontManager` tracks each font's loading state (loading, ready, or error) in a reactive map. When a font transitions to ready, dependent shapes automatically re-render:

```typescript
// packages/editor/src/lib/editor/managers/FontManager/FontManager.ts
ensureFontIsLoaded(font: TLFontFace): Promise<void> {
  const existingState = this.getFontState(font)
  if (existingState) return existingState.loadingPromise

  const instance = this.findOrCreateFontFace(font)
  const state: FontState = {
    state: 'loading',
    instance,
    loadingPromise: instance
      .load()
      .then(() => {
        document.fonts.add(instance)
        this.fontStates.update(font, (s) => ({ ...s, state: 'ready' }))
      })
      .catch((err) => {
        console.error(err)
        this.fontStates.update(font, (s) => ({ ...s, state: 'error' }))
      }),
  }

  this.fontStates.set(font, state)
  return state.loadingPromise
}
```

The `fontStates.update` call triggers reactive updates. Because fonts are batched and loaded together, multiple shapes get a single combined update when their shared fonts finish loading. No cascading renders, no flicker.

## Computed caching for font requirements

The `FontManager` uses a computed cache to memoize each shape's font requirements:

```typescript
this.shapeFontFacesCache = editor.store.createComputedCache(
	'shape font faces',
	(shape: TLShape) => {
		const shapeUtil = this.editor.getShapeUtil(shape)
		return shapeUtil.getFontFaces(shape)
	},
	{
		areResultsEqual: areArraysShallowEqual,
		areRecordsEqual: (a, b) => a.props === b.props && a.meta === b.meta,
	}
)
```

The `areRecordsEqual` optimization is crucial. It tells the cache to only recompute fonts when `props` or `meta` change. Moving a shape (which changes `x` and `y`) doesn't re-query its fonts. This matters because `getFontFaces` can be expensive for rich text with many formatting marks, and it prevents unnecessary churn in the batching system.

## Why explicit font loading matters

CSS `@font-face` rules load fonts lazily when the browser first encounters text using that font family. This sounds convenient but creates problems:

**Text measurement timing:** tldraw measures text to determine shape bounds. If measurement happens before fonts load, you get incorrect dimensions. The text jumps when the font arrives, breaking layout.

**Export consistency:** when exporting to SVG or PNG, fonts must be loaded and embedded. CSS `@font-face` provides no API to wait for specific fonts to be ready.

**Reactive integration:** shapes need to know when their fonts are ready to trigger re-renders at the right time. The browser's font loading events are page-global, not tied to specific fonts.

By managing font loading explicitly with the batching pattern, tldraw measures text with correct fonts, embeds fonts in exports reliably, and integrates font readiness into the reactive render cycle.

## When microtask batching breaks down

Microtask batching assumes all requests arrive during a single synchronous execution. If fonts are requested asynchronously—after awaiting a promise or in a setTimeout callback—they miss the batch. Each async request schedules its own microtask, defeating the purpose.

This is fine for tldraw's use case. Shapes mount synchronously during React's render pass, so all font requests arrive together. But if you're loading shapes asynchronously (fetching from an API, for example), you'd either need to batch at a different level or accept that late arrivals load independently.

The pattern also delays processing by one microtask. For fonts, this is negligible—network time dominates. But if immediate execution matters, batching adds unwanted latency.

Despite these constraints, microtask batching is remarkably effective for its specific problem: coordinating duplicate synchronous requests. One timing trick eliminates redundant work and flicker.

## Key files

- `packages/editor/src/lib/editor/managers/FontManager/FontManager.ts` — Core batching and state management
- `packages/editor/src/lib/components/Shape.tsx` — Reactive font tracking per shape (lines 46-51)
- `packages/editor/src/lib/editor/shapes/ShapeUtil.ts` — Base `getFontFaces` method
- `packages/tldraw/src/lib/shapes/text/TextShapeUtil.tsx` — Example font declaration for text shapes
- `packages/tldraw/src/lib/shapes/shared/defaultFonts.tsx` — Default font face definitions
- `packages/editor/src/lib/utils/richText.ts` — `getFontsFromRichText` for extracting fonts from rich text
