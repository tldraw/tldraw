# @tldraw/utils

The `@tldraw/utils` package provides foundational utility functions that power the tldraw SDK. It contains pure, reusable helper functions for common programming tasks including array manipulation, object operations, error handling, performance optimization, and media processing.

## 1. Introduction

The utils package serves as the foundation of the tldraw ecosystem, providing battle-tested utilities that other tldraw packages depend on. Every function is designed with type safety, performance, and cross-platform compatibility in mind.

You import utilities directly as named exports:

```ts
import { dedupe, rotateArray, partition } from '@tldraw/utils'
import { ExecutionQueue, Result, assert } from '@tldraw/utils'
import { WeakCache, MediaHelpers } from '@tldraw/utils'
```

The package is completely self-contained with no dependencies on other `@tldraw/*` packages, making it safe to use in any JavaScript environment.

> Important: Many utilities in this package are marked as `@internal` in the source code. These are implementation details used within the tldraw ecosystem. While they're exported for internal tldraw packages to use, they may change without notice in minor versions. Focus on the `@public` APIs for stable external usage.

## 2. Core Utilities

### Array Operations: Transforming Collections

Arrays are everywhere in tldraw - from managing shapes and tools to handling selections and ordering. The array utilities provide type-safe operations that preserve your data's integrity.

#### Deduplication and Uniqueness

You deduplicate arrays using the `dedupe` function:

```ts
import { dedupe } from '@tldraw/utils'

const shapes = [
	{ id: 'a', type: 'rect' },
	{ id: 'b', type: 'circle' },
	{ id: 'a', type: 'rect' }, // duplicate
]

const uniqueShapes = dedupe(shapes, (a, b) => a.id === b.id)
console.log(uniqueShapes) // [{ id: 'a', type: 'rect' }, { id: 'b', type: 'circle' }]
```

For simple value arrays, you can omit the equality function:

```ts
const ids = ['a', 'b', 'c', 'a', 'b']
const uniqueIds = dedupe(ids)
console.log(uniqueIds) // ['a', 'b', 'c']
```

#### Rotating and Reordering

You can rotate array contents with `rotateArray`:

```ts
import { rotateArray } from '@tldraw/utils'

const tools = ['select', 'draw', 'eraser', 'text']
const rotated = rotateArray(tools, 1)
console.log(rotated) // ['text', 'select', 'draw', 'eraser']
```

This is particularly useful for cycling through tools or shifting z-order arrangements.

#### Splitting Collections

You partition arrays based on conditions using `partition`:

```ts
import { partition } from '@tldraw/utils'

const shapes = [
	{ id: 'a', selected: true },
	{ id: 'b', selected: false },
	{ id: 'c', selected: true },
]

const [selected, unselected] = partition(shapes, (shape) => shape.selected)
console.log(selected) // [{ id: 'a', selected: true }, { id: 'c', selected: true }]
console.log(unselected) // [{ id: 'b', selected: false }]
```

> Note: `partition` is marked as `@internal` in the source code but is exported for use. It may change without notice in minor versions.

### Error Handling: The Result Pattern

Instead of throwing exceptions, tldraw uses the `Result` pattern for predictable error handling. This approach makes errors explicit and prevents unexpected crashes.

#### Creating Results

You create successful results with `Result.ok()` and errors with `Result.err()`:

```ts
import { Result } from '@tldraw/utils'

function parseShape(data: unknown): Result<Shape, string> {
	if (typeof data !== 'object' || data === null) {
		return Result.err('Invalid data: not an object')
	}

	// Type checking logic...
	return Result.ok(validShape)
}
```

#### Handling Results

You check results using the `ok` property:

```ts
const result = parseShape(unknownData)

if (result.ok) {
	// TypeScript knows result.value is a Shape
	console.log(`Shape type: ${result.value.type}`)
} else {
	// TypeScript knows result.error is a string
	console.error(`Parse failed: ${result.error}`)
}
```

#### Chaining Operations

Results compose well for sequential operations:

```ts
function validateAndCreateShape(data: unknown): Result<ProcessedShape, string> {
	const parseResult = parseShape(data)
	if (!parseResult.ok) {
		return parseResult // Pass through the error
	}

	const processResult = processShape(parseResult.value)
	return processResult
}
```

### Assertions: Runtime Type Checking

When you need to verify assumptions at runtime, use the assertion functions. These provide both runtime safety and TypeScript type narrowing.

#### Basic Assertions

The `assert` function throws if a condition is false:

```ts
import { assert } from '@tldraw/utils'

function processShape(shape: unknown) {
	assert(shape && typeof shape === 'object', 'Shape must be an object')
	// TypeScript now knows shape is object & not null

	assert('type' in shape, 'Shape must have a type property')
	// TypeScript knows shape has a type property
}
```

#### Existence Checking

Use `assertExists` to verify values aren't null or undefined:

```ts
import { assertExists } from '@tldraw/utils'

function findShapeById(id: string): Shape {
	const shape = shapes.find((s) => s.id === id)
	assertExists(shape, `Shape with id ${id} not found`)
	// TypeScript knows shape is not undefined
	return shape
}
```

> Tip: Assertions are removed from production builds in most bundlers, but the type narrowing still helps during development.

## 3. Advanced Features

### ExecutionQueue: Sequential Task Processing

When you need to ensure operations happen in order, use `ExecutionQueue`. This is particularly important for database writes, file operations, or any sequence where order matters.

#### Basic Queue Usage

You create a queue and push tasks to it:

```ts
import { ExecutionQueue } from '@tldraw/utils'

const saveQueue = new ExecutionQueue()

// These will execute in order, not parallel
const save1 = saveQueue.push(() => saveToDatabase(data1))
const save2 = saveQueue.push(() => saveToDatabase(data2))
const save3 = saveQueue.push(() => saveToDatabase(data3))

// All saves complete in order
await Promise.all([save1, save2, save3])
```

#### Task Timing and Cleanup

You can add a timeout between tasks and clean up when needed:

```ts
// 500ms timeout between tasks
const queue = new ExecutionQueue(500)

// Queue some operations
await queue.push(() => heavyComputation1())
// 500ms delay automatically added
await queue.push(() => heavyComputation2())

// Clean up when done
queue.close()
```

> Note: ExecutionQueue ensures sequential execution even if you don't await individual tasks immediately.

### WeakCache: Memory-Efficient Caching

When you need to cache expensive computations tied to object lifecycles, `WeakCache` automatically cleans up when objects are garbage collected.

#### Caching Expensive Computations

You cache results tied to specific objects:

```ts
import { WeakCache } from '@tldraw/utils'

const boundingBoxCache = new WeakCache<Shape, BoundingBox>()

function getBoundingBox(shape: Shape): BoundingBox {
	return boundingBoxCache.get(shape, (s) => computeBoundingBox(s))
	// Expensive computation only runs once per shape
}
```

Each time you call `getBoundingBox` with the same shape object, it returns the cached result. When the shape object is garbage collected, the cache entry is automatically cleaned up by the underlying WeakMap.

#### Multiple Cache Layers

You can create specialized caches for different computations:

```ts
const geometryCache = new WeakCache<Shape, Geometry>()
const selectionCache = new WeakCache<Shape, SelectionBounds>()

function getGeometry(shape: Shape): Geometry {
	return geometryCache.get(shape, computeGeometry)
}

function getSelectionBounds(shape: Shape): SelectionBounds {
	return selectionCache.get(shape, computeSelectionBounds)
}
```

> Tip: WeakCache is perfect for any computation where the result depends only on the input object and the object reference acts as a natural cache key.

### IndexKey System: Fractional Ordering

The tldraw editor needs to maintain stable ordering of shapes, even when inserting items between existing ones. The IndexKey system provides fractional indexing for this purpose.

#### Understanding IndexKeys

An `IndexKey` is a special string that maintains lexicographic order:

```ts
import { ZERO_INDEX_KEY, getIndexBetween, getIndexAbove } from '@tldraw/utils'

// Start with the zero index
let firstIndex = ZERO_INDEX_KEY // 'a0'

// Get an index above it
let secondIndex = getIndexAbove(firstIndex) // 'a1'

// Insert between them
let middleIndex = getIndexBetween(firstIndex, secondIndex) // 'a0V'
```

#### Maintaining Shape Order

When you need to reorder shapes, use the IndexKey system:

```ts
import { getIndicesBetween, getIndicesAbove, getIndicesBelow, sortByIndex } from '@tldraw/utils'

// Insert multiple shapes between two existing ones
const newIndices = getIndicesBetween(belowShape?.index ?? null, aboveShape?.index ?? null, 3)

// Get multiple indices above a shape
const indicesAbove = getIndicesAbove(lastShape?.index ?? null, 3)

// Get multiple indices below a shape
const indicesBelow = getIndicesBelow(firstShape?.index ?? null, 3)

const newShapes = shapeData.map((data, i) => ({
	...data,
	index: newIndices[i],
}))

// Sort all shapes by their indices
const sortedShapes = allShapes.sort(sortByIndex)
```

You can also generate a sequence of indices starting from a specific point:

```ts
import { getIndices } from '@tldraw/utils'

// Generate 5 indices starting from 'a1' (returns start + n indices)
const indices = getIndices(5, 'a1') // ['a1', 'a2', 'a3', 'a4', 'a5', 'a6']
```

The IndexKey system ensures that insertion operations always succeed, even with complex reordering scenarios.

### Media Helpers: File Processing

Working with images and videos requires careful handling of formats, dimensions, and browser compatibility. The MediaHelpers provide robust utilities for common media operations.

The package also exports constants for supported media types:

```ts
import {
	DEFAULT_SUPPORTED_IMAGE_TYPES,
	DEFAULT_SUPPORT_VIDEO_TYPES,
	DEFAULT_SUPPORTED_MEDIA_TYPES,
	DEFAULT_SUPPORTED_MEDIA_TYPE_LIST,
} from '@tldraw/utils'

console.log(DEFAULT_SUPPORTED_IMAGE_TYPES)
// ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif', 'image/apng', 'image/avif']

console.log(DEFAULT_SUPPORT_VIDEO_TYPES)
// ['video/mp4', 'video/webm', 'video/quicktime']

console.log(DEFAULT_SUPPORTED_MEDIA_TYPE_LIST)
// Comma-separated string of all supported types
```

#### Image Processing

You can get image dimensions and metadata:

```ts
import { MediaHelpers } from '@tldraw/utils'

// Get image dimensions from a Blob
const { w, h } = await MediaHelpers.getImageSize(imageFile)
console.log(`Image is ${w}x${h} pixels`)

// Load image from URL and get dimensions together
const { image, w: width, h: height } = await MediaHelpers.getImageAndDimensions(imageUrl)
// Use the loaded image element and dimensions
```

#### Format Detection

Check media formats and capabilities:

```ts
const isImage = MediaHelpers.isImageType('image/png') // true
const isStatic = MediaHelpers.isStaticImageType('image/gif') // false
const isAnimated = MediaHelpers.isAnimatedImageType('image/gif') // true
const isVector = MediaHelpers.isVectorImageType('image/svg+xml') // true

// Check if a specific file is animated
const animated = await MediaHelpers.isAnimated(gifFile)
```

#### Video Operations

Process video files and extract frames:

```ts
// Get video dimensions from a Blob
const { w, h } = await MediaHelpers.getVideoSize(videoFile)

// Load a video from URL
const videoElement = await MediaHelpers.loadVideo(videoUrl)

// Extract a frame as a data URL from loaded video element
const frameDataUrl = await MediaHelpers.getVideoFrameAsDataUrl(videoElement, 0)
```

## 4. Performance and Optimization

### Throttling and Debouncing

High-frequency events like mouse moves and resize events need careful handling to maintain smooth performance.

#### Frame-Rate Throttling

Use `fpsThrottle` for smooth 60fps updates:

```ts
import { fpsThrottle } from '@tldraw/utils'

const updateCanvas = fpsThrottle(() => {
	// This will run at most once per frame (16.67ms)
	redrawCanvas()
})

// Call as often as you want - it's automatically throttled
document.addEventListener('mousemove', updateCanvas)
```

#### Next-Frame Throttling

For less critical updates, use `throttleToNextFrame`:

```ts
import { throttleToNextFrame } from '@tldraw/utils'

const updateUI = throttleToNextFrame(() => {
	// Batches multiple calls into the next animation frame
	updateStatusBar()
})

// Returns a cancel function
const cancel = updateUI()
// Call cancel() to prevent execution if needed
```

> Note: `throttleToNextFrame` batches multiple calls to the same function and executes it only once on the next frame.

#### Debouncing User Input

Use `debounce` for operations that should only happen after user input stops:

```ts
import { debounce } from '@tldraw/utils'

const saveDocument = debounce(async () => {
	await saveToServer(document)
	console.log('Document saved!')
}, 1000)

// Call whenever document changes
document.addEventListener('input', saveDocument)
// Only saves 1 second after user stops typing
```

The debounced function returns a promise and includes a `cancel` method:

```ts
const debouncedSave = debounce(saveToServer, 1000)

// Start a save operation
const savePromise = debouncedSave()

// Cancel if needed
debouncedSave.cancel()
```

### Performance Measurement

Understanding where time is spent helps optimize tldraw applications.

#### Performance Tracking

Use `PerformanceTracker` for detailed timing analysis:

```ts
import { PerformanceTracker } from '@tldraw/utils'

const tracker = new PerformanceTracker()

tracker.start('render')
renderShapes()
tracker.stop()

tracker.start('interaction')
handleUserInteraction()
tracker.stop()
```

> Tip: Performance measurements integrate with browser DevTools Performance tab for detailed analysis.

### Mathematical Operations

The utils package includes mathematical helpers for interpolation and deterministic randomness.

#### Linear Interpolation

Use `lerp` and `invLerp` for smooth transitions:

```ts
import { lerp, invLerp } from '@tldraw/utils'

// Linear interpolate between two values
const interpolated = lerp(0, 100, 0.5) // 50

// Inverse interpolation - find t given result
const t = invLerp(0, 100, 25) // 0.25
```

#### Value Mapping

Use `modulate` to map values between different ranges:

```ts
import { modulate } from '@tldraw/utils'

// Map a value from one range to another
const result = modulate(5, [0, 10], [0, 100]) // 50

// With clamping to prevent out-of-bounds results
const clamped = modulate(15, [0, 10], [0, 100], true) // 100 (clamped)
```

#### Deterministic Random Numbers

Use `rng` for repeatable pseudo-random sequences:

```ts
import { rng } from '@tldraw/utils'

// Create a seeded random number generator
const random = rng('my-seed')

const num1 = random() // Always the same for this seed
const num2 = random() // Next number in sequence

// Different seed produces different sequence
const otherRandom = rng('other-seed')
const different = otherRandom() // Different value
```

> Tip: The `rng` function returns values between -1 and 1, making it useful for generating consistent random variations. You can normalize to other ranges as needed.

## 5. Cross-Platform Compatibility

### Storage Operations

Browser storage operations need careful error handling for quota limits and privacy modes.

#### LocalStorage with Error Handling

The storage utilities handle errors gracefully (note that these functions are marked as `@internal` but are exported for use):

```ts
import { getFromLocalStorage, setInLocalStorage, clearLocalStorage } from '@tldraw/utils'

// These handle quota exceeded errors and privacy mode
setInLocalStorage('user-preferences', JSON.stringify(preferences))
const saved = getFromLocalStorage('user-preferences')

// Clear all data when needed
clearLocalStorage()
```

#### SessionStorage Operations

Session storage works identically:

```ts
import { getFromSessionStorage, setInSessionStorage, clearSessionStorage } from '@tldraw/utils'

// Temporary data for the current session
setInSessionStorage('current-tool', 'select')
const currentTool = getFromSessionStorage('current-tool')

// Clear all session data when needed
clearSessionStorage()
```

### File Operations

The `FileHelpers` class provides utilities for working with files and data conversion.

#### Data URL Conversion

Convert between different file formats:

```ts
import { FileHelpers } from '@tldraw/utils'

// Convert blob to data URL
const dataUrl = await FileHelpers.blobToDataUrl(imageBlob)
console.log(dataUrl) // "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."

// Convert blob to text
const textContent = await FileHelpers.blobToText(textBlob)

// Fetch URL and convert to different formats
const buffer = await FileHelpers.urlToArrayBuffer('https://example.com/image.png')
const blob = await FileHelpers.urlToBlob('https://example.com/data.json')
const urlAsDataUrl = await FileHelpers.urlToDataUrl('https://example.com/image.svg')
```

#### MIME Type Management

Modify file MIME types while preserving content:

```ts
// Change MIME type of a Blob
const newBlob = FileHelpers.rewriteMimeType(originalBlob, 'image/webp')

// Change MIME type of a File (preserves filename)
const newFile = FileHelpers.rewriteMimeType(originalFile, 'application/json')
```

### URL Processing

Parsing URLs from user input requires careful validation:

```ts
import { safeParseUrl } from '@tldraw/utils'

function handleUserUrl(input: string) {
	const url = safeParseUrl(input)
	if (url) {
		console.log(`Valid URL: ${url.href}`)
		return url
	} else {
		console.log('Invalid URL provided')
		return null
	}
}
```

> Note: `safeParseUrl` returns `undefined` for invalid URLs instead of throwing exceptions.

## 6. Debugging and Development

### Timer Management

The `Timers` class helps manage timeouts and intervals with automatic cleanup:

```ts
import { Timers } from '@tldraw/utils'

class MyComponent {
	private timers = new Timers()

	startPeriodicUpdate() {
		// Set timers with context IDs for organization
		this.timers.setTimeout('component', () => this.autoSave(), 5000)
		this.timers.setInterval('component', () => this.refresh(), 1000)
		this.timers.requestAnimationFrame('component', () => this.render())
	}

	cleanup() {
		// Clears all timers for this context
		this.timers.dispose('component')
		// Or dispose all contexts
		this.timers.disposeAll()
	}

	// You can also get context-bound timer functions
	getContextTimers() {
		return this.timers.forContext('component')
	}
}
```

### Error Annotation

You can add debugging context to errors:

```ts
import { annotateError, getErrorAnnotations } from '@tldraw/utils'

try {
	performRiskyOperation()
} catch (error) {
	annotateError(error, {
		tags: { operation: 'shape-creation' },
		extras: { shapeId: 'shape-123' },
	})

	// Later, retrieve the context
	const annotations = getErrorAnnotations(error)
	console.log('Error context:', annotations)

	throw error // Re-throw with added context
}
```

### Utility Functions

Several utility functions provide common functionality:

#### Unique ID Generation

Generate unique identifiers for objects:

```ts
import { uniqueId, mockUniqueId, restoreUniqueId } from '@tldraw/utils'

// Generate a unique ID
const id = uniqueId() // 'VxhUYo3k8GsLmWkjhGq9e'

// Mock IDs for testing (returns predictable sequence)
mockUniqueId(() => 'mock-id-0')
const testId1 = uniqueId() // 'mock-id-0'
const testId2 = uniqueId() // 'mock-id-0'

// Restore normal ID generation
restoreUniqueId()
```

#### Content Hashing

Generate consistent hashes for deduplication and caching:

```ts
import { getHashForString, getHashForObject, getHashForBuffer, lns } from '@tldraw/utils'

// Hash a string
const stringHash = getHashForString('hello world') // '1794106052'

// Hash an object (uses JSON.stringify internally)
const objectHash = getHashForObject({ name: 'Alice', age: 30 })

// Hash binary data
const buffer = new ArrayBuffer(8)
const bufferHash = getHashForBuffer(buffer)

// Locale-normalized string for consistent hashing across cultures
const normalized = lns('Café') // Handles unicode normalization
```

#### Sorting Utilities

Sort objects by common properties:

```ts
import { sortById } from '@tldraw/utils'

const items = [
	{ id: 'c', name: 'Charlie' },
	{ id: 'a', name: 'Alice' },
	{ id: 'b', name: 'Bob' },
]

const sorted = items.sort(sortById)
// [{ id: 'a', name: 'Alice' }, { id: 'b', name: 'Bob' }, { id: 'c', name: 'Charlie' }]
```

#### Collection Utilities

Extract values from iterables:

```ts
import { getFirstFromIterable } from '@tldraw/utils'

const set = new Set([1, 2, 3])
const first = getFirstFromIterable(set)

const map = new Map([
	['a', 1],
	['b', 2],
])
const firstValue = getFirstFromIterable(map)
```

#### Method Binding Decorator

The `@bind` decorator ensures methods are properly bound to their class instance:

```ts
import { bind } from '@tldraw/utils'

class EventHandler {
	name = 'MyHandler'

	@bind
	handleClick(event: MouseEvent) {
		console.log(`${this.name} handled click`) // 'this' is always correct
	}
}

const handler = new EventHandler()
// Safe to use as callback - 'this' binding preserved
element.addEventListener('click', handler.handleClick)
```

### Development Helpers

Some utilities are particularly helpful during development:

```ts
import { warnOnce, exhaustiveSwitchError } from '@tldraw/utils'

// Warn about deprecated usage, but only once
function oldFunction() {
	warnOnce('oldFunction is deprecated, use newFunction instead')
	// Continue with implementation...
}

// Ensure switch statements are exhaustive
function handleShapeType(shape: Shape) {
	switch (shape.type) {
		case 'rect':
			return handleRect(shape)
		case 'circle':
			return handleCircle(shape)
		default:
			// TypeScript error if new shape types are added but not handled
			throw exhaustiveSwitchError(shape)
	}
}
```

### Value Validation

Type guards provide runtime checking with TypeScript integration:

```ts
import { isDefined, isNonNull, isNonNullish } from '@tldraw/utils'

function processUserInput(data: unknown) {
	if (isDefined(data)) {
		// TypeScript knows data is not undefined
		console.log('Data provided:', data)
	}

	if (isNonNullish(data)) {
		// TypeScript knows data is not null or undefined
		return processData(data)
	}

	throw new Error('Invalid input data')
}
```

## 7. Integration Patterns

### Using Utils in Custom Shapes

When creating custom shapes, utils provide essential building blocks:

```ts
import { WeakCache, Result, assert, getIndexBetween } from '@tldraw/utils'

class CustomShapeUtil extends BaseBoxShapeUtil<CustomShape> {
	private geometryCache = new WeakCache<CustomShape, Geometry>()

	getGeometry(shape: CustomShape): Geometry {
		return this.geometryCache.get(shape, (s) => {
			return this.computeComplexGeometry(s)
		})
	}

	canReceiveNewChildIndex(shape: CustomShape, droppingShape: Shape): boolean {
		// Use Result pattern for complex validation
		const validation = this.validateChildShape(droppingShape)
		return validation.ok
	}

	private validateChildShape(shape: Shape): Result<true, string> {
		if (!this.isCompatibleChild(shape)) {
			return Result.err(`${shape.type} cannot be a child of CustomShape`)
		}
		return Result.ok(true)
	}
}
```

### Custom Tool Development

Tools benefit from utils for state management and performance:

```ts
import { debounce, throttleToNextFrame, ExecutionQueue, partition } from '@tldraw/utils'

class CustomTool extends StateNode {
	private updateQueue = new ExecutionQueue(16) // 60fps limit
	private debouncedSave = debounce(() => this.saveToolState(), 1000)

	onPointerMove = throttleToNextFrame((info: TLPointerEventInfo) => {
		this.updateQueue.push(() => this.handleMove(info))
		this.debouncedSave()
	})

	private handleMove(info: TLPointerEventInfo) {
		const shapes = this.editor.getCurrentPageShapes()
		const [movingShapes, staticShapes] = partition(shapes, (shape) => this.isShapeMoving(shape))

		// Update only the shapes that need it
		this.updateMovingShapes(movingShapes)
	}
}
```

### Error Handling in Applications

Robust applications use Result patterns throughout:

```ts
import { Result, assertExists } from '@tldraw/utils'

class DocumentManager {
	async loadDocument(id: string): Promise<Result<Document, string>> {
		try {
			const data = await this.storage.load(id)
			assertExists(data, `Document ${id} not found`)

			const parseResult = this.parseDocument(data)
			if (!parseResult.ok) {
				return Result.err(`Failed to parse document: ${parseResult.error}`)
			}

			return Result.ok(parseResult.value)
		} catch (error) {
			return Result.err(`Storage error: ${error.message}`)
		}
	}

	private parseDocument(data: unknown): Result<Document, string> {
		// Detailed parsing with Result pattern...
		return Result.ok(validDocument)
	}
}
```

## Key Benefits

The `@tldraw/utils` package provides:

**Type Safety**: Every utility maintains and enhances TypeScript's type information, preventing runtime errors and improving developer experience.

**Performance**: Optimized implementations with caching, throttling, and memory management prevent performance bottlenecks in complex applications.

**Reliability**: Comprehensive error handling with Result patterns and assertions creates predictable, debuggable applications.

**Cross-Platform**: Consistent behavior across browsers, Node.js, and other JavaScript environments with appropriate polyfills and fallbacks.

These utilities form the foundation that makes tldraw's complex canvas operations feel smooth and reliable. Whether you're building custom shapes, tools, or integrating tldraw into larger applications, these utilities provide the building blocks for professional-grade functionality.
