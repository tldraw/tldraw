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

/** @public */
export type ValidatorFn<T> = (value: unknown) => T
/** @public */
export type ValidatorUsingKnownGoodVersionFn<In, Out = In> = (
	knownGoodValue: In,
	value: unknown
) => Out

/** @public */
export interface Validatable<T> {
	validate(value: unknown): T
	/**
	 * This is a performance optimizing version of validate that can use a previous
	 * version of the value to avoid revalidating every part of the new value if
	 * any part of it has not changed since the last validation.
	 *
	 * If the value has not changed but is not referentially equal, the function
	 * should return the previous value.
	 * @returns
	 */
	validateUsingKnownGoodVersion?(knownGoodValue: T, newValue: unknown): T
}

function formatPath(path: ReadonlyArray): string | null {
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

/** @public */
export class ValidationError extends Error {
	override name = 'ValidationError'

	constructor(public readonly rawMessage: string, public readonly path: ReadonlyArray = []) {
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
export type TypeOf<V extends Validatable> = V extends Validatable ? T : never

/** @public */
export class Validator<T> implements Validatable {
	constructor(
		readonly validationFn: ValidatorFn,
		readonly validateUsingKnownGoodVersionFn?: ValidatorUsingKnownGoodVersionFn
	) {}

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

	validateUsingKnownGoodVersion(knownGoodValue: T, newValue: unknown): T {
		if (Object.is(knownGoodValue, newValue)) {
			return knownGoodValue as T
		}

		if (this.validateUsingKnownGoodVersionFn) {
			return this.validateUsingKnownGoodVersionFn(knownGoodValue, newValue)
		}

		return this.validate(newValue)
	}

	/** Checks that the passed value is of the correct type. */
	isValid(value: unknown): value is T {
		try {
			this.validate(value)
			return true
		} catch {
			return false
		}
	}

	/**
	 * Returns a new validator that also accepts null or undefined. The resulting value will always be
	 * null.
	 */
	nullable(): Validator {
		return nullable(this)
	}

	/**
	 * Returns a new validator that also accepts null or undefined. The resulting value will always be
	 * null.
	 */
	optional(): Validator {
		return optional(this)
	}

	/**
	 * Refine this validation to a new type. The passed-in validation function should throw an error
	 * if the value can't be converted to the new type, or return the new type otherwise.
	 */
	refine<U>(otherValidationFn: (value: T) => U): Validator {
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
	check(name: string, checkFn: (value: T) => void): Validator
	check(checkFn: (value: T) => void): Validator
	check(nameOrCheckFn: string | ((value: T) => void), checkFn?: (value: T) => void): Validator {
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
export class ArrayOfValidator<T> extends Validator {
	constructor(readonly itemValidator: Validatable) {
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
export class ObjectValidator<Shape extends object> extends Validator {
	constructor(
		public readonly config: {
			readonly [K in keyof Shape]: Validatable
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
						;(validator as Validatable).validate(getOwnProperty(object, key))
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
						const validatable = validator as Validatable
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
	extend<Extension extends Record>(
		extension: {
			readonly [K in keyof Extension]: Validatable
		}
	): ObjectValidator {
		return new ObjectValidator({ ...this.config, ...extension }) as any as ObjectValidator
	}
}

// pass this into itself e.g. Config extends UnionObjectSchemaConfig<Key, Config>
/** @public */
export type UnionValidatorConfig<Key extends string, Config> = {
	readonly [Variant in keyof Config]: Validatable & {
		validate(input: any): { readonly [K in Key]: Variant }
	}
}
/** @public */
export class UnionValidator<
	Key extends string,
	Config extends UnionValidatorConfig,
	UnknownValue = never
> extends Validator {
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
		matchingSchema: Validatable | undefined
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

	validateUnknownVariants<Unknown>(
		unknownValueValidation: (value: object, variant: string) => Unknown
	): UnionValidator {
		return new UnionValidator(this.key, this.config, unknownValueValidation, this.useNumberKeys)
	}
}

/** @public */
export class DictValidator<Key extends string, Value> extends Validator {
	constructor(
		public readonly keyValidator: Validatable,
		public readonly valueValidator: Validatable
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

				return object as Record
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

				return isDifferent ? (newValue as Record) : knownGoodValue
			}
		)
	}
}

function typeofValidator<T>(type: string): Validator {
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
export function literal<T extends string | number | boolean>(expectedValue: T): Validator {
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
export function arrayOf<T>(itemValidator: Validatable): ArrayOfValidator {
	return new ArrayOfValidator(itemValidator)
}

/** @public */
export const unknownObject = new Validator<Record>((value) => {
	if (typeof value !== 'object' || value === null) {
		throw new ValidationError(`Expected object, got ${typeToString(value)}`)
	}
	return value as Record
})

/**
 * Validate an object has a particular shape.
 *
 * @public
 */
export function object<Shape extends object>(
	config: {
		readonly [K in keyof Shape]: Validatable
	}
): ObjectValidator {
	return new ObjectValidator(config) as any
}

function isPlainObject(value: unknown): value is Record {
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
 * Validate that a value is valid JSON.
 *
 * @public
 */
export const jsonValue: Validator = new Validator<JsonValue>(
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
 * Validate an object has a particular shape.
 *
 * @public
 */
export function jsonDict(): DictValidator {
	return dict(string, jsonValue)
}

/**
 * Validation that an option is a dict with particular keys and values.
 *
 * @public
 */
export function dict<Key extends string, Value>(
	keyValidator: Validatable,
	valueValidator: Validatable
): DictValidator {
	return new DictValidator(keyValidator, valueValidator)
}

/**
 * Validate a union of several object types. Each object must have a property matching `key` which
 * should be a unique string.
 *
 * @example
 *
 * ```ts
 * const catValidator = T.object({ kind: T.literal('cat'), meow: T.boolean })
 * const dogValidator = T.object({ kind: T.literal('dog'), bark: T.boolean })
 * const animalValidator = T.union('kind', { cat: catValidator, dog: dogValidator })
 * ```
 *
 * @public
 */
export function union<Key extends string, Config extends UnionValidatorConfig>(
	key: Key,
	config: Config
): UnionValidator {
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
 * @internal
 */
export function numberUnion<Key extends string, Config extends UnionValidatorConfig>(
	key: Key,
	config: Config
): UnionValidator {
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
 * A named object with an ID. Errors will be reported as being part of the object with the given
 * name.
 *
 * @public
 */
export function model<T extends { readonly id: string }>(
	name: string,
	validator: Validatable
): Validator {
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

/** @public */
export function setEnum<T>(values: ReadonlySet): Validator {
	return new Validator((value) => {
		if (!values.has(value as T)) {
			const valuesString = Array.from(values, (value) => JSON.stringify(value)).join(' or ')
			throw new ValidationError(`Expected ${valuesString}, got ${value}`)
		}
		return value as T
	})
}

/** @public */
export function optional<T>(validator: Validatable): Validator {
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

/** @public */
export function nullable<T>(validator: Validatable): Validator {
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

/** @public */
export function literalEnum<Values extends readonly unknown[]>(...values: Values): Validator {
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
 * Validates that a value is a url safe to use as a link.
 *
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
 * Validates that a valid is a url safe to load as an asset.
 *
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
 * Validates an http(s) url
 *
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
 * Validates that a value is an IndexKey.
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
 * Validate a value against one of two types.
 *
 * @public
 */
export function or<T1, T2>(v1: Validatable, v2: Validatable): Validator {
	return new Validator((value) => {
		try {
			return v1.validate(value)
		} catch {
			return v2.validate(value)
		}
	})
}
