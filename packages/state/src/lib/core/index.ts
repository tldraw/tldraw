import { atom as _atom, isAtom as _isAtom } from './Atom'
import { computed as _computed, withDiff as _withDiff } from './Computed'
import {
	EffectScheduler as _EffectScheduler,
	react as _react,
	reactor as _reactor,
} from './EffectScheduler'
import {
	unsafe__withoutCapture as _unsafe__withoutCapture,
	whyAmIRunning as _whyAmIRunning,
} from './capture'
import { EMPTY_ARRAY as _EMPTY_ARRAY } from './helpers'
import { isSignal as _isSignal } from './isSignal'
import { transact as _transact, transaction as _transaction } from './transactions'

const sym = Symbol.for('com.tldraw.state')
const glob = globalThis as any

// This should be incremented any time an API change is made. i.e. for additions or removals.
// Bugfixes need not increment this.
const currentApiVersion = 1

function init() {
	return {
		apiVersion: currentApiVersion,
		atom: _atom,
		isAtom: _isAtom,
		computed: _computed,
		withDiff: _withDiff,
		EffectScheduler: _EffectScheduler,
		react: _react,
		reactor: _reactor,
		unsafe__withoutCapture: _unsafe__withoutCapture,
		whyAmIRunning: _whyAmIRunning,
		EMPTY_ARRAY: _EMPTY_ARRAY,
		isSignal: _isSignal,
		transact: _transact,
		transaction: _transaction,
	}
}

const obj: ReturnType<typeof init> = glob[sym] || init()
glob[sym] = obj

const {
	apiVersion,
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
	atom,
	/**
	 * Returns true if the given value is an [[Atom]].
	 * @public
	 */
	isAtom,
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
	computed,
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
	withDiff,
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
	react,
	/**
	 * Creates a [[Reactor]], which is a thin wrapper around an [[EffectScheduler]].
	 *
	 * @public
	 */
	reactor,
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
	unsafe__withoutCapture,
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
	whyAmIRunning,
	/** @public */
	EMPTY_ARRAY,
	/**
	 * Returns true if the given value is a signal (either an Atom or a Computed).
	 * @public
	 */
	isSignal,
	/**
	 * Like [transaction](#transaction), but does not create a new transaction if there is already one in progress.
	 *
	 * @param fn - The function to run in a transaction.
	 * @public
	 */
	transact,
	/**
	 * Batches state updates, deferring side effects until after the transaction completes.
	 *
	 * @example
	 * ```ts
	 * const firstName = atom('John')
	 * const lastName = atom('Doe')
	 *
	 * react('greet', () => {
	 *   print(`Hello, ${firstName.get()} ${lastName.get()}!`)
	 * })
	 *
	 * // Logs "Hello, John Doe!"
	 *
	 * transaction(() => {
	 *  firstName.set('Jane')
	 *  lastName.set('Smith')
	 * })
	 *
	 * // Logs "Hello, Jane Smith!"
	 * ```
	 *
	 * If the function throws, the transaction is aborted and any signals that were updated during the transaction revert to their state before the transaction began.
	 *
	 * @example
	 * ```ts
	 * const firstName = atom('John')
	 * const lastName = atom('Doe')
	 *
	 * react('greet', () => {
	 *   print(`Hello, ${firstName.get()} ${lastName.get()}!`)
	 * })
	 *
	 * // Logs "Hello, John Doe!"
	 *
	 * transaction(() => {
	 *  firstName.set('Jane')
	 *  throw new Error('oops')
	 * })
	 *
	 * // Does not log
	 * // firstName.get() === 'John'
	 * ```
	 *
	 * A `rollback` callback is passed into the function.
	 * Calling this will prevent the transaction from committing and will revert any signals that were updated during the transaction to their state before the transaction began.
	 *
	 *  * @example
	 * ```ts
	 * const firstName = atom('John')
	 * const lastName = atom('Doe')
	 *
	 * react('greet', () => {
	 *   print(`Hello, ${firstName.get()} ${lastName.get()}!`)
	 * })
	 *
	 * // Logs "Hello, John Doe!"
	 *
	 * transaction((rollback) => {
	 *  firstName.set('Jane')
	 *  lastName.set('Smith')
	 *  rollback()
	 * })
	 *
	 * // Does not log
	 * // firstName.get() === 'John'
	 * // lastName.get() === 'Doe'
	 * ```
	 *
	 * @param fn - The function to run in a transaction, called with a function to roll back the change.
	 * @public
	 */
	transaction,
} = obj

if (apiVersion !== currentApiVersion) {
	throw new Error(
		'@tldraw/state: Multiple versions of @tldraw/state are being used. Please ensure that there is only one version of @tldraw/state in your dependency tree.'
	)
}

export type { Atom, AtomOptions } from './Atom'
export { getComputedInstance, isUninitialized } from './Computed'
export type { Computed, ComputedOptions } from './Computed'
export type { Reactor } from './EffectScheduler'
export { RESET_VALUE } from './types'
export type { Signal } from './types'
export { atom, isAtom }
export { computed, withDiff }
export { EffectScheduler, react, reactor }
export { unsafe__withoutCapture, whyAmIRunning }
export { EMPTY_ARRAY }
export { isSignal }
export { transact, transaction }
