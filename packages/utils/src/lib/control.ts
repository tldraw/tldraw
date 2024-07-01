import { omitFromStackTrace } from './function'

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
	// note that value == null is equivilent to value === null || value === undefined
	if (value == null) {
		throw new Error(message ?? 'value must be defined')
	}
	return value as NonNullable<T>
})

/** @internal */
export function promiseWithResolve<T>(): Promise<T> & {
	resolve: (value: T) => void
	reject: (reason?: any) => void
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
export class RC<out T> {
	private count = 0
	private disposeTimeout: NodeJS.Timeout | undefined

	constructor(
		private readonly value: T,
		private readonly dispose: () => void,
		private readonly timeout = 0
	) {
		// if an RC value isn't immediately retained, it will be disposed:
		this.scheduleDispose()
	}

	unsafeGetWithoutRetain() {
		return this.value
	}

	retain() {
		this.count++
		if (this.disposeTimeout) {
			clearTimeout(this.disposeTimeout)
			this.disposeTimeout = undefined
		}
		return this.value
	}

	release() {
		this.count--
		this.scheduleDispose()
	}

	private scheduleDispose() {
		if (this.count <= 0) {
			// eslint-disable-next-line no-restricted-globals
			this.disposeTimeout = setTimeout(() => {
				if (this.count === 0) {
					this.dispose()
				}
			}, this.timeout)
		}
	}
}
