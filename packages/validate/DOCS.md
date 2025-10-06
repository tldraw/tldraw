# @tldraw/validate Documentation

## 1. Introduction

### What is @tldraw/validate?

@tldraw/validate is a TypeScript library for runtime validation that combines type safety with performance optimization. It provides validators for data structures ranging from simple primitives to complex nested objects, with detailed error reporting and composable validation logic.

This library provides the validation foundation for the tldraw SDK, ensuring type safety and data integrity across shape definitions, store operations, and external data handling.

### Installation

```bash
npm install @tldraw/validate
```

### TypeScript

@tldraw/validate is written in TypeScript and provides type safety out of the box. All validators maintain full type information, ensuring your validated data has the correct types at both compile time and runtime.

### Quick Example

Here's a simple example showing the core validation concepts:

```ts
import { T } from '@tldraw/validate'

// Create some validators
const userValidator = T.object({
	name: T.string,
	age: T.positiveInteger,
	email: T.linkUrl.optional(),
})

// Validate data safely
try {
	const user = userValidator.validate({
		name: 'Alice',
		age: 25,
		email: 'alice@example.com',
	})
	// user is now typed as { name: string; age: number; email?: string }
	console.log(`Hello ${user.name}!`)
} catch (error) {
	console.error('Validation failed:', error.message)
}
```

In just a few lines, you've created type-safe validation that catches errors at runtime and provides detailed feedback when validation fails.

## 2. Core Concepts

### The Validator Class

A **Validator** is the fundamental building block of the validation system. It's a container that holds validation logic and provides methods for safely checking and converting unknown data into typed values.

```ts
import { T } from '@tldraw/validate'

const numberValidator = T.number
const result = numberValidator.validate(42) // Returns 42 as number
```

Every validator implements the same core interface, allowing them to be composed and chained together in powerful ways.

#### Basic Validation Methods

All validators provide these essential methods:

**validate(value)** - Validates a value and returns it with correct typing, or throws an error:

```ts
const validated = T.string.validate('hello') // Returns "hello" as string
// T.string.validate(123) // Throws ValidationError
```

**isValid(value)** - Checks if a value is valid without throwing:

```ts
if (T.number.isValid(someValue)) {
	// someValue is now typed as number within this block
	console.log(someValue + 1)
}
```

**validateUsingKnownGoodVersion(knownGood, newValue)** - Performance-optimized validation:

```ts
// If newValue hasn't changed, returns knownGood without re-validation
const optimized = validator.validateUsingKnownGoodVersion(previousValue, newValue)
```

> Tip: `validateUsingKnownGoodVersion` is a powerful performance optimization that avoids re-validating unchanged data, especially useful for large objects and frequent validation calls.

### Validation Errors

When validation fails, @tldraw/validate provides detailed error information through the **ValidationError** class:

```ts
try {
	T.positiveInteger.validate(-5)
} catch (error) {
	console.log(error.message) // "Expected a positive integer, got -5"
	console.log(error.path) // Array showing location in nested structures
}
```

For complex nested structures, errors include precise path information:

```ts
const complexValidator = T.object({
	users: T.arrayOf(
		T.object({
			name: T.string,
			settings: T.object({
				theme: T.literalEnum('light', 'dark'),
			}),
		})
	),
})

// Error: "At users.0.settings.theme: Expected 'light' or 'dark', got 'blue'"
```

## 3. Primitive Validators

### Basic Types

@tldraw/validate provides validators for all TypeScript primitive types:

```ts
import { T } from '@tldraw/validate'

// Core types
const name = T.string.validate('Alice')
const count = T.number.validate(42)
const isActive = T.boolean.validate(true)
const largeNumber = T.bigint.validate(123n)

// Special types
const anything = T.unknown.validate({ any: 'value' })
const untyped = T.any.validate(someValue) // Escape hatch for any type
```

**Arrays** can be validated with or without content validation:

```ts
// Any array
const items = T.array.validate([1, 'hello', true])

// Array with validated contents
const numbers = T.arrayOf(T.number).validate([1, 2, 3])
```

### Number Validators

Numbers have specialized validators for common validation needs:

```ts
// Basic number validation (finite, non-NaN)
const temperature = T.number.validate(23.5)

// Non-negative numbers (>= 0)
const price = T.positiveNumber.validate(29.99)

// Positive numbers (> 0)
const quantity = T.nonZeroNumber.validate(0.01)

// Integers
const wholeNumber = T.integer.validate(42)

// Non-negative integers (>= 0)
const positiveCount = T.positiveInteger.validate(5)

// Positive integers (> 0)
const itemCount = T.nonZeroInteger.validate(1)
```

> Note: `positiveNumber` and `positiveInteger` validate for non-negative values (`>= 0`), while `nonZeroNumber` and `nonZeroInteger` validate for positive values (`> 0`).

These validators catch common data issues:

```ts
T.number.validate(NaN) // Throws: "Expected a finite number, got NaN"
T.positiveNumber.validate(-1) // Throws: "Expected a positive number, got -1"
T.nonZeroNumber.validate(0) // Throws: "Expected a non-zero positive number, got 0"
T.integer.validate(3.14) // Throws: "Expected an integer, got 3.14"
```

### URL Validators

URLs require careful validation for security. @tldraw/validate provides context-specific URL validators:

```ts
// Safe for user-facing links (http, https, mailto)
const blogLink = T.linkUrl.validate('https://example.com')
const contactEmail = T.linkUrl.validate('mailto:hello@example.com')

// Safe for resource loading (http, https, data URLs, asset URLs)
const imageSource = T.srcUrl.validate('data:image/png;base64,...')
const staticAsset = T.srcUrl.validate('https://cdn.example.com/image.jpg')

// Strict HTTP/HTTPS only
const apiEndpoint = T.httpUrl.validate('https://api.example.com')
```

> Tip: Always use the most restrictive URL validator for your use case. `linkUrl` prevents XSS in user-generated links, while `srcUrl` allows data URLs for embedded content.

### Literal and Enum Validators

For validating specific values or sets of values:

```ts
// Single literal value
const appName = T.literal('tldraw').validate('tldraw')

// Multiple allowed values
const theme = T.literalEnum('light', 'dark', 'auto').validate('dark')

// Using a Set for enum values
const allowedMethods = new Set(['GET', 'POST', 'PUT'] as const)
const method = T.setEnum(allowedMethods).validate('GET')
```

## 4. Complex Validators

### Object Validation

The **object validator** handles structured data with type-safe property validation:

```ts
// Define the shape of your data
const userValidator = T.object({
	id: T.string,
	name: T.string,
	age: T.positiveInteger,
	isAdmin: T.boolean,
	lastLogin: T.string.optional(),
})

// Validate objects
const user = userValidator.validate({
	id: 'user123',
	name: 'Bob',
	age: 30,
	isAdmin: false,
	// lastLogin is optional, can be omitted
})
// user is typed as: { id: string; name: string; age: number; isAdmin: boolean; lastLogin?: string }
```

#### Object Options

Objects are strict by default but can be configured:

```ts
// Allow extra properties (they'll be preserved but not typed)
const flexibleUser = T.object({
	name: T.string,
	age: T.number,
}).allowUnknownProperties()

flexibleUser.validate({
	name: 'Alice',
	age: 25,
	favoriteColor: 'blue', // This won't cause an error
})
```

#### Extending Objects

Create new validators by extending existing ones:

```ts
const baseUser = T.object({
	name: T.string,
	age: T.number,
})

const adminUser = baseUser.extend({
	permissions: T.arrayOf(T.string),
	lastLogin: T.string,
})
// adminUser validates: { name: string; age: number; permissions: string[]; lastLogin: string }
```

### Array Validation

Arrays can be validated with content constraints:

```ts
// Array of specific type
const numbers = T.arrayOf(T.number)
const validNumbers = numbers.validate([1, 2, 3.14, -5])

// Array with constraints
const nonEmptyNames = T.arrayOf(T.string).nonEmpty()
const atLeastTwo = T.arrayOf(T.string).lengthGreaterThan1()

// Nested arrays
const matrix = T.arrayOf(T.arrayOf(T.number))
const grid = matrix.validate([
	[1, 2],
	[3, 4],
])
```

### Dictionary Validation

For objects used as key-value maps:

```ts
// String keys to number values
const scores = T.dict(T.string, T.number)
const gameScores = scores.validate({
	alice: 100,
	bob: 85,
	charlie: 92,
})

// Complex value types
const userPreferences = T.dict(
	T.string,
	T.object({
		theme: T.literalEnum('light', 'dark'),
		notifications: T.boolean,
	})
)
```

### Union Validation

For discriminated unions (objects that can be one of several types):

```ts
// Shape definitions with discriminated unions
const shapeValidator = T.union('type', {
	rectangle: T.object({
		type: T.literal('rectangle'),
		width: T.positiveNumber,
		height: T.positiveNumber,
	}),
	circle: T.object({
		type: T.literal('circle'),
		radius: T.positiveNumber,
	}),
	triangle: T.object({
		type: T.literal('triangle'),
		base: T.positiveNumber,
		height: T.positiveNumber,
	}),
})

// Validates based on the discriminator field
const rectangle = shapeValidator.validate({
	type: 'rectangle',
	width: 100,
	height: 50,
})
// rectangle is typed as: { type: 'rectangle'; width: number; height: number }
```

## 5. Composing Validators

### Nullable and Optional Values

Transform validators to accept null or undefined:

```ts
const optionalString = T.string.optional() // string | undefined
const nullableNumber = T.number.nullable() // number | null

// Can also use helper functions
const maybeUser = T.optional(userValidator) // User | undefined
const userOrNull = T.nullable(userValidator) // User | null
```

### Refinement and Checks

Add additional validation logic to existing validators:

#### Using refine() for Transformations

**refine()** validates and potentially transforms the value:

```ts
// Transform string to uppercase
const upperCaseString = T.string.refine((value) => {
	return value.toUpperCase()
})

const result = upperCaseString.validate('hello') // Returns "HELLO"

// Validate and parse JSON
const jsonValidator = T.string.refine((str) => {
	try {
		return JSON.parse(str)
	} catch (error) {
		throw new Error('Invalid JSON')
	}
})
```

#### Using check() for Additional Constraints

**check()** adds validation without changing the value. It has two forms:

`check(checkFn)`:

```ts
const evenNumber = T.number.check((value) => {
	if (value % 2 !== 0) {
		throw new Error('Number must be even')
	}
})
```

`check(name, checkFn)`:

You can also provide a name for the check, which will be included in error messages for easier debugging.

```ts
const strongPassword = T.string
	.check('min-length', (password) => {
		if (password.length < 8) {
			throw new Error('Password must be at least 8 characters')
		}
	})
	.check('uppercase', (password) => {
		if (!/[A-Z]/.test(password)) {
			throw new Error('Password must contain an uppercase letter')
		}
	})
	.check('number', (password) => {
		if (!/[0-9]/.test(password)) {
			throw new Error('Password must contain a number')
		}
	})

// Example error:
// "At (check uppercase): Password must contain an uppercase letter"
```

### Union Types

Combine multiple validators with **or()**:

```ts
const stringOrNumber = T.or(T.string, T.number)
const value1 = stringOrNumber.validate('hello') // string
const value2 = stringOrNumber.validate(42) // number

// More complex unions
const idValidator = T.or(
	T.string, // UUID string
	T.positiveInteger // Numeric ID
)
```

## 6. Advanced Features

### Performance Optimization with Known Good Values

The validation system includes powerful performance optimizations for repeated validation:

```ts
// First validation - full validation occurs
const user = userValidator.validate(userData)

// Later validation with mostly unchanged data
const updatedUser = userValidator.validateUsingKnownGoodVersion(
	user, // Previous valid value
	newUserData // New data to validate
)

// If newUserData is identical to user, returns user immediately
// If partially changed, only validates the changed parts
// If completely different, performs full validation
```

This is particularly powerful for complex objects:

```ts
const complexObject = T.object({
	metadata: T.object({
		created: T.string,
		updated: T.string,
	}),
	content: T.arrayOf(
		T.object({
			id: T.string,
			text: T.string,
			tags: T.arrayOf(T.string),
		})
	),
})

// Only validates changed portions of the structure
const optimized = complexObject.validateUsingKnownGoodVersion(previouslyValidated, incomingData)
```

### Model Validation

For named entities with enhanced debugging:

```ts
// Define a model with a name for better error reporting
const userModel = T.model(
	'User',
	T.object({
		id: T.string,
		name: T.string,
		email: T.linkUrl,
	})
)

// Errors will include the model name for clarity:
// "At User.email: Expected a valid URL, got 'invalid-email'"
```

### JSON Value Validation

Safe handling of JSON data:

```ts
// Validates any valid JSON value (primitives, arrays, objects)
const jsonData = T.jsonValue.validate(someUnknownData)

// JSON object specifically
const config = T.jsonDict().validate({
	setting1: 'value1',
	setting2: 42,
	setting3: ['a', 'b', 'c'],
})
```

## 7. Debugging and Error Handling

### Understanding Validation Errors

@tldraw/validate provides rich error information to help debug validation issues:

```ts
const nestedValidator = T.object({
	company: T.object({
		employees: T.arrayOf(
			T.object({
				name: T.string,
				contact: T.object({
					email: T.linkUrl,
					phone: T.string.optional(),
				}),
			})
		),
	}),
})

try {
	nestedValidator.validate({
		company: {
			employees: [
				{
					name: 'Alice',
					contact: {
						email: 'not-an-email',
						phone: '555-1234',
					},
				},
			],
		},
	})
} catch (error) {
	console.log(error.message)
	// "At company.employees.0.contact.email: Expected a valid url, got 'not-an-email'"

	console.log(error.path)
	// ['company', 'employees', 0, 'contact', 'email']

	console.log(error.rawMessage)
	// "Expected a valid url, got 'not-an-email'"
}
```

### Error Path Navigation

Error paths help you locate exactly where validation failed:

- **Property names** appear as strings: `"users"`
- **Array indices** appear as numbers: `0`, `1`, `2`
- **Union discriminators** appear with context: `"(type = rectangle)"`

```ts
// Example paths:
'name' // Simple property
'users.0' // First item in users array
'shape.(type = circle).radius' // radius property of circle variant
'config.database.connections.0.host' // Deep nesting
```

### Common Validation Patterns

#### Validating External APIs

```ts
const apiResponseValidator = T.object({
	status: T.literalEnum('success', 'error'),
	data: T.object({
		users: T.arrayOf(
			T.object({
				id: T.string,
				name: T.string,
				email: T.linkUrl.optional(),
			})
		),
	}).optional(),
	error: T.string.optional(),
})

try {
	const response = await fetch('/api/users')
	const json = await response.json()
	const validatedResponse = apiResponseValidator.validate(json)

	if (validatedResponse.status === 'success') {
		// TypeScript knows data is defined here
		console.log(`Found ${validatedResponse.data.users.length} users`)
	}
} catch (error) {
	console.error('API response validation failed:', error.message)
}
```

#### Validating User Input

```ts
const userInputValidator = T.object({
	title: T.string.check((title) => {
		if (title.length < 3) {
			throw new Error('Title must be at least 3 characters')
		}
		if (title.length > 100) {
			throw new Error('Title cannot exceed 100 characters')
		}
	}),
	category: T.literalEnum('work', 'personal', 'hobby'),
	priority: T.integer.check((priority) => {
		if (priority < 1 || priority > 5) {
			throw new Error('Priority must be between 1 and 5')
		}
	}),
	tags: T.arrayOf(T.string).optional(),
})

// Safe handling of form data
function processUserInput(formData: unknown) {
	try {
		const validInput = userInputValidator.validate(formData)
		// Process with confidence that data is valid
		return saveToDatabase(validInput)
	} catch (error) {
		// Return user-friendly validation messages
		return { error: error.message }
	}
}
```

#### Migration and Schema Validation

```ts
// Validate data during migrations
const migrationValidator = T.object({
	version: T.positiveInteger,
	data: T.jsonValue,
	timestamp: T.string,
})

const legacyUserValidator = T.object({
	name: T.string,
	email: T.string, // Old schema: any string
	age: T.number.optional(),
})

const modernUserValidator = T.object({
	name: T.string,
	email: T.linkUrl, // New schema: validated URL
	age: T.positiveInteger.optional(),
	createdAt: T.string,
})

function migrateUser(legacyData: unknown) {
	// Validate old format
	const legacy = legacyUserValidator.validate(legacyData)

	// Transform to new format with additional validation
	const modern = modernUserValidator.validate({
		name: legacy.name,
		email: legacy.email, // This will now validate as URL
		age: legacy.age,
		createdAt: new Date().toISOString(),
	})

	return modern
}
```

## 8. Integration with tldraw

### Shape Definition Validation

@tldraw/validate is extensively used throughout tldraw for shape validation:

```ts
// Example from TLImageShape
const imageShapeProps = T.object({
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	playing: T.boolean,
	url: T.linkUrl,
	assetId: T.string.nullable(),
	crop: T.object({
		topLeft: T.object({ x: T.number, y: T.number }),
		bottomRight: T.object({ x: T.number, y: T.number }),
	}).nullable(),
	flipX: T.boolean,
	flipY: T.boolean,
})
```

### Store Integration

The validation system integrates with tldraw's reactive store:

```ts
// Validating records during store operations
const shapeRecord = shapeValidator.validate(incomingShapeData)
store.put([shapeRecord])
```

### Custom Shape Validation

When creating custom shapes, use @tldraw/validate for type safety:

```ts
// Custom shape with validated properties
const customShapeValidator = T.object({
	type: T.literal('custom'),
	x: T.number,
	y: T.number,
	customProperty: T.string.check((value) => {
		if (!value.startsWith('custom-')) {
			throw new Error("Custom property must start with 'custom-'")
		}
	}),
	config: T.object({
		color: T.literalEnum('red', 'blue', 'green'),
		size: T.positiveNumber,
	}),
})

export class CustomShapeUtil extends BaseBoxShapeUtil<CustomShape> {
	static override type = 'custom' as const
	static override props = customShapeValidator
	// ... implementation
}
```

## 9. Best Practices

### Validator Organization

Structure validators for maintainability:

```ts
// Group related validators
const UserValidators = {
	base: T.object({
		id: T.string,
		name: T.string,
		email: T.linkUrl,
	}),

	create: T.object({
		name: T.string,
		email: T.linkUrl,
		password: T.string.check(validatePasswordStrength),
	}),

	update: T.object({
		name: T.string.optional(),
		email: T.linkUrl.optional(),
	}),
}

// Compose complex validators from simpler ones
const PostValidator = T.object({
	title: T.string,
	author: UserValidators.base,
	tags: T.arrayOf(T.string).optional(),
	publishedAt: T.string.nullable(),
})
```

### Error Handling Strategy

Design validation with user experience in mind:

```ts
function validateAndProcess(data: unknown) {
	try {
		const validated = complexValidator.validate(data)
		return { success: true, data: validated }
	} catch (error) {
		if (error instanceof ValidationError) {
			// Convert technical error to user-friendly message
			const userMessage = getUserFriendlyMessage(error.path, error.rawMessage)
			return { success: false, error: userMessage }
		}
		throw error // Re-throw unexpected errors
	}
}

function getUserFriendlyMessage(path: readonly (string | number)[], message: string) {
	const field = path.join('.')
	if (message.includes('Expected a valid url')) {
		return `Please enter a valid URL for ${field}`
	}
	if (message.includes('Expected a positive number')) {
		return `${field} must be a positive number`
	}
	return `Invalid value for ${field}: ${message}`
}
```

### Performance Considerations

Use validation efficiently:

```ts
// Cache validators for reuse
const userValidatorCache = new Map()
function getUserValidator(version: string) {
	if (!userValidatorCache.has(version)) {
		userValidatorCache.set(version, createUserValidator(version))
	}
	return userValidatorCache.get(version)
}

// Use known good validation for updates
let currentUser = userValidator.validate(initialData)

function updateUser(changes: unknown) {
	// Merge changes with current user
	const candidate = { ...currentUser, ...changes }

	// Efficient validation using known good value
	currentUser = userValidator.validateUsingKnownGoodVersion(currentUser, candidate)
	return currentUser
}
```

### Type Safety Patterns

Leverage TypeScript integration:

```ts
// Extract types from validators
type User = TypeOf<typeof userValidator>
type CreateUserRequest = TypeOf<typeof createUserValidator>

// Use in function signatures
function processUser(user: User): string {
	// user is fully typed, no runtime checks needed
	return `Processing ${user.name} (${user.email})`
}

// Ensure validator matches interface
interface ApiResponse {
	data: User[]
	total: number
}

const apiResponseValidator: Validator<ApiResponse> = T.object({
	data: T.arrayOf(userValidator),
	total: T.nonZeroInteger,
})
```

@tldraw/validate provides the foundation for type-safe data validation in tldraw applications. Its performance optimizations, detailed error reporting, and seamless TypeScript integration make it essential for handling external data safely within the tldraw SDK ecosystem.
