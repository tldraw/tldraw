import { JsonValue } from '@tldraw/utils'
/** @public */
export type ValidatorFn<T> = (value: unknown) => T
/** @public */
export type Validatable<T> = {
	validate: (value: unknown) => T
}
/** @public */
export declare class ValidationError extends Error {
	readonly rawMessage: string
	readonly path: ReadonlyArray<number | string>
	name: string
	constructor(rawMessage: string, path?: ReadonlyArray<number | string>)
}
/** @public */
export type TypeOf<V extends Validatable<unknown>> = V extends Validatable<infer T> ? T : never
/** @public */
export declare class Validator<T> implements Validatable<T> {
	readonly validationFn: ValidatorFn<T>
	constructor(validationFn: ValidatorFn<T>)
	/**
	 * Asserts that the passed value is of the correct type and returns it. The returned value is
	 * guaranteed to be referentially equal to the passed value.
	 */
	validate(value: unknown): T
	/** Checks that the passed value is of the correct type. */
	isValid(value: unknown): value is T
	/**
	 * Returns a new validator that also accepts null or undefined. The resulting value will always be
	 * null.
	 */
	nullable(): Validator<T | null>
	/**
	 * Returns a new validator that also accepts null or undefined. The resulting value will always be
	 * null.
	 */
	optional(): Validator<T | undefined>
	/**
	 * Refine this validation to a new type. The passed-in validation function should throw an error
	 * if the value can't be converted to the new type, or return the new type otherwise.
	 */
	refine<U>(otherValidationFn: (value: T) => U): Validator<U>
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
}
/** @public */
export declare class ArrayOfValidator<T> extends Validator<T[]> {
	readonly itemValidator: Validatable<T>
	constructor(itemValidator: Validatable<T>)
	nonEmpty(): Validator<T[]>
	lengthGreaterThan1(): Validator<T[]>
}
/** @public */
export declare class ObjectValidator<Shape extends object> extends Validator<Shape> {
	readonly config: {
		readonly [K in keyof Shape]: Validatable<Shape[K]>
	}
	private readonly shouldAllowUnknownProperties
	constructor(
		config: {
			readonly [K in keyof Shape]: Validatable<Shape[K]>
		},
		shouldAllowUnknownProperties?: boolean
	)
	allowUnknownProperties(): ObjectValidator<Shape>
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
	}): ObjectValidator<Shape & Extension>
}
type UnionValidatorConfig<Key extends string, Config> = {
	readonly [Variant in keyof Config]: Validatable<any> & {
		validate: (input: any) => {
			readonly [K in Key]: Variant
		}
	}
}
/** @public */
export declare class UnionValidator<
	Key extends string,
	Config extends UnionValidatorConfig<Key, Config>,
	UnknownValue = never,
> extends Validator<TypeOf<Config[keyof Config]> | UnknownValue> {
	private readonly key
	private readonly config
	private readonly unknownValueValidation
	constructor(
		key: Key,
		config: Config,
		unknownValueValidation: (value: object, variant: string) => UnknownValue
	)
	validateUnknownVariants<Unknown>(
		unknownValueValidation: (value: object, variant: string) => Unknown
	): UnionValidator<Key, Config, Unknown>
}
/** @public */
export declare class DictValidator<Key extends string, Value> extends Validator<
	Record<Key, Value>
> {
	readonly keyValidator: Validatable<Key>
	readonly valueValidator: Validatable<Value>
	constructor(keyValidator: Validatable<Key>, valueValidator: Validatable<Value>)
}
/**
 * Validation that accepts any value. Useful as a starting point for building your own custom
 * validations.
 *
 * @public
 */
export declare const unknown: Validator<unknown>
/**
 * Validation that accepts any value. Generally this should be avoided, but you can use it as an
 * escape hatch if you want to work without validations for e.g. a prototype.
 *
 * @public
 */
export declare const any: Validator<any>
/**
 * Validates that a value is a string.
 *
 * @public
 */
export declare const string: Validator<string>
/**
 * Validates that a value is a finite non-NaN number.
 *
 * @public
 */
export declare const number: Validator<number>
/**
 * Fails if value \< 0
 *
 * @public
 */
export declare const positiveNumber: Validator<number>
/**
 * Fails if value \<= 0
 *
 * @public
 */
export declare const nonZeroNumber: Validator<number>
/**
 * Fails if number is not an integer
 *
 * @public
 */
export declare const integer: Validator<number>
/**
 * Fails if value \< 0 and is not an integer
 *
 * @public
 */
export declare const positiveInteger: Validator<number>
/**
 * Fails if value \<= 0 and is not an integer
 *
 * @public
 */
export declare const nonZeroInteger: Validator<number>
/**
 * Validates that a value is boolean.
 *
 * @public
 */
export declare const boolean: Validator<boolean>
/**
 * Validates that a value is a bigint.
 *
 * @public
 */
export declare const bigint: Validator<bigint>
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
export declare function literal<T extends string | number | boolean>(expectedValue: T): Validator<T>
/**
 * Validates that a value is an array. To check the contents of the array, use T.arrayOf.
 *
 * @public
 */
export declare const array: Validator<unknown[]>
/**
 * Validates that a value is an array whose contents matches the passed-in validator.
 *
 * @public
 */
export declare function arrayOf<T>(itemValidator: Validatable<T>): ArrayOfValidator<T>
/** @public */
export declare const unknownObject: Validator<Record<string, unknown>>
/**
 * Validate an object has a particular shape.
 *
 * @public
 */
export declare function object<Shape extends object>(config: {
	readonly [K in keyof Shape]: Validatable<Shape[K]>
}): ObjectValidator<Shape>
/**
 * Validate that a value is valid JSON.
 *
 * @public
 */
export declare const jsonValue: Validator<JsonValue>
/**
 * Validate an object has a particular shape.
 *
 * @public
 */
export declare function jsonDict(): DictValidator<string, JsonValue>
/**
 * Validation that an option is a dict with particular keys and values.
 *
 * @public
 */
export declare function dict<Key extends string, Value>(
	keyValidator: Validatable<Key>,
	valueValidator: Validatable<Value>
): DictValidator<Key, Value>
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
export declare function union<Key extends string, Config extends UnionValidatorConfig<Key, Config>>(
	key: Key,
	config: Config
): UnionValidator<Key, Config>
/**
 * A named object with an ID. Errors will be reported as being part of the object with the given
 * name.
 *
 * @public
 */
export declare function model<
	T extends {
		readonly id: string
	},
>(name: string, validator: Validatable<T>): Validator<T>
/** @public */
export declare function setEnum<T>(values: ReadonlySet<T>): Validator<T>
/** @public */
export declare function optional<T>(validator: Validatable<T>): Validator<T | undefined>
/** @public */
export declare function nullable<T>(validator: Validatable<T>): Validator<T | null>
/** @public */
export declare function literalEnum<const Values extends readonly unknown[]>(
	...values: Values
): Validator<Values[number]>
/**
 * Validates that a value is a url safe to use as a link.
 *
 * @public
 */
export declare const linkUrl: Validator<string>
/**
 * Validates that a valid is a url safe to load as an asset.
 *
 * @public
 */
export declare const srcUrl: Validator<string>
export {}
//# sourceMappingURL=validation.d.ts.map
