import { JsonValue, exhaustiveSwitchError, getOwnProperty, hasOwnProperty } from '@tldraw/utils'

/** @public */
export type ValidatorFn<T> = (value: unknown) => T

/** @public */
export type Validatable<T> = { validate: (value: unknown) => T }

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
	if (formattedPath.startsWith('.')) {
		return formattedPath.slice(1)
	}
	return formattedPath
}

/** @public */
export class ValidationError extends Error {
	override name = 'ValidationError'

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

/** @public */
export type TypeOf<V extends Validatable<unknown>> = V extends Validatable<infer T> ? T : never

/** @public */
export class Validator<T> implements Validatable<T> {
	constructor(readonly validationFn: ValidatorFn<T>) {}

	/**
	 * Asserts that the passed value is of the correct type and returns it. The returned value is
	 * guaranteed to be referentially equal to the passed value.
	 */
	validate(value: unknown): T {
		const validated = this.validationFn(value)
		if (process.env.NODE_ENV !== 'production' && !Object.is(value, validated)) {
			throw new ValidationError('Validator functions must return the same value they were passed')
		}
		return validated
	}

	/**
	 * Returns a new validator that also accepts null or undefined. The resulting value will always be
	 * null.
	 */
	nullable(): Validator<T | null> {
		return nullable(this)
	}

	/**
	 * Returns a new validator that also accepts null or undefined. The resulting value will always be
	 * null.
	 */
	optional(): Validator<T | undefined> {
		return optional(this)
	}

	/**
	 * Refine this validation to a new type. The passed-in validation function should throw an error
	 * if the value can't be converted to the new type, or return the new type otherwise.
	 */
	refine<U>(otherValidationFn: (value: T) => U): Validator<U> {
		return new Validator((value) => {
			return otherValidationFn(this.validate(value))
		})
	}

	/**
	 * Refine this validation with an additional check that doesn't change the resulting value.
	 *
	 * @example
	 *
	 * ```ts
	 * const numberLessThan10Validator = T.number.check((value) => {
	 * 	if (value >= 10) {
	 * 		throw new ValidationError(`Expected number less than 10, got ${value}`)
	 * 	}
	 * })
	 * ```
	 */
	check(name: string, checkFn: (value: T) => void): Validator<T>
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

/** @public */
export class ArrayOfValidator<T> extends Validator<T[]> {
	constructor(readonly itemValidator: Validatable<T>) {
		super((value) => {
			const arr = array.validate(value)
			for (let i = 0; i < arr.length; i++) {
				prefixError(i, () => itemValidator.validate(arr[i]))
			}
			return arr as T[]
		})
	}

	nonEmpty() {
		return this.check((value) => {
			if (value.length === 0) {
				throw new ValidationError('Expected a non-empty array')
			}
		})
	}

	lengthGreaterThan1() {
		return this.check((value) => {
			if (value.length <= 1) {
				throw new ValidationError('Expected an array with length greater than 1')
			}
		})
	}
}

/** @public */
export class ObjectValidator<Shape extends object> extends Validator<Shape> {
	constructor(
		public readonly config: {
			readonly [K in keyof Shape]: Validatable<Shape[K]>
		},
		private readonly shouldAllowUnknownProperties = false
	) {
		super((object) => {
			if (typeof object !== 'object' || object === null) {
				throw new ValidationError(`Expected object, got ${typeToString(object)}`)
			}

			for (const [key, validator] of Object.entries(config)) {
				prefixError(key, () => {
					;(validator as Validator<unknown>).validate(getOwnProperty(object, key))
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
		})
	}

	allowUnknownProperties() {
		return new ObjectValidator(this.config, true)
	}

	/**
	 * Extend an object validator by adding additional properties.
	 *
	 * @example
	 *
	 * ```ts
	 * const animalValidator = T.object({
	 * 	name: T.string,
	 * })
	 * const catValidator = animalValidator.extend({
	 * 	meowVolume: T.number,
	 * })
	 * ```
	 */
	extend<Extension extends Record<string, unknown>>(extension: {
		readonly [K in keyof Extension]: Validatable<Extension[K]>
	}): ObjectValidator<Shape & Extension> {
		return new ObjectValidator({ ...this.config, ...extension }) as ObjectValidator<
			Shape & Extension
		>
	}
}

// pass this into itself e.g. Config extends UnionObjectSchemaConfig<Key, Config>
type UnionValidatorConfig<Key extends string, Config> = {
	readonly [Variant in keyof Config]: Validatable<any> & {
		validate: (input: any) => { readonly [K in Key]: Variant }
	}
}
/** @public */
export class UnionValidator<
	Key extends string,
	Config extends UnionValidatorConfig<Key, Config>,
	UnknownValue = never
> extends Validator<TypeOf<Config[keyof Config]> | UnknownValue> {
	constructor(
		private readonly key: Key,
		private readonly config: Config,
		private readonly unknownValueValidation: (value: object, variant: string) => UnknownValue
	) {
		super((input) => {
			if (typeof input !== 'object' || input === null) {
				throw new ValidationError(`Expected an object, got ${typeToString(input)}`, [])
			}

			const variant = getOwnProperty(input, key) as keyof Config | undefined
			if (typeof variant !== 'string') {
				throw new ValidationError(
					`Expected a string for key "${key}", got ${typeToString(variant)}`
				)
			}

			const matchingSchema = hasOwnProperty(config, variant) ? config[variant] : undefined
			if (matchingSchema === undefined) {
				return this.unknownValueValidation(input, variant)
			}

			return prefixError(`(${key} = ${variant})`, () => matchingSchema.validate(input))
		})
	}

	validateUnknownVariants<Unknown>(
		unknownValueValidation: (value: object, variant: string) => Unknown
	): UnionValidator<Key, Config, Unknown> {
		return new UnionValidator(this.key, this.config, unknownValueValidation)
	}
}

/** @public */
export class DictValidator<Key extends string, Value> extends Validator<Record<Key, Value>> {
	constructor(
		public readonly keyValidator: Validatable<Key>,
		public readonly valueValidator: Validatable<Value>
	) {
		super((object) => {
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
		})
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
 * Validation that accepts any value. Useful as a starting point for building your own custom
 * validations.
 *
 * @public
 */
export const unknown = new Validator((value) => value)
/**
 * Validation that accepts any value. Generally this should be avoided, but you can use it as an
 * escape hatch if you want to work without validations for e.g. a prototype.
 *
 * @public
 */
export const any = new Validator((value): any => value)

/**
 * Validates that a value is a string.
 *
 * @public
 */
export const string = typeofValidator<string>('string')

/**
 * Validates that a value is a finite non-NaN number.
 *
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
 * Fails if value \< 0
 *
 * @public
 */
export const positiveNumber = number.check((value) => {
	if (value < 0) throw new ValidationError(`Expected a positive number, got ${value}`)
})
/**
 * Fails if value \<= 0
 *
 * @public
 */
export const nonZeroNumber = number.check((value) => {
	if (value <= 0) throw new ValidationError(`Expected a non-zero positive number, got ${value}`)
})
/**
 * Fails if number is not an integer
 *
 * @public
 */
export const integer = number.check((value) => {
	if (!Number.isInteger(value)) throw new ValidationError(`Expected an integer, got ${value}`)
})
/**
 * Fails if value \< 0 and is not an integer
 *
 * @public
 */
export const positiveInteger = integer.check((value) => {
	if (value < 0) throw new ValidationError(`Expected a positive integer, got ${value}`)
})
/**
 * Fails if value \<= 0 and is not an integer
 *
 * @public
 */
export const nonZeroInteger = integer.check((value) => {
	if (value <= 0) throw new ValidationError(`Expected a non-zero positive integer, got ${value}`)
})

/**
 * Validates that a value is boolean.
 *
 * @public
 */
export const boolean = typeofValidator<boolean>('boolean')
/**
 * Validates that a value is a bigint.
 *
 * @public
 */
export const bigint = typeofValidator<bigint>('bigint')
/**
 * Validates that a value matches another that was passed in.
 *
 * @example
 *
 * ```ts
 * const trueValidator = T.literal(true)
 * ```
 *
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
 * Validates that a value is an array. To check the contents of the array, use T.arrayOf.
 *
 * @public
 */
export const array = new Validator<unknown[]>((value) => {
	if (!Array.isArray(value)) {
		throw new ValidationError(`Expected an array, got ${typeToString(value)}`)
	}
	return value
})

/**
 * Validates that a value is an array whose contents matches the passed-in validator.
 *
 * @public
 */
export function arrayOf<T>(itemValidator: Validatable<T>): ArrayOfValidator<T> {
	return new ArrayOfValidator(itemValidator)
}

/** @public */
export const unknownObject = new Validator<Record<string, unknown>>((value) => {
	if (typeof value !== 'object' || value === null) {
		throw new ValidationError(`Expected object, got ${typeToString(value)}`)
	}
	return value as Record<string, unknown>
})

/**
 * Validate an object has a particular shape.
 *
 * @public
 */
export function object<Shape extends object>(config: {
	readonly [K in keyof Shape]: Validatable<Shape[K]>
}): ObjectValidator<Shape> {
	return new ObjectValidator(config)
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

	if (typeof value === 'object') {
		return Object.values(value).every(isValidJson)
	}

	return false
}

/**
 * Validate that a value is valid JSON.
 *
 * @public
 */
export const jsonValue = new Validator<JsonValue>((value): JsonValue => {
	if (isValidJson(value)) {
		return value as JsonValue
	}

	throw new ValidationError(`Expected json serializable value, got ${typeof value}`)
})

/**
 * Validate an object has a particular shape.
 *
 * @public
 */
export function jsonDict(): DictValidator<string, JsonValue> {
	return dict(string, jsonValue)
}

/**
 * Validation that an option is a dict with particular keys and values.
 *
 * @public
 */
export function dict<Key extends string, Value>(
	keyValidator: Validatable<Key>,
	valueValidator: Validatable<Value>
): DictValidator<Key, Value> {
	return new DictValidator(keyValidator, valueValidator)
}

/**
 * Validate a union of several object types. Each object must have a property matching `key` which
 * should be a unique string.
 *
 * @example
 *
 * ```ts
 * const catValidator = T.object({ kind: T.value('cat'), meow: T.boolean })
 * const dogValidator = T.object({ kind: T.value('dog'), bark: T.boolean })
 * const animalValidator = T.union('kind', { cat: catValidator, dog: dogValidator })
 * ```
 *
 * @public
 */
export function union<Key extends string, Config extends UnionValidatorConfig<Key, Config>>(
	key: Key,
	config: Config
): UnionValidator<Key, Config> {
	return new UnionValidator(key, config, (unknownValue, unknownVariant) => {
		throw new ValidationError(
			`Expected one of ${Object.keys(config)
				.map((key) => JSON.stringify(key))
				.join(' or ')}, got ${JSON.stringify(unknownVariant)}`,
			[key]
		)
	})
}

/**
 * A named object with an ID. Errors will be reported as being part of the object with the given
 * name.
 *
 * @public
 */
export function model<T extends { readonly id: string }>(
	name: string,
	validator: Validatable<T>
): Validator<T> {
	return new Validator((value) => {
		const prefix =
			value && typeof value === 'object' && 'id' in value && typeof value.id === 'string'
				? `${name}(id = ${value.id})`
				: name

		return prefixError(prefix, () => validator.validate(value))
	})
}

/** @public */
export function setEnum<T>(values: ReadonlySet<T>): Validator<T> {
	return new Validator((value) => {
		if (!values.has(value as T)) {
			const valuesString = Array.from(values, (value) => JSON.stringify(value)).join(' or ')
			throw new ValidationError(`Expected ${valuesString}, got ${value}`)
		}
		return value as T
	})
}

/** @public */
export function optional<T>(validator: Validatable<T>): Validator<T | undefined> {
	return new Validator((value) => {
		if (value === undefined) return undefined
		return validator.validate(value)
	})
}

/** @public */
export function nullable<T>(validator: Validatable<T>): Validator<T | null> {
	return new Validator((value) => {
		if (value === null) return null
		return validator.validate(value)
	})
}

/** @public */
export function literalEnum<const Values extends readonly unknown[]>(
	...values: Values
): Validator<Values[number]> {
	return setEnum(new Set(values))
}
