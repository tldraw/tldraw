---
title: "@tldraw/validate"
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - validate
  - validation
  - type safety
  - runtime
  - schema
---

The `@tldraw/validate` package provides a lightweight runtime validation library with TypeScript integration. It offers type-safe validation, detailed error reporting, and composable validators for complex data structures.

## Overview

This package enables runtime type checking while maintaining TypeScript type information. When validation passes, you get a properly typed value; when it fails, you get detailed error messages showing exactly where validation failed in nested structures.

Key features:

- Full TypeScript type inference through validation
- Composable validators that chain together
- Detailed error messages with path tracking
- Performance optimization through known-good value comparison
- No external runtime dependencies

The package is used throughout tldraw for validating shape properties, API requests, migration data, and external content.

## Core concepts

### Validators

A validator takes an unknown value and either returns a typed result or throws a `ValidationError`. The base `Validator<T>` class provides the foundation:

```typescript
import { T } from '@tldraw/validate'

// Basic validation
const name = T.string.validate('Alice') // Returns 'Alice' as string type
const age = T.number.validate(25)        // Returns 25 as number type

// Validation failure throws ValidationError
T.string.validate(42) // Throws: Expected string, got a number
```

Every validator exposes these methods:

| Method | Purpose |
|--------|---------|
| `validate(value)` | Validate and return typed value, throw on failure |
| `isValid(value)` | Type guard that returns boolean |
| `optional()` | Accept undefined in addition to the base type |
| `nullable()` | Accept null in addition to the base type |
| `refine(fn)` | Add additional validation logic |
| `check(fn)` | Add validation that throws rather than transforms |

### ValidationError

When validation fails, a `ValidationError` provides detailed information about what went wrong and where:

```typescript
import { ValidationError } from '@tldraw/validate'

try {
  validator.validate(invalidData)
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(error.message)    // "At users.0.email: Expected valid URL"
    console.log(error.path)       // ['users', 0, 'email']
    console.log(error.rawMessage) // "Expected valid URL"
  }
}
```

The error path shows exactly where in nested structures validation failed.

## Primitive validators

### Basic types

```typescript
import { T } from '@tldraw/validate'

// Core primitives
T.string    // Validates strings
T.number    // Validates finite, non-NaN numbers
T.boolean   // Validates booleans
T.bigint    // Validates bigints
T.unknown   // Accepts any value (useful for pass-through)
T.any       // Escape hatch when needed
```

### Numeric validators

Specialized validators for common numeric constraints:

```typescript
T.positiveNumber    // > 0
T.nonZeroNumber     // >= 0 (misleading name, means non-negative)
T.integer           // Whole numbers only
T.positiveInteger   // Positive whole numbers
T.nonZeroInteger    // Non-negative whole numbers
```

### URL validators

Safe URL validation prevents XSS and other injection attacks:

```typescript
// For user-facing links (http, https, mailto)
T.linkUrl.validate('https://example.com')  // OK
T.linkUrl.validate('javascript:alert(1)')  // Throws - unsafe protocol

// For resource URLs (http, https, data, asset)
T.srcUrl.validate('data:image/png;base64,...')  // OK

// Strict HTTP(S) only
T.httpUrl.validate('https://api.example.com')  // OK
```

### Literals and enums

```typescript
// Exact value matching
const status = T.literal('active')
status.validate('active')   // OK
status.validate('inactive') // Throws

// Multiple allowed values
const direction = T.literalEnum('up', 'down', 'left', 'right')
direction.validate('up')    // OK
direction.validate('north') // Throws

// From a Set
const validColors = new Set(['red', 'green', 'blue'])
const color = T.setEnum(validColors)
```

## Object validators

### Basic object validation

Define the shape of objects with per-property validators:

```typescript
const personValidator = T.object({
  name: T.string,
  age: T.positiveInteger,
  email: T.linkUrl.optional(),
})

const person = personValidator.validate({
  name: 'Alice',
  age: 30,
})
// Returns: { name: 'Alice', age: 30 } with full type inference
```

By default, object validators are strict and reject unknown properties. To allow extra properties:

```typescript
const flexibleValidator = T.object({
  id: T.string,
  name: T.string,
}).allowUnknownProperties()
```

### Extending objects

Compose validators by extending:

```typescript
const baseShape = T.object({
  id: T.string,
  x: T.number,
  y: T.number,
})

const rectangleShape = baseShape.extend({
  width: T.positiveNumber,
  height: T.positiveNumber,
})
```

## Array validators

### Basic arrays

```typescript
// Array of any type
T.array.validate([1, 'two', true]) // OK

// Typed array contents
const numbers = T.arrayOf(T.number)
numbers.validate([1, 2, 3])        // OK
numbers.validate([1, 'two', 3])    // Throws at index 1
```

### Array constraints

```typescript
// Non-empty arrays
const nonEmpty = T.arrayOf(T.string).nonEmpty()
nonEmpty.validate(['a'])  // OK
nonEmpty.validate([])     // Throws

// At least two items
const twoOrMore = T.arrayOf(T.number).lengthGreaterThan1()
```

## Union validators

Discriminated unions validate based on a discriminant property:

```typescript
const shapeValidator = T.union('type', {
  rectangle: T.object({
    type: T.literal('rectangle'),
    width: T.number,
    height: T.number,
  }),
  circle: T.object({
    type: T.literal('circle'),
    radius: T.number,
  }),
})

shapeValidator.validate({ type: 'rectangle', width: 100, height: 50 }) // OK
shapeValidator.validate({ type: 'triangle', sides: 3 }) // Throws - unknown variant
```

To handle unknown variants gracefully:

```typescript
const flexibleShapeValidator = shapeValidator.validateUnknownVariants(
  (value, variant) => {
    // Return a default or transformed value for unknown variants
    return { type: 'unknown', originalType: variant }
  }
)
```

## Dictionary validators

For objects used as key-value maps:

```typescript
// String keys to number values
const scores = T.dict(T.string, T.number)
scores.validate({ alice: 100, bob: 85 }) // OK

// JSON dictionary
const jsonDict = T.jsonDict()
jsonDict.validate({ key: { nested: [1, 2, 3] } }) // OK
```

## Composition patterns

### Optional and nullable

```typescript
const config = T.object({
  name: T.string,
  description: T.string.optional(),  // string | undefined
  icon: T.string.nullable(),         // string | null
})
```

### Refinement

Add custom validation logic while preserving the type:

```typescript
const positiveEven = T.number.refine((n) => {
  if (n <= 0) throw new Error('Must be positive')
  if (n % 2 !== 0) throw new Error('Must be even')
  return n
})

positiveEven.validate(4)  // OK, returns 4
positiveEven.validate(3)  // Throws: Must be even
```

### Checks

When you only need to validate without transforming:

```typescript
const nonEmptyString = T.string.check((s) => {
  if (s.length === 0) {
    throw new Error('String cannot be empty')
  }
})
```

### Or (union without discriminant)

```typescript
const stringOrNumber = T.or(T.string, T.number)
stringOrNumber.validate('hello') // OK
stringOrNumber.validate(42)      // OK
stringOrNumber.validate(true)    // Throws
```

## Performance optimization

### Known good version validation

The `validateUsingKnownGoodVersion` method provides significant performance benefits when validating data that's similar to previously validated data:

```typescript
const validator = T.object({
  id: T.string,
  items: T.arrayOf(T.object({
    name: T.string,
    value: T.number,
  })),
})

// First validation - full check
const initial = validator.validate(data)

// Subsequent validation - only checks what changed
const updated = validator.validateUsingKnownGoodVersion(initial, newData)
```

Benefits:

- **Structural sharing**: Returns the previous value if nothing changed
- **Partial validation**: Only validates changed parts of complex structures
- **Reference equality**: Uses `Object.is()` for quick equality checks

### Custom equality

For complex objects, provide custom equality to prevent unnecessary invalidation:

```typescript
const position = T.object({
  x: T.number,
  y: T.number,
})
```

## JSON validation

Special validators for JSON-compatible values:

```typescript
// Any valid JSON value
T.jsonValue.validate({ key: [1, 2, 'three', null] }) // OK

// JSON dictionary specifically
T.jsonDict().validate({ nested: { data: true } }) // OK
```

## Index key validation

For fractional indexing systems used in ordering:

```typescript
import { T } from '@tldraw/validate'

T.indexKey.validate('a0')  // OK - valid index key
T.indexKey.validate('bad') // Throws - invalid format
```

## Model validation

Named entity validation with enhanced error reporting:

```typescript
const userModel = T.model('User', T.object({
  id: T.string,
  name: T.string,
  email: T.linkUrl,
}))

// Errors include the model name for context
userModel.validate({ id: '1', name: 'Alice', email: 'invalid' })
// Throws: At User.email: Expected a valid url, got 'invalid'
```

## Usage in tldraw

### Shape property validation

```typescript
// From packages/tlschema
export const imageShapeProps = {
  w: T.nonZeroNumber,
  h: T.nonZeroNumber,
  playing: T.boolean,
  url: T.linkUrl,
  assetId: assetIdValidator.nullable(),
  crop: ImageShapeCrop.nullable(),
  flipX: T.boolean,
  flipY: T.boolean,
}
```

### API request validation

```typescript
const queryValidator = T.object({
  w: T.string.optional(),
  q: T.string.optional(),
})

const validatedQuery = queryValidator.validate(request.query)
```

### Migration validation

```typescript
const migrationValidator = T.object({
  fromVersion: T.positiveInteger,
  toVersion: T.positiveInteger,
  data: T.jsonValue,
})
```

## Key files

- packages/validate/src/lib/validation.ts - Core validation implementation
- packages/validate/src/index.ts - Public API exports

## Related

- [@tldraw/tlschema](./tlschema.md) - Uses validate for shape and record type definitions
- [@tldraw/store](./store.md) - Uses validate for record validation during operations
- [@tldraw/utils](./utils.md) - Provides utility functions used by validate
