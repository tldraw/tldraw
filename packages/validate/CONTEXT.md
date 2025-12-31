# Validate Package Context

## Overview

The `@tldraw/validate` package provides a comprehensive runtime validation system for TypeScript applications. It offers type-safe validation with performance optimizations, detailed error reporting, and composable validators for complex data structures.

## Architecture

### Core validation system

#### `Validator<T>` - base validator class

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

- **Performance optimization**: `validateUsingKnownGoodVersion` avoids re-validating unchanged parts
- **Type safety**: Maintains TypeScript type information through validation
- **Composability**: Chain validators with `refine` and `check`
- **Nullability**: Easy nullable/optional variants

#### `ValidationError` - enhanced error reporting

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

- **Path tracking**: Shows exactly where in nested objects validation failed
- **Formatted messages**: Human-readable error descriptions
- **Stack trace integration**: Proper error reporting for debugging

### Primitive validators

#### Basic types

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

#### Numeric validators

Specialized number validation:

```typescript
const positiveNumber: Validator<number> // > 0
const nonZeroNumber: Validator<number> // >= 0
const integer: Validator<number> // whole numbers
const positiveInteger: Validator<number> // positive integers
const nonZeroInteger: Validator<number> // non-negative integers
```

#### URL validators

Safe URL validation for different contexts:

```typescript
const linkUrl: Validator<string> // http/https/mailto URLs safe for links
const srcUrl: Validator<string> // http/https/data/asset URLs safe for resources
const httpUrl: Validator<string> // strict http/https only
```

#### Literal & enum validators

```typescript
literal<T>(expectedValue: T): Validator<T>
literalEnum<Values>(...values: Values): Validator<Values[number]>
setEnum<T>(values: ReadonlySet<T>): Validator<T>
```

### Complex validators

#### `ObjectValidator<Shape>` - object validation

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

- **Property validation**: Each property validated with its own validator
- **Unknown property handling**: Strict by default, configurable
- **Extension support**: Compose validators via extension
- **Performance**: Optimized validation using known good values

#### `ArrayOfValidator<T>` - array content validation

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

#### `UnionValidator<Key, config>` - discriminated unions

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

#### `DictValidator<Key, value>` - dictionary validation

Validates objects as key-value maps:

```typescript
class DictValidator<Key, Value> extends Validator<Record<Key, Value>> {
	constructor(keyValidator: Validatable<Key>, valueValidator: Validatable<Value>)
}

// Usage
const stringToNumberDict = dict(string, number)
const jsonDict = dict(string, jsonValue)
```

### Specialized validators

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

#### Index key validation

Fractional indexing support:

```typescript
const indexKey: Validator<IndexKey>
```

Validates fractional indexing keys for ordering systems.

#### Model validation

Named entity validation with enhanced error reporting:

```typescript
model<T extends {readonly id: string}>(name: string, validator: Validatable<T>): Validator<T>
```

### Utility functions

#### Composition helpers

```typescript
// Union composition
or<T1, T2>(v1: Validatable<T1>, v2: Validatable<T2>): Validator<T1 | T2>

// Nullability
optional<T>(validator: Validatable<T>): Validator<T | undefined>
nullable<T>(validator: Validatable<T>): Validator<T | null>
```

## Performance optimizations

### Known good version validation

The `validateUsingKnownGoodVersion` method provides significant performance benefits:

- **Structural sharing**: Returns the previous value if validation passes and no changes detected
- **Partial validation**: Only validates changed parts of complex structures
- **Reference equality**: Uses `Object.is()` for quick equality checks
- **Early returns**: Avoids expensive validation when possible

### Efficient object processing

- **Property iteration**: Optimized loops for object validation
- **Error path building**: Lazy path construction for error reporting
- **Type guards**: Fast runtime type checking

## Error handling

### Detailed error messages

- **Type information**: Clear description of expected vs actual types
- **Path context**: Exact location of validation failure in nested structures
- **Custom messages**: Support for domain-specific error descriptions

### Error path formatting

```typescript
// Example error paths:
'At name: Expected string, got number'
"At users.0.email: Expected a valid url, got 'invalid-email'"
'At shape.(type = rectangle).width: Expected a positive number, got -5'
```

## Usage patterns

### Shape schema validation

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

### API request validation

Safe handling of external data:

```typescript
const queryValidator = T.object({
	w: T.string.optional(),
	q: T.string.optional(),
})

const validatedQuery = queryValidator.validate(request.query)
```

### Store migration validation

Ensures data integrity during schema migrations:

```typescript
const migrationValidator = T.object({
	fromVersion: T.positiveInteger,
	toVersion: T.positiveInteger,
	data: T.jsonValue,
})
```

## Design principles

### Type safety first

- **Compile-time**: Full TypeScript support with proper type inference
- **Runtime**: Guaranteed type safety after validation passes
- **Type preservation**: Validators maintain exact input types when possible

### Performance conscious

- **Minimal allocations**: Reuse objects when validation passes
- **Early exits**: Fast paths for common cases
- **Lazy evaluation**: Only compute expensive operations when needed

### Developer experience

- **Clear APIs**: Intuitive method names and composition patterns
- **Helpful errors**: Detailed error messages with context
- **Composability**: Easy to build complex validators from simple ones

### Security focused

- **Safe URLs**: Protocol validation prevents XSS and other attacks
- **Input sanitization**: Strict validation of external data
- **No unsafe operations**: All validators are pure functions

## Integration with tldraw

### Schema validation

Core integration with tlschema package for:

- Shape property validation
- Style property validation
- Record type validation
- Migration validation

### Store integration

Used in store package for:

- Record validation during creation/updates
- Migration step validation
- Query parameter validation

### Editor integration

Runtime validation in editor for:

- User input validation
- External content validation
- API response validation
- Configuration validation

## Key benefits

### Runtime safety

- Catch type errors at runtime before they cause issues
- Validate external data (API responses, user input, file contents)
- Ensure data integrity throughout the application

### Development productivity

- Clear error messages help debug validation issues quickly
- Type inference reduces boilerplate
- Composable design enables reusable validation logic

### Performance

- Optimized validation reduces unnecessary work
- Structural sharing preserves object references
- Early exits minimize computation cost
