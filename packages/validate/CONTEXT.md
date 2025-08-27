# Validate Package Context

## Overview

The `@tldraw/validate` package provides a comprehensive runtime validation system for TypeScript applications. It offers type-safe validation with performance optimizations, detailed error reporting, and composable validators for complex data structures.

## Architecture

### Core Validation System

#### `Validator<T>` - Base Validator Class

The foundation of the validation system:

```typescript
class Validator<T> implements Validatable<T> {
	validate(value: unknown): T
	validateUsingKnownGoodVersion(knownGoodValue: T, newValue: unknown): T
	isValid(value: unknown): value is T
	nullable(): Validator<T | null>
	optional(): Validator<T | undefined>
	refine<U>(otherValidationFn: (value: T) => U): Validator<U>
	check(checkFn: (value: T) => void): Validator<T>
}
```

Key features:

- **Performance Optimization**: `validateUsingKnownGoodVersion` avoids re-validating unchanged parts
- **Type Safety**: Maintains TypeScript type information through validation
- **Composability**: Chain validators with `refine` and `check`
- **Nullability**: Easy nullable/optional variants

#### `ValidationError` - Enhanced Error Reporting

Detailed error information with path tracking:

```typescript
class ValidationError extends Error {
  constructor(
    public readonly rawMessage: string,
    public readonly path: ReadonlyArray<number | string> = []
  )
}
```

Features:

- **Path Tracking**: Shows exactly where in nested objects validation failed
- **Formatted Messages**: Human-readable error descriptions
- **Stack Trace Integration**: Proper error reporting for debugging

### Primitive Validators

#### Basic Types

```typescript
// Core primitives
const string: Validator<string>
const number: Validator<number>      // finite, non-NaN
const boolean: Validator<boolean>
const bigint: Validator<bigint>
const unknown: Validator<unknown>    // accepts anything
const any: Validator<any>           // escape hatch

// Arrays
const array: Validator<unknown[]>
arrayOf<T>(itemValidator: Validatable<T>): ArrayOfValidator<T>
```

#### Numeric Validators

Specialized number validation:

```typescript
const positiveNumber: Validator<number> // > 0
const nonZeroNumber: Validator<number> // >= 0
const integer: Validator<number> // whole numbers
const positiveInteger: Validator<number> // positive integers
const nonZeroInteger: Validator<number> // non-negative integers
```

#### URL Validators

Safe URL validation for different contexts:

```typescript
const linkUrl: Validator<string> // http/https/mailto URLs safe for links
const srcUrl: Validator<string> // http/https/data/asset URLs safe for resources
const httpUrl: Validator<string> // strict http/https only
```

#### Literal & Enum Validators

```typescript
literal<T>(expectedValue: T): Validator<T>
literalEnum<Values>(...values: Values): Validator<Values[number]>
setEnum<T>(values: ReadonlySet<T>): Validator<T>
```

### Complex Validators

#### `ObjectValidator<Shape>` - Object Validation

Type-safe object structure validation:

```typescript
class ObjectValidator<Shape> extends Validator<Shape> {
	constructor(config: { [K in keyof Shape]: Validatable<Shape[K]> })

	allowUnknownProperties(): ObjectValidator<Shape>
	extend<Extension>(extension: Extension): ObjectValidator<Shape & Extension>
}

// Usage
const personValidator = object({
	name: string,
	age: positiveInteger,
	email: linkUrl.optional(),
})
```

Features:

- **Property Validation**: Each property validated with its own validator
- **Unknown Property Handling**: Strict by default, configurable
- **Extension Support**: Compose validators via extension
- **Performance**: Optimized validation using known good values

#### `ArrayOfValidator<T>` - Array Content Validation

Validates array contents with additional constraints:

```typescript
class ArrayOfValidator<T> extends Validator<T[]> {
	constructor(itemValidator: Validatable<T>)

	nonEmpty(): ArrayOfValidator<T>
	lengthGreaterThan1(): ArrayOfValidator<T>
}

// Usage
const numbersValidator = arrayOf(number).nonEmpty()
```

#### `UnionValidator<Key, Config>` - Discriminated Unions

Type-safe discriminated union validation:

```typescript
class UnionValidator<Key, Config> extends Validator<TypeOf<Config[keyof Config]>> {
	validateUnknownVariants<Unknown>(
		unknownValueValidation: (value: object, variant: string) => Unknown
	): UnionValidator<Key, Config, Unknown>
}

// Usage
const shapeValidator = union('type', {
	rectangle: object({ type: literal('rectangle'), width: number, height: number }),
	circle: object({ type: literal('circle'), radius: number }),
})
```

#### `DictValidator<Key, Value>` - Dictionary Validation

Validates objects as key-value maps:

```typescript
class DictValidator<Key, Value> extends Validator<Record<Key, Value>> {
	constructor(keyValidator: Validatable<Key>, valueValidator: Validatable<Value>)
}

// Usage
const stringToNumberDict = dict(string, number)
const jsonDict = dict(string, jsonValue)
```

### Specialized Validators

#### JSON Validation

Safe JSON value validation:

```typescript
const jsonValue: Validator<JsonValue>
jsonDict(): DictValidator<string, JsonValue>
```

Handles:

- Primitive JSON types (string, number, boolean, null)
- Nested arrays and objects
- Performance optimized for large JSON structures

#### Index Key Validation

Fractional indexing support:

```typescript
const indexKey: Validator<IndexKey>
```

Validates fractional indexing keys for ordering systems.

#### Model Validation

Named entity validation with enhanced error reporting:

```typescript
model<T extends {readonly id: string}>(name: string, validator: Validatable<T>): Validator<T>
```

### Utility Functions

#### Composition Helpers

```typescript
// Union composition
or<T1, T2>(v1: Validatable<T1>, v2: Validatable<T2>): Validator<T1 | T2>

// Nullability
optional<T>(validator: Validatable<T>): Validator<T | undefined>
nullable<T>(validator: Validatable<T>): Validator<T | null>
```

## Performance Optimizations

### Known Good Version Validation

The `validateUsingKnownGoodVersion` method provides significant performance benefits:

- **Structural Sharing**: Returns the previous value if validation passes and no changes detected
- **Partial Validation**: Only validates changed parts of complex structures
- **Reference Equality**: Uses `Object.is()` for quick equality checks
- **Early Returns**: Avoids expensive validation when possible

### Efficient Object Processing

- **Property Iteration**: Optimized loops for object validation
- **Error Path Building**: Lazy path construction for error reporting
- **Type Guards**: Fast runtime type checking

## Error Handling

### Detailed Error Messages

- **Type Information**: Clear description of expected vs actual types
- **Path Context**: Exact location of validation failure in nested structures
- **Custom Messages**: Support for domain-specific error descriptions

### Error Path Formatting

```typescript
// Example error paths:
'At name: Expected string, got number'
"At users.0.email: Expected a valid url, got 'invalid-email'"
'At shape.(type = rectangle).width: Expected a positive number, got -5'
```

## Usage Patterns

### Shape Schema Validation

Used extensively in tlschema package:

```typescript
export const imageShapeProps: RecordProps<TLImageShape> = {
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

### API Request Validation

Safe handling of external data:

```typescript
const queryValidator = T.object({
	w: T.string.optional(),
	q: T.string.optional(),
})

const validatedQuery = queryValidator.validate(request.query)
```

### Store Migration Validation

Ensures data integrity during schema migrations:

```typescript
const migrationValidator = T.object({
	fromVersion: T.positiveInteger,
	toVersion: T.positiveInteger,
	data: T.jsonValue,
})
```

## Design Principles

### Type Safety First

- **Compile-Time**: Full TypeScript support with proper type inference
- **Runtime**: Guaranteed type safety after validation passes
- **Type Preservation**: Validators maintain exact input types when possible

### Performance Conscious

- **Minimal Allocations**: Reuse objects when validation passes
- **Early Exits**: Fast paths for common cases
- **Lazy Evaluation**: Only compute expensive operations when needed

### Developer Experience

- **Clear APIs**: Intuitive method names and composition patterns
- **Helpful Errors**: Detailed error messages with context
- **Composability**: Easy to build complex validators from simple ones

### Security Focused

- **Safe URLs**: Protocol validation prevents XSS and other attacks
- **Input Sanitization**: Strict validation of external data
- **No Unsafe Operations**: All validators are pure functions

## Integration with tldraw

### Schema Validation

Core integration with tlschema package for:

- Shape property validation
- Style property validation
- Record type validation
- Migration validation

### Store Integration

Used in store package for:

- Record validation during creation/updates
- Migration step validation
- Query parameter validation

### Editor Integration

Runtime validation in editor for:

- User input validation
- External content validation
- API response validation
- Configuration validation

## Key Benefits

### Runtime Safety

- Catch type errors at runtime before they cause issues
- Validate external data (API responses, user input, file contents)
- Ensure data integrity throughout the application

### Development Productivity

- Clear error messages help debug validation issues quickly
- Type inference reduces boilerplate
- Composable design enables reusable validation logic

### Performance

- Optimized validation reduces unnecessary work
- Structural sharing preserves object references
- Early exits minimize computation cost
