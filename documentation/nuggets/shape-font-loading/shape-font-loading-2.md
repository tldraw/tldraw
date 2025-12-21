---
title: Shape font loading - Reactive caching
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - shape
  - font
  - loading
  - cache
  - reactive
  - signals
---

# Shape font loading: Reactive caching

When shapes with text mount in tldraw, they need to load fonts. We cache which fonts each shape needs and track their loading state with a reactive system. The interesting part is how the caches work together and what triggers invalidation.

## Two-level computed cache

We use two separate computed caches to track font requirements and loading state:

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

The cache only recomputes when `props` or `meta` change. Moving a shape across the canvas doesn't invalidate the cache—position changes don't affect font requirements.

For tracking loading state, we use a second cache that wraps computed values:

```typescript
this.shapeFontLoadStateCache = editor.store.createCache<(FontState | null)[], TLShape>(
	(id: TLShapeId) => {
		const fontFacesComputed = computed('font faces', () => this.getShapeFontFaces(id))
		return computed(
			'font load state',
			() => {
				const states = fontFacesComputed.get().map((face) => this.getFontState(face))
				return states
			},
			{ isEqual: areArraysShallowEqual }
		)
	}
)
```

This creates nested computed values. The inner computed depends on both the font faces for the shape and the load state of each font. When either changes, dependent code re-runs.

## AtomMap for font state

Font loading state lives in an `AtomMap`:

```typescript
private readonly fontStates = new AtomMap<TLFontFace, FontState>('font states')
```

`AtomMap` is a reactive map from `@tldraw/store`. Each entry is an atom. When you update an entry, only code that depends on that specific font gets notified:

```typescript
this.fontStates.update(font, (s) => ({ ...s, state: 'ready' }))
```

This update triggers reactive effects that depend on this font's state. The font state cache notices the change and recomputes. Shapes that use this font see the new state and can remeasure or re-render.

## Avoiding position invalidation

The `areRecordsEqual` check is what makes position changes cheap:

```typescript
areRecordsEqual: (a, b) => a.props === b.props && a.meta === b.meta
```

We compare identity of `props` and `meta` objects, not their contents. When you move a shape, we create a new shape record but reuse the props object (only `x` and `y` are different, and those live on the shape record directly, not in props).

This means moving 100 text shapes doesn't invalidate 100 cache entries. The cache sees the same props object and returns the cached font list without calling `getFontFaces`.

## Reactive tracking for text measurement

Text measurement needs to know when fonts finish loading:

```typescript
const sizeCache = createComputedCache(
	'text size',
	(editor: Editor, shape: TLTextShape) => {
		editor.fonts.trackFontsForShape(shape)
		return getTextSize(editor, shape.props)
	},
	{ areRecordsEqual: (a, b) => a.props === b.props }
)
```

The `trackFontsForShape` call creates a reactive dependency on font state. When the font transitions from 'loading' to 'ready', the computed cache invalidates and text gets remeasured with the correct font.

Without this tracking, text would measure once with a fallback font and never update when the real font loads.

## Font state lifecycle

Font state transitions through three states: loading → ready (or error). The state is set when loading starts:

```typescript
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
```

The `update` calls trigger reactive updates. Code that called `trackFontsForShape` or depends on the font state cache sees the change and re-runs.

## Why this structure

The two-level cache structure keeps font requirements separate from loading state. Font requirements rarely change—only when props change. Loading state changes once per font (loading → ready).

If we cached both together, every font load would invalidate every shape's cache. With separate caches, loading a font only invalidates code that actually tracks font state, not code that just needs to know which fonts a shape uses.

The `AtomMap` enables fine-grained updates. When a font loads, only shapes that use that specific font get notified. Shapes using different fonts see no change and don't recompute.

## Where this lives

The font manager is in `/packages/editor/src/lib/editor/managers/FontManager/FontManager.ts`. Shape-specific font requirements live in each shape util—TextShapeUtil, GeoShapeUtil, ArrowShapeUtil—which override `getFontFaces`.

Rich text parsing that extracts fonts from markup is in `/packages/editor/src/lib/utils/richText.ts` and `/packages/tldraw/src/lib/utils/text/richText.ts`.

