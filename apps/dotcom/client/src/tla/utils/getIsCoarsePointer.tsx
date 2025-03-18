import { tlenv } from 'tldraw'

const mql =
	(typeof window !== 'undefined' &&
		window.matchMedia &&
		window.matchMedia('(any-pointer: coarse)')) ||
	undefined

// This is a workaround for a Firefox bug where we don't correctly
// detect coarse VS fine pointer. For now, let's assume that you have a fine
// pointer if you're on Firefox on desktop.
const isForcedFinePointer = tlenv.isFirefox && !tlenv.isAndroid && !tlenv.isIos

export function getIsCoarsePointer() {
	// default to true if matchMedia is not supported, which is extremely unlikely
	return isForcedFinePointer ? false : (mql?.matches ?? true)
}
