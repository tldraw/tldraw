import { AtomOptions, _Atom, type Atom } from './Atom'
import {
	Computed,
	ComputedOptions,
	UNINITIALIZED,
	WithDiff,
	_Computed,
	_computed,
} from './Computed'
import {
	EffectSchedulerOptions,
	Reactor,
	EffectScheduler as _EffectScheduler,
} from './EffectScheduler'
import { _unsafe__withoutCapture, _whyAmIRunning } from './capture'
import { singleton } from './helpers'
import { Signal } from './types'

// This should be incremented any time an API change is made. i.e. for additions or removals.
// Bugfixes need not increment this.
const currentApiVersion = 1

const inst = singleton('api', () => ({
	apiVersion: currentApiVersion,
	_Atom: _Atom,
	_computed,
	_Computed,
	WithDiff: WithDiff,
	EffectScheduler: _EffectScheduler,
	_unsafe__withoutCapture,
	_whyAmIRunning,
	EMPTY_ARRAY: Object.freeze([]) as [],
}))

/**
 * Creates a new [[Atom]].
 *
 * An Atom is a signal that can be updated directly by calling [[Atom.set]] or [[Atom.update]].
 *
 * @example
 * ```ts
 * const name = atom('name', 'John')
 *
 * name.get() // 'John'
 *
 * name.set('Jane')
 *
 * name.get() // 'Jane'
 * ```
 *
 * @public
 */
export function atom<Value, Diff = unknown>(
	/**
	 * A name for the signal. This is used for debugging and profiling purposes, it does not need to be unique.
	 */
	name: string,
	/**
	 * The initial value of the signal.
	 */
	initialValue: Value,
	/**
	 * The options to configure the atom. See [[AtomOptions]].
	 */
	options?: AtomOptions<Value, Diff>
): Atom<Value, Diff> {
	return new inst._Atom(name, initialValue, options)
}

/**
 * Returns true if the given value is an [[Atom]].
 * @public
 */
export function isAtom(value: unknown): value is Atom<unknown> {
	return !!value && value instanceof inst._Atom
}

/**
 * Returns true if the given value is a computed signal.
 *
 * @param value - the value
 * @public
 */
export function isComputed(value: unknown): value is Computed<any> {
	return !!value && value instanceof inst._Computed
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
	return new inst.WithDiff(value, diff)
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
	// eslint-disable-next-line prefer-rest-params
	return inst._computed.apply(null, arguments as any) as any
}

/**
 * Starts a new effect scheduler, scheduling the effect immediately.
 *
 * Returns a function that can be called to stop the scheduler.
 *
 * @example
 * ```ts
 * const color = atom('color', 'red')
 * const stop = react('set style', () => {
 *   divElem.style.color = color.get()
 * })
 * color.set('blue')
 * // divElem.style.color === 'blue'
 * stop()
 * color.set('green')
 * // divElem.style.color === 'blue'
 * ```
 *
 *
 * Also useful in React applications for running effects outside of the render cycle.
 *
 * @example
 * ```ts
 * useEffect(() => react('set style', () => {
 *   divRef.current.style.color = color.get()
 * }), [])
 * ```
 *
 * @public
 */
export function react(
	name: string,
	fn: (lastReactedEpoch: number) => any,
	options?: EffectSchedulerOptions
) {
	const scheduler = new inst.EffectScheduler(name, fn, options)
	scheduler.attach()
	scheduler.scheduleEffect()
	return () => {
		scheduler.detach()
	}
}

/**
 * Creates a [[Reactor]], which is a thin wrapper around an [[EffectScheduler]].
 *
 * @public
 */
export function reactor<Result>(
	name: string,
	fn: (lastReactedEpoch: number) => Result,
	options?: EffectSchedulerOptions
): Reactor<Result> {
	const scheduler = new inst.EffectScheduler<Result>(name, fn, options)
	return {
		scheduler,
		start: (options?: { force?: boolean }) => {
			const force = options?.force ?? false
			scheduler.attach()
			if (force) {
				scheduler.scheduleEffect()
			} else {
				scheduler.maybeScheduleEffect()
			}
		},
		stop: () => {
			scheduler.detach()
		},
	}
}

/**
 * Executes the given function without capturing any parents in the current capture context.
 *
 * This is mainly useful if you want to run an effect only when certain signals change while also
 * dereferencing other signals which should not cause the effect to rerun on their own.
 *
 * @example
 * ```ts
 * const name = atom('name', 'Sam')
 * const time = atom('time', () => new Date().getTime())
 *
 * setInterval(() => {
 *   time.set(new Date().getTime())
 * })
 *
 * react('log name changes', () => {
 * 	 print(name.get(), 'was changed at', unsafe__withoutCapture(() => time.get()))
 * })
 *
 * ```
 *
 * @public
 */
export function unsafe__withoutCapture<T>(fn: () => T): T {
	return inst._unsafe__withoutCapture(fn)
}

/**
 * A debugging tool that tells you why a computed signal or effect is running.
 * Call in the body of a computed signal or effect function.
 *
 * @example
 * ```ts
 * const name = atom('name', 'Bob')
 * react('greeting', () => {
 * 	whyAmIRunning()
 *	print('Hello', name.get())
 * })
 *
 * name.set('Alice')
 *
 * // 'greeting' is running because:
 * //     'name' changed => 'Alice'
 * ```
 *
 * @public
 */
export function whyAmIRunning() {
	return inst._whyAmIRunning()
}

/**
 * Returns true if the given value is a signal (either an Atom or a Computed).
 * @public
 */
export function isSignal(value: any): value is Signal<any> {
	return value instanceof inst._Atom || value instanceof inst._Computed
}

const {
	apiVersion,

	/**
	 * An EffectScheduler is responsible for executing side effects in response to changes in state.
	 *
	 * You probably don't need to use this directly unless you're integrating this library with a framework of some kind.
	 *
	 * Instead, use the [[react]] and [[reactor]] functions.
	 *
	 * @example
	 * ```ts
	 * const render = new EffectScheduler('render', drawToCanvas)
	 *
	 * render.attach()
	 * render.execute()
	 * ```
	 *
	 * @public
	 */
	EffectScheduler,

	/** @public */
	EMPTY_ARRAY,
} = inst

if (apiVersion !== currentApiVersion) {
	throw new Error(
		'@tldraw/state: Multiple versions of @tldraw/state are being used. Please ensure that there is only one version of @tldraw/state in your dependency tree.'
	)
}

export type { Atom, AtomOptions } from './Atom'
export { getComputedInstance, isUninitialized } from './Computed'
export type { Computed, ComputedOptions } from './Computed'
export type { Reactor } from './EffectScheduler'
export { transact, transaction } from './transactions'
export { RESET_VALUE } from './types'
export type { Signal } from './types'
export { EffectScheduler }
export { EMPTY_ARRAY }
