import { exhaustiveSwitchError, getOwnProperty, hasOwnProperty } from '@tldraw/utils'

/** @public */
export type ValidatorFn<T> = (value: unknown) => T

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
export type TypeOf<V extends TypeValidator<unknown>> = V extends TypeValidator<infer T> ? T : never

/** @public */
export class TypeValidator<T> {
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
	nullable(): TypeValidator<T | null> {
		return new TypeValidator((value) => {
			if (value === null) return null
			return this.validate(value)
		})
	}

	/**
	 * Returns a new validator that also accepts null or undefined. The resulting value will always be
	 * null.
	 */
	optional(): TypeValidator<T | undefined> {
		return new TypeValidator((value) => {
			if (value === undefined) return undefined
			return this.validate(value)
		})
	}

	/**
	 * Refine this validation to a new type. The passed-in validation function should throw an error
	 * if the value can't be converted to the new type, or return the new type otherwise.
	 */
	refine<U>(otherValidationFn: (value: T) => U): TypeValidator<U> {
		return new TypeValidator((value) => {
			return otherValidationFn(this.validate(value))
		})
	}

	/**
	 * Refine this validation with an additional check that doesn't change the resulting value.
	 *
	 * @example
	 *
	 * ```ts
	 * const numberLessThan10Validator = number.check((value) => {
	 * 	if (value >= 10) {
	 * 		throw new ValidationError(`Expected number less than 10, got ${value}`)
	 * 	}
	 * })
	 * ```
	 */
	check(name: string, checkFn: (value: T) => void): TypeValidator<T>
	check(checkFn: (value: T) => void): TypeValidator<T>
	check(
		nameOrCheckFn: string | ((value: T) => void),
		checkFn?: (value: T) => void
	): TypeValidator<T> {
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
export class ArrayOfValidator<T> extends TypeValidator<T[]> {
	constructor(readonly itemValidator: TypeValidator<T>) {
		super((value) => {
			const arr = arrayValidator.validate(value)
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
export class ObjectValidator<Shape extends object> extends TypeValidator<Shape> {
	constructor(
		public readonly config: {
			readonly [K in keyof Shape]: TypeValidator<Shape[K]>
		},
		private readonly shouldAllowUnknownProperties = false
	) {
		super((object) => {
			if (typeof object !== 'object' || object === null) {
				throw new ValidationError(`Expected object, got ${typeToString(object)}`)
			}

			for (const [key, validator] of Object.entries(config)) {
				prefixError(key, () => {
					;(validator as TypeValidator<unknown>).validate(getOwnProperty(object, key))
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
	 * const animalValidator = object({
	 * 	name: string,
	 * })
	 * const catValidator = animalValidator.extend({
	 * 	meowVolume: number,
	 * })
	 * ```
	 */
	extend<Extension extends Record<string, unknown>>(extension: {
		readonly [K in keyof Extension]: TypeValidator<Extension[K]>
	}): ObjectValidator<Shape & Extension> {
		return new ObjectValidator({ ...this.config, ...extension }) as ObjectValidator<
			Shape & Extension
		>
	}
}

// pass this into itself e.g. Config extends UnionObjectSchemaConfig<Key, Config>
type UnionValidatorConfig<Key extends string, Config> = {
	readonly [Variant in keyof Config]: TypeValidator<any> & {
		validate: (input: any) => { readonly [K in Key]: Variant }
	}
}
/** @public */
export class UnionValidator<
	Key extends string,
	Config extends UnionValidatorConfig<Key, Config>,
	UnknownValue = never
> extends TypeValidator<TypeOf<Config[keyof Config]> | UnknownValue> {
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
export class DictValidator<Key extends string, Value> extends TypeValidator<Record<Key, Value>> {
	constructor(
		public readonly keyValidator: TypeValidator<Key>,
		public readonly valueValidator: TypeValidator<Value>
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

function typeofValidator<T>(type: string): TypeValidator<T> {
	return new TypeValidator((value) => {
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
export const unknownValidator = new TypeValidator((value) => value)
/**
 * Validation that accepts any value. Generally this should be avoided, but you can use it as an
 * escape hatch if you want to work without validations for e.g. a prototype.
 *
 * @public
 */
export const anyValidator = new TypeValidator((value): any => value)

/**
 * Validates that a value is a string.
 *
 * @public
 */
export const stringValidator = typeofValidator<string>('string')

/**
 * Validates that a value is a finite non-NaN number.
 *
 * @public
 */
export const numberValidator = typeofValidator<number>('number').check((number) => {
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
export const positiveNumberValidator = numberValidator.check((value) => {
	if (value < 0) throw new ValidationError(`Expected a positive number, got ${value}`)
})
/**
 * Fails if value \<= 0
 *
 * @public
 */
export const nonZeroNumberValidator = numberValidator.check((value) => {
	if (value <= 0) throw new ValidationError(`Expected a non-zero positive number, got ${value}`)
})
/**
 * Fails if number is not an integer
 *
 * @public
 */
export const integerValidator = numberValidator.check((value) => {
	if (!Number.isInteger(value)) throw new ValidationError(`Expected an integer, got ${value}`)
})
/**
 * Fails if value \< 0 and is not an integer
 *
 * @public
 */
export const positiveIntegerValidator = integerValidator.check((value) => {
	if (value < 0) throw new ValidationError(`Expected a positive integer, got ${value}`)
})
/**
 * Fails if value \<= 0 and is not an integer
 *
 * @public
 */
export const nonZeroIntegerValidator = integerValidator.check((value) => {
	if (value <= 0) throw new ValidationError(`Expected a non-zero positive integer, got ${value}`)
})

/**
 * Validates that a value is boolean.
 *
 * @public
 */
export const booleanValidator = typeofValidator<boolean>('boolean')
/**
 * Validates that a value is a bigint.
 *
 * @public
 */
export const bigintValidator = typeofValidator<bigint>('bigint')
/**
 * Validates that a value matches another that was passed in.
 *
 * @example
 *
 * ```ts
 * const trueValidator = literal(true)
 * ```
 *
 * @public
 */
export function literalValidator<T extends string | number | boolean>(
	expectedValue: T
): TypeValidator<T> {
	return new TypeValidator((actualValue) => {
		if (actualValue !== expectedValue) {
			throw new ValidationError(`Expected ${expectedValue}, got ${JSON.stringify(actualValue)}`)
		}
		return expectedValue
	})
}

/**
 * Validates that a value is an array. To check the contents of the array, use arrayOf.
 *
 * @public
 */
export const arrayValidator = new TypeValidator<unknown[]>((value) => {
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
export function arrayOfValidator<T>(itemValidator: TypeValidator<T>): ArrayOfValidator<T> {
	return new ArrayOfValidator(itemValidator)
}

/** @public */
export const unknownObjectValidator = new TypeValidator<Record<string, unknown>>((value) => {
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
export function objectValidator<Shape extends object>(config: {
	readonly [K in keyof Shape]: TypeValidator<Shape[K]>
}): ObjectValidator<Shape> {
	return new ObjectValidator(config)
}

/**
 * Validation that an option is a dict with particular keys and values.
 *
 * @public
 */
export function dictValidator<Key extends string, Value>(
	keyValidator: TypeValidator<Key>,
	valueValidator: TypeValidator<Value>
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
 * const catValidator = object({ kind: value('cat'), meow: boolean })
 * const dogValidator = object({ kind: value('dog'), bark: boolean })
 * const animalValidator = union('kind', { cat: catValidator, dog: dogValidator })
 * ```
 *
 * @public
 */
export function unionValidator<
	Key extends string,
	Config extends UnionValidatorConfig<Key, Config>
>(key: Key, config: Config): UnionValidator<Key, Config> {
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
export function modelValidator<T extends { readonly id: string }>(
	name: string,
	validator: TypeValidator<T>
): TypeValidator<T> {
	return new TypeValidator((value) => {
		const prefix =
			value && typeof value === 'object' && 'id' in value && typeof value.id === 'string'
				? `${name}(id = ${value.id})`
				: name

		return prefixError(prefix, () => validator.validate(value))
	})
}

/** @public */
export function setEnumValidator<T>(values: ReadonlySet<T>): TypeValidator<T> {
	return new TypeValidator((value) => {
		if (!values.has(value as T)) {
			const valuesString = Array.from(values, (value) => JSON.stringify(value)).join(' or ')
			throw new ValidationError(`Expected ${valuesString}, got ${value}`)
		}
		return value as T
	})
}

/** @public */
export const pointValidator = objectValidator({
	x: numberValidator,
	y: numberValidator,
	z: numberValidator.optional(),
})

/** @public */
export const boxModelValidator = objectValidator({
	x: numberValidator,
	y: numberValidator,
	w: numberValidator,
	h: numberValidator,
})
