/* eslint-disable prefer-rest-params */
import { assert } from '@tldraw/utils'
import { ArraySet } from './ArraySet'
import { maybeCaptureParent, startCapturingParents, stopCapturingParents } from './capture'
import { GLOBAL_START_EPOCH } from './constants'
import { EMPTY_ARRAY, equals, haveParentsChanged, singleton } from './helpers'
import { HistoryBuffer } from './HistoryBuffer'
import { getGlobalEpoch, getIsInTransaction } from './transactions'
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
	 * If you don't need diffs, leave this as `undefined` and no history buffer will be created. Diffs supplied via {@link withDiff} or {@link ComputedOptions.computeDiff} are only recorded when this is set.
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
	readonly __isComputed = true as const
	lastChangedEpoch = GLOBAL_START_EPOCH
	lastTraversedEpoch = GLOBAL_START_EPOCH

	__debug_ancestor_epochs__: Map<Signal<any, any>, number> | null = null

	/**
	 * The epoch when the reactor was last checked. Advances on every check, including ones that
	 * find no change, unlike `lastChangedEpoch`.
	 */
	private lastCheckedEpoch = GLOBAL_START_EPOCH

	parentSet = new ArraySet<Signal<any, any>>()
	parents: Signal<any, any>[] = []
	parentEpochs: number[] = []

	children = new ArraySet<Child>()

	// eslint-disable-next-line tldraw/no-setter-getter
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
				// Every ancestor change to an actively-listening computed traverses it (`flushChanges`),
				// so if it hasn't been traversed since it was last checked the O(parents) scan can be
				// skipped. Not valid while a transaction is open (changes traverse at commit), and only
				// if it was up to date when attached (see `attach` in helpers.ts).
				(this.isActivelyListening &&
					!getIsInTransaction() &&
					this.lastTraversedEpoch <= this.lastCheckedEpoch) ||
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
			// `derive` may have advanced the epoch, so re-read it here, but only once — the whole
			// commit below belongs to a single epoch.
			const epoch = getGlobalEpoch()
			if (isUninitialized || !this.isEqual(this.state, newState)) {
				if (this.historyBuffer && !isUninitialized) {
					// Only `undefined` means "no diff supplied"; `null` can be a legitimate diff.
					const diff = result instanceof WithDiff ? result.diff : undefined
					this.historyBuffer.pushEntry(
						this.lastChangedEpoch,
						epoch,
						diff !== undefined
							? diff
							: this.computeDiff
								? this.computeDiff(this.state, newState, this.lastCheckedEpoch, epoch)
								: RESET_VALUE
					)
				}
				this.lastChangedEpoch = epoch
				this.state = newState
			}
			this.error = null
			this.lastCheckedEpoch = epoch

			return this.state
		} catch (e) {
			// if a derived value throws an error, we reset the state to UNINITIALIZED
			const epoch = getGlobalEpoch()
			// Entering the error state (from a value, or from never having computed) is a change;
			// throwing again while already in it is not. Checking `error` rather than `state` matters
			// for a first run that throws: `state` is already UNINITIALIZED then, and leaving
			// `lastChangedEpoch` at GLOBAL_START_EPOCH would keep `isNew` true and re-run `derive` on
			// every read instead of rethrowing the cached error.
			if (this.error === null) {
				this.state = UNINITIALIZED as unknown as Value
				this.lastChangedEpoch = epoch
			}
			this.lastCheckedEpoch = epoch
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

// Set on every decorated wrapper: the symbol its per-instance computed is stored under.
const derivationKeyKey = '@@__computedDerivationKey__@@'

/**
 * Builds the method (or getter) body that `@computed` installs: a per-instance, lazily-created
 * computed over the original method. The storage symbol is unique per decoration rather than
 * `Symbol.for(name)` so that a subclass which overrides a `@computed` method and calls
 * `super.method()` reaches the superclass's computed instead of re-entering its own.
 */
function makeComputedWrapper(name: string, compute: () => any, options: ComputedOptions<any, any>) {
	const derivationKey = Symbol('__@tldraw/state__computed__' + name)

	const wrapper = function (this: any) {
		let d = this[derivationKey] as Computed<any> | undefined

		if (!d) {
			d = new _Computed(name, compute.bind(this) as any, options)
			Object.defineProperty(this, derivationKey, {
				enumerable: false,
				configurable: false,
				writable: false,
				value: d,
			})
		}
		return d.get()
	} as any
	wrapper[derivationKeyKey] = derivationKey
	return wrapper
}

function computedDecorator(
	options: ComputedOptions<any, any> = {},
	args:
		| [target: any, key: string, descriptor: PropertyDescriptor]
		| [originalMethod: () => any, context: ClassMethodDecoratorContext]
) {
	if (args.length === 2) {
		const [originalMethod, context] = args
		assert(context.kind === 'method', '@computed can only be used on methods')
		return makeComputedWrapper(String(context.name), originalMethod, options)
	} else {
		const [_target, key, descriptor] = args
		if (descriptor.get) {
			logComputedGetterWarning()
			descriptor.get = makeComputedWrapper(key, descriptor.get, options)
		} else {
			descriptor.value = makeComputedWrapper(key, descriptor.value, options)
		}
		return descriptor
	}
}

/**
 * Retrieves the underlying computed instance for a given property created with the `computed`
 * decorator.
 *
 * @example
 * ```ts
 * class Counter {
 *   max = 100
 *   count = atom('count', 0)
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
): Computed<Obj[Prop] extends () => infer Value ? Value : Obj[Prop]> {
	// The nearest decorated wrapper (a method, or a legacy getter) on the prototype chain knows
	// which symbol the instance's computed is stored under.
	for (let proto: any = obj; proto; proto = Object.getPrototypeOf(proto)) {
		const descriptor = Object.getOwnPropertyDescriptor(proto, propertyName)
		const wrapper = descriptor?.get ?? descriptor?.value
		const key = wrapper?.[derivationKeyKey]
		if (!key) continue

		let inst = (obj as any)[key]
		if (!inst) {
			// calling the wrapper creates the computed (before it first derives, so a throwing derive
			// still leaves the instance behind)
			try {
				wrapper.call(obj)
			} catch {
				// the caller asked for the instance, not its value
			}
			inst = (obj as any)[key]
		}
		return inst
	}
	return undefined as any
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
 *   count = atom('count', 0)
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
 *   count = atom('count', 0)
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
	if (arguments.length <= 1) {
		// decorator factory: `@computed(options)` or `@computed()`
		const options = arguments[0]
		return (...args: any) => computedDecorator(options, args)
	} else if (typeof arguments[0] === 'string') {
		return new _Computed(arguments[0], arguments[1], arguments[2])
	} else {
		return computedDecorator(undefined, arguments as any)
	}
}

import { isComputed as _isComputed } from './isComputed'

/**
 * Returns true if the given value is a computed signal.
 * @public
 */
export function isComputed(value: any): value is Computed<any> {
	return _isComputed(value)
}
