import { singleton } from './core/helpers'

export { ArraySet } from './core/ArraySet'
export { atom, isAtom } from './core/Atom'
export type { Atom, AtomOptions } from './core/Atom'
export {
	UNINITIALIZED,
	computed,
	getComputedInstance,
	isUninitialized,
	withDiff,
} from './core/Computed'
export type { Computed, ComputedOptions, WithDiff } from './core/Computed'
export { EffectScheduler, react, reactor } from './core/EffectScheduler'
export type { EffectSchedulerOptions, Reactor } from './core/EffectScheduler'
export { unsafe__withoutCapture, whyAmIRunning } from './core/capture'
export { EMPTY_ARRAY } from './core/helpers'
export { isSignal } from './core/isSignal'
export { transact, transaction } from './core/transactions'
export { RESET_VALUE } from './core/types'
export type { Child, ComputeDiff, Signal } from './core/types'

// This should be incremented any time an API change is made. i.e. for additions or removals.
// Bugfixes need not increment this.
const currentApiVersion = 1

const actualApiVersion = singleton('apiVersion', () => currentApiVersion)

if (actualApiVersion !== currentApiVersion) {
	throw new Error(
		`You have multiple incompatible versions of @tldraw/state in your app. Please deduplicate the package.`
	)
}
