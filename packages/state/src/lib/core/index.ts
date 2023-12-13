import { atom as _atom, isAtom as _isAtom } from './Atom'
import {
	computed as _computed,
	getComputedInstance as _getComputedInstance,
	isUninitialized as _isUninitialized,
	withDiff as _withDiff,
} from './Computed'
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

function init() {
	return {
		atom: _atom,
		isAtom: _isAtom,
		computed: _computed,
		getComputedInstance: _getComputedInstance,
		isUninitialized: _isUninitialized as typeof _isUninitialized,
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

const sym = Symbol.for('com.tldraw.state')
const glob = globalThis as any

const obj: ReturnType<typeof init> = glob[sym] || init()
glob[sym] = obj

const {
	atom,
	isAtom,
	computed,
	getComputedInstance,
	isUninitialized,
	withDiff,
	EffectScheduler,
	react,
	reactor,
	unsafe__withoutCapture,
	whyAmIRunning,
	EMPTY_ARRAY,
	isSignal,
	transact,
	transaction,
} = obj


export type { Atom, AtomOptions } from './Atom'
export type { Computed, ComputedOptions } from './Computed'
export type { Reactor } from './EffectScheduler'
export type { Signal } from './types'
export { atom, isAtom }
export { computed, getComputedInstance, isUninitialized, withDiff }
export { EffectScheduler, react, reactor }
export { unsafe__withoutCapture, whyAmIRunning }
export { EMPTY_ARRAY }
export { isSignal }
export { transact, transaction }
export { RESET_VALUE } from './types'
