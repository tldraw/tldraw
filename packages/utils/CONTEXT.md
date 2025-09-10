# CONTEXT.md - @tldraw/utils

Essential utility functions and helpers used across the entire tldraw ecosystem, providing foundational functionality for data manipulation, performance optimization, and cross-platform compatibility.

## Package Overview

- **Purpose**: Shared utility library providing common functions for arrays, objects, performance, storage, media handling, and more
- **Type**: Utility Library
- **Status**: Production
- **Dependencies**: `fractional-indexing-jittered`, `lodash.throttle`, `lodash.uniq`
- **Consumers**: All tldraw packages (17+ packages depend on this)

## Architecture

### Core Components

- **Data Structures**: Array/object manipulation, caching, and iteration utilities
- **Performance**: Throttling, debouncing, measurement tools, and performance tracking
- **Media Handling**: File detection, image/video processing, PNG manipulation
- **Storage**: LocalStorage/SessionStorage abstraction with error handling
- **Control Flow**: Assertions, error handling, promises, and result types
- **Math/Numbers**: Interpolation, random number generation, and numeric utilities
- **ID Generation**: Unique identifier creation with mocking support for tests

### Key Files

- `src/index.ts` - Main exports aggregation
- `src/lib/array.ts` - Array manipulation utilities (dedupe, partition, rotateArray)
- `src/lib/object.ts` - Object utilities (mapObjectMapValues, filterEntries, groupBy)
- `src/lib/control.ts` - Control flow helpers (Result type, assert, promiseWithResolve)
- `src/lib/performance.ts` - Performance measurement and tracking
- `src/lib/throttle.ts` - Custom throttling implementations  
- `src/lib/storage.ts` - Browser storage abstractions
- `src/lib/media/` - Media type detection and processing
- `src/lib/reordering.ts` - Fractional indexing for item ordering
- `src/lib/hash.ts` - Hashing utilities for objects and strings
- `src/lib/id.ts` - Unique ID generation

## API/Interface

### Public API

```ts
import {
  uniqueId,
  assert,
  throttle,
  debounce,
  Result,
  FileHelpers,
  MediaHelpers
} from '@tldraw/utils'

// ID Generation
const id = uniqueId() // "abc123def"

// Control Flow
assert(condition, 'Must be true')
const result: Result<Data, Error> = await someOperation()

// Performance
const throttled = throttle(() => console.log('hi'), 100)
const debounced = debounce(() => console.log('hi'), 100)

// Data Manipulation  
const unique = dedupe([1, 1, 2, 3]) // [1, 2, 3]
const grouped = groupBy(items, 'category')

// Media Helpers
const isImage = MediaHelpers.isImage(file)
const fileType = await FileHelpers.getFileType(file)

// Storage
setInLocalStorage('key', value)
const stored = getFromLocalStorage('key')
```

Main utility categories:
- **Data**: Array/object manipulation, iteration, filtering
- **Performance**: Throttling, debouncing, measurement
- **Media**: File type detection, image processing  
- **Storage**: Browser storage with error handling
- **Math**: Interpolation, random numbers, modulation
- **Control**: Assertions, Result types, promises

### Internal API

- `structuredClone()` - Cross-platform object cloning
- `STRUCTURED_CLONE_OBJECT_PROTOTYPE` - Prototype handling for cloning
- `omitFromStackTrace()` - Error reporting improvements
- `registerTldrawLibraryVersion()` - Version tracking

## Development

### Setup

```bash
cd packages/utils
yarn install
```

### Commands

- `yarn test` - Run Jest tests (includes browser environment tests)
- `yarn build` - Build package
- `yarn lint` - Lint code

### Testing

- Tests cover all utility functions with edge cases
- Browser environment tests for storage and media utilities
- Performance measurement validation
- Run tests: `yarn test`

## Integration Points

### Depends On

- `fractional-indexing-jittered` - Fractional indexing for reordering
- `lodash.throttle` - Throttling implementation
- `lodash.uniq` - Array deduplication

### Used By (17+ packages)

- `@tldraw/state` - Uses assertions, performance tracking
- `@tldraw/store` - Uses ID generation, object utilities
- `@tldraw/tlschema` - Uses validation helpers, object manipulation
- `@tldraw/editor` - Uses performance utilities, throttling, storage
- `@tldraw/validate` - Uses control flow helpers, assertions
- All apps and other packages - Foundational utilities

## Common Issues & Solutions

### Performance Issues with Throttling
- **Issue**: Functions not throttling correctly
- **Solution**: Use `throttleToNextFrame()` for rendering, `throttle()` for other cases

### Storage Quota Exceeded
- **Issue**: LocalStorage writes failing
- **Solution**: Storage utilities include error handling and quota management

### ID Collisions in Tests
- **Issue**: Non-deterministic IDs causing test failures
- **Solution**: Use `mockUniqueId()` and `restoreUniqueId()` for predictable test IDs

### Memory Leaks with WeakCache
- **Issue**: Cache not releasing references
- **Solution**: WeakCache automatically cleans up when objects are garbage collected

## Future Considerations

- Tree-shaking optimizations for smaller bundle sizes
- Enhanced TypeScript utility types for better inference
- Performance improvements for large data set operations
- Web Workers support for heavy computations
- Additional media format support (WebP, AVIF improvements)
- Cross-platform compatibility improvements for Node.js environments