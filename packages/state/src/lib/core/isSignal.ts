import { _Atom } from './Atom.js'
import { _Computed } from './Computed.js'
import { Signal } from './types.js'

/**
 * Returns true if the given value is a signal (either an Atom or a Computed).
 * @public
 */
export function isSignal(value: any): value is Signal<any> {
	return value instanceof _Atom || value instanceof _Computed
}
