import { _Atom } from './Atom'
import { _Computed } from './Computed'
import { Signal } from './types'

/**
 * Returns true if the given value is a signal (either an Atom or a Computed).
 * @public
 */
export function isSignal(value: any): value is Signal<any> {
	return value instanceof _Atom || value instanceof _Computed
}
