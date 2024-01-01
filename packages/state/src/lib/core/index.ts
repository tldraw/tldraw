import { singleton } from './helpers'

export { atom, isAtom } from './Atom'
export type { Atom, AtomOptions } from './Atom'
export { computed, getComputedInstance, isUninitialized, withDiff } from './Computed'
export type { Computed, ComputedOptions } from './Computed'
export { EffectScheduler, react, reactor } from './EffectScheduler'
export type { Reactor } from './EffectScheduler'
export { unsafe__withoutCapture, whyAmIRunning } from './capture'
export { EMPTY_ARRAY } from './helpers'
export { isSignal } from './isSignal'
export { transact, transaction } from './transactions'
export { RESET_VALUE } from './types'
export type { Signal } from './types'

// This should be incremented any time an API change is made. i.e. for additions or removals.
// Bugfixes need not increment this.
const currentApiVersion = 1

const actualApiVersion = singleton('apiVersion', () => currentApiVersion)

if (actualApiVersion !== currentApiVersion) {
	throw new Error(
		`You have multiple incompatible versions of @tldraw/state in your app. Please deduplicate the package.`
	)
}
