---
title: Raw notes - Microtask batching for font loading
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - shape
  - font
  - loading
status: published
date: 12/21/2025
order: 3
---

# Raw notes: Microtask batching for font loading

## Core implementation files

### FontManager.ts

**Location**: `/packages/editor/src/lib/editor/managers/FontManager/FontManager.ts`

#### Key interfaces and types

**TLFontFaceSource** (lines 18-26):

```typescript
export interface TLFontFaceSource {
	url: string // URL from which to load the font
	format?: string
	tech?: string
}
```

**TLFontFace** (lines 34-77):
Main font descriptor matching CSS `@font-face` rule properties:

- `family`: string - CSS font-family name
- `src`: TLFontFaceSource - font source
- `ascentOverride?`: string
- `descentOverride?`: string
- `stretch?`: string
- `style?`: string (e.g., 'normal', 'italic')
- `weight?`: string (e.g., 'normal', 'bold')
- `featureSettings?`: string
- `lineGapOverride?`: string
- `unicodeRange?`: string

**FontState** (lines 79-83):

```typescript
interface FontState {
	readonly state: 'loading' | 'ready' | 'error'
	readonly instance: FontFace
	readonly loadingPromise: Promise<void>
}
```

#### Default font face descriptors (lines 244-254)

From CSS font loading spec:

```typescript
const defaultFontFaceDescriptors = {
	style: 'normal',
	weight: 'normal',
	stretch: 'normal',
	unicodeRange: 'U+0-10FFFF',
	featureSettings: 'normal',
	ascentOverride: 'normal',
	descentOverride: 'normal',
	lineGapOverride: 'normal',
}
```

#### Computed cache for shape font faces (lines 91-101)

Cache configuration:

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

**Cache optimization**: Only recomputes when `props` or `meta` change. Position changes (x, y) don't trigger recomputation.

#### Font load state tracking cache (lines 103-115)

Two-level computed structure:

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

#### Microtask batching implementation (lines 176-193)

```typescript
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

**Key details**:

- `fontsToLoad` is a `Set<TLFontFace>` for automatic deduplication
- First call schedules `queueMicrotask`, subsequent calls just add to set
- Editor disposal check: `if (this.editor.isDisposed) return`
- Set is replaced (not cleared) to avoid mutation during iteration
- All font loading wrapped in `transact()` for batched state updates

#### Font loading implementation (lines 152-174)

```typescript
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

**Implementation notes**:

- Returns existing promise for duplicate requests (deduplication)
- Uses browser's `FontFace.load()` API
- Adds to `document.fonts` after successful load
- State updates trigger reactive re-renders via `AtomMap.update()`
- Errors logged to console, state marked as 'error'

#### Font state storage (line 147)

```typescript
private readonly fontStates = new AtomMap<TLFontFace, FontState>('font states')
```

**AtomMap** from `@tldraw/store`: Reactive map where each entry is an atom. Updates trigger dependent computations.

#### Font face creation/reuse (lines 195-216)

```typescript
private findOrCreateFontFace(font: TLFontFace) {
	// Check document.fonts for existing FontFace matching all descriptors
	for (const existing of document.fonts) {
		if (
			existing.family === font.family &&
			objectMapEntries(defaultFontFaceDescriptors).every(
				([key, defaultValue]) => existing[key] === (font[key] ?? defaultValue)
			)
		) {
			return existing
		}
	}

	// Create new FontFace with URL resolution
	const url = this.assetUrls?.[font.src.url] ?? font.src.url
	const instance = new FontFace(font.family, `url(${JSON.stringify(url)})`, {
		...mapObjectMapValues(defaultFontFaceDescriptors, (key) => font[key]),
		display: 'swap',
	})

	document.fonts.add(instance)
	return instance
}
```

**Key details**:

- Reuses existing FontFace from `document.fonts` if all descriptors match
- URL resolution: checks `assetUrls` map first, falls back to direct URL
- FontFace display mode: `'swap'` - text visible immediately with fallback font
- FontFace added to `document.fonts` immediately (before `.load()`)

#### Export to embedded CSS (lines 218-241)

```typescript
async toEmbeddedCssDeclaration(font: TLFontFace) {
	const url = this.assetUrls?.[font.src.url] ?? font.src.url
	const dataUrl = await FileHelpers.urlToDataUrl(url)

	const src = compact([
		`url("${dataUrl}")`,
		font.src.format ? `format(${font.src.format})` : null,
		font.src.tech ? `tech(${font.src.tech})` : null,
	]).join(' ')

	return compact([
		`@font-face {`,
		`  font-family: "${font.family}";`,
		font.ascentOverride ? `  ascent-override: ${font.ascentOverride};` : null,
		// ... all other descriptors ...
		`  src: ${src};`,
		`}`,
	]).join('\n')
}
```

**Purpose**: Convert font to data URL for SVG/PNG exports with embedded fonts.

### Shape.tsx

**Location**: `/packages/editor/src/lib/components/Shape.tsx`

#### Font tracking effect (lines 46-51)

```typescript
useEffect(() => {
	return react('load fonts', () => {
		const fonts = editor.fonts.getShapeFontFaces(id)
		editor.fonts.requestFonts(fonts)
	})
}, [editor, id])
```

**Implementation details**:

- `useEffect` runs on component mount
- `react()` from `@tldraw/state` creates reactive effect
- Effect re-runs automatically when shape's font requirements change
- Returns cleanup function from `react()`
- Dependencies: `[editor, id]` - stable across renders

**Reactivity**: When shape props change (e.g., text becomes bold), computed cache invalidates, `getShapeFontFaces` returns new fonts, reactive effect re-runs, fonts added to batch.

### ShapeUtil.ts

**Location**: `/packages/editor/src/lib/editor/shapes/ShapeUtil.ts`

#### Base getFontFaces method (lines 176-185)

```typescript
/**
 * Get the font faces that should be rendered in the document in order for this shape to render
 * correctly.
 *
 * @param shape - The shape.
 * @public
 */
getFontFaces(shape: Shape): TLFontFace[] {
	return EMPTY_ARRAY
}
```

**Default**: Returns `EMPTY_ARRAY` (shared constant). Most shapes don't use fonts.

### TextShapeUtil.tsx

**Location**: `/packages/tldraw/src/lib/shapes/text/TextShapeUtil.tsx`

#### Text shape font faces (lines 99-106)

```typescript
override getFontFaces(shape: TLTextShape) {
	// no need for an empty rich text check here
	return getFontsFromRichText(this.editor, shape.props.richText, {
		family: `tldraw_${shape.props.font}`,
		weight: 'normal',
		style: 'normal',
	})
}
```

**Initial state**: Sets base font family (e.g., `tldraw_draw`), normal weight/style.

#### Text size computation cache (lines 34-41)

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

**Font tracking for measurement**: Calls `trackFontsForShape()` to subscribe to font load state, ensuring re-computation when fonts load.

#### Text measurement (lines 311-334)

```typescript
function getTextSize(editor: Editor, props: TLTextShape['props']) {
	const { font, richText, size, w } = props

	const minWidth = 16
	const fontSize = FONT_SIZES[size]

	const maybeFixedWidth = props.autoSize ? null : Math.max(minWidth, Math.floor(w))

	const html = renderHtmlFromRichTextForMeasurement(editor, richText)
	const result = editor.textMeasure.measureHtml(html, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[font],
		fontSize: fontSize,
		maxWidth: maybeFixedWidth,
	})

	// If we're autosizing the measureText will essentially `Math.floor`
	// the numbers so `19` rather than `19.3`, this means we must +1 to
	// whatever we get to avoid wrapping.
	return {
		width: maybeFixedWidth ?? Math.max(minWidth, result.w + 1),
		height: Math.max(fontSize, result.h),
	}
}
```

**Min dimensions**: 16px width minimum, fontSize height minimum.
**AutoSize adjustment**: +1 to width to prevent wrapping due to floor rounding.

### Other shape implementations

#### GeoShapeUtil.tsx (lines 167-176)

```typescript
override getFontFaces(shape: TLGeoShape) {
	if (isEmptyRichText(shape.props.richText)) {
		return EMPTY_ARRAY
	}
	return getFontsFromRichText(this.editor, shape.props.richText, {
		family: `tldraw_${shape.props.font}`,
		weight: 'normal',
		style: 'normal',
	})
}
```

**Empty check optimization**: Returns `EMPTY_ARRAY` for empty text, skips font extraction.

#### NoteShapeUtil.tsx (lines 232-241)

Same pattern as GeoShapeUtil - empty text check, then `getFontsFromRichText`.

#### ArrowShapeUtil.tsx (lines 167-175)

```typescript
override getFontFaces(shape: TLArrowShape) {
	if (isEmptyRichText(shape.props.richText)) return EMPTY_ARRAY

	return getFontsFromRichText(this.editor, shape.props.richText, {
		family: `tldraw_${shape.props.font}`,
		weight: 'normal',
		style: 'normal',
	})
}
```

**Label fonts**: Arrow labels use same font system as text shapes.

### richText.ts (getFontsFromRichText)

**Location**: `/packages/editor/src/lib/utils/richText.ts`

#### Font extraction from rich text (lines 47-78)

```typescript
export function getFontsFromRichText(
	editor: Editor,
	richText: TLRichText,
	initialState: RichTextFontVisitorState
) {
	const { tipTapConfig, addFontsFromNode } = editor.getTextOptions()
	assert(tipTapConfig, 'textOptions.tipTapConfig must be set to use rich text')
	assert(addFontsFromNode, 'textOptions.addFontsFromNode must be set to use rich text')

	const schema = getTipTapSchema(tipTapConfig)
	const rootNode = Node.fromJSON(schema, richText as JSONContent)

	const fonts = new Set<TLFontFace>()

	function addFont(font: TLFontFace) {
		fonts.add(font)
	}

	function visit(node: TiptapNode, state: RichTextFontVisitorState) {
		state = addFontsFromNode!(node, state, addFont)

		for (const child of node.children) {
			visit(child, state)
		}
	}

	visit(rootNode, initialState)

	return Array.from(fonts)
}
```

**Algorithm**:

1. Parse TLRichText as TipTap Node tree
2. Recursive visitor pattern traverses tree
3. Each node updates state (font family/weight/style)
4. Fonts accumulated in Set for deduplication
5. Returns array of unique fonts

**RichTextFontVisitorState** (lines 29-33):

```typescript
export interface RichTextFontVisitorState {
	readonly family: string
	readonly weight: string
	readonly style: string
}
```

### richText.ts (defaultAddFontsFromNode)

**Location**: `/packages/tldraw/src/lib/utils/text/richText.ts`

#### Default font visitor implementation (lines 145-174)

```typescript
export function defaultAddFontsFromNode(
	node: Node,
	state: RichTextFontVisitorState,
	addFont: (font: TLFontFace) => void
) {
	// Process marks (bold, italic, code)
	for (const mark of node.marks) {
		if (mark.type.name === 'bold' && state.weight !== 'bold') {
			state = { ...state, weight: 'bold' }
		}
		if (mark.type.name === 'italic' && state.style !== 'italic') {
			state = { ...state, style: 'italic' }
		}
		if (mark.type.name === 'code' && state.family !== 'tldraw_mono') {
			state = { ...state, family: 'tldraw_mono' }
		}
	}

	// Look up font in DefaultFontFaces
	const fontsForFamily = getOwnProperty(DefaultFontFaces, state.family)
	if (!fontsForFamily) return state

	const fontsForStyle = getOwnProperty(fontsForFamily, state.style)
	if (!fontsForStyle) return state

	const fontsForWeight = getOwnProperty(fontsForStyle, state.weight)
	if (!fontsForWeight) return state

	addFont(fontsForWeight)

	return state
}
```

**Mark processing**: Bold and italic from TipTap marks. Code mark changes family to `tldraw_mono`.

**Font lookup path**: `DefaultFontFaces[family][style][weight]` - hierarchical structure.

### defaultFonts.tsx

**Location**: `/packages/tldraw/src/lib/shapes/shared/defaultFonts.tsx`

#### Font structure (lines 4-20)

```typescript
export interface TLDefaultFont {
	normal: {
		normal: TLFontFace
		bold: TLFontFace
	}
	italic: {
		normal: TLFontFace
		bold: TLFontFace
	}
}

export interface TLDefaultFonts {
	tldraw_draw: TLDefaultFont
	tldraw_sans: TLDefaultFont
	tldraw_serif: TLDefaultFont
	tldraw_mono: TLDefaultFont
}
```

**Structure**: 4 families × 2 styles × 2 weights = 16 total font faces.

#### Example font definitions (lines 24-50)

```typescript
tldraw_draw: {
	normal: {
		normal: {
			family: 'tldraw_draw',
			src: { url: 'tldraw_draw', format: 'woff2' },
			weight: 'normal',
		},
		bold: {
			family: 'tldraw_draw',
			src: { url: 'tldraw_draw_bold', format: 'woff2' },
			weight: 'bold',
		},
	},
	italic: {
		normal: {
			family: 'tldraw_draw',
			src: { url: 'tldraw_draw_italic', format: 'woff2' },
			weight: 'normal',
			style: 'italic',
		},
		bold: {
			family: 'tldraw_draw',
			src: { url: 'tldraw_draw_italic_bold', format: 'woff2' },
			weight: 'bold',
			style: 'italic',
		},
	},
},
```

**URL resolution**: URLs like `'tldraw_draw'` resolved via `assetUrls` map passed to FontManager.

**Font format**: All fonts use `woff2` format for optimal compression.

#### All font faces array (lines 145-147)

```typescript
export const allDefaultFontFaces = objectMapValues(DefaultFontFaces).flatMap((font) =>
	objectMapValues(font).flatMap((fontFace) => Object.values(fontFace))
)
```

**Usage**: For preloading all fonts at once (e.g., before export).

## Reactive state system (@tldraw/state)

### transactions.ts

**Location**: `/packages/state/src/lib/transactions.ts`

#### transact function (lines 354-359)

```typescript
export function transact<T>(fn: () => T): T {
	if (inst.currentTransaction) {
		return fn()
	}
	return transaction(fn)
}
```

**Behavior**: If already in transaction, just run function. Otherwise create transaction.

#### Transaction commit (lines 31-49)

```typescript
commit() {
	if (inst.globalIsReacting) {
		// if we're committing during a reaction we actually need to
		// use the 'cleanup' reactors set to ensure we re-run effects if necessary
		for (const atom of this.initialAtomValues.keys()) {
			traverseAtomForCleanup(atom)
		}
	} else if (this.isRoot) {
		// For root transactions, flush changed atoms
		flushChanges(this.initialAtomValues.keys())
	} else {
		// For transactions with parents, add the transaction's initial values to the parent's.
		this.initialAtomValues.forEach((value, atom) => {
			if (!this.parent!.initialAtomValues.has(atom)) {
				this.parent!.initialAtomValues.set(atom, value)
			}
		})
	}
}
```

**Key insight**: Root transaction calls `flushChanges()` once with all changed atoms, triggering batched reactive updates.

#### flushChanges (lines 133-173)

```typescript
function flushChanges(atoms: Iterable<_Atom>) {
	if (inst.globalIsReacting) {
		throw new Error('flushChanges cannot be called during a reaction')
	}

	const outerTxn = inst.currentTransaction
	try {
		// clear the transaction stack
		inst.currentTransaction = null
		inst.globalIsReacting = true
		inst.reactionEpoch = inst.globalEpoch

		// Collect all of the visited reactors.
		const reactors = new Set<EffectScheduler<unknown>>()

		for (const atom of atoms) {
			atom.children.visit((child) => traverse(reactors, child))
		}

		// Run each reactor.
		for (const r of reactors) {
			r.maybeScheduleEffect()
		}

		let updateDepth = 0
		while (inst.cleanupReactors?.size) {
			if (updateDepth++ > 1000) {
				throw new Error('Reaction update depth limit exceeded')
			}
			const reactors = inst.cleanupReactors
			inst.cleanupReactors = null
			for (const r of reactors) {
				r.maybeScheduleEffect()
			}
		}
	} finally {
		inst.cleanupReactors = null
		inst.globalIsReacting = false
		inst.currentTransaction = outerTxn
	}
}
```

**Batched notification**: Collects all dependent effects, schedules each once. Effects that change atoms during reaction phase added to `cleanupReactors` and processed in loop.

**Safety**: 1000 iteration limit prevents infinite loops.

### AtomMap.ts

**Location**: `/packages/store/src/lib/AtomMap.ts`

#### Update method (lines 167-188)

```typescript
update(key: K, updater: (value: V) => V) {
	const valueAtom = this.atoms.__unsafe__getWithoutCapture().get(key)
	if (!valueAtom) {
		throw new Error(`AtomMap: key ${key} not found`)
	}
	const value = valueAtom.__unsafe__getWithoutCapture()
	assert(value !== UNINITIALIZED)
	valueAtom.set(updater(value))
}
```

**Reactive trigger**: `valueAtom.set()` triggers change notification, schedules dependent effects.

#### AtomMap structure (lines 9-40)

```typescript
export class AtomMap<K, V> implements Map<K, V> {
	private atoms: Atom<ImmutableMap<K, Atom<V | UNINITIALIZED>>>

	constructor(
		private readonly name: string,
		entries?: Iterable<readonly [K, V]>
	) {
		let atoms = emptyMap<K, Atom<V>>()
		if (entries) {
			atoms = atoms.withMutations((atoms) => {
				for (const [k, v] of entries) {
					atoms.set(k, atom(`${name}:${String(k)}`, v))
				}
			})
		}
		this.atoms = atom(`${name}:atoms`, atoms)
	}
}
```

**Two-level reactive structure**:

1. Outer atom: tracks which keys exist
2. Inner atoms: track individual values

**Benefit**: Updating value doesn't notify observers of keys set, only observers of specific value.

### EffectScheduler.ts

**Location**: `/packages/state/src/lib/EffectScheduler.ts`

#### scheduleEffect option (lines 10-40)

````typescript
export interface EffectSchedulerOptions {
	/**
	 * scheduleEffect is a function that will be called when the effect is scheduled.
	 *
	 * It can be used to defer running effects until a later time, for example to batch them together with requestAnimationFrame.
	 *
	 * @example
	 * ```ts
	 * let isRafScheduled = false
	 * const scheduledEffects: Array<() => void> = []
	 * const scheduleEffect = (runEffect: () => void) => {
	 * 	scheduledEffects.push(runEffect)
	 * 	if (!isRafScheduled) {
	 * 		isRafScheduled = true
	 * 		requestAnimationFrame(() => {
	 * 			isRafScheduled = false
	 * 			scheduledEffects.forEach((runEffect) => runEffect())
	 * 			scheduledEffects.length = 0
	 * 		})
	 * 	}
	 * }
	 * const stop = react('set page title', () => {
	 * 	document.title = doc.title,
	 * }, scheduleEffect)
	 * ```
	 */
	scheduleEffect?: (execute: () => void) => void
}
````

**Not used for font loading**: Font loading uses immediate execution, not deferred scheduling.

#### maybeScheduleEffect (lines 91-104)

```typescript
maybeScheduleEffect() {
	// bail out if we have been cancelled by another effect
	if (!this._isActivelyListening) return
	// bail out if no atoms have changed since the last time we ran this effect
	if (this.lastReactedEpoch === getGlobalEpoch()) return

	// bail out if we have parents and they have not changed since last time
	if (this.parents.length && !haveParentsChanged(this)) {
		this.lastReactedEpoch = getGlobalEpoch()
		return
	}
	// if we don't have parents it's probably the first time this is running.
	this.scheduleEffect()
}
```

**Optimization**: Skips execution if dependencies unchanged (epoch comparison).

## Event loop timing

### Microtask phase

**JavaScript event loop phases**:

1. **Synchronous code** - Current task/script execution
2. **Microtasks** - `queueMicrotask`, Promise callbacks, MutationObserver
3. **Render** - Browser layout, paint (if needed)
4. **Macrotasks** - setTimeout, setInterval, I/O callbacks

**Key property**: Microtasks run after all synchronous code completes but before yielding to browser or running next macrotask.

### queueMicrotask vs alternatives

**queueMicrotask()**: Native browser API, runs in microtask queue.

**Promise.resolve().then()**: Also microtask, but creates Promise overhead.

**setTimeout(fn, 0)**: Macrotask - runs in next event loop iteration, too late.

**requestAnimationFrame()**: Runs before next paint, too late (after microtasks).

**Why microtask works for font batching**:

- All shape `useEffect` calls run synchronously during React commit phase
- Each effect calls `requestFonts()` synchronously
- First call schedules microtask, rest add to set
- React commit phase completes (synchronous code done)
- Microtask runs before browser does anything else
- All fonts accumulated, loaded together

## Potential issues and edge cases

### Async font requests

If fonts requested asynchronously (e.g., after `await fetch()`):

- Each async request schedules own microtask
- Batching defeated - each microtask runs separately
- Multiple transactions created

**Tldraw avoids this**: Shapes mount synchronously, font requirements computed synchronously from props.

### Editor disposal

Check in microtask: `if (this.editor.isDisposed) return`

**Why needed**: Microtask may run after editor disposed (e.g., component unmounted). Loading fonts on disposed editor causes errors.

### Set mutation during iteration

Pattern used:

```typescript
const toLoad = this.fontsToLoad
this.fontsToLoad = new Set()
```

**Why**: Creates new Set before processing. If font loading triggers more font requests, they go to new set, not current iteration.

**Alternative that breaks**:

```typescript
for (const font of this.fontsToLoad) {
	this.ensureFontIsLoaded(font) // If this causes more requestFonts calls, Set modified during iteration
}
this.fontsToLoad.clear()
```

### Duplicate font loading

Prevented at multiple levels:

1. **Set deduplication**: `fontsToLoad.add(font)` - Set only stores unique fonts
2. **State check**: `ensureFontIsLoaded` checks `getFontState()`, returns existing promise
3. **Browser deduplication**: `findOrCreateFontFace` reuses existing FontFace from `document.fonts`

### Font loading failures

Error handling:

```typescript
.catch((err) => {
	console.error(err)
	this.fontStates.update(font, (s) => ({ ...s, state: 'error' }))
})
```

**State marked 'error'**: Shape can decide to render without font or show placeholder.

**No retry**: Failed font stays in 'error' state. Subsequent requests return same rejected promise.

### Empty rich text optimization

Multiple shapes check `isEmptyRichText()` before calling `getFontsFromRichText`:

```typescript
if (isEmptyRichText(shape.props.richText)) {
	return EMPTY_ARRAY
}
```

**Why**: Avoids TipTap parsing and tree traversal for empty text. Returns shared `EMPTY_ARRAY` constant.

## Performance characteristics

### Cache hit rates

**shapeFontFacesCache**: High hit rate for shapes with unchanged props. Moving shapes doesn't invalidate cache.

**Font state lookups**: `getFontState()` checks AtomMap, O(1) lookup.

### Memory usage

**Font state storage**: One FontState per unique font (16 for default fonts).

**Shape caches**: One cache entry per shape, cleared when shape deleted.

**Microtask batching**: Set cleared after processing, no memory leak.

### Network characteristics

**Without batching**:

- 100 text shapes mounting → 100 separate font load calls
- Duplicate FontFace objects created
- Browser may deduplicate network requests, but not guaranteed
- 100 separate state updates → 100 re-render cascades

**With batching**:

- 100 shapes → 1 microtask → 1 transaction
- Unique fonts identified (e.g., 4 variants for mixed formatting)
- 4 font loads → 4 network requests
- 1 state update notification → 1 re-render pass

### Measurement timing

`getTextSize()` calls `editor.fonts.trackFontsForShape(shape)` before measurement.

**Purpose**: Subscribe to font load state. When font transitions to 'ready', cache invalidated, text re-measured with correct font.

**Initial render**: May measure with fallback font. Remeasures when font loads.

## Alternative approaches considered

### Promise.all batching

```typescript
const fontPromises = shapes.map((s) => loadFonts(s))
await Promise.all(fontPromises)
```

**Problem**: Requires coordination point where all shapes known. React renders incrementally, shapes mount independently.

### Debouncing

```typescript
let timeout
requestFonts(fonts) {
	clearTimeout(timeout)
	timeout = setTimeout(() => loadAllFonts(), 10)
}
```

**Problem**: Arbitrary delay. Too short → batching fails. Too long → fonts load late, visible delay.

### React useLayoutEffect batching

```typescript
useLayoutEffect(() => {
	// All useLayoutEffect run together
	requestFonts(fonts)
})
```

**Problem**: useLayoutEffect still runs effects individually. No automatic batching.

**Microtask advantage**: Uses event loop timing, no arbitrary delays, works with React's synchronous render.

## Testing notes

**Test file**: `/packages/editor/src/lib/editor/managers/FontManager/FontManager.test.ts`

Key test cases (lines 147-184):

- `ensureFontIsLoaded` creates and loads font face
- Error handling logs to console, sets error state
- Concurrent requests return same promise (deduplication)
- Minimal font face (only required properties) works

**Mock setup needed**:

- `global.FontFace` constructor
- `FontFace.prototype.load` returning Promise
- `document.fonts` collection

## Related APIs

### FontFace API

Browser API for programmatic font loading:

```typescript
const font = new FontFace('MyFont', 'url(font.woff2)', {
	style: 'normal',
	weight: '400',
	display: 'swap',
})

await font.load()
document.fonts.add(font)
```

**display: 'swap'**: Shows text immediately with fallback, swaps to custom font when loaded.

### document.fonts

FontFaceSet API:

- `document.fonts.add(fontFace)` - Register font
- `document.fonts.check('12px MyFont')` - Check if font loaded
- `document.fonts.ready` - Promise resolving when fonts loaded

**Tldraw usage**: `document.fonts.add()` after successful load.

## Code statistics

**FontManager.ts**: 255 lines

- ~40 lines: interfaces and types
- ~25 lines: cache setup
- ~50 lines: core batching and loading logic
- ~50 lines: font face creation/reuse
- ~40 lines: CSS export

**Key complexity**: Interaction between caching, batching, and reactive state.

**Lines of code for batching**: ~20 (requestFonts + queueMicrotask callback)

**Impact**: Eliminates cascading renders across potentially hundreds of shapes.
