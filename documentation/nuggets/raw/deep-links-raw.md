# Deep link encoding: raw notes

Internal research notes for the deep-links.md article.

## Core problem

How to encode viewport coordinates and shape IDs in URLs while keeping them human-readable and handling edge cases like IDs containing dots.

**Requirements:**
- Human-readable URLs (not gibberish like `v%2D342%2E178%2E1920%2E1080`)
- Support for shape IDs that may contain dots
- Unambiguous parsing
- Short URLs to avoid length limits

## URL encoding strategy

**Standard approach fails:**
- `encodeURIComponent()` doesn't encode dots (they're valid URL characters)
- If shape ID is `a.b.c`, it encodes to `a.b.c` unchanged
- Parser splits on dots and gets ambiguous results: `sabc.a.b.c` → `['abc', 'a', 'b', 'c']` (4 items instead of 2)

**Solution: Double-encode dots only**

From `packages/editor/src/lib/utils/deepLinks.ts:87-90`:
```typescript
function encodeId(str: string): string {
	// need to encode dots because they are used as separators
	return encodeURIComponent(str).replace(/\./g, '%2E')
}
```

- First pass: `encodeURIComponent(str)` handles spaces, special chars, etc.
- Second pass: `.replace(/\./g, '%2E')` encodes remaining dots
- Result: unencoded dots = separators, `%2E` = literal dots in content
- Standard `decodeURIComponent()` handles decoding (no custom logic needed)

**Percent-encoding recursion:**
- ID `a%2Eb` (literal `%2E` characters) encodes to `a%252Eb`
- The `%` itself gets encoded to `%25`
- System is self-consistent for arbitrary nesting

## Deep link types

From `packages/editor/src/lib/utils/deepLinks.ts:7-13`:
```typescript
export type TLDeepLink =
	| { type: 'shapes'; shapeIds: TLShapeId[] }
	| { type: 'viewport'; bounds: BoxModel; pageId?: TLPageId }
	| { type: 'page'; pageId: TLPageId }
```

**BoxModel structure:**
From `packages/tlschema/src/misc/geometry-types.ts:7-12`:
```typescript
export interface BoxModel {
	x: number
	y: number
	w: number
	h: number
}
```

## Encoding implementation

From `packages/editor/src/lib/utils/deepLinks.ts:29-49`:

```typescript
export function createDeepLinkString(deepLink: TLDeepLink): string {
	switch (deepLink.type) {
		case 'shapes': {
			const ids = deepLink.shapeIds.map((id) => encodeId(id.slice('shape:'.length)))
			return `s${ids.join('.')}`
		}
		case 'page': {
			return 'p' + encodeId(PageRecordType.parseId(deepLink.pageId))
		}
		case 'viewport': {
			const { bounds, pageId } = deepLink
			let res = `v${Math.round(bounds.x)}.${Math.round(bounds.y)}.${Math.round(bounds.w)}.${Math.round(bounds.h)}`
			if (pageId) {
				res += '.' + encodeId(PageRecordType.parseId(pageId))
			}
			return res
		}
	}
}
```

**Format prefixes:**
- `s` = shapes link (e.g., `sabc.def.ghi`)
- `p` = page link (e.g., `pabc`)
- `v` = viewport link (e.g., `v342.178.1920.1080` or `v342.178.1920.1080.page-id`)

**Shape ID stripping:**
- Shape IDs stored as `shape:abc` internally
- `.slice('shape:'.length)` removes `shape:` prefix before encoding
- Only the suffix (e.g., `abc`) goes in URL

**Page ID inclusion:**
- Viewport links optionally include page ID as 5th component
- Only included if `pageId` is provided in the deep link
- Useful for multi-page documents

## Decoding implementation

From `packages/editor/src/lib/utils/deepLinks.ts:59-85`:

```typescript
export function parseDeepLinkString(deepLinkString: string): TLDeepLink {
	const type = deepLinkString[0]
	switch (type) {
		case 's': {
			const shapeIds = deepLinkString
				.slice(1)
				.split('.')
				.filter(Boolean)
				.map((id) => createShapeId(decodeURIComponent(id)))
			return { type: 'shapes', shapeIds }
		}
		case 'p': {
			const pageId = PageRecordType.createId(decodeURIComponent(deepLinkString.slice(1)))
			return { type: 'page', pageId }
		}
		case 'v': {
			const [x, y, w, h, pageId] = deepLinkString.slice(1).split('.')
			return {
				type: 'viewport',
				bounds: new Box(Number(x), Number(y), Number(w), Number(h)),
				pageId: pageId ? PageRecordType.createId(decodeURIComponent(pageId)) : undefined,
			}
		}
		default:
			throw Error('Invalid deep link string')
	}
}
```

**Parsing steps:**
1. Read first character to determine type
2. Slice off prefix character
3. Split on dots (unencoded dots are separators)
4. Filter out empty strings with `.filter(Boolean)`
5. Decode each component with `decodeURIComponent()`
6. Reconstruct full IDs (add `shape:` prefix back via `createShapeId()`)

**Shape ID reconstruction:**
From `packages/tlschema/src/records/TLShape.ts:436-438`:
```typescript
export function createShapeId(id?: string): TLShapeId {
	return `shape:${id ?? uniqueId()}` as TLShapeId
}
```

## Precision vs length tradeoff

**Integer rounding for viewport coordinates:**
From line 40 of deepLinks.ts:
```typescript
let res = `v${Math.round(bounds.x)}.${Math.round(bounds.y)}.${Math.round(bounds.w)}.${Math.round(bounds.h)}`
```

- Viewport positions rounded to integers
- Sub-pixel precision doesn't matter for viewport positioning
- Comparison: `v342.7891234.178.2341567.1920.123456.1080.789012` (58 chars) vs `v343.178.1920.1081` (18 chars)
- 3x shorter URLs for imperceptible difference on screen

**Tradeoff:**
- Viewport might be off by ~1 pixel when restored
- Acceptable for general area/shape viewing
- Exact reproduction requires full document state (not URL-based)

## Navigation implementation

**Entry point:**
From `packages/editor/src/lib/editor/Editor.ts:9905-9926`:

```typescript
navigateToDeepLink(opts?: TLDeepLink | { url?: string | URL; param?: string }): Editor {
	if (opts && 'type' in opts) {
		this._navigateToDeepLink(opts)
		return this
	}

	const url = new URL(opts?.url ?? window.location.href)
	const deepLinkString = url.searchParams.get(opts?.param ?? 'd')

	if (!deepLinkString) {
		this._zoomToFitPageContentAt100Percent()
		return this
	}

	try {
		this._navigateToDeepLink(parseDeepLinkString(deepLinkString))
	} catch (e) {
		console.warn(e)
		this._zoomToFitPageContentAt100Percent()
	}
	return this
}
```

**Default parameter:**
- URL param defaults to `d` (e.g., `?d=v342.178.1920.1080`)
- Configurable via `param` option
- Falls back to fitting page content if no param found or parsing fails

**Core navigation logic:**
From `packages/editor/src/lib/editor/Editor.ts:9830-9877`:

```typescript
private _navigateToDeepLink(deepLink: TLDeepLink) {
	this.run(() => {
		switch (deepLink.type) {
			case 'page': {
				const page = this.getPage(deepLink.pageId)
				if (page) {
					this.setCurrentPage(page)
				}
				this._zoomToFitPageContentAt100Percent()
				return
			}
			case 'shapes': {
				const allShapes = compact(deepLink.shapeIds.map((id) => this.getShape(id)))
				const byPage: { [pageId: string]: TLShape[] } = {}
				for (const shape of allShapes) {
					const pageId = this.getAncestorPageId(shape)
					if (!pageId) continue
					byPage[pageId] ??= []
					byPage[pageId].push(shape)
				}
				const [pageId, shapes] = Object.entries(byPage).sort(
					([_, a], [__, b]) => b.length - a.length
				)[0] ?? ['', []]

				if (!pageId || !shapes.length) {
					this._zoomToFitPageContentAt100Percent()
				} else {
					this.setCurrentPage(pageId as TLPageId)
					const bounds = Box.Common(shapes.map((s) => this.getShapePageBounds(s)!))
					this.zoomToBounds(bounds, { immediate: true, targetZoom: this.getBaseZoom() })
				}
				return
			}
			case 'viewport': {
				if (deepLink.pageId) {
					const page = this.getPage(deepLink.pageId)
					if (page) {
						this.setCurrentPage(page)
					}
				}
				this.setCamera({ x: -deepLink.bounds.x, y: -deepLink.bounds.y, z: deepLink.bounds.w / this.getViewportScreenBounds().w }, { immediate: true })
				return
			}
		}
	})
}
```

**Graceful degradation for shapes:**
- Groups shapes by page using `getAncestorPageId()`
- Sorts pages by shape count (descending)
- Navigates to page with most matching shapes
- If no shapes found, falls back to fitting current page content

**Box.Common utility:**
From `packages/editor/src/lib/primitives/Box.ts:442-457`:
```typescript
static Common(boxes: Box[]) {
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity

	for (let i = 0; i < boxes.length; i++) {
		const B = boxes[i]
		minX = Math.min(minX, B.minX)
		minY = Math.min(minY, B.minY)
		maxX = Math.max(maxX, B.maxX)
		maxY = Math.max(maxY, B.maxY)
	}

	return new Box(minX, minY, maxX - minX, maxY - minY)
}
```
Computes bounding box that encompasses all provided boxes.

**compact utility:**
From `packages/utils/src/lib/array.ts:81-83`:
```typescript
export function compact<T>(arr: T[]): NonNullable<T>[] {
	return arr.filter((i) => i !== undefined && i !== null) as any
}
```
Removes null/undefined values from array.

**Zoom behavior:**
- Shapes link: zooms to `getBaseZoom()` (typically 100% or fit-to-viewport)
- Viewport link: restores exact camera position
- Immediate transitions (no animation) via `{ immediate: true }`

## Creating deep links

From `packages/editor/src/lib/editor/Editor.ts:9962-9977`:

```typescript
createDeepLink(opts?: { url?: string | URL; param?: string; to?: TLDeepLink }): URL {
	const url = new URL(opts?.url ?? window.location.href)

	url.searchParams.set(
		opts?.param ?? 'd',
		createDeepLinkString(
			opts?.to ?? {
				type: 'viewport',
				pageId: this.options.maxPages === 1 ? undefined : this.getCurrentPageId(),
				bounds: this.getViewportPageBounds(),
			}
		)
	)

	return url
}
```

**Default behavior:**
- Uses current `window.location.href` as base URL
- Defaults to viewport link with current viewport bounds
- Includes page ID only if `maxPages !== 1` (multi-page documents)
- Returns full URL object (not string)

## Deep link listener (URL sync)

From `packages/editor/src/lib/editor/Editor.ts:10023-10063`:

```typescript
registerDeepLinkListener(opts?: TLDeepLinkOptions): () => void {
	if (opts?.getUrl && !opts?.onChange) {
		throw Error(
			'[tldraw:urlStateSync] If you specify getUrl, you must also specify the onChange callback.'
		)
	}

	const url$ = computed('url with state', () => {
		const url = opts?.getUrl?.(this) ?? window.location.href
		const urlWithState = this.createDeepLink({
			param: opts?.param,
			url,
			to: opts?.getTarget?.(this),
		})
		return urlWithState.toString()
	})

	const announceChange =
		opts?.onChange ??
		(() => {
			const url = this.createDeepLink({
				param: opts?.param,
				to: opts?.getTarget?.(this),
			})

			window.history.replaceState({}, document.title, url.toString())
		})

	const scheduleEffect = debounce((execute: () => void) => execute(), opts?.debounceMs ?? 500)

	const unlisten = react(
		'update url on state change',
		() => announceChange(new URL(url$.get()), this),
		{ scheduleEffect }
	)

	return () => {
		unlisten()
		scheduleEffect.cancel()
	}
}
```

**Options interface:**
From `packages/editor/src/lib/utils/deepLinks.ts:93-122`:
```typescript
export interface TLDeepLinkOptions {
	param?: string           // URL param name (default: 'd')
	debounceMs?: number      // Debounce delay (default: 500ms)
	getUrl?(editor: Editor): string | URL  // Custom URL provider
	getTarget?(editor: Editor): TLDeepLink // Custom target provider
	onChange?(url: URL, editor: Editor): void // Custom change handler
}
```

**Debounce behavior:**
- Default: 500ms delay before URL updates
- From line 10051: `debounce((execute: () => void) => execute(), opts?.debounceMs ?? 500)`
- Prevents thrashing browser history during pan/zoom
- URL lags ~500ms behind actual viewport during interaction
- Only updates once user stops moving

**Default onChange:**
- Uses `window.history.replaceState()` (doesn't create new history entries)
- Updates URL in place without page reload
- Each pan/zoom creates only one history entry after debounce

**Reactive computation:**
- Uses `@tldraw/state` reactive signals (`computed`, `react`)
- Automatically tracks dependencies (viewport bounds, page ID, etc.)
- Updates triggered by state changes

## Component integration

From `packages/editor/src/lib/TldrawEditor.tsx:421-443, 472-510`:

**Props:**
```typescript
interface TldrawEditorProps {
	deepLinks?: true | TLDeepLinkOptions
	// ... other props
}
```

**Initialization on mount:**
```typescript
const deepLinks = useShallowObjectIdentity(_deepLinks === true ? {} : _deepLinks)

// On editor creation:
if (deepLinks) {
	if (!deepLinks?.getUrl) {
		// load the state from window.location
		editor.navigateToDeepLink(deepLinks)
	} else {
		// load the state from the provided URL
		editor.navigateToDeepLink({ ...deepLinks, url: deepLinks.getUrl(editor) })
	}
}
```

**Listener registration:**
```typescript
useLayoutEffect(() => {
	if (!editor) return
	if (deepLinks) {
		return editor.registerDeepLinkListener(deepLinks)
	}
}, [editor, deepLinks])
```

- `deepLinks={true}` enables with default options
- `deepLinks={options}` enables with custom options
- Navigates to deep link on mount
- Registers listener to keep URL in sync

## URL length constraints

**No enforced limits:**
- Code doesn't validate URL length
- Practical limits:
  - IE: ~2,000 characters
  - Chrome: millions technically, but servers often reject >2,048
  - User experience: <1,000 chars preferred

**Size estimates:**
- 100 shapes with short IDs: ~290 characters (`s0.1.2.3.4...98.99`)
- 20 shapes with long custom IDs: ~910 characters
- Viewport only: ~18-30 characters (`v342.178.1920.1080`)

**Design decision:**
- Put state directly in URL (no server/database needed)
- Accept length constraints as fundamental tradeoff
- Alternative (short tokens like `?d=x7h9k2`) requires server infrastructure

## Test cases

From `packages/editor/src/lib/utils/deepLinks.test.ts`:

```typescript
const testCases = [
	{
		name: 'no shapes',
		deepLink: { type: 'shapes', shapeIds: [] },
		expected: 's',
	},
	{
		name: 'one shape',
		deepLink: { type: 'shapes', shapeIds: [createShapeId('abc')] },
		expected: 'sabc',
	},
	{
		name: 'two shapes',
		deepLink: { type: 'shapes', shapeIds: [createShapeId('abc'), createShapeId('def')] },
		expected: 'sabc.def',
	},
	{
		name: 'page',
		deepLink: { type: 'page', pageId: PageRecordType.createId('abc') },
		expected: 'pabc',
	},
	{
		name: 'viewport alone',
		deepLink: { type: 'viewport', bounds: new Box(-1, 2, 3, 4) },
		expected: 'v-1.2.3.4',
	},
	{
		name: 'viewport with page',
		deepLink: { type: 'viewport', bounds: new Box(1, -2, 3, 4), pageId: PageRecordType.createId('abc') },
		expected: 'v1.-2.3.4.abc',
	},
]
```

**Negative coordinates:**
- Supported natively: `v-1.2.3.4` (negative x), `v1.-2.3.4` (negative y)
- Minus sign is URL-safe and human-readable

## Error handling

**Parse errors:**
- `parseDeepLinkString()` throws on invalid type character
- `navigateToDeepLink()` catches exceptions and falls back to fitting page content

**Missing shapes:**
- `compact()` filters out null results from `getShape(id)`
- If no shapes found, falls back to current page
- If some shapes found, zooms to those (partial success)

**Missing pages:**
- `getPage(pageId)` returns null if page doesn't exist
- Falls back to current page without error

**Invalid viewport bounds:**
- No validation in parsing
- `Number()` on non-numeric strings returns `NaN`
- Camera operations handle `NaN` gracefully (typically clamp to valid values)

## Key source files

- `/packages/editor/src/lib/utils/deepLinks.ts` - Encoding/decoding functions, type definitions
- `/packages/editor/src/lib/editor/Editor.ts:9830-10063` - Navigation methods (`_navigateToDeepLink`, `navigateToDeepLink`, `createDeepLink`, `registerDeepLinkListener`)
- `/packages/editor/src/lib/TldrawEditor.tsx:421-510` - Deep link prop handling and lifecycle integration
- `/packages/editor/src/lib/utils/deepLinks.test.ts` - Unit tests for encode/decode roundtrips
- `/packages/editor/src/lib/primitives/Box.ts:442-457` - `Box.Common()` bounding box calculation
- `/packages/tlschema/src/misc/geometry-types.ts:7-12` - `BoxModel` interface
- `/packages/tlschema/src/records/TLShape.ts:436-438` - `createShapeId()` helper
- `/packages/utils/src/lib/array.ts:81-83` - `compact()` utility

## Design principles

1. **Human-readable over machine-optimal**: Keep dots unencoded even though it complicates parsing
2. **Graceful degradation**: Missing shapes/pages don't break, just show fallback
3. **Client-side simplicity**: No server required, state directly in URL
4. **Debounce for UX**: Prevent history thrashing, accept slight lag
5. **Precision tradeoff**: Round coordinates for shorter URLs, accept 1px imprecision
6. **Standard encoding base**: Build on `encodeURIComponent()`, just add dot handling
