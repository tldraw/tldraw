````markdown
# Utils Package Context

## Overview

The `@tldraw/utils` package provides foundational utility functions used throughout the tldraw codebase. It contains pure, reusable helper functions for common programming tasks including array manipulation, object operations, control flow, media processing, and performance optimization.

## Package Structure & Exports

The utils package uses a barrel export pattern through `index.ts`, exposing all utilities as named exports:

```typescript
// Main entry point exports
export * from './lib/array'
export * from './lib/object'
export * from './lib/control'
export * from './lib/reordering'
export * from './lib/media/media'
export * from './lib/ExecutionQueue'
export * from './lib/perf'
export * from './lib/PerformanceTracker'
export * from './lib/hash'
export * from './lib/cache'
export * from './lib/storage'
export * from './lib/file'
export * from './lib/value'
export * from './lib/network'
export * from './lib/error'
// ... and more

// Import examples:
import { dedupe, rotateArray, partition } from '@tldraw/utils'
import { ExecutionQueue, PerformanceTracker } from '@tldraw/utils'
import { Result, assert, exhaustiveSwitchError } from '@tldraw/utils'
```
````

## Architecture

### Core Categories

#### Array Utilities (`array.ts`)

Type-safe array manipulation functions with complete TypeScript signatures:

```typescript
// Array transformation and analysis
rotateArray<T>(arr: T[], offset: number): T[]
dedupe<T>(input: T[], equals?: (a: any, b: any) => boolean): T[]
partition<T>(arr: readonly T[], predicate: (item: T, index: number) => boolean): [T[], T[]]

// Array search and comparison
minBy<T>(arr: readonly T[], fn: (item: T) => number): T | undefined
maxBy<T>(arr: readonly T[], fn: (item: T) => number): T | undefined
areArraysShallowEqual<T>(arr1: readonly T[], arr2: readonly T[]): boolean

// Advanced merging with override support
mergeArraysAndReplaceDefaults<Key extends string | number | symbol, T extends Record<Key, unknown>>(
  key: Key,
  custom: T[],
  defaults: T[]
): T[]
```

#### Object Utilities (`object.ts`)

Type-preserving object operations with complete signatures:

```typescript
// Type-safe object key/value extraction
objectMapKeys<Key extends string | number | symbol>(object: {readonly [K in Key]: unknown}): Array<Key>
objectMapValues<Key extends string | number | symbol, Value>(object: {readonly [K in Key]: Value}): Array<Value>
objectMapEntries<Key extends string | number | symbol, Value>(object: {readonly [K in Key]: Value}): Array<[Key, Value]>

// Object transformation and filtering with full type preservation
filterEntries<Key extends string | number | symbol, Value>(
  object: {readonly [K in Key]: Value},
  predicate: (key: Key, value: Value) => boolean
): {[K in Key]: Value}

mapObjectMapValues<Key extends string | number | symbol, ValueBefore, ValueAfter>(
  object: {readonly [K in Key]: ValueBefore},
  mapper: (key: Key, value: ValueBefore) => ValueAfter
): {readonly [K in Key]: ValueAfter}

areObjectsShallowEqual<T extends Record<string | number | symbol, unknown>>(obj1: T, obj2: T): boolean
```

#### Control Flow (`control.ts`)

Error handling and async utilities:

```typescript
// Result type for error handling without exceptions
interface OkResult<T> { readonly ok: true; readonly value: T }
interface ErrorResult<E> { readonly ok: false; readonly error: E }
type Result<T, E> = OkResult<T> | ErrorResult<E>

class Result {
  static ok<T>(value: T): OkResult<T>
  static err<E>(error: E): ErrorResult<E>
}

// Assertions with stack trace optimization
assert(value: unknown, message?: string): asserts value
assertExists<T>(value: T | null | undefined, message?: string): NonNullable<T>
exhaustiveSwitchError(value: never, property?: string): never

// Promise utilities
promiseWithResolve<T>(): Promise<T> & {
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}
sleep(ms: number): Promise<void>
```

#### Reordering System (`reordering.ts`)

Fractional indexing for item ordering. IndexKey is a branded string type that ensures type safety for ordering operations:

```typescript
// Brand type prevents mixing regular strings with index keys
type IndexKey = string & { __brand: 'indexKey' }
const ZERO_INDEX_KEY = 'a0' as IndexKey

// Generate indices for ordering - creates fractional indices between bounds
getIndices(below: IndexKey | null, above: IndexKey | null, n: number): IndexKey[]
getIndexBetween(below: IndexKey | null, above: IndexKey | null): IndexKey
getIndexAbove(below: IndexKey | null): IndexKey
getIndexBelow(above: IndexKey | null): IndexKey
validateIndexKey(key: string): IndexKey

// Sort comparison function for items that have index properties
sortByIndex<T extends { index: IndexKey }>(a: T, b: T): number
```

#### Media Helpers (`media/media.ts`)

Media file processing and validation:

```typescript
// Supported media types constants
const DEFAULT_SUPPORTED_IMAGE_TYPES: readonly string[]
const DEFAULT_SUPPORT_VIDEO_TYPES: readonly string[]

class MediaHelpers {
	// Image processing
	static async getImageSize(file: File): Promise<{ w: number; h: number }>
	static async getImageAndDimensions(
		file: File
	): Promise<{ image: HTMLImageElement; w: number; h: number }>
	static isImageType(mimeType: string): boolean
	static isStaticImageType(mimeType: string): boolean
	static isVectorImageType(mimeType: string): boolean
	static isAnimatedImageType(mimeType: string): boolean
	static async isAnimated(file: File): Promise<boolean>

	// Video processing
	static async getVideoSize(file: File): Promise<{ w: number; h: number }>
	static async getVideoFrameAsDataUrl(file: File): Promise<string>
	static async loadVideo(url: string): Promise<HTMLVideoElement>

	// URL management
	static usingObjectURL<T>(blob: Blob, fn: (url: string) => T): T
}
```

### Performance & Execution

#### ExecutionQueue (`ExecutionQueue.ts`)

Sequential task execution with optional timing - ensures tasks run one at a time:

```typescript
class ExecutionQueue {
  constructor(private readonly timeout?: number)

  // Add task to queue - waits for previous tasks to complete
  async push<T>(task: () => T | Promise<T>): Promise<Awaited<T>>
  isEmpty(): boolean
  close(): void

  // Usage example:
  const queue = new ExecutionQueue(5000) // 5 second timeout

  // Tasks execute sequentially, not in parallel
  const result1 = await queue.push(() => expensiveOperation1())
  const result2 = await queue.push(() => expensiveOperation2()) // Waits for operation1
}
```

#### Performance Tracking (`perf.ts`, `PerformanceTracker.ts`)

Performance measurement and monitoring:

```typescript
// Duration measurement utilities
measureDuration<T>(fn: () => T): {duration: number; result: T}
measureCbDuration<T>(fn: (cb: () => void) => T): Promise<{duration: number; result: T}>
measureAverageDuration(label: string, fn: () => void, iterations: number): void

// Performance tracking across app lifecycle
class PerformanceTracker {
  mark(name: string): void
  measure(name: string, start?: string, end?: string): PerformanceMeasure | void

  // Usage example:
  const tracker = new PerformanceTracker()
  tracker.mark('render-start')
  // ... rendering logic
  tracker.mark('render-end')
  tracker.measure('render-duration', 'render-start', 'render-end')
}
```

### Data Processing

#### Hashing (`hash.ts`)

Content hashing for deduplication and caching:

```typescript
// Hash generation for various input types
getHashForString(string: string): string
getHashForBuffer(buffer: ArrayBuffer): string
getHashForObject(object: object): string
lns(str: string): string // locale-normalized string for consistent hashing
```

#### Caching (`cache.ts`)

Weak reference caching system that prevents memory leaks:

```typescript
class WeakCache<T extends object, U> {
	get<P extends T>(item: P, cb: (item: P) => U): U

	// Usage example - caches expensive computations tied to object lifecycle:
	cache = new WeakCache<Shape, BoundingBox>()
	bbox = cache.get(shape, (s) => computeBoundingBox(s)) // Computed once per shape
}
```

#### Storage (`storage.ts`)

Browser storage utilities with comprehensive error handling:

```typescript
// LocalStorage operations with error boundaries
getFromLocalStorage(key: string): string | null
setInLocalStorage(key: string, value: string): void
deleteFromLocalStorage(key: string): void
clearLocalStorage(): void

// SessionStorage operations
getFromSessionStorage(key: string): string | null
setInSessionStorage(key: string, value: string): void
deleteFromSessionStorage(key: string): void
clearSessionStorage(): void
```

### Utility Functions

#### Timing & Throttling

```typescript
// Throttling utilities for performance
debounce<T extends (...args: any[]) => any>(func: T, wait: number): T
fpsThrottle<T extends (...args: any[]) => any>(func: T): T // 60fps throttling
throttleToNextFrame<T extends (...args: any[]) => any>(func: T): T

// Timer management with cleanup
class Timers {
  setTimeout(handler: () => void, timeout?: number): number
  setInterval(handler: () => void, timeout?: number): number
  requestAnimationFrame(handler: () => void): number
  dispose(): void // Cleanup all timers
}
```

#### File Operations (`file.ts`)

File system and blob utilities:

```typescript
class FileHelpers {
	static mimeTypeFromFilename(filename: string): string
	static extension(filename: string): string
	static isImage(file: File): boolean
	static isVideo(file: File): boolean
	static async dataUrlToBlob(dataUrl: string): Promise<Blob>
	static async blobToDataUrl(blob: Blob): Promise<string>
}
```

#### Value Processing (`value.ts`)

Value validation and cloning:

```typescript
// Type guards with proper type narrowing
isDefined<T>(value: T): value is NonNullable<T>
isNonNull<T>(value: T): value is NonNull<T>
isNonNullish<T>(value: T): value is NonNullable<T>

// Structured cloning with fallbacks
structuredClone<T>(obj: T): T
isNativeStructuredClone(): boolean
```

#### Network (`network.ts`)

Network utilities with cross-platform polyfills:

```typescript
// Cross-platform fetch and Image with Node.js compatibility
export const fetch: typeof globalThis.fetch
export const Image: typeof globalThis.Image
```

### Specialized Utilities

#### String Processing

```typescript
// String enumeration helper for creating string literal types
stringEnum<T extends Record<string, string>>(obj: T): T

// URL processing with safe parsing
safeParseUrl(url: string): URL | undefined
```

#### Mathematical Operations

```typescript
// Interpolation and random number generation
lerp(a: number, b: number, t: number): number
invLerp(a: number, b: number, v: number): number
modulate(value: number, rangeA: [number, number], rangeB: [number, number]): number
rng(seed?: string): () => number // Seedable PRNG for deterministic randomness
```

#### Error Enhancement (`error.ts`)

Error annotation system for debugging:

```typescript
interface ErrorAnnotations {
  tags?: {[key: string]: {value: unknown}}
  extras?: {[key: string]: unknown}
}

annotateError(error: unknown, annotations: ErrorAnnotations): void
getErrorAnnotations(error: unknown): ErrorAnnotations | undefined
```

## Key Design Patterns

### Type Safety

- Extensive use of TypeScript generics for type preservation
- Brand types for nominal typing (IndexKey prevents string/index confusion)
- Type guards for runtime type checking with proper narrowing
- Assertion functions that provide type information to TypeScript

### Performance Optimization

- Stack trace optimization with `omitFromStackTrace` for cleaner debugging
- Weak reference caching to prevent memory leaks
- FPS-aware throttling for smooth 60fps animations
- Efficient object comparison with early returns and shallow checks

### Cross-Platform Compatibility

The utils package ensures consistent behavior across different JavaScript environments:

**Browser Compatibility:**

- Storage utilities handle quota exceeded errors gracefully
- Media helpers work with File API and canvas operations
- Performance tracking uses native Performance API when available

**Node.js Compatibility:**

- Network utilities provide fetch and Image polyfills for server environments
- File operations handle both browser Blob/File APIs and Node.js buffers
- Performance tracking falls back to high-resolution time measurements

**Test Environment:**

- Mock-friendly APIs that can be easily stubbed
- Deterministic random number generation for reproducible tests
- Environment detection utilities for conditional behavior

### Functional Programming

- Pure functions with no side effects (except explicit I/O operations)
- Immutable operations that return new objects rather than mutating inputs
- Higher-order functions for common patterns like filtering and mapping
- Composition-friendly API design that works well with pipes and chains

## Usage Patterns & Examples

### In Editor Package

```typescript
// Array utilities for managing shape collections
const visibleShapes = shapes.filter((shape) => shape.visible)
const uniqueShapes = dedupe(shapes, (a, b) => a.id === b.id)
const [selectedShapes, unselectedShapes] = partition(shapes, (shape) => shape.selected)

// Reordering system for z-index management
const newIndex = getIndexBetween(belowShape?.index ?? null, aboveShape?.index ?? null)
const sortedShapes = shapes.sort(sortByIndex)
```

### In State Package

```typescript
// Control flow utilities for error handling
const result = Result.ok(computedValue)
if (!result.ok) {
	// Handle error case
	return result.error
}

// Performance tracking for reactive updates
const tracker = new PerformanceTracker()
tracker.mark('reaction-start')
// ... reactive computation
tracker.measure('reaction-time', 'reaction-start')
```

### In Store Package

```typescript
// Hashing for record deduplication
const recordHash = getHashForObject(record)
const isDuplicate = existingHashes.has(recordHash)

// Execution queue for atomic operations
const writeQueue = new ExecutionQueue()
await writeQueue.push(() => database.write(operation))
```

## Dependencies

### External Dependencies

- `lodash.isequal`, `lodash.isequalwith`: Deep equality comparison for complex objects
- `lodash.throttle`, `lodash.uniq`: Performance utilities with battle-tested implementations
- `fractional-indexing-jittered`: Fractional indexing implementation for stable ordering

### Peer Dependencies

None - the utils package is completely self-contained and provides the foundation for other tldraw packages.

### Internal Dependencies

None - this package has no dependencies on other `@tldraw/*` packages, making it the foundation of the dependency graph.

## When to Use Utils vs Other Packages

**Use @tldraw/utils when:**

- You need basic array/object manipulation utilities
- You're implementing error handling with Result types
- You need performance measurement or throttling
- You're working with media files or storage operations
- You need cross-platform compatibility utilities

**Use other packages when:**

- `@tldraw/state` for reactive state management
- `@tldraw/store` for document/record management
- `@tldraw/editor` for canvas/shape operations
- `@tldraw/tldraw` for complete editor with UI

## Testing Patterns

The utils package follows co-located testing with `.test.ts` files alongside source files:

```typescript
// Example test patterns
describe('ExecutionQueue', () => {
	it('executes tasks sequentially', async () => {
		const queue = new ExecutionQueue()
		const results: number[] = []

		// These should execute in order, not parallel
		await Promise.all([
			queue.push(() => {
				results.push(1)
				return 1
			}),
			queue.push(() => {
				results.push(2)
				return 2
			}),
			queue.push(() => {
				results.push(3)
				return 3
			}),
		])

		expect(results).toEqual([1, 2, 3])
	})
})
```

## Troubleshooting Common Issues

### Performance Issues

- Use `fpsThrottle` for UI updates that happen frequently
- Use `WeakCache` for expensive computations tied to object lifecycles
- Use `ExecutionQueue` to prevent overwhelming the system with parallel operations

### Memory Leaks

- Prefer `WeakCache` over `Map` for object-keyed caches
- Always call `dispose()` on `Timers` instances
- Use `Result` types instead of throwing exceptions in hot paths

### Type Safety Issues

- Use assertion functions (`assert`, `assertExists`) for runtime type checking
- Prefer branded types (like `IndexKey`) for values that shouldn't be mixed
- Use type guards (`isDefined`, `isNonNull`) before accessing potentially undefined values

### Cross-Platform Issues

- Use provided `fetch` and `Image` exports instead of globals for Node.js compatibility
- Handle storage quota errors with try/catch around storage operations
- Use `safeParseUrl` instead of `new URL()` constructor for user input

## Version Compatibility

The utils package maintains backward compatibility within major versions. When upgrading:

- Check for deprecated function warnings in TypeScript
- Review breaking changes in CHANGELOG.md
- Test thoroughly with your specific usage patterns
- Consider using the migration scripts provided for major version updates

## Key Benefits

### Performance

- Optimized algorithms for common operations (O(n) where possible)
- Memory-efficient caching with automatic cleanup
- Non-blocking execution patterns with queuing
- Minimal object allocations in hot paths

### Reliability

- Comprehensive error handling with Result types
- Type-safe operations prevent runtime errors
- Defensive programming practices throughout
- Extensive test coverage (>95% line coverage)

### Developer Experience

- Clear, descriptive function names following consistent patterns
- Comprehensive TypeScript types with proper generic constraints
- Well-documented public interfaces with usage examples
- Functional programming patterns that compose well

```

```
