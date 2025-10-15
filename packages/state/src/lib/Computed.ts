/* eslint-disable prefer-rest-params */
import { assert } from '@tldraw/utils'
import { ArraySet } from './ArraySet'
import { HistoryBuffer } from './HistoryBuffer'
import { maybeCaptureParent, startCapturingParents, stopCapturingParents } from './capture'
import { GLOBAL_START_EPOCH } from './constants'
import { EMPTY_ARRAY, equals, haveParentsChanged, singleton } from './helpers'
import { getGlobalEpoch, getIsReacting, getReactionEpoch } from './transactions'
import { Child, ComputeDiff, RESET_VALUE, Signal } from './types'
import { logComputedGetterWarning } from './warnings'

/**
 * A special symbol used to indicate that a computed signal has not been initialized yet.
 * This is passed as the `previousValue` parameter to a computed signal function on its first run.
 *
 * @example
 * ```ts
 * const count = atom('count', 0)
 * const double = computed('double', (prevValue) => {
 *   if (isUninitialized(prevValue)) {
 *     console.log('First computation!')
 *   }
 *   return count.get() * 2
 * })
 * ```
 *
 * @public
 */
export const UNINITIALIZED = Symbol.for('com.tldraw.state/UNINITIALIZED')
/**
 * The type of the first value passed to a computed signal function as the 'prevValue' parameter.
 * This type represents the uninitialized state of a computed signal before its first calculation.
 *
 * @see {@link isUninitialized}
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
export function isUninitialized(value: any): value is UNINITIALIZED {
	return value === UNINITIALIZED
}

/**
 * A singleton class used to wrap computed signal values along with their diffs.
 * This class is used internally by the {@link withDiff} function to provide both
 * the computed value and its diff to the signal system.
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
 * })
 * ```
 *
 * @public
 */
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

/**
 * Interface representing a value wrapped with its corresponding diff.
 * Used in incremental computation to provide both the new value and the diff from the previous value.
 *
 * @public
 */
export interface WithDiff<Value, Diff> {
	/**
	 * The computed value.
	 */
	value: Value
	/**
	 * The diff between the previous and current value.
	 */
	diff: Diff
}

/**
 * When writing incrementally-computed signals it is convenient (and usually more performant) to incrementally compute the diff too.
 *
 * You can use this function to wrap the return value of a computed signal function to indicate that the diff should be used instead of calculating a new one with {@link AtomOptions.computeDiff}.
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
 * Options for configuring computed signals. Used when calling `computed` or using the `@computed` decorator.
 *
 * @example
 * ```ts
 * const greeting = computed('greeting', () => `Hello ${name.get()}!`, {
 *   historyLength: 10,
 *   isEqual: (a, b) => a === b,
 *   computeDiff: (oldVal, newVal) => ({ type: 'change', from: oldVal, to: newVal })
 * })
 * ```
 *
 * @public
 */
export interface ComputedOptions<Value, Diff> {
	/**
	 * The maximum number of diffs to keep in the history buffer.
	 *
	 * If you don't need to compute diffs, or if you will supply diffs manually via {@link Atom.set}, you can leave this as `undefined` and no history buffer will be created.
	 *
	 * If you expect the value to be part of an active effect subscription all the time, and to not change multiple times inside of a single transaction, you can set this to a relatively low number (e.g. 10).
	 *
	 * Otherwise, set this to a higher number based on your usage pattern and memory constraints.
	 *
	 */
	historyLength?: number
	/**
	 * A method used to compute a diff between the computed's old and new values. If provided, it will not be used unless you also specify {@link ComputedOptions.historyLength}.
	 */
	computeDiff?: ComputeDiff<Value, Diff>
	/**
	 * If provided, this will be used to compare the old and new values of the computed to determine if the value has changed.
	 * By default, values are compared using first using strict equality (`===`), then `Object.is`, and finally any `.equals` method present in the object's prototype chain.
	 * @param a - The old value
	 * @param b - The new value
	 * @returns True if the values are equal, false otherwise.
	 */
	isEqual?(a: any, b: any): boolean
}

/**
 * A computed signal created via the `computed` function or `@computed` decorator.
 * Computed signals derive their values from other signals and automatically update when their dependencies change.
 * They use lazy evaluation, only recalculating when accessed and dependencies have changed.
 *
 * @example
 * ```ts
 * const firstName = atom('firstName', 'John')
 * const lastName = atom('lastName', 'Doe')
 * const fullName = computed('fullName', () => `${firstName.get()} ${lastName.get()}`)
 *
 * console.log(fullName.get()) // "John Doe"
 * firstName.set('Jane')
 * console.log(fullName.get()) // "Jane Doe"
 * ```
 *
 * @public
 */
export interface Computed<Value, Diff = unknown> extends Signal<Value, Diff> {
	/**
	 * Whether this computed signal is involved in an actively-running effect graph.
	 * Returns true if there are any reactions or other computed signals depending on this one.
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

	__debug_ancestor_epochs__: Map<Signal<any, any>, number> | null = null

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

/**
 * Singleton reference to the computed signal implementation class.
 * Used internally by the library to create computed signal instances.
 *
 * @internal
 */
export const _Computed = singleton('Computed', () => __UNSAFE__Computed)

/**
 * Type alias for the computed signal implementation class.
 *
 * @internal
 */
export type _Computed = InstanceType<typeof __UNSAFE__Computed>

function computedMethodLegacyDecorator(
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

function computedGetterLegacyDecorator(
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

function computedMethodTc39Decorator<This extends object, Value>(
	options: ComputedOptions<Value, any>,
	compute: () => Value,
	context: ClassMethodDecoratorContext<This, () => Value>
) {
	assert(context.kind === 'method', '@computed can only be used on methods')
	const derivationKey = Symbol.for('__@tldraw/state__computed__' + String(context.name))

	const fn = function (this: any) {
		let d = this[derivationKey] as Computed<any> | undefined

		if (!d) {
			d = new _Computed(String(context.name), compute.bind(this) as any, options)
			Object.defineProperty(this, derivationKey, {
				enumerable: false,
				configurable: false,
				writable: false,
				value: d,
			})
		}
		return d.get()
	}
	fn[isComputedMethodKey] = true
	return fn
}

function computedDecorator(
	options: ComputedOptions<any, any> = {},
	args:
		| [target: any, key: string, descriptor: PropertyDescriptor]
		| [originalMethod: () => any, context: ClassMethodDecoratorContext]
) {
	if (args.length === 2) {
		const [originalMethod, context] = args
		return computedMethodTc39Decorator(options, originalMethod, context)
	} else {
		const [_target, key, descriptor] = args
		if (descriptor.get) {
			logComputedGetterWarning()
			return computedGetterLegacyDecorator(options, _target, key, descriptor)
		} else {
			return computedMethodLegacyDecorator(options, _target, key, descriptor)
		}
	}
}

const isComputedMethodKey = '@@__isComputedMethod__@@'

/**
 * Retrieves the underlying computed instance for a given property created with the `computed`
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
 * Creates a computed signal that derives its value from other signals.
 * Computed signals automatically update when their dependencies change and use lazy evaluation
 * for optimal performance.
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
 * You may optionally pass in a {@link ComputedOptions} when used as a decorator:
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
 * @param name - The name of the signal for debugging purposes
 * @param compute - The function that computes the value of the signal. Receives the previous value and last computed epoch
 * @param options - Optional configuration for the computed signal
 * @returns A new computed signal
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
/**
 * TC39 decorator for creating computed methods in classes.
 *
 * @example
 * ```ts
 * class MyClass {
 *   value = atom('value', 10)
 *
 *   @computed
 *   doubled() {
 *     return this.value.get() * 2
 *   }
 * }
 * ```
 *
 * @param compute - The method to be decorated
 * @param context - The decorator context provided by TypeScript
 * @returns The decorated method
 * @public
 */
export function computed<This extends object, Value>(
	compute: () => Value,
	context: ClassMethodDecoratorContext<This, () => Value>
): () => Value
/**
 * Legacy TypeScript decorator for creating computed methods in classes.
 *
 * @example
 * ```ts
 * class MyClass {
 *   value = atom('value', 10)
 *
 *   @computed
 *   doubled() {
 *     return this.value.get() * 2
 *   }
 * }
 * ```
 *
 * @param target - The class prototype
 * @param key - The property key
 * @param descriptor - The property descriptor
 * @returns The modified property descriptor
 * @public
 */
export function computed(
	target: any,
	key: string,
	descriptor: PropertyDescriptor
): PropertyDescriptor
/**
 * Decorator factory for creating computed methods with options.
 *
 * @example
 * ```ts
 * class MyClass {
 *   items = atom('items', [1, 2, 3])
 *
 *   @computed({ historyLength: 10 })
 *   sum() {
 *     return this.items.get().reduce((a, b) => a + b, 0)
 *   }
 * }
 * ```
 *
 * @param options - Configuration options for the computed signal
 * @returns A decorator function that can be applied to methods
 * @public
 */
export function computed<Value, Diff = unknown>(
	options?: ComputedOptions<Value, Diff>
): ((target: any, key: string, descriptor: PropertyDescriptor) => PropertyDescriptor) &
	(<This>(
		compute: () => Value,
		context: ClassMethodDecoratorContext<This, () => Value>
	) => () => Value)

/**
 * Implementation function that handles all computed signal creation and decoration scenarios.
 * This function is overloaded to support multiple usage patterns:
 * - Creating computed signals directly
 * - Using as a TC39 decorator
 * - Using as a legacy decorator
 * - Using as a decorator factory with options
 *
 * @returns Either a computed signal instance or a decorator function depending on usage
 * @public
 */
export function computed() {
	if (arguments.length === 1) {
		const options = arguments[0]
		return (...args: any) => computedDecorator(options, args)
	} else if (typeof arguments[0] === 'string') {
		return new _Computed(arguments[0], arguments[1], arguments[2])
	} else {
		return computedDecorator(undefined, arguments as any)
	}
}

/**
 * Returns true if the given value is a computed signal.
 * This is a type guard function that can be used to check if a value is a computed signal instance.
 *
 * @example
 * ```ts
 * const count = atom('count', 0)
 * const double = computed('double', () => count.get() * 2)
 *
 * console.log(isComputed(count))  // false
 * console.log(isComputed(double)) // true
 * ```
 *
 * @param value - The value to check
 * @returns True if the value is a computed signal, false otherwise
 * @public
 */
export function isComputed(value: any): value is Computed<any> {
	return !!(value && value instanceof _Computed)
}
