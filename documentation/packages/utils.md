---
title: "@tldraw/utils"
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - utils
  - utilities
  - helpers
  - functions
  - foundation
---

The `@tldraw/utils` package provides foundational utility functions used throughout the tldraw codebase. It contains pure, reusable helper functions for common programming tasks including array manipulation, object operations, control flow, media processing, and performance optimization.

## Overview

This package is the foundation of the tldraw dependency graph—it has no dependencies on other `@tldraw/*` packages. All utilities are designed to be:

- **Type-safe**: Full TypeScript support with proper type inference
- **Pure**: No side effects except explicit I/O operations
- **Performant**: Optimized for common use cases
- **Cross-platform**: Works in browser, Node.js, and test environments

## Array utilities

### Transformation and analysis

```typescript
import { dedupe, rotateArray, partition, minBy, maxBy } from '@tldraw/utils'

// Remove duplicates
const unique = dedupe([1, 2, 2, 3, 3, 3]) // [1, 2, 3]

// Custom equality for objects
const uniqueUsers = dedupe(users, (a, b) => a.id === b.id)

// Rotate array elements
const rotated = rotateArray([1, 2, 3, 4], 1) // [2, 3, 4, 1]

// Split array by predicate
const [selected, unselected] = partition(shapes, (s) => s.selected)

// Find extremes
const cheapest = minBy(products, (p) => p.price)
const tallest = maxBy(people, (p) => p.height)
```

### Comparison

```typescript
import { areArraysShallowEqual } from '@tldraw/utils'

// Shallow equality check
areArraysShallowEqual([1, 2, 3], [1, 2, 3]) // true
areArraysShallowEqual([1, 2], [1, 2, 3])    // false
```

### Merging with defaults

```typescript
import { mergeArraysAndReplaceDefaults } from '@tldraw/utils'

// Merge arrays, replacing default items with custom ones by key
const tools = mergeArraysAndReplaceDefaults(
  'id',
  customTools,
  defaultTools
)
```

## Object utilities

### Type-safe key/value extraction

```typescript
import { objectMapKeys, objectMapValues, objectMapEntries } from '@tldraw/utils'

const scores = { alice: 100, bob: 85 }

objectMapKeys(scores)    // ['alice', 'bob'] with proper types
objectMapValues(scores)  // [100, 85]
objectMapEntries(scores) // [['alice', 100], ['bob', 85]]
```

### Transformation and filtering

```typescript
import { filterEntries, mapObjectMapValues, areObjectsShallowEqual } from '@tldraw/utils'

// Filter object entries
const passing = filterEntries(scores, (key, value) => value >= 90)

// Transform values
const doubled = mapObjectMapValues(scores, (key, value) => value * 2)

// Shallow equality
areObjectsShallowEqual({ a: 1 }, { a: 1 }) // true
```

## Control flow

### Result type

Error handling without exceptions using a Result type:

```typescript
import { Result } from '@tldraw/utils'

function parseConfig(input: string): Result<Config, ParseError> {
  try {
    return Result.ok(JSON.parse(input))
  } catch (e) {
    return Result.err(new ParseError(e.message))
  }
}

const result = parseConfig(input)
if (result.ok) {
  // result.value is typed as Config
  useConfig(result.value)
} else {
  // result.error is typed as ParseError
  logError(result.error)
}
```

### Assertions

```typescript
import { assert, assertExists, exhaustiveSwitchError } from '@tldraw/utils'

// Assert truthy value
assert(user.isAdmin, 'User must be admin')

// Assert non-null/undefined
const name = assertExists(user.name, 'User must have a name')

// Exhaustive switch checking
type Shape = 'circle' | 'square'
function getArea(shape: Shape): number {
  switch (shape) {
    case 'circle': return Math.PI * r * r
    case 'square': return s * s
    default: exhaustiveSwitchError(shape) // TypeScript error if cases missed
  }
}
```

### Promise utilities

```typescript
import { promiseWithResolve, sleep } from '@tldraw/utils'

// Promise with external resolve/reject
const { promise, resolve, reject } = promiseWithResolve<string>()
setTimeout(() => resolve('done'), 1000)
await promise // 'done'

// Async delay
await sleep(500) // Wait 500ms
```

## Reordering system

Fractional indexing for stable item ordering:

```typescript
import {
  getIndexBetween,
  getIndexAbove,
  getIndexBelow,
  getIndices,
  sortByIndex,
  ZERO_INDEX_KEY,
} from '@tldraw/utils'

// Generate index between two items
const newIndex = getIndexBetween(itemA.index, itemB.index)

// Generate index above/below
const topIndex = getIndexAbove(highestItem.index)
const bottomIndex = getIndexBelow(lowestItem.index)

// Generate multiple indices
const indices = getIndices(startIndex, endIndex, 5) // 5 indices between

// Sort items by index
const sorted = items.sort(sortByIndex)
```

`IndexKey` is a branded string type that ensures type safety:

```typescript
type IndexKey = string & { __brand: 'indexKey' }

// Use validateIndexKey to convert strings to IndexKey
const key = validateIndexKey('a0')
```

## Media helpers

### Image processing

```typescript
import { MediaHelpers } from '@tldraw/utils'

// Get image dimensions
const { w, h } = await MediaHelpers.getImageSize(file)

// Check image type
MediaHelpers.isImageType('image/png')        // true
MediaHelpers.isStaticImageType('image/png')  // true
MediaHelpers.isAnimatedImageType('image/gif') // true
MediaHelpers.isVectorImageType('image/svg+xml') // true

// Check if GIF is actually animated
const animated = await MediaHelpers.isAnimated(gifFile)
```

### Video processing

```typescript
// Get video dimensions
const { w, h } = await MediaHelpers.getVideoSize(videoFile)

// Extract video frame as data URL (for thumbnails)
const frameUrl = await MediaHelpers.getVideoFrameAsDataUrl(videoFile)

// Load video element
const video = await MediaHelpers.loadVideo(videoUrl)
```

### Object URL management

```typescript
// Safely use object URLs with automatic cleanup
const result = MediaHelpers.usingObjectURL(blob, (url) => {
  // Use url here
  return processImage(url)
})
// URL is automatically revoked after callback
```

## Execution queue

Sequential task execution prevents race conditions:

```typescript
import { ExecutionQueue } from '@tldraw/utils'

const queue = new ExecutionQueue(5000) // 5 second timeout

// Tasks execute sequentially, never in parallel
const result1 = await queue.push(() => saveToDatabase(data1))
const result2 = await queue.push(() => saveToDatabase(data2))

// Check queue state
queue.isEmpty() // true when no pending tasks

// Cleanup
queue.close()
```

## Performance utilities

### Measurement

```typescript
import { measureDuration, measureAverageDuration } from '@tldraw/utils'

// Measure single operation
const { duration, result } = measureDuration(() => expensiveOperation())
console.log(`Took ${duration}ms`)

// Measure average across iterations
measureAverageDuration('render', () => renderComponent(), 100)
```

### PerformanceTracker

```typescript
import { PerformanceTracker } from '@tldraw/utils'

const tracker = new PerformanceTracker()

tracker.mark('render-start')
// ... rendering logic
tracker.mark('render-end')

tracker.measure('render-duration', 'render-start', 'render-end')
```

### Throttling

```typescript
import { debounce, fpsThrottle, throttleToNextFrame } from '@tldraw/utils'

// Standard debounce
const debouncedSave = debounce(save, 300)

// Throttle to 60fps
const throttledUpdate = fpsThrottle(updatePosition)

// Throttle to next animation frame
const frameUpdate = throttleToNextFrame(render)
```

### Timer management

```typescript
import { Timers } from '@tldraw/utils'

const timers = new Timers()

timers.setTimeout(() => console.log('delayed'), 1000)
timers.setInterval(() => console.log('repeated'), 500)
timers.requestAnimationFrame(() => render())

// Clean up all timers at once
timers.dispose()
```

## Caching

### WeakCache

Memory-efficient caching tied to object lifecycles:

```typescript
import { WeakCache } from '@tldraw/utils'

const boundingBoxCache = new WeakCache<Shape, BoundingBox>()

// Computed once per shape, automatically cleaned up when shape is garbage collected
const bbox = boundingBoxCache.get(shape, (s) => computeBoundingBox(s))
```

## Hashing

```typescript
import { getHashForString, getHashForBuffer, getHashForObject, lns } from '@tldraw/utils'

// Hash different input types
const stringHash = getHashForString('content')
const bufferHash = getHashForBuffer(arrayBuffer)
const objectHash = getHashForObject({ key: 'value' })

// Locale-normalized string for consistent hashing
const normalized = lns('Café') // Consistent across locales
```

## Storage

Safe browser storage operations with error handling:

```typescript
import {
  getFromLocalStorage,
  setInLocalStorage,
  deleteFromLocalStorage,
  clearLocalStorage,
} from '@tldraw/utils'

// LocalStorage (persists across sessions)
setInLocalStorage('key', 'value')
const value = getFromLocalStorage('key')
deleteFromLocalStorage('key')
clearLocalStorage()

// SessionStorage (same API)
import { getFromSessionStorage, setInSessionStorage } from '@tldraw/utils'
```

These functions handle quota exceeded errors and other storage failures gracefully.

## File utilities

```typescript
import { FileHelpers } from '@tldraw/utils'

// Get MIME type from filename
FileHelpers.mimeTypeFromFilename('photo.jpg') // 'image/jpeg'

// Get extension
FileHelpers.extension('document.pdf') // 'pdf'

// Check file type
FileHelpers.isImage(file) // true for image files
FileHelpers.isVideo(file) // true for video files

// Convert between data URL and blob
const blob = await FileHelpers.dataUrlToBlob(dataUrl)
const dataUrl = await FileHelpers.blobToDataUrl(blob)
```

## Value utilities

```typescript
import { isDefined, isNonNull, isNonNullish, structuredClone } from '@tldraw/utils'

// Type guards with proper type narrowing
const items = [1, null, 2, undefined, 3]
const defined = items.filter(isDefined)     // [1, null, 2, 3]
const nonNull = items.filter(isNonNull)     // [1, 2, undefined, 3]
const nonNullish = items.filter(isNonNullish) // [1, 2, 3]

// Deep clone with structured clone algorithm
const clone = structuredClone(complexObject)
```

## Network utilities

Cross-platform fetch and Image:

```typescript
import { fetch, Image } from '@tldraw/utils'

// Works in both browser and Node.js
const response = await fetch('https://api.example.com/data')

// Image constructor that works everywhere
const img = new Image()
```

## Error annotation

Attach metadata to errors for debugging:

```typescript
import { annotateError, getErrorAnnotations } from '@tldraw/utils'

try {
  await riskyOperation()
} catch (error) {
  annotateError(error, {
    tags: { operation: { value: 'riskyOperation' } },
    extras: { userId: currentUser.id },
  })
  throw error
}

// Later in error handling
const annotations = getErrorAnnotations(error)
```

## Mathematical utilities

```typescript
import { lerp, invLerp, modulate, rng } from '@tldraw/utils'

// Linear interpolation
lerp(0, 100, 0.5) // 50

// Inverse linear interpolation
invLerp(0, 100, 50) // 0.5

// Map value from one range to another
modulate(5, [0, 10], [0, 100]) // 50

// Seedable random number generator
const random = rng('seed')
random() // Same sequence every time with same seed
```

## URL utilities

```typescript
import { safeParseUrl } from '@tldraw/utils'

// Safe URL parsing (returns undefined instead of throwing)
const url = safeParseUrl(userInput)
if (url) {
  console.log(url.hostname)
}
```

## Key files

- packages/utils/src/lib/array.ts - Array manipulation utilities
- packages/utils/src/lib/object.ts - Object manipulation utilities
- packages/utils/src/lib/control.ts - Control flow (Result, assertions)
- packages/utils/src/lib/reordering.ts - Fractional indexing system
- packages/utils/src/lib/media/media.ts - Media processing helpers
- packages/utils/src/lib/ExecutionQueue.ts - Sequential task execution
- packages/utils/src/lib/perf.ts - Performance measurement
- packages/utils/src/lib/cache.ts - WeakCache implementation
- packages/utils/src/lib/hash.ts - Hashing utilities
- packages/utils/src/lib/storage.ts - Browser storage utilities
- packages/utils/src/lib/file.ts - File operation utilities

## Related

- [@tldraw/validate](./validate.md) - Uses utils for foundational operations
- [@tldraw/state](./state.md) - Uses utils for performance optimization
- [@tldraw/store](./store.md) - Uses utils for hashing and execution queuing
