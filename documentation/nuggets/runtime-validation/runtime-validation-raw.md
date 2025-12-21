---
title: Runtime validation - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - runtime
  - validation
---

# Runtime validation - raw notes

## Problem statement

### TypeScript type erasure at runtime
- TypeScript types compile away - no runtime enforcement
- External data sources (user input, network, storage, multiplayer) can violate type assumptions
- Example: `w: 0` passes TypeScript checks as `number` but causes division by zero in vector normalization
- Stack traces point at math code, not the real source of bad data
- Multiplayer adds complexity: bug may have been created by another user minutes ago

### Performance challenge with frequent validation
- Canvas editors validate hundreds of shapes on every user action
- Reactive databases re-validate cached records as updates stream in
- Full validation on every update is wasteful
- Example: moving a shape from `x: 100` to `x: 150` doesn't need to re-validate entire object
- Access pattern: validating same large objects repeatedly as they change incrementally

## Core validation architecture

### File: /Users/stephenruiz/Documents/GitHub/tldraw/packages/validate/src/lib/validation.ts

### Validatable interface (lines 76-98)
```typescript
export interface Validatable<T> {
	validate(value: unknown): T
	validateUsingKnownGoodVersion?(knownGoodValue: T, newValue: unknown): T
}
```
- Base interface for all validators
- `validate`: Standard one-shot validation
- `validateUsingKnownGoodVersion`: Optional performance optimization for incremental validation

### Validator class (lines 231-500)
```typescript
export class Validator<T> implements Validatable<T> {
	constructor(
		readonly validationFn: ValidatorFn<T>,
		readonly validateUsingKnownGoodVersionFn?: ValidatorUsingKnownGoodVersionFn<T>,
		readonly skipSameValueCheck: boolean = false
	) {}
}
```

#### Key methods:
1. **validate** (lines 266-272)
   - Calls validationFn
   - Dev-only check: ensures validators return same value (referential equality)
   - Check disabled for transforming validators via `skipSameValueCheck`

2. **validateUsingKnownGoodVersion** (lines 299-309)
   - Fast path: `Object.is(knownGoodValue, newValue)` returns immediately
   - Calls optimized function if available
   - Falls back to full validation

3. **Helper methods**:
   - `isValid(value: unknown): value is T` - type guard, no throws (lines 333-340)
   - `nullable()` - returns `Validator<T | null>` (lines 365-367)
   - `optional()` - returns `Validator<T | undefined>` (lines 392-394)
   - `refine<U>` - compose validators with transformation (lines 425-440)
   - `check` - add validation constraint without changing type (lines 478-499)

### ValidationError class (lines 147-167)
```typescript
export class ValidationError extends Error {
	constructor(
		public readonly rawMessage: string,
		public readonly path: ReadonlyArray<number | string> = []
	) {}
}
```
- Tracks path through nested structures
- formatPath (lines 100-127): converts path array to readable string
  - Example: `['users', 0, 'email']` → `"At users.0.email"`
  - Strips id values from path for better error grouping in Sentry (line 121)
  - Special handling for discriminated union paths like `(type = rectangle)`

## Incremental validation algorithm

### Core principle: reference equality checks
- Uses `Object.is()` for O(1) equality checks
- Compares references, not deep values
- If reference unchanged, skip validation entirely
- Only validate properties/elements that have different references

### ObjectValidator implementation (lines 663-818)

#### Construction (lines 670-680)
```typescript
constructor(
	public readonly config: {
		readonly [K in keyof Shape]: Validatable<Shape[K]>
	},
	private readonly shouldAllowUnknownProperties = false
) {}
```

#### Full validation (lines 677-710)
- Validates each property in config
- Checks for unexpected properties if `shouldAllowUnknownProperties = false`
- Returns validated object (same reference)

#### Incremental validation (lines 712-778)
Key algorithm (lines 714-777):
```typescript
validateUsingKnownGoodVersion(knownGoodValue, newValue) {
	// Fast path: same reference means no changes
	if (Object.is(knownGoodValue, newValue)) {
		return knownGoodValue
	}

	let isDifferent = false

	for (const key in config) {
		if (!hasOwnProperty(config, key)) continue
		const validator = config[key as keyof typeof config]
		const prev = getOwnProperty(knownGoodValue, key)
		const next = getOwnProperty(newValue, key)

		// Skip validation for unchanged properties
		if (Object.is(prev, next)) {
			continue
		}

		// Validate only what changed
		const checked = validator.validateUsingKnownGoodVersion
			? validator.validateUsingKnownGoodVersion(prev, next)
			: validator.validate(next)

		if (!Object.is(checked, prev)) {
			isDifferent = true
		}
	}

	// Check for removed keys
	for (const key of Object.keys(knownGoodValue)) {
		if (!hasOwnProperty(newValue, key)) {
			isDifferent = true
			break
		}
	}

	return isDifferent ? (newValue as Shape) : knownGoodValue
}
```

### ArrayOfValidator implementation (lines 515-641)

#### Incremental validation (lines 542-598)
```typescript
validateUsingKnownGoodVersion(knownGoodValue, newValue) {
	if (Object.is(knownGoodValue, newValue)) {
		return knownGoodValue
	}

	const arr = array.validate(newValue)
	let isDifferent = knownGoodValue.length !== arr.length

	for (let i = 0; i < arr.length; i++) {
		const item = arr[i]

		// New elements beyond previous length
		if (i >= knownGoodValue.length) {
			isDifferent = true
			itemValidator.validate(item)
			continue
		}

		// Quick reference equality check
		if (Object.is(knownGoodValue[i], item)) {
			continue
		}

		// Validate changed elements
		const checkedItem = itemValidator.validateUsingKnownGoodVersion!(
			knownGoodValue[i],
			item
		)
		if (!Object.is(checkedItem, knownGoodValue[i])) {
			isDifferent = true
		}
	}

	return isDifferent ? (newValue as T[]) : knownGoodValue
}
```

### DictValidator implementation (lines 977-1108)
Similar pattern to ObjectValidator but for arbitrary key-value pairs:
- Uses `for...in` loop instead of `Object.entries()` (line 995, 1028)
- Tracks `newKeyCount` and compares with old key count (lines 1092-1102)
- Only iterates old keys if no difference detected yet (optimization)

### jsonValue validator (lines 1562-1619)
Special recursive validator for JSON values:
- Handles primitives (return immediately)
- Arrays: validate each element incrementally
- Objects: validate each property incrementally
- Custom implementation instead of using ObjectValidator for efficiency

## Performance optimizations

### Environment-based code paths (line 13)
```typescript
const IS_DEV = process.env.NODE_ENV !== 'production'
```
- Read once at module load time, not on every validation
- Used to conditionally enable expensive dev checks

### Development vs production code paths
Pattern appears throughout validation.ts:

#### In ArrayOfValidator.validate (lines 526-538):
```typescript
if (IS_DEV) {
	prefixError(i, () => itemValidator.validate(arr[i]))
} else {
	// Production: inline error handling to avoid closure overhead
	try {
		itemValidator.validate(arr[i])
	} catch (err) {
		if (err instanceof ValidationError) {
			throw new ValidationError(err.rawMessage, [i, ...err.path])
		}
		throw new ValidationError((err as Error).toString(), [i])
	}
}
```

Rationale:
- **Dev**: Use `prefixError` helper for cleaner code and stack traces
- **Production**: Inline try-catch to avoid closure allocation overhead
- `prefixError` creates a closure that captures `path` variable (line 169-178)

Appears in:
- ArrayOfValidator full validation (lines 526-538)
- ArrayOfValidator incremental (lines 554-565, 572-594)
- ObjectValidator full validation (lines 685-699)
- ObjectValidator incremental (lines 732-759)
- DictValidator full validation (lines 997-1013)
- DictValidator incremental (lines 1036-1051, 1062-1087)

### Efficient iteration patterns

#### Use for...in instead of Object.entries()
Example from DictValidator (lines 994-1015):
```typescript
// Slower: allocates array of [key, value] tuples
for (const [key, value] of Object.entries(obj)) { ... }

// Faster: no allocation
for (const key in object) {
	if (!hasOwnProperty(object, key)) continue
	const value = object[key]
	...
}
```

Benefit: Avoids allocating intermediate array

#### Sneaky quick checks
From ObjectValidator.validateUsingKnownGoodVersion (line 728):
```typescript
// sneaky quick check here to avoid the prefix + validator overhead
if (Object.is(prev, next)) {
	continue
}
```
- Comment appears in code (line 728)
- Early continue before expensive validation and error path building

From ArrayOfValidator.validateUsingKnownGoodVersion (line 568):
```typescript
// sneaky quick check here to avoid the prefix + validator overhead
if (Object.is(knownGoodValue[i], item)) {
	continue
}
```

### Validator construction optimizations

#### skipSameValueCheck flag (line 243)
- Used for validators that transform values (like `refine`)
- Skips dev-mode check that validated === value (line 268)
- Passed through nullable/optional wrappers (lines 1830, 1862)

#### Number validation fast paths

**Finite check trick** (lines 1168-1182):
```typescript
if (Number.isFinite(value)) {
	return value as number
}
```
Uses built-in `Number.isFinite` which checks:
- typeof === 'number'
- Not NaN
- Not Infinity

**NaN check trick** (line 1178):
```typescript
// value !== value is true only for NaN (faster than Number.isNaN)
if (value !== value) {
	throw new ValidationError('Expected a number, got NaN')
}
```

**Fast finite number check in UnionValidator** (lines 926-933):
```typescript
// Fast finite number check: numVariant - numVariant === 0 is false for Infinity and NaN
// This avoids Number.isFinite function call overhead
const numVariant = Number(variant)
if (numVariant - numVariant !== 0) {
	throw new ValidationError(
		`Expected a number for key "${this.key}", got "${variant as any}"`
	)
}
```
- Arithmetic trick: `x - x === 0` is false for Infinity and NaN
- Avoids function call overhead of `Number.isFinite`

## Security validation

### URL validators (lines 1887-1976)

#### parseUrl helper (lines 1887-1900)
```typescript
function parseUrl(str: string) {
	try {
		return new URL(str)
	} catch {
		if (str.startsWith('/') || str.startsWith('./')) {
			try {
				return new URL(str, 'http://example.com')
			} catch {
				throw new ValidationError(`Expected a valid url, got ${JSON.stringify(str)}`)
			}
		}
		throw new ValidationError(`Expected a valid url, got ${JSON.stringify(str)}`)
	}
}
```
- Handles absolute URLs
- Special case for relative paths (/, ./)
- Uses dummy base URL for relative path parsing

#### linkUrl validator (lines 1902-1926)
```typescript
const validLinkProtocols = new Set(['http:', 'https:', 'mailto:'])

export const linkUrl = string.check((value) => {
	if (value === '') return
	const url = parseUrl(value)

	if (!validLinkProtocols.has(url.protocol.toLowerCase())) {
		throw new ValidationError(
			`Expected a valid url, got ${JSON.stringify(value)} (invalid protocol)`
		)
	}
})
```
- Prevents XSS via `javascript:` URLs
- Allows empty string
- Safe protocols: http, https, mailto

#### srcUrl validator (lines 1929-1953)
```typescript
const validSrcProtocols = new Set(['http:', 'https:', 'data:', 'asset:'])

export const srcUrl = string.check((value) => {
	if (value === '') return
	const url = parseUrl(value)

	if (!validSrcProtocols.has(url.protocol.toLowerCase())) {
		throw new ValidationError(
			`Expected a valid url, got ${JSON.stringify(value)} (invalid protocol)`
		)
	}
})
```
- For asset sources (images, videos, etc.)
- Allows data: URLs (base64 encoded data)
- Allows asset: URLs (tldraw's IndexedDB reference, line 1928 comment)

#### httpUrl validator (lines 1967-1976)
```typescript
export const httpUrl = string.check((value) => {
	if (value === '') return
	const url = parseUrl(value)

	if (!url.protocol.toLowerCase().match(/^https?:$/)) {
		throw new ValidationError(
			`Expected a valid url, got ${JSON.stringify(value)} (invalid protocol)`
		)
	}
})
```
- Strict HTTP/HTTPS only
- Uses regex match for flexibility

### Protocol whitelist pattern
- Set-based lookup for O(1) checking
- Protocol comparison always lowercase (line 1921, 1948)
- Empty string always allowed for optional URLs

## Primitive validators

### Number validators (lines 1167-1375)

#### number (lines 1167-1182)
- Rejects NaN, Infinity, -Infinity
- Uses `Number.isFinite()` fast path
- Specific error messages for each case

#### positiveNumber (lines 1195-1209)
- Actually allows zero (line 1196: `>= 0`)
- Name is historical misnomer
- Used for growY, width, height where zero is valid

#### nonZeroNumber (lines 1221-1235)
- Strictly positive: `> 0`
- Used for scale factors, dimensions that can't be zero

#### nonZeroFiniteNumber (lines 1248-1262)
- Allows negative numbers
- Used for scale factors that can be negative (flipping)

#### unitInterval (lines 1277-1288)
- Range [0, 1]
- Used for opacity, percentages

#### integer (lines 1300-1315)
- Uses `Number.isInteger()` built-in

#### positiveInteger (lines 1329-1346)
- Allows zero: `>= 0`

#### nonZeroInteger (lines 1358-1375)
- Strictly positive: `> 0`

### String validators (lines 1154)
```typescript
export const string = typeofValidator<string>('string')
```

Simple typeof check via typeofValidator helper (lines 1110-1117):
```typescript
function typeofValidator<T>(type: string): Validator<T> {
	return new Validator((value) => {
		if (typeof value !== type) {
			throw new ValidationError(`Expected ${type}, got ${typeToString(value)}`)
		}
		return value as T
	})
}
```

### Literal and enum validators

#### literal (lines 1418-1425)
```typescript
export function literal<T extends string | number | boolean>(expectedValue: T): Validator<T> {
	return new Validator((actualValue) => {
		if (actualValue !== expectedValue) {
			throw new ValidationError(`Expected ${expectedValue}, got ${JSON.stringify(actualValue)}`)
		}
		return expectedValue
	})
}
```

#### literalEnum (lines 1881-1885)
```typescript
export function literalEnum<const Values extends readonly unknown[]>(
	...values: Values
): Validator<Values[number]> {
	return setEnum(new Set(values))
}
```
Convenience wrapper around setEnum

#### setEnum (lines 1792-1800)
```typescript
export function setEnum<T>(values: ReadonlySet<T>): Validator<T> {
	return new Validator((value) => {
		if (!values.has(value as T)) {
			const valuesString = Array.from(values, (value) => JSON.stringify(value)).join(' or ')
			throw new ValidationError(`Expected ${valuesString}, got ${value}`)
		}
		return value as T
	})
}
```

### Union validators

#### or combinator (lines 2016-2024)
```typescript
export function or<T1, T2>(v1: Validatable<T1>, v2: Validatable<T2>): Validator<T1 | T2> {
	return new Validator((value) => {
		try {
			return v1.validate(value)
		} catch {
			return v2.validate(value)
		}
	})
}
```
- Try first validator, fall back to second
- Throws error from second validator if both fail

#### UnionValidator (lines 854-958)
For discriminated unions:
```typescript
export class UnionValidator<
	Key extends string,
	Config extends UnionValidatorConfig<Key, Config>,
	UnknownValue = never,
> extends Validator<TypeOf<Config[keyof Config]> | UnknownValue>
```

Key features:
- Discriminator key determines which variant
- getMatchingSchemaAndVariant (lines 916-938)
- Supports string keys (default) or number keys
- validateUnknownVariants method for extensibility (lines 954-958)

## Integration with tldraw Store

### File: /Users/stephenruiz/Documents/GitHub/tldraw/packages/store/src/lib/Store.ts

### StoreValidator interface (lines 231-248)
```typescript
export interface StoreValidator<R extends UnknownRecord> {
	validate(record: unknown): R
	validateUsingKnownGoodVersion?(knownGoodVersion: R, record: unknown): R
}
```
- Matches Validatable interface from validation.ts
- Used by RecordType validators

### Store validation flow

#### On initialization (lines 483-490)
```typescript
if (initialData) {
	this.records = new AtomMap(
		'store',
		objectMapEntries(initialData).map(([id, record]) => [
			id,
			devFreeze(this.schema.validateRecord(this, record, 'initialize', null)),
		])
	)
}
```
- Validates all initial records
- Uses devFreeze to prevent mutations in dev mode

#### On record creation (lines 666-688)
```typescript
// Validate the record
record = this.schema.validateRecord(
	this,
	record as R,
	phaseOverride ?? 'createRecord',
	null
)

// freeze it
record = devFreeze(record)
```
- Full validation (no previous version)
- Freeze record to prevent mutations

#### On record update (lines 645-665)
```typescript
// Validate the record
const validated = this.schema.validateRecord(
	this,
	record,
	phaseOverride ?? 'updateRecord',
	initialValue  // Previous version passed here
)

if (validated === initialValue) continue

record = devFreeze(record)
this.records.set(record.id, record)
```
- Incremental validation with previous version
- If validation returns same reference, skip update
- This is where `validateUsingKnownGoodVersion` optimization kicks in

### File: /Users/stephenruiz/Documents/GitHub/tldraw/packages/store/src/lib/StoreSchema.ts

#### validateRecord method (lines 370-398)
```typescript
validateRecord(
	store: Store<R>,
	record: R,
	phase: 'initialize' | 'createRecord' | 'updateRecord' | 'tests',
	recordBefore: R | null
): R {
	try {
		const recordType = getOwnProperty(this.types, record.typeName)
		if (!recordType) {
			throw new Error(`Missing definition for record type ${record.typeName}`)
		}
		return recordType.validate(record, recordBefore ?? undefined)
	} catch (error: unknown) {
		if (this.options.onValidationFailure) {
			return this.options.onValidationFailure({
				store,
				// ... error info
			})
		}
		throw error
	}
}
```
- Routes to appropriate RecordType validator
- Passes recordBefore for incremental validation
- Allows custom error handling

### File: /Users/stephenruiz/Documents/GitHub/tldraw/packages/store/src/lib/RecordType.ts

#### RecordType.validate method (lines 309-314)
```typescript
validate(record: unknown, recordBefore?: R): R {
	if (recordBefore && this.validator.validateUsingKnownGoodVersion) {
		return this.validator.validateUsingKnownGoodVersion(recordBefore, record)
	}
	return this.validator.validate(record)
}
```
- If recordBefore provided and incremental validation available, use it
- Otherwise fall back to full validation
- This is the connection point where Store's update flow triggers incremental validation

## Real-world usage examples

### File: /Users/stephenruiz/Documents/GitHub/tldraw/packages/tlschema/src/shapes/TLGeoShape.ts

#### geoShapeProps (lines 165-183)
```typescript
export const geoShapeProps: RecordProps<TLGeoShape> = {
	geo: GeoShapeGeoStyle,
	dash: DefaultDashStyle,
	url: T.linkUrl,
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	growY: T.positiveNumber,
	scale: T.nonZeroNumber,

	// Text properties
	labelColor: DefaultLabelColorStyle,
	color: DefaultColorStyle,
	fill: DefaultFillStyle,
	size: DefaultSizeStyle,
	font: DefaultFontStyle,
	align: DefaultHorizontalAlignStyle,
	verticalAlign: DefaultVerticalAlignStyle,
	richText: richTextValidator,
}
```

Key validators used:
- `T.linkUrl` - Security validation for URLs
- `T.nonZeroNumber` - Width/height must be non-zero
- `T.positiveNumber` - growY allows zero

#### Migration fixing invalid URLs (lines 278-288)
```typescript
{
	id: geoShapeVersions.MakeUrlsValid,
	up: (props) => {
		if (!T.linkUrl.isValid(props.url)) {
			props.url = ''
		}
	},
	down: (_props) => {
		// noop
	},
}
```
- Uses `isValid()` type guard method
- Fixes data from older versions that allowed invalid URLs

### File: /Users/stephenruiz/Documents/GitHub/tldraw/packages/tlschema/src/shapes/TLArrowShape.ts

#### arrowShapeProps (lines 237-254)
```typescript
export const arrowShapeProps: RecordProps<TLArrowShape> = {
	kind: ArrowShapeKindStyle,
	labelColor: DefaultLabelColorStyle,
	color: DefaultColorStyle,
	fill: DefaultFillStyle,
	dash: DefaultDashStyle,
	size: DefaultSizeStyle,
	arrowheadStart: ArrowShapeArrowheadStartStyle,
	arrowheadEnd: ArrowShapeArrowheadEndStyle,
	font: DefaultFontStyle,
	start: vecModelValidator,
	end: vecModelValidator,
	bend: T.number,
	richText: richTextValidator,
	labelPosition: T.number,
	scale: T.nonZeroNumber,
	elbowMidPoint: T.number,
}
```

Uses:
- `T.number` - Plain number for bend, labelPosition, elbowMidPoint
- `T.nonZeroNumber` - Scale factor can't be zero
- Custom validators: vecModelValidator, richTextValidator

## Performance characteristics

### Big-O complexity

#### Full validation: O(n)
- n = size of data structure
- Must visit every property/element

#### Incremental validation best case: O(1)
- If `Object.is(knownGood, newValue)` is true
- Single reference check

#### Incremental validation typical case: O(m)
- m = number of changed properties/elements
- Only validates changed parts
- m << n for typical updates

### Memory characteristics

#### Object reuse
- If validation passes with no changes, returns knownGood reference
- Avoids allocating new objects
- Preserves referential equality for React/reactivity systems

#### Closure avoidance in production
- Dev: Uses `prefixError` helper (allocates closure)
- Production: Inlines error handling (no closure allocation)
- Measured in hot paths (object/array/dict validation)

### Practical performance example

Shape with 10 properties:
```typescript
{
	geo: 'rectangle',
	dash: 'solid',
	url: 'https://example.com',
	w: 100,
	h: 100,
	growY: 0,
	scale: 1,
	labelColor: 'black',
	color: 'blue',
	fill: 'solid'
}
```

Update `x` coordinate (outside props):
- Full validation: validate all 10 properties
- Incremental: `Object.is` check on props object → skip all validation

Update `w` from 100 to 150:
- Full validation: validate all 10 properties
- Incremental: validate only `w` property (1 number check)
- 90% reduction in validation work

## Implementation patterns

### Validator composition

#### Optional/nullable wrappers (lines 1816-1864)
```typescript
export function optional<T>(validator: Validatable<T>): Validator<T | undefined> {
	return new Validator(
		(value) => {
			if (value === undefined) return undefined
			return validator.validate(value)
		},
		(knownGoodValue, newValue) => {
			if (newValue === undefined) return undefined
			if (validator.validateUsingKnownGoodVersion && knownGoodValue !== undefined) {
				return validator.validateUsingKnownGoodVersion(knownGoodValue as T, newValue)
			}
			return validator.validate(newValue)
		},
		// Propagate skipSameValueCheck from inner validator
		validator instanceof Validator && validator.skipSameValueCheck
	)
}
```

Pattern:
1. Check for special value (undefined/null)
2. Delegate to inner validator
3. Preserve incremental validation capability
4. Propagate skipSameValueCheck flag

#### Refine transformation (lines 425-440)
```typescript
refine<U>(otherValidationFn: (value: T) => U): Validator<U> {
	return new Validator(
		(value) => {
			return otherValidationFn(this.validate(value))
		},
		(knownGoodValue, newValue) => {
			const validated = this.validateUsingKnownGoodVersion(knownGoodValue as any, newValue)
			if (Object.is(knownGoodValue, validated)) {
				return knownGoodValue
			}
			return otherValidationFn(validated)
		},
		true // skipSameValueCheck: refine is designed to transform values
	)
}
```

Pattern:
1. Chain validators
2. Preserve incremental validation
3. Only transform if value changed
4. Set skipSameValueCheck=true since transformation expected

#### Check constraint (lines 478-499)
```typescript
check(nameOrCheckFn: string | ((value: T) => void), checkFn?: (value: T) => void): Validator<T> {
	if (typeof nameOrCheckFn === 'string') {
		return this.refine((value) => {
			prefixError(`(check ${nameOrCheckFn})`, () => checkFn!(value))
			return value
		})
	} else {
		return this.refine((value) => {
			nameOrCheckFn(value)
			return value
		})
	}
}
```

Pattern:
- Uses refine internally
- Optional name for better error messages
- Returns same value (identity transformation)

### Error handling patterns

#### prefixError helper (lines 169-178)
```typescript
function prefixError<T>(path: string | number, fn: () => T): T {
	try {
		return fn()
	} catch (err) {
		if (err instanceof ValidationError) {
			throw new ValidationError(err.rawMessage, [path, ...err.path])
		}
		throw new ValidationError((err as Error).toString(), [path])
	}
}
```
- Wraps validation calls in dev mode
- Adds current path segment to error path array
- Preserves original error message

#### Production inline pattern
```typescript
try {
	validator.validate(value)
} catch (err) {
	if (err instanceof ValidationError) {
		throw new ValidationError(err.rawMessage, [path, ...err.path])
	}
	throw new ValidationError((err as Error).toString(), [path])
}
```
- Same logic as prefixError but inlined
- Avoids closure allocation overhead

### Type utility helpers

#### TypeOf (line 212)
```typescript
export type TypeOf<V extends Validatable<any>> = V extends Validatable<infer T> ? T : never
```
- Extracts validated type from validator
- Used throughout codebase for type inference

#### typeToString helper (lines 180-199)
```typescript
function typeToString(value: unknown): string {
	if (value === null) return 'null'
	if (Array.isArray(value)) return 'an array'
	const type = typeof value
	switch (type) {
		case 'bigint':
		case 'boolean':
		case 'function':
		case 'number':
		case 'string':
		case 'symbol':
			return `a ${type}`
		case 'object':
			return `an ${type}`
		case 'undefined':
			return 'undefined'
		default:
			exhaustiveSwitchError(type)
	}
}
```
- Used in error messages
- Handles a/an grammar
- Exhaustive switch for type safety

## Additional validators

### indexKey validator (lines 1990-1997)
```typescript
export const indexKey = string.refine<IndexKey>((key) => {
	try {
		validateIndexKey(key)
		return key
	} catch {
		throw new ValidationError(`Expected an index key, got ${JSON.stringify(key)}`)
	}
})
```
- Validates fractional indexing keys
- Used in tldraw's ordering system
- Delegates to validateIndexKey from utils package

### model validator (lines 1757-1775)
```typescript
export function model<T extends { readonly id: string }>(
	name: string,
	validator: Validatable<T>
): Validator<T> {
	return new Validator(
		(value) => {
			return prefixError(name, () => validator.validate(value))
		},
		(prevValue, newValue) => {
			return prefixError(name, () => {
				if (validator.validateUsingKnownGoodVersion) {
					return validator.validateUsingKnownGoodVersion(prevValue, newValue)
				} else {
					return validator.validate(newValue)
				}
			})
		}
	)
}
```
- Wraps validator with model name for better error messages
- Example error: "At User.email: Expected valid URL"
- Preserves incremental validation

### object factory (lines 1513-1517)
```typescript
export function object<Shape extends object>(config: {
	readonly [K in keyof Shape]: Validatable<Shape[K]>
}): ObjectValidator<MakeUndefinedOptional<Shape>> {
	return new ObjectValidator(config) as any
}
```
- Uses MakeUndefinedOptional utility type
- Makes properties with `T | undefined` values optional in object type
- Type cast needed for complex mapped type

### dict factory (lines 1661-1666)
```typescript
export function dict<Key extends string, Value>(
	keyValidator: Validatable<Key>,
	valueValidator: Validatable<Value>
): DictValidator<Key, Value> {
	return new DictValidator(keyValidator, valueValidator)
}
```

### arrayOf factory (lines 1464-1466)
```typescript
export function arrayOf<T>(itemValidator: Validatable<T>): ArrayOfValidator<T> {
	return new ArrayOfValidator(itemValidator)
}
```

### union factory (lines 1689-1706)
```typescript
export function union<Key extends string, Config extends UnionValidatorConfig<Key, Config>>(
	key: Key,
	config: Config
): UnionValidator<Key, Config> {
	return new UnionValidator(
		key,
		config,
		(_unknownValue, unknownVariant) => {
			throw new ValidationError(
				`Expected one of ${Object.keys(config)
					.map((key) => JSON.stringify(key))
					.join(' or ')}, got ${JSON.stringify(unknownVariant)}`,
				[key]
			)
		},
		false  // useNumberKeys = false
	)
}
```

## Edge cases and special handling

### Empty strings in URL validators
All URL validators allow empty strings:
```typescript
if (value === '') return
```
- Represents "no URL" state
- Avoids needing nullable URLs everywhere
- Empty string is invalid URL but common default

### Unknown properties in objects
Default behavior: reject unknown properties (line 702-707)
```typescript
if (!shouldAllowUnknownProperties) {
	for (const key of Object.keys(object)) {
		if (!hasOwnProperty(config, key)) {
			throw new ValidationError(`Unexpected property`, [key])
		}
	}
}
```

Can be disabled:
```typescript
const flexibleValidator = object({ ... }).allowUnknownProperties()
```

### Removed keys detection
ObjectValidator checks for keys present in knownGood but missing in newValue (lines 770-775):
```typescript
for (const key of Object.keys(knownGoodValue)) {
	if (!hasOwnProperty(newValue, key)) {
		isDifferent = true
		break
	}
}
```

DictValidator optimization: only checks if no changes detected yet (lines 1092-1102)

### Array length changes
ArrayOfValidator immediately marks as different if lengths differ (line 549):
```typescript
let isDifferent = knownGoodValue.length !== arr.length
```

### JSON validation recursion
jsonValue.validateUsingKnownGoodVersion handles different type transitions (lines 1570-1618):
- Array → Array: incremental
- Object → Object: incremental
- Anything else: full validation
- No check for Array → Object or other type changes - falls through to full validation

### Plain object detection
Used by jsonValue to distinguish plain objects from class instances (lines 1519-1527):
```typescript
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		(Object.getPrototypeOf(value) === Object.prototype ||
			Object.getPrototypeOf(value) === null ||
			Object.getPrototypeOf(value) === STRUCTURED_CLONE_OBJECT_PROTOTYPE)
	)
}
```
- Checks prototype is Object.prototype, null, or STRUCTURED_CLONE_OBJECT_PROTOTYPE
- STRUCTURED_CLONE_OBJECT_PROTOTYPE from @tldraw/utils (line 5)
- Handles objects from structuredClone which have different prototype

## Bundle size considerations

### Mentioned in article
- Zero dependencies
- Specialized for specific use case
- Production code inlines error handling
- Single IS_DEV check instead of per-call checks

### Not mentioned but observable
- Tree-shakeable exports (all named exports)
- No external dependencies besides @tldraw/utils
- Utils dependency is likely bundled anyway
- Minimal runtime overhead

## Testing and development

### Dev-mode checks

#### Same value check (line 268-270)
```typescript
if (IS_DEV && !this.skipSameValueCheck && !Object.is(value, validated)) {
	throw new ValidationError('Validator functions must return the same value they were passed')
}
```
- Ensures validators don't modify input
- Critical for referential equality optimization
- Disabled for transforming validators (refine, check)

### Error message quality

#### Path formatting (lines 100-127)
- Removes id values for better Sentry grouping
- Handles nested paths
- Special formatting for union discriminators

#### Type descriptions
- typeToString helper provides readable type names
- JSON.stringify for value representation
- Consistent error format across validators

## Constants and configuration

### Protocol whitelists (lines 1902, 1929)
```typescript
const validLinkProtocols = new Set(['http:', 'https:', 'mailto:'])
const validSrcProtocols = new Set(['http:', 'https:', 'data:', 'asset:'])
```
- Set for O(1) lookup
- Lowercase protocol comparison for case-insensitivity
- asset: is tldraw-specific (IndexedDB reference)

### Module-level constants
```typescript
const IS_DEV = process.env.NODE_ENV !== 'production'  // line 13
```
- Read once at module initialization
- Used throughout validation logic
- Enables dead code elimination by bundlers

## Additional notes

### Why not Zod comparison
From article:
- Zod designed for one-shot validation
- validateUsingKnownGoodVersion is access-pattern specific
- Bundle size considerations
- Performance characteristics
- Type inference complexity

### Use cases
From article:
- Real-time editors (tldraw)
- Databases with reactivity
- State management with large objects
- NOT for: API validation, form validation, config files (use Zod)

### Trust boundary concept
From article:
- Validate at system boundaries
- Everything inside has known-good properties
- More robust than per-use sanitization
- Prevents prototype pollution, injection attacks

### Multiplayer considerations
From article:
- Bad data may come from other users
- Temporal separation from bug creation
- Validation catches issues at boundary
- Prevents cascading failures
