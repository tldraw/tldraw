# Shape font loading with microtask batching

When a tldraw document loads with many text shapes, each shape needs its fonts. The naive approach—request fonts as each shape renders—creates a cascade of duplicate network requests. Ten sticky notes using the same handwriting font would fire ten separate font loads. This nugget explains how tldraw batches font requests using `queueMicrotask` to ensure each font is loaded exactly once, no matter how many shapes need it.

## The synchronous render problem

React renders all shapes in a single synchronous pass. When each shape mounts, it asks "what fonts do I need?" and triggers a request. Since these all happen in the same call stack, there's no opportunity to deduplicate. The browser's `FontFace` API would handle duplicate requests eventually (same URL means same cached response), but we'd still create redundant `FontFace` objects and fire redundant load calls.

More importantly, shapes need to re-render when their fonts finish loading. If ten shapes each independently track their font's loading state, you get ten separate re-render triggers instead of one coordinated update. The canvas flickers as shapes pop in one by one.

## The queueMicrotask batching trick

The solution exploits a timing quirk: `queueMicrotask` schedules work to run after the current synchronous code completes, but before the browser yields to other tasks. All the synchronous font requests from all shapes pile up, then a single microtask processes them in batch.

```typescript
// packages/editor/src/lib/editor/managers/FontManager/FontManager.ts
private fontsToLoad = new Set<TLFontFace>()

requestFonts(fonts: TLFontFace[]) {
	if (!this.fontsToLoad.size) {
		queueMicrotask(() => {
			if (this.editor.isDisposed) return
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

The first call to `requestFonts` schedules the microtask. Subsequent calls during the same synchronous execution just add to the `Set`—the `Set` naturally deduplicates identical font requests. When the microtask fires, it processes all accumulated fonts at once.

The `transact` wrapper groups the state updates from all font loads into a single reactive notification. This way, shapes that depend on font loading state get one combined update instead of many individual ones.

## How shapes declare their fonts

Each shape type implements `getFontFaces` to declare what fonts it needs:

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

The `getFontsFromRichText` function walks the rich text structure looking for formatting marks (bold, italic) and returns the specific font faces needed. A text shape with mixed bold and italic text might return three different fonts—normal, bold, and italic variants.

## Reactive font tracking

The Shape component sets up font tracking on mount:

```typescript
// packages/editor/src/lib/components/Shape.tsx
useEffect(() => {
	return react('load fonts', () => {
		const fonts = editor.fonts.getShapeFontFaces(id)
		editor.fonts.requestFonts(fonts)
	})
}, [editor, id])
```

This reactive effect does two things. First, it requests the fonts the shape needs. Second, because it runs inside `react()`, it automatically re-runs if the shape's props change—for instance, if you change text from regular to bold, the effect re-runs and requests the bold font variant.

## The font state machine

Each font goes through three states: loading, ready, or error. The `FontManager` tracks this using an `AtomMap`, a reactive map where changes trigger dependent computations:

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

When a font transitions to ready, `fontStates.update` triggers reactive updates throughout the system. Shapes that depend on that font's state re-render, now with the correct font instead of a fallback.

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

The `areRecordsEqual` optimization is crucial. It tells the cache to only recompute a shape's fonts when `props` or `meta` change. Moving a shape (which changes `x` and `y`) doesn't re-query its fonts. This matters because `getFontFaces` can be expensive for rich text with many formatting marks.

## Why not just use CSS @font-face?

CSS `@font-face` rules load fonts lazily when the browser first encounters text using that font family. This sounds perfect, but creates problems:

1. **Text measurement timing**: tldraw measures text to determine shape bounds. If measurement happens before fonts load, you get incorrect dimensions. The text then jumps when the font arrives.

2. **Export consistency**: when exporting to SVG or PNG, we need fonts loaded and embedded. CSS `@font-face` provides no API to wait for specific fonts.

3. **Reactive integration**: shapes need to know when their fonts are ready to trigger re-renders. The browser's font loading events are page-global, not tied to specific fonts.

By managing font loading explicitly, tldraw can measure text with the correct fonts, embed fonts in exports reliably, and integrate font readiness into the reactive render cycle.

## Key files

- `packages/editor/src/lib/editor/managers/FontManager/FontManager.ts` — Core batching and state management
- `packages/editor/src/lib/components/Shape.tsx` — Reactive font tracking per shape
- `packages/editor/src/lib/editor/shapes/ShapeUtil.ts` — Base `getFontFaces` method
- `packages/tldraw/src/lib/shapes/text/TextShapeUtil.tsx` — Example font declaration for text shapes
- `packages/tldraw/src/lib/shapes/shared/defaultFonts.tsx` — Default font face definitions
- `packages/editor/src/lib/utils/richText.ts` — `getFontsFromRichText` for extracting fonts from rich text
