import { registerTldrawLibraryVersion } from '@tldraw/utils'
import { singleton } from './lib/helpers'

export { ArraySet } from './lib/ArraySet'
export { atom, isAtom } from './lib/Atom'
export type { Atom, AtomOptions } from './lib/Atom'
export { unsafe__withoutCapture, whyAmIRunning } from './lib/capture'
export {
	computed,
	getComputedInstance,
	isUninitialized,
	UNINITIALIZED,
	withDiff,
} from './lib/Computed'
export type { Computed, ComputedOptions, WithDiff } from './lib/Computed'
export { EffectScheduler, react, reactor } from './lib/EffectScheduler'
export type { EffectSchedulerOptions, Reactor } from './lib/EffectScheduler'
export { EMPTY_ARRAY } from './lib/helpers'
export { isSignal } from './lib/isSignal'
export { localStorageAtom } from './lib/localStorageAtom'
export { deferAsyncEffects, transact, transaction } from './lib/transactions'
export { RESET_VALUE } from './lib/types'
export type { Child, ComputeDiff, Signal } from './lib/types'

// This should be incremented any time an API change is made. i.e. for additions or removals.
// Bugfixes need not increment this.
const currentApiVersion = 1

const actualApiVersion = singleton('apiVersion', () => currentApiVersion)

if (actualApiVersion !== currentApiVersion) {
	throw new Error(
		`You have multiple incompatible versions of @tldraw/state in your app. Please deduplicate the package.`
	)
}

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
