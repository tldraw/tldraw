/* eslint-disable prefer-rest-params */
import { ArraySet } from './ArraySet'
import { HistoryBuffer } from './HistoryBuffer'
import { maybeCaptureParent, startCapturingParents, stopCapturingParents } from './capture'
import { GLOBAL_START_EPOCH } from './constants'
import { EMPTY_ARRAY, equals, haveParentsChanged, singleton } from './helpers'
import { getGlobalEpoch, getIsReacting, getReactionEpoch } from './transactions'
import { Child, ComputeDiff, RESET_VALUE, Signal } from './types'
import { logComputedGetterWarning } from './warnings'

/**
 * @public
 */
export const UNINITIALIZED = Symbol.for('com.tldraw.state/UNINITIALIZED')
/**
 * The type of the first value passed to a computed signal function as the 'prevValue' parameter.
 *
 * @see [[isUninitialized]].
 * @public
 */
export type UNINITIALIZED = typeof UNINITIALIZED

/**
 * Call this inside a computed signal function to determine whether it is the first time the function is being called.
 *
 * Mainly useful for incremental signal computation.
 *
 * @example
 * ```ts
 * const count = atom('count', 0)
 * const double = computed('double', (prevValue) => {
 *   if (isUninitialized(prevValue)) {
 *     print('First time!')
 *   }
 *   return count.get() * 2
 * })
 * ```
 *
 * @param value - The value to check.
 * @public
 */
export const isUninitialized = (value: any): value is UNINITIALIZED => {
	return value === UNINITIALIZED
}

export const WithDiff = singleton(
	'WithDiff',
	() =>
		class WithDiff<Value, Diff> {
			constructor(
				public value: Value,
				public diff: Diff
			) {}
		}
)
export interface WithDiff<Value, Diff> {
	value: Value
	diff: Diff
}

/**
 * When writing incrementally-computed signals it is convenient (and usually more performant) to incrementally compute the diff too.
 *
 * You can use this function to wrap the return value of a computed signal function to indicate that the diff should be used instead of calculating a new one with [[AtomOptions.computeDiff]].
 *
 * @example
 * ```ts
 * const count = atom('count', 0)
 * const double = computed('double', (prevValue) => {
 *   const nextValue = count.get() * 2
 *   if (isUninitialized(prevValue)) {
 *     return nextValue
 *   }
 *   return withDiff(nextValue, nextValue - prevValue)
 * }, { historyLength: 10 })
 * ```
 *
 *
 * @param value - The value.
 * @param diff - The diff.
 * @public
 */
export function withDiff<Value, Diff>(value: Value, diff: Diff): WithDiff<Value, Diff> {
	return new WithDiff(value, diff)
}

/**
 * Options for creating computed signals. Used when calling [[computed]].
 * @public
 */
export interface ComputedOptions<Value, Diff> {
	/**
	 * The maximum number of diffs to keep in the history buffer.
	 *
	 * If you don't need to compute diffs, or if you will supply diffs manually via [[Atom.set]], you can leave this as `undefined` and no history buffer will be created.
	 *
	 * If you expect the value to be part of an active effect subscription all the time, and to not change multiple times inside of a single transaction, you can set this to a relatively low number (e.g. 10).
	 *
	 * Otherwise, set this to a higher number based on your usage pattern and memory constraints.
	 *
	 */
	historyLength?: number
	/**
	 * A method used to compute a diff between the atom's old and new values. If provided, it will not be used unless you also specify [[AtomOptions.historyLength]].
	 */
	computeDiff?: ComputeDiff<Value, Diff>
	/**
	 * If provided, this will be used to compare the old and new values of the atom to determine if the value has changed.
	 * By default, values are compared using first using strict equality (`===`), then `Object.is`, and finally any `.equals` method present in the object's prototype chain.
	 * @param a - The old value
	 * @param b - The new value
	 * @returns
	 */
	isEqual?: (a: any, b: any) => boolean
}

/**
 * A computed signal created via [[computed]].
 *
 * @public
 */
export interface Computed<Value, Diff = unknown> extends Signal<Value, Diff> {
	/**
	 * Whether this computed child is involved in an actively-running effect graph.
	 * @public
	 */
	readonly isActivelyListening: boolean

	/** @internal */
	readonly parentSet: ArraySet<Signal<any, any>>
	/** @internal */
	readonly parents: Signal<any, any>[]
	/** @internal */
	readonly parentEpochs: number[]
}

/**
 * @internal
 */
class __UNSAFE__Computed<Value, Diff = unknown> implements Computed<Value, Diff> {
	lastChangedEpoch = GLOBAL_START_EPOCH
	lastTraversedEpoch = GLOBAL_START_EPOCH

	/**
	 * The epoch when the reactor was last checked.
	 */
	private lastCheckedEpoch = GLOBAL_START_EPOCH

	parentSet = new ArraySet<Signal<any, any>>()
	parents: Signal<any, any>[] = []
	parentEpochs: number[] = []

	children = new ArraySet<Child>()

	// eslint-disable-next-line no-restricted-syntax
	get isActivelyListening(): boolean {
		return !this.children.isEmpty
	}

	historyBuffer?: HistoryBuffer<Diff>

	// The last-computed value of this signal.
	private state: Value = UNINITIALIZED as unknown as Value
	// If the signal throws an error we stash it so we can rethrow it on the next get()
	private error: null | { thrownValue: any } = null

	private computeDiff?: ComputeDiff<Value, Diff>

	private readonly isEqual: (a: any, b: any) => boolean

	constructor(
		/**
		 * The name of the signal. This is used for debugging and performance profiling purposes. It does not need to be globally unique.
		 */
		public readonly name: string,
		/**
		 * The function that computes the value of the signal.
		 */
		private readonly derive: (
			previousValue: Value | UNINITIALIZED,
			lastComputedEpoch: number
		) => Value | WithDiff<Value, Diff>,
		options?: ComputedOptions<Value, Diff>
	) {
		if (options?.historyLength) {
			this.historyBuffer = new HistoryBuffer(options.historyLength)
		}
		this.computeDiff = options?.computeDiff
		this.isEqual = options?.isEqual ?? equals
	}

	__unsafe__getWithoutCapture(ignoreErrors?: boolean): Value {
		const isNew = this.lastChangedEpoch === GLOBAL_START_EPOCH

		const globalEpoch = getGlobalEpoch()

		if (
			!isNew &&
			(this.lastCheckedEpoch === globalEpoch ||
				(this.isActivelyListening &&
					getIsReacting() &&
					this.lastTraversedEpoch < getReactionEpoch()) ||
				!haveParentsChanged(this))
		) {
			this.lastCheckedEpoch = globalEpoch
			if (this.error) {
				if (!ignoreErrors) {
					throw this.error.thrownValue
				} else {
					return this.state // will be UNINITIALIZED
				}
			} else {
				return this.state
			}
		}

		try {
			startCapturingParents(this)
			const result = this.derive(this.state, this.lastCheckedEpoch)
			const newState = result instanceof WithDiff ? result.value : result
			const isUninitialized = this.state === UNINITIALIZED
			if (isUninitialized || !this.isEqual(newState, this.state)) {
				if (this.historyBuffer && !isUninitialized) {
					const diff = result instanceof WithDiff ? result.diff : undefined
					this.historyBuffer.pushEntry(
						this.lastChangedEpoch,
						getGlobalEpoch(),
						diff ??
							this.computeDiff?.(this.state, newState, this.lastCheckedEpoch, getGlobalEpoch()) ??
							RESET_VALUE
					)
				}
				this.lastChangedEpoch = getGlobalEpoch()
				this.state = newState
			}
			this.error = null
			this.lastCheckedEpoch = getGlobalEpoch()

			return this.state
		} catch (e) {
			// if a derived value throws an error, we reset the state to UNINITIALIZED
			if (this.state !== UNINITIALIZED) {
				this.state = UNINITIALIZED as unknown as Value
				this.lastChangedEpoch = getGlobalEpoch()
			}
			this.lastCheckedEpoch = getGlobalEpoch()
			// we also clear the history buffer if an error was thrown
			if (this.historyBuffer) {
				this.historyBuffer.clear()
			}
			this.error = { thrownValue: e }
			// we don't wish to propagate errors when derefed via haveParentsChanged()
			if (!ignoreErrors) throw e
			return this.state
		} finally {
			stopCapturingParents()
		}
	}

	get(): Value {
		try {
			return this.__unsafe__getWithoutCapture()
		} finally {
			// if the deriver throws an error we still need to capture
			maybeCaptureParent(this)
		}
	}

	getDiffSince(epoch: number): RESET_VALUE | Diff[] {
		// we can ignore any errors thrown during derive
		this.__unsafe__getWithoutCapture(true)
		// and we still need to capture this signal as a parent
		maybeCaptureParent(this)

		if (epoch >= this.lastChangedEpoch) {
			return EMPTY_ARRAY
		}

		return this.historyBuffer?.getChangesSince(epoch) ?? RESET_VALUE
	}
}

export const _Computed = singleton('Computed', () => __UNSAFE__Computed)
export type _Computed = InstanceType<typeof __UNSAFE__Computed>

function computedMethodAnnotation(
	options: ComputedOptions<any, any> = {},
	_target: any,
	key: string,
	descriptor: PropertyDescriptor
) {
	const originalMethod = descriptor.value
	const derivationKey = Symbol.for('__@tldraw/state__computed__' + key)

	descriptor.value = function (this: any) {
		let d = this[derivationKey] as Computed<any> | undefined

		if (!d) {
			d = new _Computed(key, originalMethod!.bind(this) as any, options)
			Object.defineProperty(this, derivationKey, {
				enumerable: false,
				configurable: false,
				writable: false,
				value: d,
			})
		}
		return d.get()
	}
	descriptor.value[isComputedMethodKey] = true

	return descriptor
}

function computedAnnotation(
	options: ComputedOptions<any, any> = {},
	_target: any,
	key: string,
	descriptor: PropertyDescriptor
) {
	if (descriptor.get) {
		logComputedGetterWarning()
		return computedGetterAnnotation(options, _target, key, descriptor)
	} else {
		return computedMethodAnnotation(options, _target, key, descriptor)
	}
}

function computedGetterAnnotation(
	options: ComputedOptions<any, any> = {},
	_target: any,
	key: string,
	descriptor: PropertyDescriptor
) {
	const originalMethod = descriptor.get
	const derivationKey = Symbol.for('__@tldraw/state__computed__' + key)

	descriptor.get = function (this: any) {
		let d = this[derivationKey] as Computed<any> | undefined

		if (!d) {
			d = new _Computed(key, originalMethod!.bind(this) as any, options)
			Object.defineProperty(this, derivationKey, {
				enumerable: false,
				configurable: false,
				writable: false,
				value: d,
			})
		}
		return d.get()
	}

	return descriptor
}

const isComputedMethodKey = '@@__isComputedMethod__@@'

/**
 * Retrieves the underlying computed instance for a given property created with the [[computed]]
 * decorator.
 *
 * @example
 * ```ts
 * class Counter {
 *   max = 100
 *   count = atom(0)
 *
 *   @computed getRemaining() {
 *     return this.max - this.count.get()
 *   }
 * }
 *
 * const c = new Counter()
 * const remaining = getComputedInstance(c, 'getRemaining')
 * remaining.get() === 100 // true
 * c.count.set(13)
 * remaining.get() === 87 // true
 * ```
 *
 * @param obj - The object
 * @param propertyName - The property name
 * @public
 */
export function getComputedInstance<Obj extends object, Prop extends keyof Obj>(
	obj: Obj,
	propertyName: Prop
): Computed<Obj[Prop]> {
	const key = Symbol.for('__@tldraw/state__computed__' + propertyName.toString())
	let inst = obj[key as keyof typeof obj] as Computed<Obj[Prop]> | undefined
	if (!inst) {
		// deref to make sure it exists first
		const val = obj[propertyName]
		if (typeof val === 'function' && (val as any)[isComputedMethodKey]) {
			val.call(obj)
		}

		inst = obj[key as keyof typeof obj] as Computed<Obj[Prop]> | undefined
	}
	return inst as any
}

/**
 * Creates a computed signal.
 *
 * @example
 * ```ts
 * const name = atom('name', 'John')
 * const greeting = computed('greeting', () => `Hello ${name.get()}!`)
 * console.log(greeting.get()) // 'Hello John!'
 * ```
 *
 * `computed` may also be used as a decorator for creating computed getter methods.
 *
 * @example
 * ```ts
 * class Counter {
 *   max = 100
 *   count = atom<number>(0)
 *
 *   @computed getRemaining() {
 *     return this.max - this.count.get()
 *   }
 * }
 * ```
 *
 * You may optionally pass in a [[ComputedOptions]] when used as a decorator:
 *
 * @example
 * ```ts
 * class Counter {
 *   max = 100
 *   count = atom<number>(0)
 *
 *   @computed({isEqual: (a, b) => a === b})
 *   getRemaining() {
 *     return this.max - this.count.get()
 *   }
 * }
 * ```
 *
 * @param name - The name of the signal.
 * @param compute - The function that computes the value of the signal.
 * @param options - Options for the signal.
 *
 * @public
 */
export function computed<Value, Diff = unknown>(
	name: string,
	compute: (
		previousValue: Value | typeof UNINITIALIZED,
		lastComputedEpoch: number
	) => Value | WithDiff<Value, Diff>,
	options?: ComputedOptions<Value, Diff>
): Computed<Value, Diff>

/** @public */
export function computed(
	target: any,
	key: string,
	descriptor: PropertyDescriptor
): PropertyDescriptor
/** @public */
export function computed<Value, Diff = unknown>(
	options?: ComputedOptions<Value, Diff>
): (target: any, key: string, descriptor: PropertyDescriptor) => PropertyDescriptor
/** @public */
export function computed() {
	if (arguments.length === 1) {
		const options = arguments[0]
		return (target: any, key: string, descriptor: PropertyDescriptor) =>
			computedAnnotation(options, target, key, descriptor)
	} else if (typeof arguments[0] === 'string') {
		return new _Computed(arguments[0], arguments[1], arguments[2])
	} else {
		return computedAnnotation(undefined, arguments[0], arguments[1], arguments[2])
	}
}

/**
 * Returns true if the given value is a computed signal.
 *
 * @param value
 * @returns {value is Computed<any>}
 * @public
 */
export function isComputed(value: any): value is Computed<any> {
	return value && value instanceof _Computed
}
