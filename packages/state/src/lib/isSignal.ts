import { _Atom } from './Atom'
import { _Computed } from './Computed'
import { Signal } from './types'

/**
 * @public
 */
export function isSignal(value: any): value is Signal<any> {
	return value instanceof _Atom || value instanceof _Computed
}
