import { _Atom } from './Atom'
import { _Computed } from './Computed'
import { Signal } from './types'

/**
 * Type guard function that determines whether a value is a signal (either an Atom or Computed).
 *
 * This utility function is helpful when working with mixed data types and you need to
 * differentiate between regular values and reactive signal containers. It returns `true`
 * if the provided value is either an atomic signal created with `atom()` or a computed
 * signal created with `computed()`.
 *
 * @param value - The value to check, can be of any type
 * @returns `true` if the value is a Signal (Atom or Computed), `false` otherwise
 *
 * @example
 * ```ts
 * import { atom, computed, isSignal } from '@tldraw/state'
 *
 * const count = atom('count', 5)
 * const doubled = computed('doubled', () => count.get() * 2)
 * const regularValue = 'hello'
 *
 * console.log(isSignal(count))        // true
 * console.log(isSignal(doubled))      // true
 * console.log(isSignal(regularValue)) // false
 * console.log(isSignal(null))         // false
 * ```
 *
 * @public
 */
export function isSignal(value: any): value is Signal<any> {
	return value instanceof _Atom || value instanceof _Computed
}
