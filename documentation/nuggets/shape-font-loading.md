# Coalescing async operations with microtask batching

When many components request the same async resource during a single render pass, you can end up with duplicate requests, redundant state updates, and UI flickering. The microtask batching pattern solves this by accumulating requests synchronously and processing them once in a single batch. This nugget shows how tldraw uses `queueMicrotask` to load fonts efficiently, but the pattern applies to any scenario where multiple components might trigger the same async work.

## The synchronous render problem

React renders all components in a single synchronous pass. When components mount simultaneously and each triggers an async operation, there's no natural opportunity to deduplicate. Consider loading a document with dozens of text shapes that all use the same handwriting font:

```typescript
// Each shape mounts and requests fonts
useEffect(() => {
	const fonts = getFontsForShape(shape)
	fonts.forEach((font) => loadFont(font)) // Duplicate requests!
}, [shape])
```

Every shape fires its own `loadFont` call. Even if you track loaded fonts to avoid redundant network requests, you still create multiple `FontFace` objects and trigger multiple state updates. The result is cascade rendering: shapes pop in one by one as each completes its independent font load, causing visible flicker.

The core issue is timing. All the synchronous render code executes in one burst, leaving no chance to see which fonts multiple shapes need and deduplicate before starting loads.

## Why queueMicrotask is perfect for batching

The JavaScript event loop has three phases where work can be scheduled:

1. **Synchronous code** - Runs immediately in the current task
2. **Microtasks** - Run after the current synchronous code, before the next task
3. **Tasks** (setTimeout, setImmediate) - Run in future event loop iterations

`queueMicrotask` schedules work to run after all synchronous code completes, but before the browser yields control. This timing is perfect for batching: collect requests synchronously, then process them all at once in a microtask.

Here's how tldraw's `FontManager` uses this pattern:

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

The first call to `requestFonts` schedules a microtask, then immediately adds its fonts to the set. Subsequent calls during the same synchronous execution skip scheduling (the set already has items) and just add their fonts. The `Set` naturally deduplicates identical font requests.

When all synchronous code finishes, the microtask runs and processes every accumulated font in one batch. The `transact` wrapper (from tldraw's reactive state library) groups all the state updates from font loading into a single notification, so dependent components re-render once instead of many times.

## Applying the pattern to other async operations

This pattern works for any async operation where multiple components might request the same resource:

**Image preloading:**

```typescript
private imagesToLoad = new Set<string>()

requestImage(url: string) {
  if (!this.imagesToLoad.size) {
    queueMicrotask(() => {
      const urls = this.imagesToLoad
      this.imagesToLoad = new Set()
      this.loadImagesInBatch(Array.from(urls))
    })
  }
  this.imagesToLoad.add(url)
}
```

**API data fetching:**

```typescript
private idsToFetch = new Set<string>()

requestEntity(id: string) {
  if (!this.idsToFetch.size) {
    queueMicrotask(() => {
      const ids = Array.from(this.idsToFetch)
      this.idsToFetch = new Set()
      // Batch API request for all IDs at once
      this.fetchEntitiesByIds(ids)
    })
  }
  this.idsToFetch.add(id)
}
```

**GraphQL query batching:**

```typescript
private pendingQueries = new Map<string, QueryConfig>()

query(config: QueryConfig) {
  if (!this.pendingQueries.size) {
    queueMicrotask(() => {
      const queries = Array.from(this.pendingQueries.values())
      this.pendingQueries = new Map()
      // Combine into a single GraphQL request
      this.executeBatchQuery(queries)
    })
  }
  this.pendingQueries.set(config.id, config)
}
```

The pattern is the same in all cases: check if the queue is empty (no microtask scheduled yet), schedule one if needed, add the current request to the queue, and let the microtask process everything in batch.

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

## The tradeoff: timing assumptions

Microtask batching assumes all requests happen in a single synchronous execution. If requests arrive asynchronously (after awaiting a promise, for example), you might batch some but miss others. This is fine for font loading during initial render, but wouldn't work if fonts were requested from async effects.

The pattern also adds a small delay (one microtask) before processing begins. For fonts, this is negligible—the network request dominates. For operations where immediate execution matters, you'd need a different approach.

Still, when you have multiple components triggering the same async work during synchronous execution, microtask batching is a simple, elegant solution. One small timing trick eliminates duplicate work and coordinates state updates.

## Key files

- `packages/editor/src/lib/editor/managers/FontManager/FontManager.ts` — Core batching and state management
- `packages/editor/src/lib/components/Shape.tsx` — Reactive font tracking per shape (lines 46-51)
- `packages/editor/src/lib/editor/shapes/ShapeUtil.ts` — Base `getFontFaces` method
- `packages/tldraw/src/lib/shapes/text/TextShapeUtil.tsx` — Example font declaration for text shapes
- `packages/tldraw/src/lib/shapes/shared/defaultFonts.tsx` — Default font face definitions
- `packages/editor/src/lib/utils/richText.ts` — `getFontsFromRichText` for extracting fonts from rich text
