import {
	IndexKey,
	JsonValue,
	MakeUndefinedOptional,
	STRUCTURED_CLONE_OBJECT_PROTOTYPE,
	exhaustiveSwitchError,
	getOwnProperty,
	hasOwnProperty,
	validateIndexKey,
} from '@tldraw/utils'

/**
 * A function that validates and returns a value of type T from unknown input.
 * The function should throw a ValidationError if the value is invalid.
 *
 * @param value - The unknown value to validate
 * @returns The validated value of type T
 * @throws \{ValidationError\} When the value doesn't match the expected type
 * @example
 * ```ts
 * const stringValidator: ValidatorFn<string> = (value) => {
 *   if (typeof value !== 'string') {
 *     throw new ValidationError('Expected string')
 *   }
 *   return value
 * }
 * ```
 * @public
 */
export type ValidatorFn<T> = (value: unknown) => T
/**
 * A performance-optimized validation function that can use a previously validated value
 * to avoid revalidating unchanged parts of the data structure.
 *
 * @param knownGoodValue - A previously validated value of type In
 * @param value - The unknown value to validate
 * @returns The validated value of type Out
 * @throws ValidationError When the value doesn't match the expected type
 * @example
 * ```ts
 * const optimizedValidator: ValidatorUsingKnownGoodVersionFn<User> = (
 *   knownGood,
 *   newValue
 * ) => {
 *   if (Object.is(knownGood, newValue)) return knownGood
 *   return fullValidation(newValue)
 * }
 * ```
 * @public
 */
export type ValidatorUsingKnownGoodVersionFn<In, Out = In> = (
	knownGoodValue: In,
	value: unknown
) => Out

/**
 * Interface for objects that can validate unknown values and return typed results.
 * This is the core interface implemented by all validators in the validation system.
 *
 * @example
 * ```ts
 * const customValidator: Validatable<number> = {
 *   validate(value) {
 *     if (typeof value !== 'number') {
 *       throw new ValidationError('Expected number')
 *     }
 *     return value
 *   }
 * }
 * ```
 * @public
 */
export interface Validatable<T> {
	/**
	 * Validates an unknown value and returns it with the correct type.
	 *
	 * @param value - The unknown value to validate
	 * @returns The validated value with type T
	 * @throws ValidationError When validation fails
	 */
	validate(value: unknown): T
	/**
	 * Performance-optimized validation that can use a previously validated value
	 * to avoid revalidating unchanged parts of the data structure.
	 *
	 * If the value has not changed but is not referentially equal, the function
	 * should return the previous value.
	 *
	 * @param knownGoodValue - A previously validated value
	 * @param newValue - The new value to validate
	 * @returns The validated value, potentially reusing the known good value for performance
	 * @throws ValidationError When validation fails
	 */
	validateUsingKnownGoodVersion?(knownGoodValue: T, newValue: unknown): T
}

function formatPath(path: ReadonlyArray<number | string>): string | null {
	if (!path.length) {
		return null
	}

	let formattedPath = ''
	for (const item of path) {
		if (typeof item === 'number') {
			formattedPath += `.${item}`
		} else if (item.startsWith('(')) {
			if (formattedPath.endsWith(')')) {
				formattedPath = `${formattedPath.slice(0, -1)}, ${item.slice(1)}`
			} else {
				formattedPath += item
			}
		} else {
			formattedPath += `.${item}`
		}
	}

	// N.B. We don't want id's in the path because they make grouping in Sentry tough.
	formattedPath = formattedPath.replace(/id = [^,]+, /, '').replace(/id = [^)]+/, '')

	if (formattedPath.startsWith('.')) {
		return formattedPath.slice(1)
	}
	return formattedPath
}

/**
 * Error thrown when validation fails. Provides detailed information about what went wrong
 * and where in the data structure the error occurred.
 *
 * @example
 * ```ts
 * try {
 *   validator.validate(invalidData)
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.log(error.message) // "At users.0.email: Expected valid URL"
 *     console.log(error.path) // ['users', 0, 'email']
 *     console.log(error.rawMessage) // "Expected valid URL"
 *   }
 * }
 * ```
 * @public
 */
export class ValidationError extends Error {
	override name = 'ValidationError'

	/**
	 * Creates a new ValidationError with contextual information about where the error occurred.
	 *
	 * rawMessage - The raw error message without path information
	 * path - Array indicating the location in the data structure where validation failed
	 */
	constructor(
		public readonly rawMessage: string,
		public readonly path: ReadonlyArray<number | string> = []
	) {
		const formattedPath = formatPath(path)
		const indentedMessage = rawMessage
			.split('\n')
			.map((line, i) => (i === 0 ? line : `  ${line}`))
			.join('\n')
		super(path ? `At ${formattedPath}: ${indentedMessage}` : indentedMessage)
	}
}

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

/**
 * Utility type that extracts the validated type from a Validatable object.
 * Useful for deriving TypeScript types from validator definitions.
 *
 * @example
 * ```ts
 * const userValidator = T.object({ name: T.string, age: T.number })
 * type User = TypeOf<typeof userValidator> // { name: string; age: number }
 * ```
 * @public
 */
export type TypeOf<V extends Validatable<any>> = V extends Validatable<infer T> ? T : never

/**
 * The main validator class that implements the Validatable interface. This is the base class
 * for all validators and provides methods for validation, type checking, and composing validators.
 *
 * @example
 * ```ts
 * const numberValidator = new Validator((value) => {
 *   if (typeof value !== 'number') {
 *     throw new ValidationError('Expected number')
 *   }
 *   return value
 * })
 *
 * const result = numberValidator.validate(42) // Returns 42 as number
 * ```
 * @public
 */
export class Validator<T> implements Validatable<T> {
	/**
	 * Creates a new Validator instance.
	 *
	 * validationFn - Function that validates and returns a value of type T
	 * validateUsingKnownGoodVersionFn - Optional performance-optimized validation function
	 */
	constructor(
		readonly validationFn: ValidatorFn<T>,
		readonly validateUsingKnownGoodVersionFn?: ValidatorUsingKnownGoodVersionFn<T>
	) {}

	/**
	 * Validates an unknown value and returns it with the correct type. The returned value is
	 * guaranteed to be referentially equal to the passed value.
	 *
	 * @param value - The unknown value to validate
	 * @returns The validated value with type T
	 * @throws ValidationError When validation fails
	 * @example
	 * ```ts
	 * import { T } from '@tldraw/validate'
	 *
	 * const name = T.string.validate("Alice") // Returns "Alice" as string
	 * const title = T.string.validate("") // Returns "" (empty strings are valid)
	 *
	 * // These will throw ValidationError:
	 * T.string.validate(123) // Expected string, got a number
	 * T.string.validate(null) // Expected string, got null
	 * T.string.validate(undefined) // Expected string, got undefined
	 * ```
	 */
	validate(value: unknown): T {
		const validated = this.validationFn(value)
		if (process.env.NODE_ENV !== 'production' && !Object.is(value, validated)) {
			throw new ValidationError('Validator functions must return the same value they were passed')
		}
		return validated
	}

	/**
	 * Performance-optimized validation using a previously validated value. If the new value
	 * is referentially equal to the known good value, returns the known good value immediately.
	 *
	 * @param knownGoodValue - A previously validated value
	 * @param newValue - The new value to validate
	 * @returns The validated value, potentially reusing the known good value
	 * @throws ValidationError When validation fails
	 * @example
	 * ```ts
	 * import { T } from '@tldraw/validate'
	 *
	 * const userValidator = T.object({
	 *   name: T.string,
	 *   settings: T.object({ theme: T.literalEnum('light', 'dark') })
	 * })
	 *
	 * const user = userValidator.validate({ name: "Alice", settings: { theme: "light" } })
	 *
	 * // Later, with partially changed data:
	 * const newData = { name: "Alice", settings: { theme: "dark" } }
	 * const updated = userValidator.validateUsingKnownGoodVersion(user, newData)
	 * // Only validates the changed 'theme' field for better performance
	 * ```
	 */
	validateUsingKnownGoodVersion(knownGoodValue: T, newValue: unknown): T {
		if (Object.is(knownGoodValue, newValue)) {
			return knownGoodValue as T
		}

		if (this.validateUsingKnownGoodVersionFn) {
			return this.validateUsingKnownGoodVersionFn(knownGoodValue, newValue)
		}

		return this.validate(newValue)
	}

	/**
	 * Type guard that checks if a value is valid without throwing an error.
	 *
	 * @param value - The value to check
	 * @returns True if the value is valid, false otherwise
	 * @example
	 * ```ts
	 * import { T } from '@tldraw/validate'
	 *
	 * function processUserInput(input: unknown) {
	 *   if (T.string.isValid(input)) {
	 *     // input is now typed as string within this block
	 *     return input.toUpperCase()
	 *   }
	 *   if (T.number.isValid(input)) {
	 *     // input is now typed as number within this block
	 *     return input.toFixed(2)
	 *   }
	 *   throw new Error('Expected string or number')
	 * }
	 * ```
	 */
	isValid(value: unknown): value is T {
		try {
			this.validate(value)
			return true
		} catch {
			return false
		}
	}

	/**
	 * Returns a new validator that also accepts null values.
	 *
	 * @returns A new validator that accepts T or null
	 * @example
	 * ```ts
	 * import { T } from '@tldraw/validate'
	 *
	 * const assetValidator = T.object({
	 *   id: T.string,
	 *   name: T.string,
	 *   src: T.srcUrl.nullable(), // Can be null if not loaded yet
	 *   mimeType: T.string.nullable()
	 * })
	 *
	 * const asset = assetValidator.validate({
	 *   id: "image-123",
	 *   name: "photo.jpg",
	 *   src: null, // Valid - asset not loaded yet
	 *   mimeType: "image/jpeg"
	 * })
	 * ```
	 */
	nullable(): Validator<T | null> {
		return nullable(this)
	}

	/**
	 * Returns a new validator that also accepts undefined values.
	 *
	 * @returns A new validator that accepts T or undefined
	 * @example
	 * ```ts
	 * import { T } from '@tldraw/validate'
	 *
	 * const shapeConfigValidator = T.object({
	 *   type: T.literal('rectangle'),
	 *   x: T.number,
	 *   y: T.number,
	 *   label: T.string.optional(), // Optional property
	 *   metadata: T.object({ created: T.string }).optional()
	 * })
	 *
	 * // Both of these are valid:
	 * const shape1 = shapeConfigValidator.validate({ type: 'rectangle', x: 0, y: 0 })
	 * const shape2 = shapeConfigValidator.validate({
	 *   type: 'rectangle', x: 0, y: 0, label: "My Shape"
	 * })
	 * ```
	 */
	optional(): Validator<T | undefined> {
		return optional(this)
	}

	/**
	 * Creates a new validator by refining this validator with additional logic that can transform
	 * the validated value to a new type.
	 *
	 * @param otherValidationFn - Function that transforms/validates the value to type U
	 * @returns A new validator that validates to type U
	 * @throws ValidationError When validation or refinement fails
	 * @example
	 * ```ts
	 * import { T, ValidationError } from '@tldraw/validate'
	 *
	 * // Transform string to ensure it starts with a prefix
	 * const prefixedIdValidator = T.string.refine((id) => {
	 *   return id.startsWith('shape:') ? id : `shape:${id}`
	 * })
	 *
	 * const id1 = prefixedIdValidator.validate("rectangle-123") // Returns "shape:rectangle-123"
	 * const id2 = prefixedIdValidator.validate("shape:circle-456") // Returns "shape:circle-456"
	 *
	 * // Parse and validate JSON strings
	 * const jsonValidator = T.string.refine((str) => {
	 *   try {
	 *     return JSON.parse(str)
	 *   } catch {
	 *     throw new ValidationError('Invalid JSON string')
	 *   }
	 * })
	 * ```
	 */
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
			}
		)
	}

	/**
	 * Adds an additional validation check without changing the resulting value type.
	 * Can be called with just a check function, or with a name for better error messages.
	 *
	 * @param name - Name for the check (used in error messages)
	 * @param checkFn - Function that validates the value (should throw on invalid input)
	 * @returns A new validator with the additional check
	 * @throws ValidationError When the check fails
	 * @example
	 * ```ts
	 * import { T, ValidationError } from '@tldraw/validate'
	 *
	 * // Basic check without name
	 * const evenNumber = T.number.check((value) => {
	 *   if (value % 2 !== 0) {
	 *     throw new ValidationError('Expected even number')
	 *   }
	 * })
	 *
	 * // Named checks for better error messages in complex validators
	 * const shapePositionValidator = T.object({
	 *   x: T.number.check('finite', (value) => {
	 *     if (!Number.isFinite(value)) {
	 *       throw new ValidationError('Position must be finite')
	 *     }
	 *   }),
	 *   y: T.number.check('within-bounds', (value) => {
	 *     if (value < -10000 || value > 10000) {
	 *       throw new ValidationError('Position must be within bounds (-10000 to 10000)')
	 *     }
	 *   })
	 * })
	 *
	 * // Error will be: "At x (check finite): Position must be finite"
	 * ```
	 */
	check(name: string, checkFn: (value: T) => void): Validator<T>
	/**
	 * Adds an additional validation check without changing the resulting value type.
	 *
	 * @param checkFn - Function that validates the value (should throw on invalid input)
	 * @returns A new validator with the additional check
	 * @throws ValidationError When the check fails
	 */
	check(checkFn: (value: T) => void): Validator<T>
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
}

/**
 * Validator for arrays where each element is validated using the provided item validator.
 * Extends the base Validator class with array-specific validation methods.
 *
 * @example
 * ```ts
 * const stringArray = new ArrayOfValidator(T.string)
 * const numbers = stringArray.validate(["a", "b", "c"]) // Returns string[]
 *
 * const userArray = T.arrayOf(T.object({ name: T.string, age: T.number }))
 * ```
 * @public
 */
export class ArrayOfValidator<T> extends Validator<T[]> {
	/**
	 * Creates a new ArrayOfValidator.
	 *
	 * itemValidator - Validator used to validate each array element
	 */
	constructor(readonly itemValidator: Validatable<T>) {
		super(
			(value) => {
				const arr = array.validate(value)
				for (let i = 0; i < arr.length; i++) {
					prefixError(i, () => itemValidator.validate(arr[i]))
				}
				return arr as T[]
			},
			(knownGoodValue, newValue) => {
				if (!itemValidator.validateUsingKnownGoodVersion) return this.validate(newValue)
				const arr = array.validate(newValue)
				let isDifferent = knownGoodValue.length !== arr.length
				for (let i = 0; i < arr.length; i++) {
					const item = arr[i]
					if (i >= knownGoodValue.length) {
						isDifferent = true
						prefixError(i, () => itemValidator.validate(item))
						continue
					}
					// sneaky quick check here to avoid the prefix + validator overhead
					if (Object.is(knownGoodValue[i], item)) {
						continue
					}
					const checkedItem = prefixError(i, () =>
						itemValidator.validateUsingKnownGoodVersion!(knownGoodValue[i], item)
					)
					if (!Object.is(checkedItem, knownGoodValue[i])) {
						isDifferent = true
					}
				}

				return isDifferent ? (newValue as T[]) : knownGoodValue
			}
		)
	}

	/**
	 * Returns a new validator that ensures the array is not empty.
	 *
	 * @returns A new validator that rejects empty arrays
	 * @throws ValidationError When the array is empty
	 * @example
	 * ```ts
	 * const nonEmptyStrings = T.arrayOf(T.string).nonEmpty()
	 * nonEmptyStrings.validate(["hello"]) // Valid
	 * nonEmptyStrings.validate([]) // Throws ValidationError
	 * ```
	 */
	nonEmpty() {
		return this.check((value) => {
			if (value.length === 0) {
				throw new ValidationError('Expected a non-empty array')
			}
		})
	}

	/**
	 * Returns a new validator that ensures the array has more than one element.
	 *
	 * @returns A new validator that requires at least 2 elements
	 * @throws ValidationError When the array has 1 or fewer elements
	 * @example
	 * ```ts
	 * const multipleItems = T.arrayOf(T.string).lengthGreaterThan1()
	 * multipleItems.validate(["a", "b"]) // Valid
	 * multipleItems.validate(["a"]) // Throws ValidationError
	 * ```
	 */
	lengthGreaterThan1() {
		return this.check((value) => {
			if (value.length <= 1) {
				throw new ValidationError('Expected an array with length greater than 1')
			}
		})
	}
}

/**
 * Validator for objects with a defined shape. Each property is validated using its corresponding
 * validator from the config object. Can be configured to allow or reject unknown properties.
 *
 * @example
 * ```ts
 * const userValidator = new ObjectValidator({
 *   name: T.string,
 *   age: T.number,
 *   email: T.string.optional()
 * })
 *
 * const user = userValidator.validate({
 *   name: "Alice",
 *   age: 25,
 *   email: "alice@example.com"
 * })
 * ```
 * @public
 */
export class ObjectValidator<Shape extends object> extends Validator<Shape> {
	/**
	 * Creates a new ObjectValidator.
	 *
	 * config - Object mapping property names to their validators
	 * shouldAllowUnknownProperties - Whether to allow properties not defined in config
	 */
	constructor(
		public readonly config: {
			readonly [K in keyof Shape]: Validatable<Shape[K]>
		},
		private readonly shouldAllowUnknownProperties = false
	) {
		super(
			(object) => {
				if (typeof object !== 'object' || object === null) {
					throw new ValidationError(`Expected object, got ${typeToString(object)}`)
				}

				for (const [key, validator] of Object.entries(config)) {
					prefixError(key, () => {
						;(validator as Validatable<unknown>).validate(getOwnProperty(object, key))
					})
				}

				if (!shouldAllowUnknownProperties) {
					for (const key of Object.keys(object)) {
						if (!hasOwnProperty(config, key)) {
							throw new ValidationError(`Unexpected property`, [key])
						}
					}
				}

				return object as Shape
			},
			(knownGoodValue, newValue) => {
				if (typeof newValue !== 'object' || newValue === null) {
					throw new ValidationError(`Expected object, got ${typeToString(newValue)}`)
				}

				let isDifferent = false

				for (const [key, validator] of Object.entries(config)) {
					const prev = getOwnProperty(knownGoodValue, key)
					const next = getOwnProperty(newValue, key)
					// sneaky quick check here to avoid the prefix + validator overhead
					if (Object.is(prev, next)) {
						continue
					}
					const checked = prefixError(key, () => {
						const validatable = validator as Validatable<unknown>
						if (validatable.validateUsingKnownGoodVersion) {
							return validatable.validateUsingKnownGoodVersion(prev, next)
						} else {
							return validatable.validate(next)
						}
					})
					if (!Object.is(checked, prev)) {
						isDifferent = true
					}
				}

				if (!shouldAllowUnknownProperties) {
					for (const key of Object.keys(newValue)) {
						if (!hasOwnProperty(config, key)) {
							throw new ValidationError(`Unexpected property`, [key])
						}
					}
				}

				for (const key of Object.keys(knownGoodValue)) {
					if (!hasOwnProperty(newValue, key)) {
						isDifferent = true
						break
					}
				}

				return isDifferent ? (newValue as Shape) : knownGoodValue
			}
		)
	}

	/**
	 * Returns a new validator that allows unknown properties in the validated object.
	 *
	 * @returns A new ObjectValidator that accepts extra properties
	 * @example
	 * ```ts
	 * const flexibleUser = T.object({ name: T.string }).allowUnknownProperties()
	 * flexibleUser.validate({ name: "Alice", extra: "allowed" }) // Valid
	 * ```
	 */
	allowUnknownProperties() {
		return new ObjectValidator(this.config, true)
	}

	/**
	 * Creates a new ObjectValidator by extending this validator with additional properties.
	 *
	 * @param extension - Object mapping new property names to their validators
	 * @returns A new ObjectValidator that validates both original and extended properties
	 * @example
	 * ```ts
	 * const baseUser = T.object({ name: T.string, age: T.number })
	 * const adminUser = baseUser.extend({
	 *   permissions: T.arrayOf(T.string),
	 *   isAdmin: T.boolean
	 * })
	 * // adminUser validates: { name: string; age: number; permissions: string[]; isAdmin: boolean }
	 * ```
	 */
	extend<Extension extends Record<string, unknown>>(extension: {
		readonly [K in keyof Extension]: Validatable<Extension[K]>
	}): ObjectValidator<Shape & Extension> {
		return new ObjectValidator({ ...this.config, ...extension }) as any as ObjectValidator<
			Shape & Extension
		>
	}
}

/**
 * Configuration type for union validators. Each variant must be a validator that produces
 * an object with the discriminator key set to the variant name.
 *
 * @example
 * ```ts
 * type ShapeConfig = UnionValidatorConfig<'type', {
 *   circle: Validatable<{ type: 'circle'; radius: number }>
 *   square: Validatable<{ type: 'square'; size: number }>
 * }>
 * ```
 * @public
 */
export type UnionValidatorConfig<Key extends string, Config> = {
	readonly [Variant in keyof Config]: Validatable<any> & {
		validate(input: any): { readonly [K in Key]: Variant }
	}
}
/**
 * Validator for discriminated union types. Validates objects that can be one of several variants,
 * distinguished by a discriminator property (key) that indicates which variant the object represents.
 *
 * @example
 * ```ts
 * const shapeValidator = new UnionValidator('type', {
 *   circle: T.object({ type: T.literal('circle'), radius: T.number }),
 *   square: T.object({ type: T.literal('square'), size: T.number })
 * }, () => { throw new Error('Unknown shape') }, false)
 *
 * const circle = shapeValidator.validate({ type: 'circle', radius: 5 })
 * // circle is typed as { type: 'circle'; radius: number }
 * ```
 * @public
 */
export class UnionValidator<
	Key extends string,
	Config extends UnionValidatorConfig<Key, Config>,
	UnknownValue = never,
> extends Validator<TypeOf<Config[keyof Config]> | UnknownValue> {
	/**
	 * Creates a new UnionValidator.
	 *
	 * key - The discriminator property name used to determine the variant
	 * config - Object mapping variant names to their validators
	 * unknownValueValidation - Function to handle unknown variants
	 * useNumberKeys - Whether the discriminator uses number keys instead of strings
	 */
	constructor(
		private readonly key: Key,
		private readonly config: Config,
		private readonly unknownValueValidation: (value: object, variant: string) => UnknownValue,
		private readonly useNumberKeys: boolean
	) {
		super(
			(input) => {
				this.expectObject(input)

				const { matchingSchema, variant } = this.getMatchingSchemaAndVariant(input)
				if (matchingSchema === undefined) {
					return this.unknownValueValidation(input, variant)
				}

				return prefixError(`(${key} = ${variant})`, () => matchingSchema.validate(input))
			},
			(prevValue, newValue) => {
				this.expectObject(newValue)
				this.expectObject(prevValue)

				const { matchingSchema, variant } = this.getMatchingSchemaAndVariant(newValue)
				if (matchingSchema === undefined) {
					return this.unknownValueValidation(newValue, variant)
				}

				if (getOwnProperty(prevValue, key) !== getOwnProperty(newValue, key)) {
					// the type has changed so bail out and do a regular validation
					return prefixError(`(${key} = ${variant})`, () => matchingSchema.validate(newValue))
				}

				return prefixError(`(${key} = ${variant})`, () => {
					if (matchingSchema.validateUsingKnownGoodVersion) {
						return matchingSchema.validateUsingKnownGoodVersion(prevValue, newValue)
					} else {
						return matchingSchema.validate(newValue)
					}
				})
			}
		)
	}

	private expectObject(value: unknown): asserts value is object {
		if (typeof value !== 'object' || value === null) {
			throw new ValidationError(`Expected an object, got ${typeToString(value)}`, [])
		}
	}

	private getMatchingSchemaAndVariant(object: object): {
		matchingSchema: Validatable<any> | undefined
		variant: string
	} {
		const variant = getOwnProperty(object, this.key)! as string & keyof Config
		if (!this.useNumberKeys && typeof variant !== 'string') {
			throw new ValidationError(
				`Expected a string for key "${this.key}", got ${typeToString(variant)}`
			)
		} else if (this.useNumberKeys && !Number.isFinite(Number(variant))) {
			throw new ValidationError(`Expected a number for key "${this.key}", got "${variant as any}"`)
		}

		const matchingSchema = hasOwnProperty(this.config, variant) ? this.config[variant] : undefined
		return { matchingSchema, variant }
	}

	/**
	 * Returns a new UnionValidator that can handle unknown variants using the provided function.
	 *
	 * @param unknownValueValidation - Function to validate/transform unknown variants
	 * @returns A new UnionValidator that accepts unknown variants
	 * @example
	 * ```ts
	 * const shapeValidator = T.union('type', { circle: circleValidator })
	 *   .validateUnknownVariants((obj, variant) => {
	 *     console.warn(`Unknown shape type: ${variant}`)
	 *     return obj as UnknownShape
	 *   })
	 * ```
	 */
	validateUnknownVariants<Unknown>(
		unknownValueValidation: (value: object, variant: string) => Unknown
	): UnionValidator<Key, Config, Unknown> {
		return new UnionValidator(this.key, this.config, unknownValueValidation, this.useNumberKeys)
	}
}

/**
 * Validator for dictionary/map objects where both keys and values are validated.
 * Useful for validating objects used as key-value stores.
 *
 * @example
 * ```ts
 * const scoreDict = new DictValidator(T.string, T.number)
 * const scores = scoreDict.validate({
 *   "alice": 100,
 *   "bob": 85,
 *   "charlie": 92
 * })
 * // scores is typed as Record<string, number>
 * ```
 * @public
 */
export class DictValidator<Key extends string, Value> extends Validator<Record<Key, Value>> {
	/**
	 * Creates a new DictValidator.
	 *
	 * keyValidator - Validator for object keys
	 * valueValidator - Validator for object values
	 */
	constructor(
		public readonly keyValidator: Validatable<Key>,
		public readonly valueValidator: Validatable<Value>
	) {
		super(
			(object) => {
				if (typeof object !== 'object' || object === null) {
					throw new ValidationError(`Expected object, got ${typeToString(object)}`)
				}

				for (const [key, value] of Object.entries(object)) {
					prefixError(key, () => {
						keyValidator.validate(key)
						valueValidator.validate(value)
					})
				}

				return object as Record<Key, Value>
			},
			(knownGoodValue, newValue) => {
				if (typeof newValue !== 'object' || newValue === null) {
					throw new ValidationError(`Expected object, got ${typeToString(newValue)}`)
				}

				let isDifferent = false

				for (const [key, value] of Object.entries(newValue)) {
					if (!hasOwnProperty(knownGoodValue, key)) {
						isDifferent = true
						prefixError(key, () => {
							keyValidator.validate(key)
							valueValidator.validate(value)
						})
						continue
					}
					const prev = getOwnProperty(knownGoodValue, key)
					const next = value
					// sneaky quick check here to avoid the prefix + validator overhead
					if (Object.is(prev, next)) {
						continue
					}
					const checked = prefixError(key, () => {
						if (valueValidator.validateUsingKnownGoodVersion) {
							return valueValidator.validateUsingKnownGoodVersion(prev as any, next)
						} else {
							return valueValidator.validate(next)
						}
					})
					if (!Object.is(checked, prev)) {
						isDifferent = true
					}
				}

				for (const key of Object.keys(knownGoodValue)) {
					if (!hasOwnProperty(newValue, key)) {
						isDifferent = true
						break
					}
				}

				return isDifferent ? (newValue as Record<Key, Value>) : knownGoodValue
			}
		)
	}
}

function typeofValidator<T>(type: string): Validator<T> {
	return new Validator((value) => {
		if (typeof value !== type) {
			throw new ValidationError(`Expected ${type}, got ${typeToString(value)}`)
		}
		return value as T
	})
}

/**
 * Validator that accepts any value without type checking. Useful as a starting point for
 * building custom validations or when you need to accept truly unknown data.
 *
 * @example
 * ```ts
 * const result = T.unknown.validate(anything) // Returns the value as-is
 * // result is typed as unknown
 * ```
 * @public
 */
export const unknown = new Validator((value) => value)
/**
 * Validator that accepts any value and types it as 'any'. This should generally be avoided
 * as it bypasses type safety, but can be used as an escape hatch for prototyping.
 *
 * @example
 * ```ts
 * const result = T.any.validate(anything) // Returns the value as any
 * // result is typed as any - use with caution!
 * ```
 * @public
 */
export const any = new Validator((value): any => value)

/**
 * Validator that ensures a value is a string.
 *
 * @example
 * ```ts
 * const name = T.string.validate("hello") // Returns "hello" as string
 * T.string.validate(123) // Throws ValidationError: "Expected string, got a number"
 * ```
 * @public
 */
export const string = typeofValidator<string>('string')

/**
 * Validator that ensures a value is a finite, non-NaN number. Rejects Infinity, -Infinity, and NaN.
 *
 * @example
 * ```ts
 * const count = T.number.validate(42) // Returns 42 as number
 * T.number.validate(NaN) // Throws ValidationError: "Expected a number, got NaN"
 * T.number.validate(Infinity) // Throws ValidationError: "Expected a finite number, got Infinity"
 * ```
 * @public
 */
export const number = typeofValidator<number>('number').check((number) => {
	if (Number.isNaN(number)) {
		throw new ValidationError('Expected a number, got NaN')
	}
	if (!Number.isFinite(number)) {
		throw new ValidationError(`Expected a finite number, got ${number}`)
	}
})
/**
 * Validator that ensures a value is a non-negative number (\>= 0).
 * Despite the name "positive", this validator accepts zero.
 *
 * @example
 * ```ts
 * const price = T.positiveNumber.validate(29.99) // Returns 29.99
 * const free = T.positiveNumber.validate(0) // Returns 0 (valid)
 * T.positiveNumber.validate(-1) // Throws ValidationError: "Expected a positive number, got -1"
 * ```
 * @public
 */
export const positiveNumber = number.check((value) => {
	if (value < 0) throw new ValidationError(`Expected a positive number, got ${value}`)
})
/**
 * Validator that ensures a value is a positive number (\> 0). Rejects zero and negative numbers.
 *
 * @example
 * ```ts
 * const quantity = T.nonZeroNumber.validate(0.01) // Returns 0.01
 * T.nonZeroNumber.validate(0) // Throws ValidationError: "Expected a non-zero positive number, got 0"
 * T.nonZeroNumber.validate(-5) // Throws ValidationError: "Expected a non-zero positive number, got -5"
 * ```
 * @public
 */
export const nonZeroNumber = number.check((value) => {
	if (value <= 0) throw new ValidationError(`Expected a non-zero positive number, got ${value}`)
})
/**
 * Validator that ensures a value is an integer (whole number).
 *
 * @example
 * ```ts
 * const count = T.integer.validate(42) // Returns 42
 * T.integer.validate(3.14) // Throws ValidationError: "Expected an integer, got 3.14"
 * T.integer.validate(-5) // Returns -5 (negative integers are valid)
 * ```
 * @public
 */
export const integer = number.check((value) => {
	if (!Number.isInteger(value)) throw new ValidationError(`Expected an integer, got ${value}`)
})
/**
 * Validator that ensures a value is a non-negative integer (\>= 0).
 * Despite the name "positive", this validator accepts zero.
 *
 * @example
 * ```ts
 * const index = T.positiveInteger.validate(5) // Returns 5
 * const start = T.positiveInteger.validate(0) // Returns 0 (valid)
 * T.positiveInteger.validate(-1) // Throws ValidationError: "Expected a positive integer, got -1"
 * T.positiveInteger.validate(3.14) // Throws ValidationError: "Expected an integer, got 3.14"
 * ```
 * @public
 */
export const positiveInteger = integer.check((value) => {
	if (value < 0) throw new ValidationError(`Expected a positive integer, got ${value}`)
})
/**
 * Validator that ensures a value is a positive integer (\> 0). Rejects zero and negative integers.
 *
 * @example
 * ```ts
 * const itemCount = T.nonZeroInteger.validate(1) // Returns 1
 * T.nonZeroInteger.validate(0) // Throws ValidationError: "Expected a non-zero positive integer, got 0"
 * T.nonZeroInteger.validate(-5) // Throws ValidationError: "Expected a non-zero positive integer, got -5"
 * ```
 * @public
 */
export const nonZeroInteger = integer.check((value) => {
	if (value <= 0) throw new ValidationError(`Expected a non-zero positive integer, got ${value}`)
})

/**
 * Validator that ensures a value is a boolean.
 *
 * @example
 * ```ts
 * const isActive = T.boolean.validate(true) // Returns true
 * const isEnabled = T.boolean.validate(false) // Returns false
 * T.boolean.validate("true") // Throws ValidationError: "Expected boolean, got a string"
 * ```
 * @public
 */
export const boolean = typeofValidator<boolean>('boolean')
/**
 * Validator that ensures a value is a bigint.
 *
 * @example
 * ```ts
 * const largeNumber = T.bigint.validate(123n) // Returns 123n
 * T.bigint.validate(123) // Throws ValidationError: "Expected bigint, got a number"
 * ```
 * @public
 */
export const bigint = typeofValidator<bigint>('bigint')
/**
 * Creates a validator that only accepts a specific literal value.
 *
 * @param expectedValue - The exact value that must be matched
 * @returns A validator that only accepts the specified literal value
 * @throws ValidationError When the value doesn't match the expected literal
 * @example
 * ```ts
 * const trueValidator = T.literal(true)
 * trueValidator.validate(true) // Returns true
 * trueValidator.validate(false) // Throws ValidationError
 *
 * const statusValidator = T.literal("active")
 * statusValidator.validate("active") // Returns "active"
 * statusValidator.validate("inactive") // Throws ValidationError
 * ```
 * @public
 */
export function literal<T extends string | number | boolean>(expectedValue: T): Validator<T> {
	return new Validator((actualValue) => {
		if (actualValue !== expectedValue) {
			throw new ValidationError(`Expected ${expectedValue}, got ${JSON.stringify(actualValue)}`)
		}
		return expectedValue
	})
}

/**
 * Validator that ensures a value is an array. Does not validate the contents of the array.
 * Use T.arrayOf() to validate both the array structure and its contents.
 *
 * @example
 * ```ts
 * const items = T.array.validate([1, "hello", true]) // Returns unknown[]
 * T.array.validate("not array") // Throws ValidationError: "Expected an array, got a string"
 *
 * // For typed arrays, use T.arrayOf:
 * const numbers = T.arrayOf(T.number).validate([1, 2, 3]) // Returns number[]
 * ```
 * @public
 */
export const array = new Validator<unknown[]>((value) => {
	if (!Array.isArray(value)) {
		throw new ValidationError(`Expected an array, got ${typeToString(value)}`)
	}
	return value
})

/**
 * Creates a validator for arrays where each element is validated using the provided validator.
 *
 * @param itemValidator - Validator to use for each array element
 * @returns An ArrayOfValidator that validates both array structure and element types
 * @throws ValidationError When the value is not an array or when any element is invalid
 * @example
 * ```ts
 * const numberArray = T.arrayOf(T.number)
 * numberArray.validate([1, 2, 3]) // Returns number[]
 * numberArray.validate([1, "2", 3]) // Throws ValidationError at index 1
 *
 * const userArray = T.arrayOf(T.object({ name: T.string, age: T.number }))
 * ```
 * @public
 */
export function arrayOf<T>(itemValidator: Validatable<T>): ArrayOfValidator<T> {
	return new ArrayOfValidator(itemValidator)
}

/**
 * Validator that ensures a value is an object (non-null, non-array). Does not validate
 * the properties of the object.
 *
 * @example
 * ```ts
 * const obj = T.unknownObject.validate({ any: "properties" }) // Returns Record<string, unknown>
 * T.unknownObject.validate(null) // Throws ValidationError: "Expected object, got null"
 * T.unknownObject.validate([1, 2, 3]) // Throws ValidationError: "Expected object, got an array"
 * ```
 * @public
 */
export const unknownObject = new Validator<Record<string, unknown>>((value) => {
	if (typeof value !== 'object' || value === null) {
		throw new ValidationError(`Expected object, got ${typeToString(value)}`)
	}
	return value as Record<string, unknown>
})

/**
 * Creates a validator for objects with a defined shape. Each property is validated using
 * its corresponding validator from the config object.
 *
 * @param config - Object mapping property names to their validators
 * @returns An ObjectValidator that validates the object structure and all properties
 * @throws ValidationError When the value is not an object or when any property is invalid
 * @example
 * ```ts
 * const userValidator = T.object({
 *   name: T.string,
 *   age: T.number,
 *   email: T.string.optional(),
 *   isActive: T.boolean
 * })
 *
 * const user = userValidator.validate({
 *   name: "Alice",
 *   age: 25,
 *   email: "alice@example.com",
 *   isActive: true
 * })
 * // user is typed with full type safety
 * ```
 * @public
 */
export function object<Shape extends object>(config: {
	readonly [K in keyof Shape]: Validatable<Shape[K]>
}): ObjectValidator<MakeUndefinedOptional<Shape>> {
	return new ObjectValidator(config) as any
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		(Object.getPrototypeOf(value) === Object.prototype ||
			Object.getPrototypeOf(value) === null ||
			Object.getPrototypeOf(value) === STRUCTURED_CLONE_OBJECT_PROTOTYPE)
	)
}

function isValidJson(value: any): value is JsonValue {
	if (
		value === null ||
		typeof value === 'number' ||
		typeof value === 'string' ||
		typeof value === 'boolean'
	) {
		return true
	}

	if (Array.isArray(value)) {
		return value.every(isValidJson)
	}

	if (isPlainObject(value)) {
		return Object.values(value).every(isValidJson)
	}

	return false
}

/**
 * Validator that ensures a value is valid JSON (string, number, boolean, null, array, or plain object).
 * Rejects functions, undefined, symbols, and other non-JSON values.
 *
 * @example
 * ```ts
 * const data = T.jsonValue.validate({ name: "Alice", scores: [1, 2, 3], active: true })
 * T.jsonValue.validate(undefined) // Throws ValidationError
 * T.jsonValue.validate(() => {}) // Throws ValidationError
 * ```
 * @public
 */
export const jsonValue: Validator<JsonValue> = new Validator<JsonValue>(
	(value): JsonValue => {
		if (isValidJson(value)) {
			return value as JsonValue
		}

		throw new ValidationError(`Expected json serializable value, got ${typeof value}`)
	},
	(knownGoodValue, newValue) => {
		if (Array.isArray(knownGoodValue) && Array.isArray(newValue)) {
			let isDifferent = knownGoodValue.length !== newValue.length
			for (let i = 0; i < newValue.length; i++) {
				if (i >= knownGoodValue.length) {
					isDifferent = true
					jsonValue.validate(newValue[i])
					continue
				}
				const prev = knownGoodValue[i]
				const next = newValue[i]
				if (Object.is(prev, next)) {
					continue
				}
				const checked = jsonValue.validateUsingKnownGoodVersion!(prev, next)
				if (!Object.is(checked, prev)) {
					isDifferent = true
				}
			}
			return isDifferent ? (newValue as JsonValue) : knownGoodValue
		} else if (isPlainObject(knownGoodValue) && isPlainObject(newValue)) {
			let isDifferent = false
			for (const key of Object.keys(newValue)) {
				if (!hasOwnProperty(knownGoodValue, key)) {
					isDifferent = true
					jsonValue.validate(newValue[key])
					continue
				}
				const prev = knownGoodValue[key]
				const next = newValue[key]
				if (Object.is(prev, next)) {
					continue
				}
				const checked = jsonValue.validateUsingKnownGoodVersion!(prev!, next)
				if (!Object.is(checked, prev)) {
					isDifferent = true
				}
			}
			for (const key of Object.keys(knownGoodValue)) {
				if (!hasOwnProperty(newValue, key)) {
					isDifferent = true
					break
				}
			}
			return isDifferent ? (newValue as JsonValue) : knownGoodValue
		} else {
			return jsonValue.validate(newValue)
		}
	}
)

/**
 * Creates a validator for JSON dictionaries (objects with string keys and JSON-serializable values).
 *
 * @returns A DictValidator that validates string keys and JSON values
 * @throws ValidationError When keys are not strings or values are not JSON-serializable
 * @example
 * ```ts
 * const config = T.jsonDict().validate({
 *   "setting1": "value",
 *   "setting2": 42,
 *   "setting3": ["a", "b", "c"],
 *   "setting4": { nested: true }
 * })
 * ```
 * @public
 */
export function jsonDict(): DictValidator<string, JsonValue> {
	return dict(string, jsonValue)
}

/**
 * Creates a validator for dictionary objects where both keys and values are validated.
 * Useful for validating objects used as key-value maps.
 *
 * @param keyValidator - Validator for object keys
 * @param valueValidator - Validator for object values
 * @returns A DictValidator that validates all keys and values
 * @throws ValidationError When any key or value is invalid
 * @example
 * ```ts
 * const scores = T.dict(T.string, T.number)
 * scores.validate({ "alice": 100, "bob": 85 }) // Valid
 *
 * const userPrefs = T.dict(T.string, T.object({
 *   theme: T.literalEnum('light', 'dark'),
 *   notifications: T.boolean
 * }))
 * ```
 * @public
 */
export function dict<Key extends string, Value>(
	keyValidator: Validatable<Key>,
	valueValidator: Validatable<Value>
): DictValidator<Key, Value> {
	return new DictValidator(keyValidator, valueValidator)
}

/**
 * Creates a validator for discriminated union types. Validates objects that can be one of
 * several variants, distinguished by a discriminator property.
 *
 * @param key - The discriminator property name used to determine the variant
 * @param config - Object mapping variant names to their validators
 * @returns A UnionValidator that validates based on the discriminator value
 * @throws ValidationError When the discriminator is invalid or the variant validation fails
 * @example
 * ```ts
 * const shapeValidator = T.union('type', {
 *   circle: T.object({ type: T.literal('circle'), radius: T.number }),
 *   square: T.object({ type: T.literal('square'), size: T.number }),
 *   triangle: T.object({ type: T.literal('triangle'), base: T.number, height: T.number })
 * })
 *
 * const circle = shapeValidator.validate({ type: 'circle', radius: 5 })
 * // circle is typed as { type: 'circle'; radius: number }
 * ```
 * @public
 */
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
		false
	)
}

/**
 * Creates a validator for discriminated union types using number discriminators instead of strings.
 * This is an internal function used for specific cases where numeric discriminators are needed.
 *
 * @param key - The discriminator property name used to determine the variant
 * @param config - Object mapping variant names to their validators
 * @returns A UnionValidator that validates based on numeric discriminator values
 * @throws ValidationError When the discriminator is invalid or the variant validation fails
 * @internal
 */
export function numberUnion<Key extends string, Config extends UnionValidatorConfig<Key, Config>>(
	key: Key,
	config: Config
): UnionValidator<Key, Config> {
	return new UnionValidator(
		key,
		config,
		(unknownValue, unknownVariant) => {
			throw new ValidationError(
				`Expected one of ${Object.keys(config)
					.map((key) => JSON.stringify(key))
					.join(' or ')}, got ${JSON.stringify(unknownVariant)}`,
				[key]
			)
		},
		true
	)
}

/**
 * Creates a validator for named model objects with enhanced error reporting. The model name
 * will be included in error messages to provide better debugging context.
 *
 * @param name - The name of the model (used in error messages)
 * @param validator - The validator for the model structure
 * @returns A Validator with enhanced error reporting that includes the model name
 * @throws ValidationError With model name context when validation fails
 * @example
 * ```ts
 * const userModel = T.model('User', T.object({
 *   id: T.string,
 *   name: T.string,
 *   email: T.linkUrl
 * }))
 *
 * // Error message will be: "At User.email: Expected a valid url, got 'invalid-email'"
 * ```
 * @public
 */
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

/**
 * Creates a validator that only accepts values from a given Set of allowed values.
 *
 * @param values - Set containing the allowed values
 * @returns A validator that only accepts values from the provided set
 * @throws ValidationError When the value is not in the allowed set
 * @example
 * ```ts
 * const allowedColors = new Set(['red', 'green', 'blue'] as const)
 * const colorValidator = T.setEnum(allowedColors)
 * colorValidator.validate('red') // Returns 'red'
 * colorValidator.validate('yellow') // Throws ValidationError
 * ```
 * @public
 */
export function setEnum<T>(values: ReadonlySet<T>): Validator<T> {
	return new Validator((value) => {
		if (!values.has(value as T)) {
			const valuesString = Array.from(values, (value) => JSON.stringify(value)).join(' or ')
			throw new ValidationError(`Expected ${valuesString}, got ${value}`)
		}
		return value as T
	})
}

/**
 * Creates a validator that accepts either the validated type or undefined.
 *
 * @param validator - The base validator to make optional
 * @returns A validator that accepts T or undefined
 * @example
 * ```ts
 * const optionalString = T.optional(T.string)
 * optionalString.validate("hello") // Returns "hello"
 * optionalString.validate(undefined) // Returns undefined
 * optionalString.validate(null) // Throws ValidationError
 * ```
 * @public
 */
export function optional<T>(validator: Validatable<T>): Validator<T | undefined> {
	return new Validator(
		(value) => {
			if (value === undefined) return undefined
			return validator.validate(value)
		},
		(knownGoodValue, newValue) => {
			if (knownGoodValue === undefined && newValue === undefined) return undefined
			if (newValue === undefined) return undefined
			if (validator.validateUsingKnownGoodVersion && knownGoodValue !== undefined) {
				return validator.validateUsingKnownGoodVersion(knownGoodValue as T, newValue)
			}
			return validator.validate(newValue)
		}
	)
}

/**
 * Creates a validator that accepts either the validated type or null.
 *
 * @param validator - The base validator to make nullable
 * @returns A validator that accepts T or null
 * @example
 * ```ts
 * const nullableString = T.nullable(T.string)
 * nullableString.validate("hello") // Returns "hello"
 * nullableString.validate(null) // Returns null
 * nullableString.validate(undefined) // Throws ValidationError
 * ```
 * @public
 */
export function nullable<T>(validator: Validatable<T>): Validator<T | null> {
	return new Validator(
		(value) => {
			if (value === null) return null
			return validator.validate(value)
		},
		(knownGoodValue, newValue) => {
			if (newValue === null) return null
			if (validator.validateUsingKnownGoodVersion && knownGoodValue !== null) {
				return validator.validateUsingKnownGoodVersion(knownGoodValue as T, newValue)
			}
			return validator.validate(newValue)
		}
	)
}

/**
 * Creates a validator that only accepts one of the provided literal values.
 * This is a convenience function that creates a setEnum from the provided values.
 *
 * @param values - The allowed literal values
 * @returns A validator that only accepts the provided literal values
 * @throws ValidationError When the value is not one of the allowed literals
 * @example
 * ```ts
 * const themeValidator = T.literalEnum('light', 'dark', 'auto')
 * themeValidator.validate('light') // Returns 'light'
 * themeValidator.validate('blue') // Throws ValidationError: Expected "light" or "dark" or "auto", got blue
 * ```
 * @public
 */
export function literalEnum<const Values extends readonly unknown[]>(
	...values: Values
): Validator<Values[number]> {
	return setEnum(new Set(values))
}

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

const validLinkProtocols = new Set(['http:', 'https:', 'mailto:'])

/**
 * Validator for URLs that are safe to use as user-facing links. Accepts http, https, and mailto protocols.
 * This validator provides security by rejecting potentially dangerous protocols like javascript:.
 *
 * @example
 * ```ts
 * const link = T.linkUrl.validate("https://example.com") // Valid
 * const email = T.linkUrl.validate("mailto:user@example.com") // Valid
 * T.linkUrl.validate("") // Valid (empty string allowed)
 * T.linkUrl.validate("javascript:alert(1)") // Throws ValidationError (unsafe protocol)
 * ```
 * @public
 */
export const linkUrl = string.check((value) => {
	if (value === '') return
	const url = parseUrl(value)

	if (!validLinkProtocols.has(url.protocol.toLowerCase())) {
		throw new ValidationError(
			`Expected a valid url, got ${JSON.stringify(value)} (invalid protocol)`
		)
	}
})

// N.B. asset: is a reference to the local indexedDB object store.
const validSrcProtocols = new Set(['http:', 'https:', 'data:', 'asset:'])

/**
 * Validator for URLs that are safe to use as asset sources. Accepts http, https, data, and asset protocols.
 * The asset: protocol refers to tldraw's local IndexedDB object store.
 *
 * @example
 * ```ts
 * const imageUrl = T.srcUrl.validate("https://example.com/image.png") // Valid
 * const dataUrl = T.srcUrl.validate("data:image/png;base64,iVBORw0...") // Valid
 * const assetUrl = T.srcUrl.validate("asset:abc123") // Valid (local asset reference)
 * T.srcUrl.validate("") // Valid (empty string allowed)
 * ```
 * @public
 */
export const srcUrl = string.check((value) => {
	if (value === '') return
	const url = parseUrl(value)

	if (!validSrcProtocols.has(url.protocol.toLowerCase())) {
		throw new ValidationError(
			`Expected a valid url, got ${JSON.stringify(value)} (invalid protocol)`
		)
	}
})

/**
 * Validator for HTTP and HTTPS URLs only. Rejects all other protocols.
 *
 * @example
 * ```ts
 * const apiUrl = T.httpUrl.validate("https://api.example.com") // Valid
 * const httpUrl = T.httpUrl.validate("http://localhost:3000") // Valid
 * T.httpUrl.validate("") // Valid (empty string allowed)
 * T.httpUrl.validate("ftp://files.example.com") // Throws ValidationError (not http/https)
 * ```
 * @public
 */
export const httpUrl = string.check((value) => {
	if (value === '') return
	const url = parseUrl(value)

	if (!url.protocol.toLowerCase().match(/^https?:$/)) {
		throw new ValidationError(
			`Expected a valid url, got ${JSON.stringify(value)} (invalid protocol)`
		)
	}
})

/**
 * Validator for IndexKey values used in tldraw's indexing system. An IndexKey is a string
 * that meets specific format requirements for use as a database index.
 *
 * @throws ValidationError When the string is not a valid IndexKey format
 * @example
 * ```ts
 * const key = T.indexKey.validate("valid_index_key") // Returns IndexKey
 * T.indexKey.validate("invalid key!") // Throws ValidationError (invalid format)
 * ```
 * @public
 */
export const indexKey = string.refine<IndexKey>((key) => {
	try {
		validateIndexKey(key)
		return key
	} catch {
		throw new ValidationError(`Expected an index key, got ${JSON.stringify(key)}`)
	}
})

/**
 * Creates a validator that accepts values matching either of two validators.
 * Tries the first validator, and if it fails, tries the second validator.
 *
 * @param v1 - The first validator to try
 * @param v2 - The second validator to try if the first fails
 * @returns A validator that accepts values matching either validator
 * @throws ValidationError When the value matches neither validator (throws error from v2)
 * @example
 * ```ts
 * const stringOrNumber = T.or(T.string, T.number)
 * stringOrNumber.validate("hello") // Returns "hello" as string
 * stringOrNumber.validate(42) // Returns 42 as number
 * stringOrNumber.validate(true) // Throws ValidationError from number validator
 * ```
 * @public
 */
export function or<T1, T2>(v1: Validatable<T1>, v2: Validatable<T2>): Validator<T1 | T2> {
	return new Validator((value) => {
		try {
			return v1.validate(value)
		} catch {
			return v2.validate(value)
		}
	})
}
