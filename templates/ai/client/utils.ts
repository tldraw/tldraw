import { useRef } from 'react'

/** @public */
export interface OkResult<T> {
	readonly ok: true
	readonly value: T
}
/** @public */
export interface ErrorResult<E> {
	readonly ok: false
	readonly error: E
}
/** @public */
export type Result<T, E> = OkResult<T> | ErrorResult<E>

/** @public */
export const Result = {
	ok<T>(value: T): OkResult<T> {
		return { ok: true, value }
	},
	err<E>(error: E): ErrorResult<E> {
		return { ok: false, error }
	},
}

/** @internal */
export function exhaustiveSwitchError(value: never, property?: string): never {
	const debugValue =
		property && value && typeof value === 'object' && property in value ? value[property] : value
	throw new Error(`Unknown switch case ${debugValue}`)
}

/** @internal */
export const assert: (value: unknown, message?: string) => asserts value = omitFromStackTrace(
	(value, message) => {
		if (!value) {
			throw new Error(message || 'Assertion Error')
		}
	}
)

/** @internal */
export const assertExists = omitFromStackTrace(<T>(value: T, message?: string): NonNullable<T> => {
	// note that value == null is equivalent to value === null || value === undefined
	if (value == null) {
		throw new Error(message ?? 'value must be defined')
	}
	return value as NonNullable<T>
})

/** @internal */
export function promiseWithResolve<T>(): Promise<T> & {
	resolve(value: T): void
	reject(reason?: any): void
} {
	let resolve: (value: T) => void
	let reject: (reason?: any) => void
	const promise = new Promise<T>((res, rej) => {
		resolve = res
		reject = rej
	})
	return Object.assign(promise, {
		resolve: resolve!,
		reject: reject!,
	})
}

/** @internal */
export function sleep(ms: number): Promise<void> {
	// eslint-disable-next-line no-restricted-globals
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * When a function is wrapped in `omitFromStackTrace`, if it throws an error the stack trace won't
 * include the function itself or any stack frames above it. Useful for assertion-style function
 * where the error will ideally originate from the call-site rather than within the implementation
 * of the assert fn.
 *
 * Only works in platforms that support `Error.captureStackTrace` (ie v8).
 *
 * @internal
 */
export function omitFromStackTrace<Args extends Array<unknown>, Return>(
	fn: (...args: Args) => Return
): (...args: Args) => Return {
	const wrappedFn = (...args: Args) => {
		try {
			return fn(...args)
		} catch (error) {
			if (error instanceof Error && Error.captureStackTrace) {
				Error.captureStackTrace(error, wrappedFn)
			}
			throw error
		}
	}

	return wrappedFn
}

/**
 * An alias for `Object.entries` that treats the object as a map and so preserves the type of the
 * keys.
 *
 * @internal
 */
export function objectMapEntries<Key extends string, Value>(object: {
	[K in Key]: Value
}): Array<[Key, Value]> {
	return Object.entries(object) as [Key, Value][]
}

/**
 * 
/**
 * Does nothing, but it's really really good at it.
 * @internal
 */
export const noop: () => void = () => {}

/**
 * Maps the values of one object map to another.
 * @returns a new object with the entries mapped
 * @internal
 */
export function mapObjectMapValues<Key extends string, ValueBefore, ValueAfter>(
	object: { readonly [K in Key]: ValueBefore },
	mapper: (key: Key, value: ValueBefore) => ValueAfter
): { [K in Key]: ValueAfter } {
	const result = {} as { [K in Key]: ValueAfter }
	for (const [key, value] of objectMapEntries(object)) {
		const newValue = mapper(key, value)
		result[key] = newValue
	}
	return result
}

function useIdentity<T>(value: T, isEqual: (a: T, b: T) => boolean): T {
	const ref = useRef(value)
	if (isEqual(value, ref.current)) {
		return ref.current
	}
	ref.current = value
	return value
}

/** @internal */
export function useShallowObjectIdentity<T extends object | null | undefined>(obj: T): T {
	return useIdentity(obj, areNullableObjectsShallowEqual)
}

const areNullableObjectsShallowEqual = (
	a: object | null | undefined,
	b: object | null | undefined
) => {
	a ??= null
	b ??= null
	if (a === b) {
		return true
	}
	if (!a || !b) {
		return false
	}
	return areObjectsShallowEqual(a, b)
}

/** @internal */
export function areObjectsShallowEqual<T extends object>(obj1: T, obj2: T): boolean {
	if (obj1 === obj2) return true
	const keys1 = new Set(Object.keys(obj1))
	const keys2 = new Set(Object.keys(obj2))
	if (keys1.size !== keys2.size) return false
	for (const key of keys1) {
		if (!keys2.has(key)) return false
		if (!Object.is((obj1 as any)[key], (obj2 as any)[key])) return false
	}
	return true
}

import { uniqueId } from 'tldraw'

export function getLocalUserId() {
	let localUserId = uniqueId()

	const localUserIdInLocalStorage = localStorage.getItem('localUserId')
	if (localUserIdInLocalStorage) {
		localUserId = localUserIdInLocalStorage
	} else {
		localStorage.setItem('localUserId', localUserId)
	}

	return localUserId
}
