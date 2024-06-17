import { singleton } from './helpers'

export { ArraySet } from './ArraySet'
export { atom, isAtom } from './Atom'
export type { Atom, AtomOptions } from './Atom'
export { UNINITIALIZED, computed, getComputedInstance, isUninitialized, withDiff } from './Computed'
export type { Computed, ComputedOptions, WithDiff } from './Computed'
export { EffectScheduler, react, reactor } from './EffectScheduler'
export type { EffectSchedulerOptions, Reactor } from './EffectScheduler'
export { unsafe__withoutCapture, whyAmIRunning } from './capture'
export { EMPTY_ARRAY } from './helpers'
export { isSignal } from './isSignal'
export { transact, transaction } from './transactions'
export { RESET_VALUE } from './types'
export type { Child, ComputeDiff, Signal } from './types'

// This should be incremented any time an API change is made. i.e. for additions or removals.
// Bugfixes need not increment this.
const currentApiVersion = 1

const actualApiVersion = singleton('apiVersion', () => currentApiVersion)

if (actualApiVersion !== currentApiVersion) {
	throw new Error(
		`You have multiple incompatible versions of @tldraw/state in your app. Please deduplicate the package.`
	)
}
